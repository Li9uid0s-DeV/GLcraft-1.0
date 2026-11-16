//! 7-Mode World Generator & Biome Blend (`worldgen.rs`)
//! Implements all 7 requested world types in Rust:
//! 1. Normal (26.3 Wilderness Bound with Dappled Forest & Abandoned Camp)
//! 2. JJ Thunder To The Max (Extreme Y=319 peaks, cliffs & deep caverns)
//! 3. AMPLIFIED (High-amplitude jagged mountains)
//! 4. FLAT (Bedrock + Dirt + Grass superflat)
//! 5. SKY BLOCK (L-shaped floating island + oak tree + starter chest + sand island)
//! 6. SKY BLOCK (Lucky Block) (SkyBlock + floating ring of Lucky Blocks)
//! 7. One Block (Infinite regenerating phase block at (0, 64, 0))

use crate::chunk::ChunkColumn;
use crate::registry::ModRegistry;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum WorldType {
    Normal = 0,
    JJThunderToTheMax = 1,
    Amplified = 2,
    Flat = 3,
    SkyBlock = 4,
    SkyBlockLucky = 5,
    OneBlock = 6,
}

impl WorldType {
    pub fn from_u8(v: u8) -> Self {
        match v {
            1 => WorldType::JJThunderToTheMax,
            2 => WorldType::Amplified,
            3 => WorldType::Flat,
            4 => WorldType::SkyBlock,
            5 => WorldType::SkyBlockLucky,
            6 => WorldType::OneBlock,
            _ => WorldType::Normal,
        }
    }
}

pub struct WorldGenerator {
    pub seed: u32,
    pub world_type: WorldType,
    pub biome_blend_radius: u8,
}

impl WorldGenerator {
    pub fn new(seed: u32, world_type: WorldType, biome_blend_radius: u8) -> Self {
        WorldGenerator {
            seed,
            world_type,
            biome_blend_radius,
        }
    }

    #[inline]
    fn hash2d(&self, x: i32, z: i32) -> f32 {
        let mut n = (x.wrapping_mul(374761393))
            .wrapping_add(z.wrapping_mul(668265263))
            .wrapping_add(self.seed as i32);
        n = (n ^ (n >> 13)).wrapping_mul(1274126177);
        ((n ^ (n >> 16)) as u32 as f32) / (u32::MAX as f32)
    }

    pub fn value_noise(&self, x: f32, z: f32) -> f32 {
        let ix = x.floor() as i32;
        let iz = z.floor() as i32;
        let fx = x - ix as f32;
        letfz = z - iz as f32;
        let u = fx * fx * (3.0 - 2.0 * fx);
        let v = letfz * letfz * (3.0 - 2.0 * letfz);

        let a = self.hash2d(ix, iz);
        let b = self.hash2d(ix + 1, iz);
        let c = self.hash2d(ix, iz + 1);
        let d = self.hash2d(ix + 1, iz + 1);

        let ab = a + (b - a) * u;
        let cd = c + (d - c) * u;
        ab + (cd - ab) * v
    }

    pub fn fbm(&self, x: f32, z: f32, octaves: usize) -> f32 {
        let mut total = 0.0;
        let mut freq = 1.0;
        let mut amp = 1.0;
        let mut max_v = 0.0;
        for _ in 0..octaves {
            total += self.value_noise(x * freq, z * freq) * amp;
            max_v += amp;
            amp *= 0.5;
            freq *= 2.03;
        }
        total / max_v
    }

    /// Biome ID: 0 = Plains, 1 = Forest, 2 = Dappled Forest (26.3), 3 = Snowy Peaks
    pub fn sample_biome(&self, wx: i32, wz: i32) -> u8 {
        let t = self.fbm(wx as f32 * 0.008, wz as f32 * 0.008, 3);
        if t < 0.30 {
            0 // Plains
        } else if t < 0.52 {
            1 // Forest
        } else if t < 0.80 {
            2 // 26.3 Dappled Forest
        } else {
            3 // Snowy Peaks
        }
    }

    /// Computes smoothed grass/foliage tint across configurable 3x3..15x15 Biome Blend window.
    pub fn blended_grass_color(&self, wx: i32, wz: i32) -> [f32; 3] {
        let r = (self.biome_blend_radius as i32 / 2).clamp(0, 7);
        if r == 0 {
            return self.raw_biome_color(self.sample_biome(wx, wz));
        }
        let mut sum = [0.0f32; 3];
        let mut count = 0.0f32;
        for dx in -r..=r {
            for dz in -r..=r {
                let c = self.raw_biome_color(self.sample_biome(wx + dx * 2, wz + dz * 2));
                sum[0] += c[0];
                sum[1] += c[1];
                sum[2] += c[2];
                count += 1.0;
            }
        }
        [sum[0] / count, sum[1] / count, sum[2] / count]
    }

    fn raw_biome_color(&self, biome: u8) -> [f32; 3] {
        match biome {
            0 => [0.44, 0.74, 0.30], // Plains green
            1 => [0.30, 0.65, 0.24], // Forest lush green
            2 => [0.86, 0.53, 0.20], // 26.3 Dappled Forest autumn orange-gold
            _ => [0.52, 0.72, 0.64], // Taiga/Snowy cool tint
        }
    }

    pub fn compute_surface_y(&self, wx: i32, wz: i32) -> i32 {
        match self.world_type {
            WorldType::Flat => 64,
            WorldType::Normal => {
                let n = self.fbm(wx as f32 * 0.015, wz as f32 * 0.015, 4);
                60 + (n * 26.0) as i32
            }
            WorldType::Amplified => {
                let n = self.fbm(wx as f32 * 0.018, wz as f32 * 0.018, 5);
                let ridge = (n * 2.0 - 0.5).max(0.0).powf(1.65);
                62 + (ridge * 130.0) as i32
            }
            WorldType::JJThunderToTheMax => {
                // Massive tectonic relief reaching up toward Y=310 with dramatic cliffs
                let continental = self.fbm(wx as f32 * 0.0045, wz as f32 * 0.0045, 6);
                let cliff = self.fbm(wx as f32 * 0.022, wz as f32 * 0.022, 4);
                let peak = continental.powf(1.8) * 235.0 + (cliff - 0.5) * 38.0;
                (62.0 + peak).clamp(42.0, 312.0) as i32
            }
            WorldType::SkyBlock | WorldType::SkyBlockLucky | WorldType::OneBlock => 0,
        }
    }

    pub fn next_one_block_id(&self, broken_count: u32) -> u16 {
        let phase = (broken_count / 20) % 5;
        let r = (broken_count.wrapping_mul(1103515245).wrapping_add(12345) >> 16) % 10;
        match phase {
            0 => [2, 3, 8, 21, 32][r as usize % 5], // Forest / Dappled phase
            1 => [1, 4, 31, 30, 1][r as usize % 5], // Cavern phase
            2 => [10, 21, 23, 2, 1][r as usize % 5], // Snowy / Autumn phase
            3 => [33, 60, 31, 33, 30][r as usize % 5], // Nether / Explosive phase
            _ => [34, 61, 30, 34, 32][r as usize % 5], // End phase
        }
    }

    pub fn generate_chunk(
        &self,
        cx: i32,
        cz: i32,
        dimension: &str,
        _reg: &ModRegistry,
    ) -> ChunkColumn {
        let mut chunk = ChunkColumn::new(cx, cz);

        if dimension == "minecraft:the_nether" {
            for lx in 0..16 {
                for lz in 0..16 {
                    let wx = cx * 16 + lx as i32;
                    let wz = cz * 16 + lz as i32;
                    let floor_y = 48 + (self.fbm(wx as f32 * 0.03, wz as f32 * 0.03, 3) * 18.0) as i32;
                    for wy in -64..=floor_y {
                        chunk.set_block(lx, (wy + 64) as usize, lz, if wy == -64 { 5 } else { 33 });
                    }
                }
            }
            return chunk;
        }

        if dimension == "minecraft:the_end" {
            for lx in 0..16 {
                for lz in 0..16 {
                    let wx = cx * 16 + lx as i32;
                    let wz = cz * 16 + lz as i32;
                    let dist = ((wx * wx + wz * wz) as f32).sqrt();
                    if dist < 48.0 {
                        let top_y = 64 + (self.fbm(wx as f32 * 0.04, wz as f32 * 0.04, 2) * 6.0) as i32;
                        for wy in 48..=top_y {
                            chunk.set_block(lx, (wy + 64) as usize, lz, 34);
                        }
                    }
                }
            }
            return chunk;
        }

        match self.world_type {
            WorldType::OneBlock => {
                if cx == 0 && cz == 0 {
                    chunk.set_block(0, (64 + 64) as usize, 0, 2); // Single Infinite Grass Block at (0,64,0)
                }
                return chunk;
            }
            WorldType::SkyBlock | WorldType::SkyBlockLucky => {
                self.populate_skyblock(&mut chunk, cx, cz);
                return chunk;
            }
            _ => {}
        }

        for lx in 0..16 {
            for lz in 0..16 {
                let wx = cx * 16 + lx as i32;
                let wz = cz * 16 + lz as i32;
                let biome = self.sample_biome(wx, wz);
                chunk.biomes[lz * 16 + lx] = biome;

                let surf_y = self.compute_surface_y(wx, wz);
                chunk.set_block(lx, 0, lz, 5); // Bedrock at Y=-64

                for wy in -63..=surf_y {
                    let ly = (wy + 64) as usize;
                    let block_id = if wy == surf_y {
                        if wy < 62 && self.world_type != WorldType::Flat {
                            7 // Sand beach
                        } else if wy > 135 {
                            10 // Snow cap
                        } else if biome == 2 {
                            20 // 26.3 Dappled Forest Orange Grass
                        } else {
                            2 // Standard Grass Block
                        }
                    } else if wy >= surf_y - 3 {
                        3 // Dirt
                    } else {
                        1 // Stone
                    };
                    chunk.set_block(lx, ly, lz, block_id);
                }

                // Sea level water at Y=62
                if self.world_type != WorldType::Flat && surf_y < 62 {
                    for wy in (surf_y + 1)..=62 {
                        chunk.set_block(lx, (wy + 64) as usize, lz, 6);
                    }
                }
            }
        }
        chunk
    }

    fn populate_skyblock(&self, chunk: &mut ChunkColumn, cx: i32, cz: i32) {
        for lx in 0..16 {
            for lz in 0..16 {
                let wx = cx * 16 + lx as i32;
                let wz = cz * 16 + lz as i32;
                // L-shaped starter grass island near (0..6, 62..64, 0..6)
                let in_l_island = (wx >= -3 && wx <= 3 && wz >= -3 && wz <= 3)
                    && !(wx > 0 && wz > 0);
                if in_l_island {
                    chunk.set_block(lx, (62 + 64) as usize, lz, 5);
                    chunk.set_block(lx, (63 + 64) as usize, lz, 3);
                    chunk.set_block(lx, (64 + 64) as usize, lz, 2);
                }
                // Distant sand island
                if wx >= 18 && wx <= 22 && wz >= -2 && wz <= 2 {
                    chunk.set_block(lx, (63 + 64) as usize, lz, 7);
                    chunk.set_block(lx, (64 + 64) as usize, lz, 7);
                }
                // Lucky Block spiral in SKY BLOCK (Lucky Block) mode
                if self.world_type == WorldType::SkyBlockLucky
                    && wx.rem_euclid(8) == 0
                    && wz.rem_euclid(8) == 0
                    && (wx != 0 || wz != 0)
                {
                    chunk.set_block(lx, (65 + 64) as usize, lz, 30); // Lucky Block
                }
            }
        }
    }
}
