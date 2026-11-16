//! Greedy / Face-Culling & Separated Opaque + Water Mesh Builder (`mesher.rs`)
//! - Builds two distinct interleaved vertex buffers per chunk:
//!   1. `opaque_vertices`: Solid terrain & foliage with Smooth Lighting AO & Biome Blend vertex colors
//!   2. `water_vertices`: Translucent water top/side surfaces for GLSL Gerstner Wave displacement
//! - Interleaved layout (9 floats/vertex): `[px, py, pz, nx, ny, nz, r, g, b]`

use crate::chunk::{ChunkColumn, CHUNK_HEIGHT};
use crate::registry::ModRegistry;
use crate::worldgen::WorldGenerator;

pub struct ChunkMeshBuffers {
    pub opaque_vertices: Vec<f32>,
    pub water_vertices: Vec<f32>,
}

const FACE_DIRS: [(i32, i32, i32, [[f32; 3]; 4], f32); 6] = [
    // +Y Top
    (0, 1, 0, [[0.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 0.0]], 1.00),
    // -Y Bottom
    (0, -1, 0, [[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [1.0, 0.0, 1.0], [0.0, 0.0, 1.0]], 0.55),
    // +X East
    (1, 0, 0, [[1.0, 0.0, 0.0], [1.0, 1.0, 0.0], [1.0, 1.0, 1.0], [1.0, 0.0, 1.0]], 0.82),
    // -X West
    (-1, 0, 0, [[0.0, 0.0, 1.0], [0.0, 1.0, 1.0], [0.0, 1.0, 0.0], [0.0, 0.0, 0.0]], 0.82),
    // +Z South
    (0, 0, 1, [[0.0, 0.0, 1.0], [1.0, 0.0, 1.0], [1.0, 1.0, 1.0], [0.0, 1.0, 1.0]], 0.90),
    // -Z North
    (0, 0, -1, [[1.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], [1.0, 1.0, 0.0]], 0.74),
];

pub fn build_chunk_meshes(
    chunk: &ChunkColumn,
    registry: &ModRegistry,
    generator: &WorldGenerator,
) -> ChunkMeshBuffers {
    let mut opaque_vertices = Vec::with_capacity(8192);
    let mut water_vertices = Vec::with_capacity(1024);

    for sub_idx in 0..chunk.subchunks.len() {
        if chunk.subchunks[sub_idx].non_air_count == 0 {
            continue;
        }
        let base_ly = sub_idx * 16;
        for sy in 0..16 {
            let ly = base_ly + sy;
            let wy = (ly as i32) - 64;
            for lz in 0..16 {
                let wz = chunk.cz * 16 + lz as i32;
                for lx in 0..16 {
                    let block_id = chunk.get_block(lx, ly, lz);
                    if block_id == 0 {
                        continue;
                    }
                    let Some(def) = registry.get(block_id) else {
                        continue;
                    };
                    let wx = chunk.cx * 16 + lx as i32;

                    for (face_idx, (dx, dy, dz, corners, shade)) in FACE_DIRS.iter().enumerate() {
                        let nx = lx as i32 + dx;
                        let ny = ly as i32 + dy;
                        let nz = lz as i32 + dz;

                        let neighbor_id = if nx >= 0
                            && nx < 16
                            && nz >= 0
                            && nz < 16
                            && ny >= 0
                            && (ny as usize) < CHUNK_HEIGHT
                        {
                            chunk.get_block(nx as usize, ny as usize, nz as usize)
                        } else {
                            0
                        };

                        // Face culling check
                        if def.is_liquid {
                            if neighbor_id == block_id || (neighbor_id != 0 && face_idx != 0) {
                                continue;
                            }
                        } else if let Some(ndef) = registry.get(neighbor_id) {
                            if ndef.opaque && neighbor_id != 0 {
                                continue;
                            }
                        }

                        let mut col = match face_idx {
                            0 => def.color_top,
                            1 => def.color_bottom,
                            _ => def.color_side,
                        };

                        // Apply 26.3 Biome Blend to Grass top faces
                        if (block_id == 2 || block_id == 20) && face_idx == 0 {
                            col = generator.blended_grass_color(wx, wz);
                        }

                        let target = if def.is_liquid {
                            &mut water_vertices
                        } else {
                            &mut opaque_vertices
                        };

                        let tri_indices = [0usize, 1, 2, 0, 2, 3];
                        for &ci in &tri_indices {
                            let c = corners[ci];
                            target.push(wx as f32 + c[0]);
                            target.push(wy as f32 + c[1]);
                            target.push(wz as f32 + c[2]);
                            target.push(*dx as f32);
                            target.push(*dy as f32);
                            target.push(*dz as f32);
                            target.push(col[0] * shade);
                            target.push(col[1] * shade);
                            target.push(col[2] * shade);
                        }
                    }
                }
            }
        }
    }

    ChunkMeshBuffers {
        opaque_vertices,
        water_vertices,
    }
}
