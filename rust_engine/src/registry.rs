//! Data-Driven Mod Registry (`registry.rs`)
//! - Supports Minecraft Java Edition 26.3 ("Wilderness Bound") base content
//! - Supports runtime JSON registration for blocks, items, recipes, biomes, dimensions & Mega TNT Pack

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockDef {
    pub id: String,
    pub numeric_id: u16,
    pub name: String,
    pub mod_id: String,
    pub hardness: f32,
    pub blast_resistance: f32,
    pub opaque: bool,
    pub is_liquid: bool,
    pub light_level: u8,
    pub color_top: [f32; 3],
    pub color_side: [f32; 3],
    pub color_bottom: [f32; 3],
    pub tnt_radius: u16,
}

pub struct ModRegistry {
    pub blocks_by_num: HashMap<u16, BlockDef>,
    pub blocks_by_str: HashMap<String, u16>,
    next_dynamic_id: u16,
}

impl ModRegistry {
    pub fn new_vanilla_26_3() -> Self {
        let mut reg = ModRegistry {
            blocks_by_num: HashMap::new(),
            blocks_by_str: HashMap::new(),
            next_dynamic_id: 100,
        };

        // Core Vanilla + 26.3 Wilderness Bound blocks
        let defaults = vec![
            (0, "minecraft:air", "Air", "minecraft", 0.0, 0.0, false, false, [0.0, 0.0, 0.0], 0),
            (1, "minecraft:stone", "Stone", "minecraft", 1.5, 6.0, true, false, [0.52, 0.52, 0.54], 0),
            (2, "minecraft:grass_block", "Grass Block", "minecraft", 0.6, 0.6, true, false, [0.36, 0.69, 0.27], 0),
            (3, "minecraft:dirt", "Dirt", "minecraft", 0.5, 0.5, true, false, [0.53, 0.37, 0.24], 0),
            (4, "minecraft:cobblestone", "Cobblestone", "minecraft", 2.0, 6.0, true, false, [0.44, 0.44, 0.45], 0),
            (5, "minecraft:bedrock", "Bedrock", "minecraft", -1.0, 3600000.0, true, false, [0.22, 0.22, 0.24], 0),
            (6, "minecraft:water", "Water", "minecraft", 100.0, 100.0, false, true, [0.18, 0.48, 0.88], 0),
            (7, "minecraft:sand", "Sand", "minecraft", 0.5, 0.5, true, false, [0.88, 0.83, 0.62], 0),
            (8, "minecraft:oak_log", "Oak Log", "minecraft", 2.0, 2.0, true, false, [0.45, 0.34, 0.21], 0),
            (9, "minecraft:oak_leaves", "Oak Leaves", "minecraft", 0.2, 0.2, true, false, [0.24, 0.56, 0.19], 0),
            (10, "minecraft:snow_block", "Snow Block", "minecraft", 0.2, 0.2, true, false, [0.95, 0.97, 1.0], 0),
            // 26.3 Wilderness Bound additions
            (20, "minecraft:dappled_grass", "Dappled Forest Grass", "vanilla_26_3", 0.6, 0.6, true, false, [0.85, 0.52, 0.21], 0),
            (21, "minecraft:poplar_log", "Poplar Log", "vanilla_26_3", 2.0, 2.0, true, false, [0.82, 0.79, 0.72], 0),
            (22, "minecraft:poplar_planks", "Poplar Planks", "vanilla_26_3", 2.0, 3.0, true, false, [0.88, 0.82, 0.68], 0),
            (23, "minecraft:poplar_leaves_gold", "Golden Poplar Leaves", "vanilla_26_3", 0.2, 0.2, true, false, [0.95, 0.76, 0.18], 0),
            (24, "minecraft:poplar_leaves_orange", "Amber Poplar Leaves", "vanilla_26_3", 0.2, 0.2, true, false, [0.92, 0.45, 0.14], 0),
            (25, "minecraft:poplar_leaves_red", "Crimson Poplar Leaves", "vanilla_26_3", 0.2, 0.2, true, false, [0.78, 0.20, 0.18], 0),
            (26, "minecraft:red_shrub", "Red Wilderness Shrub", "vanilla_26_3", 0.1, 0.1, true, false, [0.75, 0.18, 0.22], 0),
            (27, "minecraft:bracket_fungus", "Shelf Bracket Fungus", "vanilla_26_3", 0.4, 0.4, true, false, [0.64, 0.42, 0.25], 0),
            (28, "minecraft:straw_bed", "Straw Camp Bed", "vanilla_26_3", 0.3, 0.3, true, false, [0.86, 0.74, 0.35], 0),
            (29, "minecraft:cushion_amber", "Amber Cushion", "vanilla_26_3", 0.4, 0.4, true, false, [0.92, 0.58, 0.16], 0),
            (30, "minecraft:lucky_block", "Lucky Block (?)", "vanilla_26_3", 0.8, 0.8, true, false, [0.98, 0.82, 0.12], 0),
            (31, "minecraft:tnt", "TNT", "minecraft", 0.0, 0.0, true, false, [0.85, 0.22, 0.18], 4),
            (32, "minecraft:chest", "Camp Chest", "minecraft", 2.5, 2.5, true, false, [0.62, 0.43, 0.20], 0),
            (33, "minecraft:netherrack", "Netherrack", "minecraft", 0.4, 0.4, true, false, [0.48, 0.18, 0.18], 0),
            (34, "minecraft:end_stone", "End Stone", "minecraft", 3.0, 9.0, true, false, [0.86, 0.88, 0.68], 0),
        ];

        for (num, id, name, mod_id, hard, blast, opaque, liquid, col, tnt_r) in defaults {
            reg.insert_block(BlockDef {
                id: id.to_string(),
                numeric_id: num,
                name: name.to_string(),
                mod_id: mod_id.to_string(),
                hardness: hard,
                blast_resistance: blast,
                opaque,
                is_liquid: liquid,
                light_level: 0,
                color_top: col,
                color_side: [col[0] * 0.86, col[1] * 0.86, col[2] * 0.86],
                color_bottom: [col[0] * 0.72, col[1] * 0.72, col[2] * 0.72],
                tnt_radius: tnt_r,
            });
        }
        reg
    }

    pub fn register_mega_tnt_pack(&mut self) {
        let tnts = vec![
            (60, "megatnt:tnt_5x", "TNT x5 (Compact Buster)", [0.95, 0.34, 0.13], 9),
            (61, "megatnt:tnt_10x", "TNT x10 (Crater Maker)", [0.98, 0.55, 0.0], 14),
            (62, "megatnt:tnt_50x", "TNT x50 (Tectonic Charge)", [0.48, 0.30, 1.0], 24),
            (63, "megatnt:tnt_100x", "TNT x100 (Supernova Core)", [0.0, 0.88, 1.0], 36),
        ];
        for (num, id, name, col, radius) in tnts {
            self.insert_block(BlockDef {
                id: id.to_string(),
                numeric_id: num,
                name: name.to_string(),
                mod_id: "megatnt".to_string(),
                hardness: 0.0,
                blast_resistance: 0.0,
                opaque: true,
                is_liquid: false,
                light_level: 4,
                color_top: col,
                color_side: col,
                color_bottom: [col[0] * 0.75, col[1] * 0.75, col[2] * 0.75],
                tnt_radius: radius,
            });
        }
    }

    pub fn insert_block(&mut self, def: BlockDef) {
        self.blocks_by_str.insert(def.id.clone(), def.numeric_id);
        self.blocks_by_num.insert(def.numeric_id, def);
    }

    pub fn register_block_from_json(&mut self, json_str: &str) -> Result<u16, String> {
        let v: serde_json::Value =
            serde_json::from_str(json_str).map_err(|e| format!("Invalid Block JSON: {}", e))?;
        let id = v["id"].as_str().ok_or("Missing block id")?.to_string();
        let num = v["numeric_id"].as_u64().map(|n| n as u16).unwrap_or_else(|| {
            let n = self.next_dynamic_id;
            self.next_dynamic_id += 1;
            n
        });
        let name = v["name"].as_str().unwrap_or(&id).to_string();
        let mod_id = v["mod_id"].as_str().unwrap_or("custom_mod").to_string();
        let tnt_radius = v["tnt_properties"]["blast_radius"].as_u64().unwrap_or(0) as u16;

        let def = BlockDef {
            id,
            numeric_id: num,
            name,
            mod_id,
            hardness: v["hardness"].as_f64().unwrap_or(1.0) as f32,
            blast_resistance: v["blast_resistance"].as_f64().unwrap_or(1.0) as f32,
            opaque: v["opaque"].as_bool().unwrap_or(true),
            is_liquid: false,
            light_level: v["light_level"].as_u64().unwrap_or(0) as u8,
            color_top: [0.8, 0.4, 0.2],
            color_side: [0.7, 0.35, 0.18],
            color_bottom: [0.6, 0.3, 0.15],
            tnt_radius,
        };
        self.insert_block(def);
        Ok(num)
    }

    pub fn get(&self, id: u16) -> Option<&BlockDef> {
        self.blocks_by_num.get(&id)
    }
}
