//! VoxelCraft 26.3 - Rust / WebAssembly Core Engine (`lib.rs`)
//! Targets MediaTek Kompanio 500 (ARM Cortex-A73/A53, 4GB RAM)
//! - Zero-chunk allocation on Title Screen
//! - 16-bit palette-compressed chunks (16x384x16)
//! - Instant dimension cache eviction (`switch_dimension`)
//! - Zero-copy TypedArray pointers (`Float32Array` / `Uint32Array`) for Three.js

pub mod chunk;
pub mod explosion;
pub mod mesher;
pub mod registry;
pub mod worldgen;

use std::collections::HashMap;
use wasm_bindgen::prelude::*;

use crate::chunk::{ChunkColumn, CHUNK_HEIGHT};
use crate::explosion::TimeSlicedExplosionQueue;
use crate::mesher::{build_chunk_meshes, ChunkMeshBuffers};
use crate::registry::ModRegistry;
use crate::worldgen::{WorldGenerator, WorldType};

#[wasm_bindgen]
pub struct VoxelEngineWasm {
    registry: ModRegistry,
    generator: WorldGenerator,
    current_dimension: String,
    chunks: HashMap<(i32, i32), ChunkColumn>,
    meshes: HashMap<(i32, i32), ChunkMeshBuffers>,
    explosions: TimeSlicedExplosionQueue,
    one_block_broken_count: u32,
}

#[wasm_bindgen]
impl VoxelEngineWasm {
    /// Creates the engine in Title-Screen standby mode (0 chunks allocated).
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32, world_type_id: u8, biome_blend_radius: u8) -> VoxelEngineWasm {
        let mut registry = ModRegistry::new_vanilla_26_3();
        registry.register_mega_tnt_pack();
        VoxelEngineWasm {
            registry,
            generator: WorldGenerator::new(
                seed,
                WorldType::from_u8(world_type_id),
                biome_blend_radius,
            ),
            current_dimension: "minecraft:overworld".to_string(),
            chunks: HashMap::new(),
            meshes: HashMap::new(),
            explosions: TimeSlicedExplosionQueue::new(4096),
            one_block_broken_count: 0,
        }
    }

    /// Registers a custom block or item from JSON (`mods/*.json`).
    #[wasm_bindgen]
    pub fn register_mod_block_json(&mut self, json_str: &str) -> Result<u16, JsValue> {
        self.registry
            .register_block_from_json(json_str)
            .map_err(|e| JsValue::from_str(&e))
    }

    /// Switches dimension and IMMEDIATELY frees all chunk & mesh buffers from the previous dimension
    /// to strictly stay well under the 4GB RAM budget.
    #[wasm_bindgen]
    pub fn switch_dimension(&mut self, dimension_id: &str) {
        if self.current_dimension != dimension_id {
            self.chunks.clear();
            self.chunks.shrink_to_fit();
            self.meshes.clear();
            self.meshes.shrink_to_fit();
            self.explosions.clear();
            self.current_dimension = dimension_id.to_string();
        }
    }

    /// Generates a 16x384x16 chunk column and builds separated Opaque + Water meshes.
    #[wasm_bindgen]
    pub fn generate_and_mesh_chunk(&mut self, cx: i32, cz: i32) {
        if !self.chunks.contains_key(&(cx, cz)) {
            let chunk = self
                .generator
                .generate_chunk(cx, cz, &self.current_dimension, &self.registry);
            self.chunks.insert((cx, cz), chunk);
        }
        if let Some(chunk) = self.chunks.get(&(cx, cz)) {
            let mesh = build_chunk_meshes(chunk, &self.registry, &self.generator);
            self.meshes.insert((cx, cz), mesh);
        }
    }

    #[wasm_bindgen]
    pub fn get_block(&self, wx: i32, wy: i32, wz: i32) -> u16 {
        if wy < -64 || wy >= (-64 + CHUNK_HEIGHT as i32) {
            return 0;
        }
        let cx = wx.div_euclid(16);
        let cz = wz.div_euclid(16);
        let lx = wx.rem_euclid(16) as usize;
        let lz = wz.rem_euclid(16) as usize;
        let ly = (wy + 64) as usize;
        self.chunks
            .get(&(cx, cz))
            .map(|c| c.get_block(lx, ly, lz))
            .unwrap_or(0)
    }

    #[wasm_bindgen]
    pub fn set_block(&mut self, wx: i32, wy: i32, wz: i32, block_id: u16) -> bool {
        if wy < -64 || wy >= (-64 + CHUNK_HEIGHT as i32) {
            return false;
        }
        let cx = wx.div_euclid(16);
        let cz = wz.div_euclid(16);
        let lx = wx.rem_euclid(16) as usize;
        let lz = wz.rem_euclid(16) as usize;
        let ly = (wy + 64) as usize;

        if let Some(chunk) = self.chunks.get_mut(&(cx, cz)) {
            chunk.set_block(lx, ly, lz, block_id);
            // One Block progression logic: regenerate the origin block at (0, 64, 0)
            if self.generator.world_type == WorldType::OneBlock
                && wx == 0
                && wy == 64
                && wz == 0
                && block_id == 0
            {
                self.one_block_broken_count += 1;
                let next_id = self
                    .generator
                    .next_one_block_id(self.one_block_broken_count);
                chunk.set_block(lx, ly, lz, next_id);
            }
            let mesh = build_chunk_meshes(chunk, &self.registry, &self.generator);
            self.meshes.insert((cx, cz), mesh);
            true
        } else {
            false
        }
    }

    /// Queues a Mega TNT or standard TNT explosion into the non-blocking time-sliced raycast engine.
    #[wasm_bindgen]
    pub fn queue_explosion(&mut self, wx: i32, wy: i32, wz: i32, radius: u16) {
        self.explosions.enqueue(wx, wy, wz, radius);
    }

    /// Steps the time-sliced explosion queue (processes at most `budget` blocks per frame)
    /// and returns a packed Int32Array of dirty chunk coordinates `[cx0, cz0, cx1, cz1, ...]`.
    #[wasm_bindgen]
    pub fn step_explosions(&mut self) -> Vec<i32> {
        let dirty_chunks = self
            .explosions
            .process_slice(&mut self.chunks, &self.registry);
        let mut out = Vec::with_capacity(dirty_chunks.len() * 2);
        for (cx, cz) in dirty_chunks {
            if let Some(chunk) = self.chunks.get(&(cx, cz)) {
                let mesh = build_chunk_meshes(chunk, &self.registry, &self.generator);
                self.meshes.insert((cx, cz), mesh);
                out.push(cx);
                out.push(cz);
            }
        }
        out
    }

    /// Zero-copy pointer accessors for Three.js `BufferAttribute` (via `WebAssembly.Memory.buffer`)
    #[wasm_bindgen]
    pub fn opaque_vertices_ptr(&self, cx: i32, cz: i32) -> *const f32 {
        self.meshes
            .get(&(cx, cz))
            .map(|m| m.opaque_vertices.as_ptr())
            .unwrap_or(std::ptr::null())
    }

    #[wasm_bindgen]
    pub fn opaque_vertices_len(&self, cx: i32, cz: i32) -> usize {
        self.meshes
            .get(&(cx, cz))
            .map(|m| m.opaque_vertices.len())
            .unwrap_or(0)
    }

    #[wasm_bindgen]
    pub fn water_vertices_ptr(&self, cx: i32, cz: i32) -> *const f32 {
        self.meshes
            .get(&(cx, cz))
            .map(|m| m.water_vertices.as_ptr())
            .unwrap_or(std::ptr::null())
    }

    #[wasm_bindgen]
    pub fn water_vertices_len(&self, cx: i32, cz: i32) -> usize {
        self.meshes
            .get(&(cx, cz))
            .map(|m| m.water_vertices.len())
            .unwrap_or(0)
    }

    #[wasm_bindgen]
    pub fn loaded_chunk_count(&self) -> usize {
        self.chunks.len()
    }
}
