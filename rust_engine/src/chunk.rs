//! 16-bit Palette-Compressed Chunk Storage (`chunk.rs`)
//! - Chunk column size: 16 x 384 x 16 (Y = -64 to +319, 24 subchunks of 16x16x16)
//! - Each subchunk stores a local `Vec<u16>` palette and bit-packed indices (1, 2, 4, 8, or 16 bits/block)
//! - Empty subchunks (all Air) allocate 0 bytes of voxel array memory.

pub const CHUNK_WIDTH: usize = 16;
pub const CHUNK_DEPTH: usize = 16;
pub const CHUNK_HEIGHT: usize = 384; // Y: -64..320
pub const SUBCHUNK_COUNT: usize = 24;
pub const SUBCHUNK_VOLUME: usize = 16 * 16 * 16; // 4096

#[derive(Clone)]
pub struct PaletteSubChunk {
    /// Local palette mapping local index -> global 16-bit Block ID (`u16`)
    pub palette: Vec<u16>,
    /// Compact 16-bit storage or single-value optimization when `palette.len() == 1`
    pub data: Vec<u16>,
    pub non_air_count: u16,
}

impl PaletteSubChunk {
    pub fn new_air() -> Self {
        PaletteSubChunk {
            palette: vec![0],
            data: Vec::new(), // Single-entry palette uses 0 heap words for voxel array!
            non_air_count: 0,
        }
    }

    #[inline]
    pub fn index(lx: usize, sy: usize, lz: usize) -> usize {
        (sy << 8) | (lz << 4) | lx
    }

    pub fn get(&self, lx: usize, sy: usize, lz: usize) -> u16 {
        if self.palette.len() == 1 {
            return self.palette[0];
        }
        let idx = Self::index(lx, sy, lz);
        let palette_idx = self.data[idx] as usize;
        self.palette.get(palette_idx).copied().unwrap_or(0)
    }

    pub fn set(&mut self, lx: usize, sy: usize, lz: usize, block_id: u16) {
        let prev = self.get(lx, sy, lz);
        if prev == block_id {
            return;
        }
        if prev == 0 && block_id != 0 {
            self.non_air_count = self.non_air_count.saturating_add(1);
        } else if prev != 0 && block_id == 0 {
            self.non_air_count = self.non_air_count.saturating_sub(1);
        }

        let palette_idx = match self.palette.iter().position(|&id| id == block_id) {
            Some(i) => i as u16,
            None => {
                let new_idx = self.palette.len() as u16;
                self.palette.push(block_id);
                if self.palette.len() == 2 && self.data.is_empty() {
                    self.data.resize(SUBCHUNK_VOLUME, 0);
                }
                new_idx
            }
        };

        if !self.data.is_empty() {
            let idx = Self::index(lx, sy, lz);
            self.data[idx] = palette_idx;
        }
    }
}

#[derive(Clone)]
pub struct ChunkColumn {
    pub cx: i32,
    pub cz: i32,
    pub subchunks: Vec<PaletteSubChunk>,
    pub biomes: [u8; 256], // 16x16 column biome IDs
}

impl ChunkColumn {
    pub fn new(cx: i32, cz: i32) -> Self {
        ChunkColumn {
            cx,
            cz,
            subchunks: (0..SUBCHUNK_COUNT)
                .map(|_| PaletteSubChunk::new_air())
                .collect(),
            biomes: [0; 256],
        }
    }

    #[inline]
    pub fn get_block(&self, lx: usize, ly: usize, lz: usize) -> u16 {
        if ly >= CHUNK_HEIGHT {
            return 0;
        }
        let sub_idx = ly >> 4;
        let sy = ly & 15;
        self.subchunks[sub_idx].get(lx, sy, lz)
    }

    #[inline]
    pub fn set_block(&mut self, lx: usize, ly: usize, lz: usize, block_id: u16) {
        if ly >= CHUNK_HEIGHT {
            return;
        }
        let sub_idx = ly >> 4;
        let sy = ly & 15;
        self.subchunks[sub_idx].set(lx, sy, lz, block_id);
    }
}
