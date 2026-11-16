/**
 * VoxelCraft 26.3 - 16-bit Palette-Compressed Chunk Engine, 7 World Generators,
 * Data-Driven Mod Registry, Time-Sliced Explosion Engine, WorldEdit & Command Engine.
 * Mirrors the exact memory layout and algorithms of `rust_engine/src/*.rs` using
 * zero-GC TypedArrays (`Uint16Array`, `Float32Array`) for instant execution in the browser.
 */

export type WorldTypeId =
  | 'normal'
  | 'jj_thunder'
  | 'amplified'
  | 'flat'
  | 'skyblock'
  | 'skyblock_lucky'
  | 'oneblock';

export type GameMode = 'survival' | 'creative' | 'spectator';
export type DimensionId = 'minecraft:overworld' | 'minecraft:the_nether' | 'minecraft:the_end';
export type RenderMode = 'normal' | 'pbr' | 'raytracing';

export interface BlockDefinition {
  numericId: number;
  id: string;
  name: string;
  modId: string;
  modName: string;
  category: 'building' | 'nature' | 'wilderness_26_3' | 'redstone' | 'explosives' | 'utility' | 'tools';
  hardness: number;
  blastResistance: number;
  properTool: 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'shears' | 'any';
  opaque: boolean;
  isLiquid?: boolean;
  isItemOnly?: boolean;
  lightLevel: number;
  colorTop: [number, number, number];
  colorSide: [number, number, number];
  colorBottom: [number, number, number];
  accentHex: string;
  tntRadius?: number;
  tntFuseTicks?: number;
  redstonePower?: number;
  description?: string;
}

export interface CraftingRecipe {
  id: string;
  resultId: string;
  resultCount: number;
  pattern: string[];
  key: Record<string, string>;
  modName: string;
}

export const CHUNK_WIDTH = 16;
export const CHUNK_DEPTH = 16;
export const CHUNK_HEIGHT = 384; // Y = -64 .. 319
export const MIN_Y = -64;
export const MAX_Y = 319;
export const SUBCHUNK_COUNT = 24;
export const SUBCHUNK_VOLUME = 4096;

export const INITIAL_BLOCKS_26_3: BlockDefinition[] = [
  {
    numericId: 0,
    id: 'minecraft:air',
    name: 'Air',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    lightLevel: 0,
    colorTop: [0, 0, 0],
    colorSide: [0, 0, 0],
    colorBottom: [0, 0, 0],
    accentHex: '#000000',
  },
  {
    numericId: 1,
    id: 'minecraft:stone',
    name: 'Stone',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'building',
    hardness: 1.5,
    blastResistance: 6.0,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.52, 0.53, 0.55],
    colorSide: [0.47, 0.48, 0.50],
    colorBottom: [0.40, 0.41, 0.43],
    accentHex: '#84878c',
  },
  {
    numericId: 2,
    id: 'minecraft:grass_block',
    name: 'Grass Block',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 0.6,
    blastResistance: 0.6,
    properTool: 'shovel',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.38, 0.72, 0.28],
    colorSide: [0.48, 0.36, 0.23],
    colorBottom: [0.45, 0.32, 0.20],
    accentHex: '#61b847',
  },
  {
    numericId: 3,
    id: 'minecraft:dirt',
    name: 'Dirt',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 0.5,
    blastResistance: 0.5,
    properTool: 'shovel',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.54, 0.38, 0.25],
    colorSide: [0.49, 0.34, 0.22],
    colorBottom: [0.44, 0.30, 0.19],
    accentHex: '#8a6140',
  },
  {
    numericId: 4,
    id: 'minecraft:cobblestone',
    name: 'Cobblestone',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'building',
    hardness: 2.0,
    blastResistance: 6.0,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.44, 0.45, 0.46],
    colorSide: [0.40, 0.41, 0.42],
    colorBottom: [0.35, 0.36, 0.37],
    accentHex: '#707375',
  },
  {
    numericId: 5,
    id: 'minecraft:bedrock',
    name: 'Bedrock',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'building',
    hardness: -1,
    blastResistance: 3600000,
    properTool: 'any',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.22, 0.22, 0.24],
    colorSide: [0.19, 0.19, 0.21],
    colorBottom: [0.16, 0.16, 0.18],
    accentHex: '#38383d',
  },
  {
    numericId: 6,
    id: 'minecraft:water',
    name: 'Water',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 100,
    blastResistance: 100,
    properTool: 'any',
    opaque: false,
    isLiquid: true,
    lightLevel: 0,
    colorTop: [0.16, 0.52, 0.92],
    colorSide: [0.14, 0.45, 0.84],
    colorBottom: [0.10, 0.36, 0.72],
    accentHex: '#2985eb',
  },
  {
    numericId: 7,
    id: 'minecraft:sand',
    name: 'Sand',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 0.5,
    blastResistance: 0.5,
    properTool: 'shovel',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.89, 0.84, 0.63],
    colorSide: [0.84, 0.79, 0.58],
    colorBottom: [0.78, 0.72, 0.52],
    accentHex: '#e3d6a1',
  },
  {
    numericId: 8,
    id: 'minecraft:oak_log',
    name: 'Oak Log',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 2.0,
    blastResistance: 2.0,
    properTool: 'axe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.65, 0.52, 0.32],
    colorSide: [0.43, 0.32, 0.19],
    colorBottom: [0.60, 0.48, 0.29],
    accentHex: '#6e5230',
  },
  {
    numericId: 9,
    id: 'minecraft:oak_leaves',
    name: 'Oak Leaves',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 0.2,
    blastResistance: 0.2,
    properTool: 'hoe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.25, 0.58, 0.20],
    colorSide: [0.22, 0.52, 0.18],
    colorBottom: [0.19, 0.45, 0.15],
    accentHex: '#409433',
  },
  {
    numericId: 10,
    id: 'minecraft:snow_block',
    name: 'Snow Block',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'nature',
    hardness: 0.2,
    blastResistance: 0.2,
    properTool: 'shovel',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.95, 0.97, 1.0],
    colorSide: [0.88, 0.92, 0.97],
    colorBottom: [0.80, 0.85, 0.92],
    accentHex: '#f2f7ff',
  },
  // 26.3 Wilderness Bound additions
  {
    numericId: 20,
    id: 'minecraft:dappled_grass',
    name: 'Dappled Forest Grass',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.6,
    blastResistance: 0.6,
    properTool: 'shovel',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.86, 0.53, 0.21],
    colorSide: [0.54, 0.37, 0.22],
    colorBottom: [0.46, 0.31, 0.19],
    accentHex: '#db8736',
    description: 'Autumn-tinted grass block found in 26.3 Dappled Forests.',
  },
  {
    numericId: 21,
    id: 'minecraft:poplar_log',
    name: 'Poplar Log',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 2.0,
    blastResistance: 2.0,
    properTool: 'axe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.85, 0.80, 0.68],
    colorSide: [0.82, 0.79, 0.73],
    colorBottom: [0.78, 0.74, 0.64],
    accentHex: '#d1c9ba',
    description: 'Pale barked wood native to Dappled Forests (standing & fallen logs).',
  },
  {
    numericId: 22,
    id: 'minecraft:poplar_planks',
    name: 'Poplar Planks',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 2.0,
    blastResistance: 3.0,
    properTool: 'axe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.89, 0.83, 0.69],
    colorSide: [0.85, 0.79, 0.65],
    colorBottom: [0.80, 0.74, 0.60],
    accentHex: '#e3d4b0',
    description: 'Warm cream-toned planks crafted from 26.3 Poplar Logs.',
  },
  {
    numericId: 23,
    id: 'minecraft:poplar_leaves_gold',
    name: 'Golden Poplar Leaves',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.2,
    blastResistance: 0.2,
    properTool: 'hoe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.95, 0.76, 0.18],
    colorSide: [0.89, 0.70, 0.15],
    colorBottom: [0.80, 0.62, 0.12],
    accentHex: '#f2c22e',
  },
  {
    numericId: 24,
    id: 'minecraft:poplar_leaves_orange',
    name: 'Amber Poplar Leaves',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.2,
    blastResistance: 0.2,
    properTool: 'hoe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.93, 0.46, 0.15],
    colorSide: [0.86, 0.41, 0.13],
    colorBottom: [0.78, 0.36, 0.11],
    accentHex: '#ed7526',
  },
  {
    numericId: 25,
    id: 'minecraft:poplar_leaves_red',
    name: 'Crimson Poplar Leaves',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.2,
    blastResistance: 0.2,
    properTool: 'hoe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.80, 0.21, 0.19],
    colorSide: [0.73, 0.18, 0.16],
    colorBottom: [0.65, 0.15, 0.14],
    accentHex: '#cc3630',
  },
  {
    numericId: 26,
    id: 'minecraft:red_shrub',
    name: 'Red Wilderness Shrub',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.1,
    blastResistance: 0.1,
    properTool: 'shears',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.76, 0.18, 0.22],
    colorSide: [0.68, 0.16, 0.19],
    colorBottom: [0.58, 0.14, 0.16],
    accentHex: '#c22e38',
  },
  {
    numericId: 27,
    id: 'minecraft:bracket_fungus',
    name: 'Bracket Shelf Fungus',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.4,
    blastResistance: 0.4,
    properTool: 'axe',
    opaque: true,
    lightLevel: 2,
    colorTop: [0.66, 0.43, 0.25],
    colorSide: [0.58, 0.37, 0.21],
    colorBottom: [0.82, 0.72, 0.56],
    accentHex: '#a86e40',
  },
  {
    numericId: 28,
    id: 'minecraft:straw_bed',
    name: 'Straw Camp Bed (16-Stack)',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.3,
    blastResistance: 0.3,
    properTool: 'any',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.87, 0.75, 0.36],
    colorSide: [0.78, 0.66, 0.29],
    colorBottom: [0.68, 0.55, 0.24],
    accentHex: '#debf5c',
    description: 'Temporary wilderness bed Found in Abandoned Camps; stacks to 16 and vanishes on wake.',
  },
  {
    numericId: 29,
    id: 'minecraft:cushion_amber',
    name: 'Amber Seated Cushion',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'wilderness_26_3',
    hardness: 0.4,
    blastResistance: 0.4,
    properTool: 'shears',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.92, 0.58, 0.16],
    colorSide: [0.84, 0.51, 0.13],
    colorBottom: [0.74, 0.44, 0.11],
    accentHex: '#eb9429',
  },
  {
    numericId: 30,
    id: 'minecraft:lucky_block',
    name: 'Lucky Block (?)',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'utility',
    hardness: 0.8,
    blastResistance: 0.8,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 6,
    colorTop: [0.98, 0.82, 0.12],
    colorSide: [0.95, 0.76, 0.08],
    colorBottom: [0.86, 0.66, 0.05],
    accentHex: '#fad11f',
    description: 'Triggers a random event when broken: Diamond Loot, TNT Blast, Mob Ambush, or Shrine!',
  },
  {
    numericId: 31,
    id: 'minecraft:tnt',
    name: 'TNT (Standard)',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'explosives',
    hardness: 0.0,
    blastResistance: 0.0,
    properTool: 'any',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.85, 0.22, 0.18],
    colorSide: [0.80, 0.20, 0.16],
    colorBottom: [0.68, 0.16, 0.13],
    accentHex: '#d9382e',
    tntRadius: 4,
    tntFuseTicks: 50,
  },
  {
    numericId: 32,
    id: 'minecraft:chest',
    name: 'Abandoned Camp Chest',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'utility',
    hardness: 2.5,
    blastResistance: 2.5,
    properTool: 'axe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.64, 0.44, 0.20],
    colorSide: [0.58, 0.39, 0.17],
    colorBottom: [0.48, 0.32, 0.14],
    accentHex: '#a37033',
    description: 'Contains Explorer Map, Straw Bed, Poplar Saplings & Gunpowder.',
  },
  {
    numericId: 33,
    id: 'minecraft:netherrack',
    name: 'Netherrack',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'building',
    hardness: 0.4,
    blastResistance: 0.4,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.50, 0.19, 0.19],
    colorSide: [0.45, 0.16, 0.16],
    colorBottom: [0.38, 0.13, 0.13],
    accentHex: '#803030',
  },
  {
    numericId: 34,
    id: 'minecraft:end_stone',
    name: 'End Stone',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'building',
    hardness: 3.0,
    blastResistance: 9.0,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 0,
    colorTop: [0.86, 0.88, 0.68],
    colorSide: [0.81, 0.83, 0.63],
    colorBottom: [0.75, 0.77, 0.57],
    accentHex: '#dbe0ad',
  },
  {
    numericId: 35,
    id: 'minecraft:redstone_block',
    name: 'Block of Redstone (Signal 15)',
    modId: 'minecraft',
    modName: 'Minecraft 26.3',
    category: 'redstone',
    hardness: 5.0,
    blastResistance: 6.0,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 7,
    redstonePower: 15,
    colorTop: [0.78, 0.12, 0.08],
    colorSide: [0.72, 0.10, 0.06],
    colorBottom: [0.64, 0.08, 0.05],
    accentHex: '#c71f14',
    description: 'Emits continuous Redstone power 15 and automatically primes adjacent TNT / Mega TNT.',
  },
  {
    numericId: 36,
    id: 'minecraft:weather_radar',
    name: 'Weather2 Storm Radar',
    modId: 'weather2',
    modName: 'Weather2 Remastered',
    category: 'utility',
    hardness: 1.5,
    blastResistance: 6.0,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 8,
    colorTop: [0.16, 0.78, 0.68],
    colorSide: [0.22, 0.32, 0.38],
    colorBottom: [0.18, 0.24, 0.28],
    accentHex: '#29c7ad',
    description: 'Tracks localized storm cells, wind vectors, and F3-F5 Tornado coordinates.',
  },
  // Sample Mod: Mega TNT Pack (`mods/mega_tnt/`)
  {
    numericId: 60,
    id: 'megatnt:tnt_5x',
    name: 'TNT x5 (Compact Buster)',
    modId: 'megatnt',
    modName: 'Mega TNT Pack',
    category: 'explosives',
    hardness: 0.0,
    blastResistance: 0.0,
    properTool: 'any',
    opaque: true,
    lightLevel: 2,
    colorTop: [0.95, 0.34, 0.13],
    colorSide: [0.90, 0.29, 0.10],
    colorBottom: [0.76, 0.22, 0.08],
    accentHex: '#f25721',
    tntRadius: 7,
    tntFuseTicks: 50,
    description: '5x Explosive Yield (Blast Radius 7). Time-sliced Rust detonation.',
  },
  {
    numericId: 61,
    id: 'megatnt:tnt_10x',
    name: 'TNT x10 (Crater Maker)',
    modId: 'megatnt',
    modName: 'Mega TNT Pack',
    category: 'explosives',
    hardness: 0.0,
    blastResistance: 0.0,
    properTool: 'any',
    opaque: true,
    lightLevel: 4,
    colorTop: [0.98, 0.58, 0.05],
    colorSide: [0.92, 0.50, 0.04],
    colorBottom: [0.78, 0.40, 0.02],
    accentHex: '#fa940d',
    tntRadius: 11,
    tntFuseTicks: 65,
    description: '10x Explosive Yield (Blast Radius 11). Cleans out entire hillsides.',
  },
  {
    numericId: 62,
    id: 'megatnt:tnt_50x',
    name: 'TNT x50 (Tectonic Charge)',
    modId: 'megatnt',
    modName: 'Mega TNT Pack',
    category: 'explosives',
    hardness: 0.0,
    blastResistance: 0.0,
    properTool: 'any',
    opaque: true,
    lightLevel: 7,
    colorTop: [0.52, 0.28, 0.98],
    colorSide: [0.45, 0.22, 0.90],
    colorBottom: [0.35, 0.16, 0.75],
    accentHex: '#8547fa',
    tntRadius: 17,
    tntFuseTicks: 80,
    description: '50x Explosive Yield (Blast Radius 17). Non-blocking time-sliced raycast.',
  },
  {
    numericId: 63,
    id: 'megatnt:tnt_100x',
    name: 'TNT x100 (Supernova Core)',
    modId: 'megatnt',
    modName: 'Mega TNT Pack',
    category: 'explosives',
    hardness: 0.0,
    blastResistance: 0.0,
    properTool: 'any',
    opaque: true,
    lightLevel: 11,
    colorTop: [0.05, 0.88, 0.98],
    colorSide: [0.04, 0.76, 0.92],
    colorBottom: [0.02, 0.58, 0.78],
    accentHex: '#0de0fa',
    tntRadius: 24,
    tntFuseTicks: 95,
    description: '100x Explosive Yield (Blast Radius 24). Slices destruction over frames for 60FPS on 4GB RAM.',
  },
  // Special tools / items
  {
    numericId: 260,
    id: 'megatnt:blast_igniter',
    name: 'Blast Igniter',
    modId: 'megatnt',
    modName: 'Mega TNT Pack',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [1.0, 0.3, 0.0],
    colorSide: [1.0, 0.3, 0.0],
    colorBottom: [1.0, 0.3, 0.0],
    accentHex: '#ff4d00',
    description: 'Right-click any TNT or Mega TNT block to ignite immediately!',
  },
  {
    numericId: 261,
    id: 'worldedit:wooden_axe',
    name: 'WorldEdit Wand (//wand)',
    modId: 'worldedit',
    modName: 'WorldEdit Built-in',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'axe',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.76, 0.56, 0.32],
    colorSide: [0.76, 0.56, 0.32],
    colorBottom: [0.76, 0.56, 0.32],
    accentHex: '#c28f52',
    description: 'Left-click block = Pos1, Right-click block = Pos2. Use //set, //replace, //sphere, //walls.',
  },
  {
    numericId: 262,
    id: 'minecraft:explorer_map',
    name: 'Abandoned Camp Explorer Map',
    modId: 'vanilla_26_3',
    modName: 'Wilderness Bound 26.3',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.85, 0.76, 0.55],
    colorSide: [0.85, 0.76, 0.55],
    colorBottom: [0.85, 0.76, 0.55],
    accentHex: '#d9c28c',
    description: 'Reveals nearest 26.3 Dappled Forest & Abandoned Camp coordinates.',
  },
  // TaCZ (Timeless and Classics Zero) Tactical Firearms & Gun Smith Table
  {
    numericId: 270,
    id: 'tacz:m4a1',
    name: 'TaCZ M4A1 Carbine (5.56mm)',
    modId: 'tacz',
    modName: 'TaCZ: Timeless and Classics Zero',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.22, 0.25, 0.30],
    colorSide: [0.84, 0.64, 0.32],
    colorBottom: [0.16, 0.18, 0.22],
    accentHex: '#d4a359',
    description: '800 RPM Tactical Carbine. Left-click: Fire, Right-click: Holo Sight ADS, [T]: Reload.',
  },
  {
    numericId: 271,
    id: 'tacz:ai_awp',
    name: 'TaCZ AI-AWP Magnum Sniper',
    modId: 'tacz',
    modName: 'TaCZ: Timeless and Classics Zero',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.20, 0.34, 0.22],
    colorSide: [0.18, 0.30, 0.20],
    colorBottom: [0.12, 0.14, 0.16],
    accentHex: '#3b6e44',
    description: '.338 Lapua Bolt-Action Sniper Rifle with 8x Mil-Dot Scope ADS (Right-click).',
  },
  {
    numericId: 272,
    id: 'tacz:rpg7',
    name: 'TaCZ RPG-7 Warhead Launcher',
    modId: 'tacz',
    modName: 'TaCZ: Timeless and Classics Zero',
    category: 'explosives',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.46, 0.30, 0.18],
    colorSide: [0.36, 0.24, 0.14],
    colorBottom: [0.22, 0.24, 0.26],
    accentHex: '#8c5832',
    tntRadius: 6,
    description: 'Fires PG-7V high-explosive anti-tank rockets that carve 3D craters on impact.',
  },
  {
    numericId: 273,
    id: 'tacz:deagle_golden',
    name: 'TaCZ Golden Desert Eagle .50 AE',
    modId: 'tacz',
    modName: 'TaCZ: Timeless and Classics Zero',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.94, 0.76, 0.22],
    colorSide: [0.86, 0.68, 0.18],
    colorBottom: [0.20, 0.22, 0.25],
    accentHex: '#f0c238',
    description: '.50 Action Express heavy semi-auto pistol with high stopping power.',
  },
  {
    numericId: 274,
    id: 'tacz:gun_smith_table',
    name: 'TaCZ Gun Smith Table',
    modId: 'tacz',
    modName: 'TaCZ: Timeless and Classics Zero',
    category: 'utility',
    hardness: 2.5,
    blastResistance: 6.0,
    properTool: 'pickaxe',
    opaque: true,
    lightLevel: 4,
    colorTop: [0.24, 0.32, 0.42],
    colorSide: [0.34, 0.40, 0.48],
    colorBottom: [0.18, 0.20, 0.24],
    accentHex: '#466280',
    description: 'Craft & customize TaCZ firearms, optics, suppressors, and ammunition.',
  },
  {
    numericId: 275,
    id: 'do_a_barrel_roll:flight_thruster',
    name: 'Do a Barrel Roll Elytra Wing [G]',
    modId: 'do_a_barrel_roll',
    modName: 'Do a Barrel Roll (Fabric)',
    category: 'tools',
    hardness: 0,
    blastResistance: 0,
    properTool: 'any',
    opaque: false,
    isItemOnly: true,
    lightLevel: 0,
    colorTop: [0.24, 0.74, 0.96],
    colorSide: [0.18, 0.62, 0.88],
    colorBottom: [0.12, 0.48, 0.72],
    accentHex: '#38bdf8',
    description: 'Right-click or press [G] to toggle 6-DOF Aircraft Roll/Pitch/Yaw Flight & [Z]/[X] 360° Barrel Roll!',
  },
];

export const CRAFTING_RECIPES_26_3: CraftingRecipe[] = [
  {
    id: 'vanilla_26_3:poplar_planks',
    resultId: 'minecraft:poplar_planks',
    resultCount: 4,
    pattern: ['L'],
    key: { L: 'minecraft:poplar_log' },
    modName: 'Wilderness Bound 26.3',
  },
  {
    id: 'vanilla_26_3:straw_bed',
    resultId: 'minecraft:straw_bed',
    resultCount: 1,
    pattern: ['SSS', 'PPP'],
    key: { S: 'minecraft:dappled_grass', P: 'minecraft:poplar_planks' },
    modName: 'Wilderness Bound 26.3',
  },
  {
    id: 'vanilla_26_3:cushion_amber',
    resultId: 'minecraft:cushion_amber',
    resultCount: 2,
    pattern: ['LL', 'PP'],
    key: { L: 'minecraft:poplar_leaves_orange', P: 'minecraft:poplar_planks' },
    modName: 'Wilderness Bound 26.3',
  },
  {
    id: 'megatnt:craft_tnt_5x',
    resultId: 'megatnt:tnt_5x',
    resultCount: 1,
    pattern: ['TGT', 'GTG', 'TGT'],
    key: { T: 'minecraft:tnt', G: 'minecraft:sand' },
    modName: 'Mega TNT Pack',
  },
  {
    id: 'megatnt:craft_tnt_10x',
    resultId: 'megatnt:tnt_10x',
    resultCount: 1,
    pattern: ['R5R', '5R5', 'R5R'],
    key: { '5': 'megatnt:tnt_5x', R: 'minecraft:redstone_block' },
    modName: 'Mega TNT Pack',
  },
  {
    id: 'megatnt:craft_tnt_50x',
    resultId: 'megatnt:tnt_50x',
    resultCount: 1,
    pattern: ['XRX', 'RXR', 'XRX'],
    key: { X: 'megatnt:tnt_10x', R: 'minecraft:redstone_block' },
    modName: 'Mega TNT Pack',
  },
  {
    id: 'megatnt:craft_tnt_100x',
    resultId: 'megatnt:tnt_100x',
    resultCount: 1,
    pattern: ['F5F', '5F5', 'F5F'],
    key: { F: 'megatnt:tnt_50x', '5': 'megatnt:tnt_5x' },
    modName: 'Mega TNT Pack',
  },
  {
    id: 'megatnt:craft_blast_igniter',
    resultId: 'megatnt:blast_igniter',
    resultCount: 1,
    pattern: [' R', 'S '],
    key: { R: 'minecraft:redstone_block', S: 'minecraft:stone' },
    modName: 'Mega TNT Pack',
  },
  {
    id: 'tacz:craft_m4a1',
    resultId: 'tacz:m4a1',
    resultCount: 1,
    pattern: ['SSS', 'GR ', 'P  '],
    key: { S: 'minecraft:stone', G: 'minecraft:gold_ore', R: 'minecraft:redstone_block', P: 'minecraft:poplar_planks' },
    modName: 'TaCZ: Timeless and Classics Zero',
  },
  {
    id: 'tacz:craft_ai_awp',
    resultId: 'tacz:ai_awp',
    resultCount: 1,
    pattern: ['GGG', 'SR ', 'P  '],
    key: { G: 'minecraft:gold_ore', S: 'minecraft:stone', R: 'minecraft:redstone_block', P: 'minecraft:poplar_planks' },
    modName: 'TaCZ: Timeless and Classics Zero',
  },
  {
    id: 'tacz:craft_rpg7',
    resultId: 'tacz:rpg7',
    resultCount: 1,
    pattern: ['TTT', 'SR ', 'P  '],
    key: { T: 'megatnt:tnt_5x', S: 'minecraft:stone', R: 'minecraft:redstone_block', P: 'minecraft:poplar_planks' },
    modName: 'TaCZ: Timeless and Classics Zero',
  },
];

/**
 * 16-bit Palette-Compressed SubChunk (16x16x16 = 4096 voxels).
 * When all blocks in a subchunk share 1 ID (e.g. Air), `indices` is null (0 bytes allocated).
 */
export class PaletteSubChunk {
  palette: number[] = [0];
  indices: Uint16Array | null = null;
  nonAirCount = 0;

  get(lx: number, sy: number, lz: number): number {
    if (!this.indices || this.palette.length === 1) {
      return this.palette[0];
    }
    const idx = (sy << 8) | (lz << 4) | lx;
    return this.palette[this.indices[idx]] ?? 0;
  }

  set(lx: number, sy: number, lz: number, blockId: number): void {
    const prev = this.get(lx, sy, lz);
    if (prev === blockId) return;

    if (prev === 0 && blockId !== 0) this.nonAirCount++;
    else if (prev !== 0 && blockId === 0) this.nonAirCount = Math.max(0, this.nonAirCount - 1);

    let pIdx = this.palette.indexOf(blockId);
    if (pIdx === -1) {
      pIdx = this.palette.length;
      this.palette.push(blockId);
      if (!this.indices && this.palette.length > 1) {
        this.indices = new Uint16Array(SUBCHUNK_VOLUME);
      }
    }
    if (this.indices) {
      const idx = (sy << 8) | (lz << 4) | lx;
      this.indices[idx] = pIdx;
    }
  }
}

export class ChunkColumn {
  readonly cx: number;
  readonly cz: number;
  readonly subchunks: PaletteSubChunk[];
  readonly biomes: Uint8Array;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.subchunks = Array.from({ length: SUBCHUNK_COUNT }, () => new PaletteSubChunk());
    this.biomes = new Uint8Array(256);
  }

  getBlock(lx: number, ly: number, lz: number): number {
    if (ly < 0 || ly >= CHUNK_HEIGHT) return 0;
    return this.subchunks[ly >> 4].get(lx, ly & 15, lz);
  }

  setBlock(lx: number, ly: number, lz: number, blockId: number): void {
    if (ly < 0 || ly >= CHUNK_HEIGHT) return;
    this.subchunks[ly >> 4].set(lx, ly & 15, lz, blockId);
  }
}

export interface ChunkMeshResult {
  opaquePositions: Float32Array;
  opaqueNormals: Float32Array;
  opaqueColors: Float32Array;
  opaqueUvs: Float32Array;
  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterColors: Float32Array;
}

interface ExplosionSliceJob {
  originX: number;
  originY: number;
  originZ: number;
  radius: number;
  curDx: number;
  curDy: number;
  curDz: number;
  destroyedBlocks: number;
}

export interface UndoEntry {
  changes: Array<{ x: number; y: number; z: number; prevId: number; nextId: number }>;
}

const FACE_TABLE: Array<{
  dx: number;
  dy: number;
  dz: number;
  shade: number;
  corners: [number, number, number][];
  uvs: [number, number][];
}> = [
  {
    dx: 0,
    dy: 1,
    dz: 0,
    shade: 1.0,
    corners: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    dx: 0,
    dy: -1,
    dz: 0,
    shade: 0.55,
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  {
    dx: 1,
    dy: 0,
    dz: 0,
    shade: 0.84,
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    dx: -1,
    dy: 0,
    dz: 0,
    shade: 0.80,
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  },
  {
    dx: 0,
    dy: 0,
    dz: 1,
    shade: 0.90,
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  {
    dx: 0,
    dy: 0,
    dz: -1,
    shade: 0.74,
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
];

export class VoxelEngineCore {
  seed: number;
  worldType: WorldTypeId;
  dimension: DimensionId = 'minecraft:overworld';
  biomeBlendSize: number; // 1, 3, 5, 7, 9, 11, 13, 15
  readonly blocksByNum = new Map<number, BlockDefinition>();
  readonly blocksById = new Map<string, BlockDefinition>();
  readonly chunks = new Map<string, ChunkColumn>();
  readonly meshes = new Map<string, ChunkMeshResult>();
  readonly explosionQueue: ExplosionSliceJob[] = [];
  readonly sliceBudgetPerTick = 4096;
  readonly recipes: CraftingRecipe[] = CRAFTING_RECIPES_26_3;
  oneBlockBrokenCount = 0;
  oneBlockPhaseName = 'Phase 1: Dappled Wilderness';
  readonly undoStack: UndoEntry[] = [];
  readonly redoStack: UndoEntry[] = [];
  private nextCustomNumericId = 120;

  constructor(seed = 26032026, worldType: WorldTypeId = 'normal', biomeBlendSize = 5) {
    this.seed = seed >>> 0;
    this.worldType = worldType;
    this.biomeBlendSize = biomeBlendSize;
    for (const def of INITIAL_BLOCKS_26_3) {
      this.registerBlock(def);
    }
  }

  registerBlock(def: BlockDefinition): number {
    this.blocksByNum.set(def.numericId, def);
    this.blocksById.set(def.id, def);
    return def.numericId;
  }

  registerCustomModJson(rawJson: string): BlockDefinition {
    const parsed = JSON.parse(rawJson);
    if (!parsed.id || typeof parsed.id !== 'string' || !parsed.id.includes(':')) {
      throw new Error('Block ID must be in namespace:name format (e.g. mymod:ruby_block)');
    }
    const existing = this.blocksById.get(parsed.id);
    const numericId =
      existing?.numericId ??
      (typeof parsed.numeric_id === 'number' ? parsed.numeric_id : this.nextCustomNumericId++);
    const hex: string = parsed.color || parsed.textures?.top || '#ff6d00';
    const rgb = Array.isArray(parsed.colorTop) ? parsed.colorTop : this.hexToRgb(hex);
    const rgbSide = Array.isArray(parsed.colorSide)
      ? parsed.colorSide
      : ([rgb[0] * 0.88, rgb[1] * 0.88, rgb[2] * 0.88] as [number, number, number]);
    const rgbBottom = Array.isArray(parsed.colorBottom)
      ? parsed.colorBottom
      : ([rgb[0] * 0.72, rgb[1] * 0.72, rgb[2] * 0.72] as [number, number, number]);
    const accentHex =
      parsed.color ||
      `#${Math.round(rgb[0] * 255)
        .toString(16)
        .padStart(2, '0')}${Math.round(rgb[1] * 255)
        .toString(16)
        .padStart(2, '0')}${Math.round(rgb[2] * 255)
        .toString(16)
        .padStart(2, '0')}`;
    const def: BlockDefinition = {
      numericId,
      id: parsed.id,
      name: parsed.name || parsed.id,
      modId: parsed.mod_id || parsed.id.split(':')[0],
      modName: parsed.mod_name || parsed.modSource || 'User Custom Mod',
      category: parsed.tnt_properties ? 'explosives' : 'building',
      hardness: typeof parsed.hardness === 'number' ? parsed.hardness : 1.2,
      blastResistance: typeof parsed.blast_resistance === 'number' ? parsed.blast_resistance : 4.0,
      properTool: parsed.proper_tool || parsed.tool || 'pickaxe',
      opaque: parsed.transparent ? false : parsed.opaque !== false,
      lightLevel: typeof parsed.light_level === 'number' ? parsed.light_level : 0,
      colorTop: rgb,
      colorSide: rgbSide,
      colorBottom: rgbBottom,
      accentHex,
      tntRadius: parsed.tnt_properties?.blast_radius,
      tntFuseTicks: parsed.tnt_properties?.fuse_ticks,
      description: parsed.description || 'Registered dynamically via VoxelCraft 26.3 Mod API.',
    };
    this.registerBlock(def);
    return def;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 6 ? clean : 'ff8800', 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  static chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  /**
   * 4GB RAM Requirement: Switching dimensions immediately frees all previous dimension chunks & meshes.
   */
  switchDimension(newDim: DimensionId): void {
    if (this.dimension !== newDim) {
      this.chunks.clear();
      this.meshes.clear();
      this.explosionQueue.length = 0;
      this.dimension = newDim;
    }
  }

  /**
   * Title Screen 4GB RAM Requirement: Release all chunks when returning to title screen.
   */
  releaseAllMemory(): void {
    this.chunks.clear();
    this.meshes.clear();
    this.explosionQueue.length = 0;
  }

  private hash2d(x: number, z: number): number {
    let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + this.seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  valueNoise(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const u = fx * fx * (3 - 2 * fx);
    const v = fz * fz * (3 - 2 * fz);
    const a = this.hash2d(ix, iz);
    const b = this.hash2d(ix + 1, iz);
    const c = this.hash2d(ix, iz + 1);
    const d = this.hash2d(ix + 1, iz + 1);
    const ab = a + (b - a) * u;
    const cd = c + (d - c) * u;
    return ab + (cd - ab) * v;
  }

  fbm(x: number, z: number, octaves = 4): number {
    let total = 0;
    let freq = 1;
    let amp = 1;
    let maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.valueNoise(x * freq, z * freq) * amp;
      maxVal += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return total / maxVal;
  }

  /**
   * 0 = Plains, 1 = Forest, 2 = Dappled Forest (26.3 Wilderness Bound), 3 = Snowy Peaks
   */
  sampleBiome(wx: number, wz: number): number {
    const v = this.fbm(wx * 0.012, wz * 0.012, 3);
    if (v < 0.30) return 0;
    if (v < 0.48) return 1;
    if (v < 0.80) return 2; // 26.3 Dappled Forest prominent near spawn
    return 3;
  }

  getBiomeName(biomeId: number): string {
    switch (biomeId) {
      case 0:
        return 'Plains';
      case 1:
        return 'Oak Forest';
      case 2:
        return 'Dappled Forest (26.3)';
      default:
        return 'Alpine Peaks';
    }
  }

  private rawBiomeGrassColor(biome: number): [number, number, number] {
    switch (biome) {
      case 0:
        return [0.43, 0.74, 0.31];
      case 1:
        return [0.30, 0.65, 0.25];
      case 2:
        return [0.87, 0.54, 0.20]; // 26.3 Dappled Forest vibrant autumn gold-orange
      default:
        return [0.50, 0.72, 0.63];
    }
  }

  blendedGrassColor(wx: number, wz: number): [number, number, number] {
    const r = Math.min(3, Math.floor(this.biomeBlendSize / 2));
    if (r <= 0) return this.rawBiomeGrassColor(this.sampleBiome(wx, wz));
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let count = 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const c = this.rawBiomeGrassColor(this.sampleBiome(wx + dx * 3, wz + dz * 3));
        sr += c[0];
        sg += c[1];
        sb += c[2];
        count++;
      }
    }
    return [sr / count, sg / count, sb / count];
  }

  smoothLightingEnabled = true;

  computeSurfaceY(wx: number, wz: number): number {
    if (this.dimension === 'minecraft:the_nether') {
      return 56 + Math.floor(this.fbm(wx * 0.03, wz * 0.03, 3) * 14);
    }
    if (this.dimension === 'minecraft:the_end') {
      const dist = Math.hypot(wx, wz);
      return dist < 44 ? 64 + Math.floor(this.fbm(wx * 0.04, wz * 0.04, 2) * 5) : 0;
    }

    switch (this.worldType) {
      case 'flat':
        return 64;
      case 'normal': {
        // Multi-octave Continentalness + Erosion + Peaks & Valleys (PV) spline terrain
        const continental = this.fbm(wx * 0.0085, wz * 0.0085, 4);
        const erosion = this.fbm(wx * 0.021 + 31.7, wz * 0.021 + 19.3, 3);
        const detail = this.fbm(wx * 0.048, wz * 0.048, 3);
        const pvRidge = 1.0 - Math.abs(this.valueNoise(wx * 0.014, wz * 0.014) * 2.0 - 1.0);
        // Carve natural river channels where pvRidge is very low and continentalness is moderate
        const riverChannel = Math.max(0, 0.24 - pvRidge) * 24.0;
        const mountainFactor = Math.max(0, continental - 0.52) * Math.max(0.2, 1.15 - erosion) * 68.0;
        const baseHills = (continental - 0.36) * 24.0 + (detail - 0.5) * 7.5 + pvRidge * 6.5;
        return Math.max(54, Math.min(148, Math.floor(62 + baseHills + mountainFactor - riverChannel)));
      }
      case 'amplified': {
        const n = this.fbm(wx * 0.022, wz * 0.022, 5);
        const ridge = Math.pow(Math.max(0, n * 1.85 - 0.42), 1.55);
        return Math.min(260, 62 + Math.floor(ridge * 115));
      }
      case 'jj_thunder': {
        // Extreme mountain ridges climbing toward Y=319 + deep dramatic valleys
        const macro = this.fbm(wx * 0.008, wz * 0.008, 5);
        const detail = this.fbm(wx * 0.032, wz * 0.032, 4);
        const spire = Math.pow(Math.max(0, macro * 1.75 - 0.3), 1.7) * 195 + (detail - 0.5) * 32;
        return Math.max(48, Math.min(312, Math.floor(62 + spire)));
      }
      case 'skyblock':
      case 'skyblock_lucky':
      case 'oneblock':
        return 64;
    }
  }

  generateChunk(cx: number, cz: number): ChunkColumn {
    const key = VoxelEngineCore.chunkKey(cx, cz);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const chunk = new ChunkColumn(cx, cz);

    if (this.dimension === 'minecraft:the_nether') {
      for (let lx = 0; lx < 16; lx++) {
        for (let lz = 0; lz < 16; lz++) {
          const wx = cx * 16 + lx;
          const wz = cz * 16 + lz;
          const surfY = this.computeSurfaceY(wx, wz);
          chunk.setBlock(lx, 0, lz, 5);
          for (let wy = 45; wy <= surfY; wy++) {
            chunk.setBlock(lx, wy - MIN_Y, lz, wy === surfY && (wx + wz) % 19 === 0 ? 60 : 33);
          }
        }
      }
      this.chunks.set(key, chunk);
      return chunk;
    }

    if (this.dimension === 'minecraft:the_end') {
      for (let lx = 0; lx < 16; lx++) {
        for (let lz = 0; lz < 16; lz++) {
          const wx = cx * 16 + lx;
          const wz = cz * 16 + lz;
          const surfY = this.computeSurfaceY(wx, wz);
          if (surfY > 0) {
            for (let wy = 54; wy <= surfY; wy++) {
              chunk.setBlock(lx, wy - MIN_Y, lz, 34);
            }
          }
        }
      }
      this.chunks.set(key, chunk);
      return chunk;
    }

    if (this.worldType === 'oneblock') {
      if (cx === 0 && cz === 0) {
        chunk.setBlock(0, 64 - MIN_Y, 0, 2); // Single Infinite OneBlock at (0, 64, 0)
      }
      this.chunks.set(key, chunk);
      return chunk;
    }

    if (this.worldType === 'skyblock' || this.worldType === 'skyblock_lucky') {
      this.populateSkyBlockChunk(chunk, cx, cz);
      this.chunks.set(key, chunk);
      return chunk;
    }

    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        const wx = cx * 16 + lx;
        const wz = cz * 16 + lz;
        const biome = this.sampleBiome(wx, wz);
        chunk.biomes[lz * 16 + lx] = biome;

        const surfY = this.computeSurfaceY(wx, wz);
        // Compute local terrain slope for authentic exposed stone/cobblestone cliff faces
        const hNorth = this.computeSurfaceY(wx, wz - 1);
        const hEast = this.computeSurfaceY(wx + 1, wz);
        const slope = Math.max(Math.abs(surfY - hNorth), Math.abs(surfY - hEast));

        chunk.setBlock(lx, 0, lz, 5); // Bedrock at Y=-64

        const minFillY = Math.max(MIN_Y + 1, surfY - 14);
        for (let wy = minFillY; wy <= surfY; wy++) {
          const ly = wy - MIN_Y;
          let blockId = 1; // Stone
          if (wy === surfY) {
            if (this.worldType !== 'flat' && wy <= 62) {
              blockId = 7; // Sand beach & riverbeds
            } else if (wy >= 112) {
              blockId = slope >= 3 ? 1 : 10; // Exposed cliff stone or Alpine snow peak
            } else if (this.worldType !== 'flat' && slope >= 3 && wy >= 70) {
              blockId = (wx + wy + wz) % 4 === 0 ? 4 : 1; // Exposed rocky cliff face
            } else if (biome === 2) {
              blockId = 20; // 26.3 Dappled Forest Grass
            } else {
              blockId = 2; // Standard Grass
            }
          } else if (wy >= surfY - 3) {
            blockId = slope >= 3 ? 1 : wy <= 62 ? 7 : 3; // Stone under cliffs, Sand under beaches, Dirt under grass
          } else {
            // Subsurface ore veins (Gold Ore 31, Redstone 35)
            const oreHash = ((wx * 73856093) ^ (wy * 19349663) ^ (wz * 83492791)) >>> 0;
            if (oreHash % 97 === 0) blockId = 31;
            else if (oreHash % 131 === 0) blockId = 35;
          }
          chunk.setBlock(lx, ly, lz, blockId);
        }

        // Fill ocean/river/lake water up to Y=62
        if (this.worldType !== 'flat' && surfY < 62) {
          for (let wy = surfY + 1; wy <= 62; wy++) {
            chunk.setBlock(lx, wy - MIN_Y, lz, 6);
          }
        }

        // Authentic Trees, Poplar Groves, Boulders & Wild Shrubs in Dappled Forest / Forest
        if (
          this.worldType !== 'flat' &&
          surfY > 62 &&
          surfY < 108 &&
          slope <= 2 &&
          lx >= 2 &&
          lx <= 13 &&
          lz >= 2 &&
          lz <= 13
        ) {
          // Keep a clear spawn path near (0, z) so player never spawns facing a wall
          if (Math.abs(wx) > 4 || Math.abs(wz) > 6) {
            const treeRng = this.hash2d(wx * 3, wz * 3);
            if (treeRng > 0.968) {
              this.placeTree(chunk, lx, surfY + 1, lz, biome === 2);
            } else if (biome === 2 && treeRng > 0.942 && treeRng <= 0.954) {
              chunk.setBlock(lx, surfY + 1 - MIN_Y, lz, 26); // Red Shrub
            } else if (treeRng > 0.935 && treeRng <= 0.938) {
              // Mossy forest boulder
              chunk.setBlock(lx, surfY + 1 - MIN_Y, lz, 4);
            }
          }
        }
      }
    }

    // Generate 26.3 "Abandoned Camp" + TaCZ Gun Smith Station in chunk (0, -1) right in front of spawn vista!
    if (cx === 0 && cz === -1 && this.worldType !== 'flat') {
      const campX = 8;
      const campZ = 6;
      const campY = this.computeSurfaceY(campX, -16 + campZ);
      if (campY >= 62) {
        // Fallen Poplar log bench
        for (let dx = -2; dx <= 1; dx++) {
          chunk.setBlock(campX + dx, campY + 1 - MIN_Y, campZ, 21);
        }
        // Bracket fungus on fallen log
        chunk.setBlock(campX - 2, campY + 2 - MIN_Y, campZ, 27);
        // Straw Bed + Amber Cushion + Camp Chest + TaCZ Gun Smith Table (274) + Demo Mega TNT x5
        chunk.setBlock(campX + 2, campY + 1 - MIN_Y, campZ + 1, 28);
        chunk.setBlock(campX + 1, campY + 1 - MIN_Y, campZ + 2, 29);
        chunk.setBlock(campX - 1, campY + 1 - MIN_Y, campZ + 2, 32);
        chunk.setBlock(campX - 2, campY + 1 - MIN_Y, campZ + 2, 274); // TaCZ Gun Smith Table
        chunk.setBlock(campX + 3, campY + 1 - MIN_Y, campZ - 1, 60); // TNT x5 ready to test!
      }
    }

    this.chunks.set(key, chunk);
    return chunk;
  }

  private placeTree(chunk: ChunkColumn, lx: number, baseWy: number, lz: number, isPoplar: boolean): void {
    const logId = isPoplar ? 21 : 8;
    const leafId = isPoplar ? [23, 24, 25][(lx + lz) % 3] : 9;
    const trunkH = isPoplar ? 6 + ((lx + lz) % 2) : 5;

    for (let h = 0; h < trunkH; h++) {
      chunk.setBlock(lx, baseWy + h - MIN_Y, lz, logId);
    }
    if (isPoplar) {
      chunk.setBlock(lx + 1, baseWy + 1 - MIN_Y, lz, 27); // Bracket fungus on Poplar trunk
    }

    // Fuller multi-layered Minecraft tree crown with rounded corner culling
    for (let dy = trunkH - 3; dy <= trunkH + 1; dy++) {
      const isTopCrown = dy >= trunkH;
      const rad = isTopCrown ? 1 : 2;
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dz = -rad; dz <= rad; dz++) {
          if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && (dy === trunkH - 3 || dy === trunkH - 1)) {
            continue;
          }
          if (isTopCrown && dy === trunkH + 1 && Math.abs(dx) === 1 && Math.abs(dz) === 1) {
            continue;
          }
          if (dx === 0 && dz === 0 && dy < trunkH) continue;
          const tx = lx + dx;
          const tz = lz + dz;
          if (tx >= 0 && tx < 16 && tz >= 0 && tz < 16) {
            chunk.setBlock(tx, baseWy + dy - MIN_Y, tz, leafId);
          }
        }
      }
    }
  }

  private populateSkyBlockChunk(chunk: ChunkColumn, cx: number, cz: number): void {
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        const wx = cx * 16 + lx;
        const wz = cz * 16 + lz;
        // L-shaped starter island at (-3..3, 62..64, -3..3)
        const inL = wx >= -3 && wx <= 3 && wz >= -3 && wz <= 3 && !(wx > 0 && wz > 0);
        if (inL) {
          chunk.setBlock(lx, 62 - MIN_Y, lz, 5);
          chunk.setBlock(lx, 63 - MIN_Y, lz, 3);
          chunk.setBlock(lx, 64 - MIN_Y, lz, 2);
        }
        // Starter Chest & Poplar Tree on SkyBlock
        if (wx === -2 && wz === -2) {
          this.placeTree(chunk, lx, 65, lz, true);
        }
        if (wx === 2 && wz === -1) {
          chunk.setBlock(lx, 65 - MIN_Y, lz, 32); // Starter Chest
        }
        // Secondary Sand + Mega TNT island
        if (wx >= -2 && wx <= 2 && wz >= -18 && wz <= -14) {
          chunk.setBlock(lx, 63 - MIN_Y, lz, 7);
          chunk.setBlock(lx, 64 - MIN_Y, lz, 7);
          if (wx === 0 && wz === -16) {
            chunk.setBlock(lx, 65 - MIN_Y, lz, 30); // Lucky block
          }
        }
        // Floating Lucky Blocks in SKY BLOCK (Lucky Block) mode
        if (
          this.worldType === 'skyblock_lucky' &&
          ((wx % 8) + 8) % 8 === 0 &&
          ((wz % 8) + 8) % 8 === 0 &&
          (wx !== 0 || wz !== 0)
        ) {
          chunk.setBlock(lx, 65 - MIN_Y, lz, 30);
        }
      }
    }
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < MIN_Y || wy > MAX_Y) return 0;
    const cx = Math.floor(wx / 16);
    const cz = Math.floor(wz / 16);
    const chunk = this.chunks.get(VoxelEngineCore.chunkKey(cx, cz));
    if (!chunk) return 0;
    const lx = ((wx % 16) + 16) % 16;
    const lz = ((wz % 16) + 16) % 16;
    return chunk.getBlock(lx, wy - MIN_Y, lz);
  }

  setBlock(wx: number, wy: number, wz: number, blockId: number, rebuildMesh = true): Set<string> {
    const dirty = new Set<string>();
    if (wy < MIN_Y || wy > MAX_Y) return dirty;
    const cx = Math.floor(wx / 16);
    const cz = Math.floor(wz / 16);
    const key = VoxelEngineCore.chunkKey(cx, cz);
    const chunk = this.chunks.get(key) ?? this.generateChunk(cx, cz);
    const lx = ((wx % 16) + 16) % 16;
    const lz = ((wz % 16) + 16) % 16;

    chunk.setBlock(lx, wy - MIN_Y, lz, blockId);
    dirty.add(key);

    // One Block infinite progression at (0, 64, 0)
    if (this.worldType === 'oneblock' && wx === 0 && wy === 64 && wz === 0 && blockId === 0) {
      this.oneBlockBrokenCount++;
      const nextId = this.getNextOneBlockId(this.oneBlockBrokenCount);
      chunk.setBlock(lx, wy - MIN_Y, lz, nextId);
    }

    if (rebuildMesh) {
      this.buildChunkMesh(cx, cz);
    }
    return dirty;
  }

  private getNextOneBlockId(brokenCount: number): number {
    const phase = Math.floor(brokenCount / 10) % 5;
    const phaseNames = [
      'Phase 1: Dappled Wilderness',
      'Phase 2: Deep Stone Caverns',
      'Phase 3: Alpine Peaks & Autumn',
      'Phase 4: Nether & Mega TNT',
      'Phase 5: The End & Lucky Blocks',
    ];
    this.oneBlockPhaseName = phaseNames[phase];
    const pools = [
      [20, 21, 22, 2, 32],
      [1, 4, 31, 30, 35],
      [10, 23, 24, 28, 29],
      [33, 60, 61, 35, 30],
      [34, 62, 30, 32, 21],
    ];
    return pools[phase][brokenCount % 5];
  }

  private isAoOccluderFast(chunk: ChunkColumn, lx: number, ly: number, lz: number, wx: number, wy: number, wz: number): number {
    let id = 0;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && ly >= 0 && ly < CHUNK_HEIGHT) {
      id = chunk.getBlock(lx, ly, lz);
    } else if (ly >= 0 && ly < CHUNK_HEIGHT) {
      id = this.getBlock(wx, wy, wz);
    }
    return id !== 0 && id !== 6 ? 1 : 0;
  }

  /**
   * Computes authentic 4-level Minecraft Per-Vertex Ambient Occlusion (Smooth Lighting) for a corner `c` on face `f`.
   */
  private computeCornerAO(
    chunk: ChunkColumn,
    lx: number,
    ly: number,
    lz: number,
    wx: number,
    wy: number,
    wz: number,
    f: number,
    c: [number, number, number]
  ): number {
    if (!this.smoothLightingEnabled) return 1.0;
    const sx = c[0] === 1 ? 1 : -1;
    const sy = c[1] === 1 ? 1 : -1;
    const sz = c[2] === 1 ? 1 : -1;

    let s1 = 0;
    let s2 = 0;
    let corner = 0;
    if (f === 0 || f === 1) {
      const dy = f === 0 ? 1 : -1;
      s1 = this.isAoOccluderFast(chunk, lx + sx, ly + dy, lz, wx + sx, wy + dy, wz);
      s2 = this.isAoOccluderFast(chunk, lx, ly + dy, lz + sz, wx, wy + dy, wz + sz);
      corner = s1 && s2 ? 1 : this.isAoOccluderFast(chunk, lx + sx, ly + dy, lz + sz, wx + sx, wy + dy, wz + sz);
    } else if (f === 2 || f === 3) {
      const dx = f === 2 ? 1 : -1;
      s1 = this.isAoOccluderFast(chunk, lx + dx, ly + sy, lz, wx + dx, wy + sy, wz);
      s2 = this.isAoOccluderFast(chunk, lx + dx, ly, lz + sz, wx + dx, wy, wz + sz);
      corner = s1 && s2 ? 1 : this.isAoOccluderFast(chunk, lx + dx, ly + sy, lz + sz, wx + dx, wy + sy, wz + sz);
    } else {
      const dz = f === 4 ? 1 : -1;
      s1 = this.isAoOccluderFast(chunk, lx + sx, ly, lz + dz, wx + sx, wy, wz + dz);
      s2 = this.isAoOccluderFast(chunk, lx, ly + sy, lz + dz, wx, wy + sy, wz + dz);
      corner = s1 && s2 ? 1 : this.isAoOccluderFast(chunk, lx + sx, ly + sy, lz + dz, wx + sx, wy + sy, wz + dz);
    }
    const occ = s1 + s2 + corner; // 0..3
    return 1.0 - occ * 0.145;
  }

  /**
   * Builds separated Opaque and Water Float32Array geometry buffers with Sodium-style Face Culling,
   * 4-level Per-Vertex Ambient Occlusion (Smooth Lighting), and Biome Blend.
   */
  buildChunkMesh(cx: number, cz: number): ChunkMeshResult {
    const key = VoxelEngineCore.chunkKey(cx, cz);
    const chunk = this.chunks.get(key) ?? this.generateChunk(cx, cz);

    const oPos: number[] = [];
    const oNorm: number[] = [];
    const oCol: number[] = [];
    const oUv: number[] = [];

    const wPos: number[] = [];
    const wNorm: number[] = [];
    const wCol: number[] = [];

    for (let subIdx = 0; subIdx < SUBCHUNK_COUNT; subIdx++) {
      const sub = chunk.subchunks[subIdx];
      if (sub.nonAirCount === 0) continue;
      const baseLy = subIdx * 16;

      for (let sy = 0; sy < 16; sy++) {
        const ly = baseLy + sy;
        const wy = ly + MIN_Y;
        for (let lz = 0; lz < 16; lz++) {
          const wz = cz * 16 + lz;
          for (let lx = 0; lx < 16; lx++) {
            const blockId = sub.get(lx, sy, lz);
            if (blockId === 0) continue;
            const def = this.blocksByNum.get(blockId);
            if (!def || def.isItemOnly) continue;
            const wx = cx * 16 + lx;

            for (let f = 0; f < 6; f++) {
              const face = FACE_TABLE[f];
              const nx = lx + face.dx;
              const ny = ly + face.dy;
              const nz = lz + face.dz;

              let neighborId = 0;
              if (nx >= 0 && nx < 16 && nz >= 0 && nz < 16 && ny >= 0 && ny < CHUNK_HEIGHT) {
                neighborId = chunk.getBlock(nx, ny, nz);
              } else if (ny >= 0 && ny < CHUNK_HEIGHT) {
                neighborId = this.getBlock(wx + face.dx, wy + face.dy, wz + face.dz);
              }

              if (def.isLiquid) {
                // Only render top face of water unless exposed to air on side
                if (neighborId === blockId || (neighborId !== 0 && f !== 0)) continue;
              } else {
                const nDef = this.blocksByNum.get(neighborId);
                if (nDef && nDef.opaque && !nDef.isLiquid) continue;
              }

              let col = f === 0 ? def.colorTop : f === 1 ? def.colorBottom : def.colorSide;
              if ((blockId === 2 || blockId === 20) && f === 0) {
                col = this.blendedGrassColor(wx, wz);
              }

              const triOrder = [0, 1, 2, 0, 2, 3];
              // Subtle deterministic per-block brightness variation for visual depth
              const microShade = 0.96 + ((wx * 19 + wy * 31 + wz * 13) & 7) * 0.01;
              const baseR = col[0] * face.shade * microShade;
              const baseG = col[1] * face.shade * microShade;
              const baseB = col[2] * face.shade * microShade;

              if (def.isLiquid) {
                for (let i = 0; i < 6; i++) {
                  const ci = triOrder[i];
                  const c = face.corners[ci];
                  wPos.push(wx + c[0], wy + c[1] - 0.12, wz + c[2]);
                  wNorm.push(face.dx, face.dy, face.dz);
                  wCol.push(Math.min(1, baseR), Math.min(1, baseG), Math.min(1, baseB));
                }
              } else {
                // Precompute 4 corner Ambient Occlusion values for smooth lighting across the quad
                const cornerAos = [
                  this.computeCornerAO(chunk, lx, ly, lz, wx, wy, wz, f, face.corners[0]),
                  this.computeCornerAO(chunk, lx, ly, lz, wx, wy, wz, f, face.corners[1]),
                  this.computeCornerAO(chunk, lx, ly, lz, wx, wy, wz, f, face.corners[2]),
                  this.computeCornerAO(chunk, lx, ly, lz, wx, wy, wz, f, face.corners[3]),
                ];
                for (let i = 0; i < 6; i++) {
                  const ci = triOrder[i];
                  const c = face.corners[ci];
                  const uv = face.uvs[ci];
                  const ao = cornerAos[ci];
                  oPos.push(wx + c[0], wy + c[1], wz + c[2]);
                  oNorm.push(face.dx, face.dy, face.dz);
                  oCol.push(
                    Math.min(1, baseR * ao),
                    Math.min(1, baseG * ao),
                    Math.min(1, baseB * ao)
                  );
                  oUv.push(uv[0], uv[1]);
                }
              }
            }
          }
        }
      }
    }

    const result: ChunkMeshResult = {
      opaquePositions: new Float32Array(oPos),
      opaqueNormals: new Float32Array(oNorm),
      opaqueColors: new Float32Array(oCol),
      opaqueUvs: new Float32Array(oUv),
      waterPositions: new Float32Array(wPos),
      waterNormals: new Float32Array(wNorm),
      waterColors: new Float32Array(wCol),
    };
    this.meshes.set(key, result);
    return result;
  }

  /**
   * Queues a non-blocking time-sliced explosion (Mega TNT 5x/10x/50x/100x).
   */
  queueTimeSlicedExplosion(wx: number, wy: number, wz: number, radius: number): void {
    const r = Math.max(1, Math.min(28, Math.round(radius)));
    this.explosionQueue.push({
      originX: Math.round(wx),
      originY: Math.round(wy),
      originZ: Math.round(wz),
      radius: r,
      curDx: -r,
      curDy: -r,
      curDz: -r,
      destroyedBlocks: 0,
    });
  }

  /**
   * Advances active explosions up to `sliceBudgetPerTick` voxel checks per frame.
   * Returns list of dirty chunk keys and newly spawned debris coordinates.
   */
  stepExplosionSlice(): {
    dirtyChunkKeys: string[];
    debrisSpawns: Array<{ x: number; y: number; z: number; color: [number, number, number] }>;
  } {
    const dirtyChunks = new Set<string>();
    const debrisSpawns: Array<{ x: number; y: number; z: number; color: [number, number, number] }> = [];
    let budget = this.sliceBudgetPerTick;

    while (budget > 0 && this.explosionQueue.length > 0) {
      const job = this.explosionQueue[0];
      const r2 = job.radius * job.radius;

      while (budget > 0) {
        const d2 = job.curDx * job.curDx + job.curDy * job.curDy + job.curDz * job.curDz;
        if (d2 <= r2) {
          const wx = job.originX + job.curDx;
          const wy = job.originY + job.curDy;
          const wz = job.originZ + job.curDz;
          const blockId = this.getBlock(wx, wy, wz);
          if (blockId !== 0 && blockId !== 5) {
            const def = this.blocksByNum.get(blockId);
            if (!def || def.blastResistance < 1000) {
              // Chain-detonate if hitting another TNT
              if (def?.tntRadius && (job.curDx !== 0 || job.curDy !== 0 || job.curDz !== 0)) {
                this.queueTimeSlicedExplosion(wx, wy, wz, def.tntRadius);
              }
              this.setBlock(wx, wy, wz, 0, false).forEach((k) => dirtyChunks.add(k));
              job.destroyedBlocks++;
              if (debrisSpawns.length < 36 && (job.destroyedBlocks & 3) === 0 && def) {
                debrisSpawns.push({ x: wx + 0.5, y: wy + 0.5, z: wz + 0.5, color: def.colorTop });
              }
            }
          }
        }
        budget--;

        job.curDz++;
        if (job.curDz > job.radius) {
          job.curDz = -job.radius;
          job.curDy++;
          if (job.curDy > job.radius) {
            job.curDy = -job.radius;
            job.curDx++;
            if (job.curDx > job.radius) {
              this.explosionQueue.shift();
              break;
            }
          }
        }
      }
    }

    for (const key of dirtyChunks) {
      const [cx, cz] = key.split(',').map(Number);
      this.buildChunkMesh(cx, cz);
    }

    return { dirtyChunkKeys: Array.from(dirtyChunks), debrisSpawns };
  }

  /**
   * WorldEdit region operations (`//set`, `//replace`, `//walls`, `//sphere`, `//cyl`, `//undo`, `//redo`)
   */
  applyWorldEditBox(
    pos1: [number, number, number],
    pos2: [number, number, number],
    targetBlockId: number,
    mode: 'set' | 'walls' | 'replace',
    replaceFromId?: number
  ): { changedCount: number; dirtyChunks: string[] } {
    const minX = Math.min(pos1[0], pos2[0]);
    const maxX = Math.max(pos1[0], pos2[0]);
    const minY = Math.max(MIN_Y, Math.min(pos1[1], pos2[1]));
    const maxY = Math.min(MAX_Y, Math.max(pos1[1], pos2[1]));
    const minZ = Math.min(pos1[2], pos2[2]);
    const maxZ = Math.max(pos1[2], pos2[2]);

    const changes: UndoEntry['changes'] = [];
    const dirtyChunks = new Set<string>();

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (mode === 'walls' && x !== minX && x !== maxX && z !== minZ && z !== maxZ) {
            continue;
          }
          const prevId = this.getBlock(x, y, z);
          if (mode === 'replace' && replaceFromId !== undefined && prevId !== replaceFromId) {
            continue;
          }
          if (prevId !== targetBlockId) {
            changes.push({ x, y, z, prevId, nextId: targetBlockId });
            this.setBlock(x, y, z, targetBlockId, false).forEach((k) => dirtyChunks.add(k));
          }
        }
      }
    }

    if (changes.length > 0) {
      this.undoStack.push({ changes });
      this.redoStack.length = 0;
      for (const k of dirtyChunks) {
        const [cx, cz] = k.split(',').map(Number);
        this.buildChunkMesh(cx, cz);
      }
    }
    return { changedCount: changes.length, dirtyChunks: Array.from(dirtyChunks) };
  }

  applyWorldEditSphere(
    center: [number, number, number],
    radius: number,
    targetBlockId: number,
    cylinderHeight?: number
  ): { changedCount: number; dirtyChunks: string[] } {
    const r = Math.max(1, Math.min(12, Math.round(radius)));
    const changes: UndoEntry['changes'] = [];
    const dirtyChunks = new Set<string>();
    const [ox, oy, oz] = center.map(Math.round);
    const minDy = cylinderHeight ? 0 : -r;
    const maxDy = cylinderHeight ? Math.max(1, Math.min(20, cylinderHeight)) - 1 : r;

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = minDy; dy <= maxDy; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          const distSq = cylinderHeight ? dx * dx + dz * dz : dx * dx + dy * dy + dz * dz;
          if (distSq <= r * r) {
            const x = ox + dx;
            const y = oy + dy;
            const z = oz + dz;
            const prevId = this.getBlock(x, y, z);
            if (prevId !== targetBlockId) {
              changes.push({ x, y, z, prevId, nextId: targetBlockId });
              this.setBlock(x, y, z, targetBlockId, false).forEach((k) => dirtyChunks.add(k));
            }
          }
        }
      }
    }

    if (changes.length > 0) {
      this.undoStack.push({ changes });
      this.redoStack.length = 0;
      for (const k of dirtyChunks) {
        const [cx, cz] = k.split(',').map(Number);
        this.buildChunkMesh(cx, cz);
      }
    }
    return { changedCount: changes.length, dirtyChunks: Array.from(dirtyChunks) };
  }

  undoWorldEdit(): { restoredCount: number; dirtyChunks: string[] } {
    const entry = this.undoStack.pop();
    if (!entry) return { restoredCount: 0, dirtyChunks: [] };
    const dirtyChunks = new Set<string>();
    for (const c of entry.changes) {
      this.setBlock(c.x, c.y, c.z, c.prevId, false).forEach((k) => dirtyChunks.add(k));
    }
    this.redoStack.push(entry);
    for (const k of dirtyChunks) {
      const [cx, cz] = k.split(',').map(Number);
      this.buildChunkMesh(cx, cz);
    }
    return { restoredCount: entry.changes.length, dirtyChunks: Array.from(dirtyChunks) };
  }

  redoWorldEdit(): { reappliedCount: number; dirtyChunks: string[] } {
    const entry = this.redoStack.pop();
    if (!entry) return { reappliedCount: 0, dirtyChunks: [] };
    const dirtyChunks = new Set<string>();
    for (const c of entry.changes) {
      this.setBlock(c.x, c.y, c.z, c.nextId, false).forEach((k) => dirtyChunks.add(k));
    }
    this.undoStack.push(entry);
    for (const k of dirtyChunks) {
      const [cx, cz] = k.split(',').map(Number);
      this.buildChunkMesh(cx, cz);
    }
    return { reappliedCount: entry.changes.length, dirtyChunks: Array.from(dirtyChunks) };
  }
}

export const ALL_COMMANDS_26_3 = [
  '/give @s megatnt:tnt_5x 16',
  '/give @s megatnt:tnt_10x 8',
  '/give @s megatnt:tnt_50x 4',
  '/give @s megatnt:tnt_100x 1',
  '/give @s megatnt:blast_igniter 1',
  '/give @s minecraft:dappled_grass 64',
  '/give @s minecraft:poplar_log 64',
  '/give @s minecraft:straw_bed 16',
  '/give @s minecraft:cushion_amber 16',
  '/give @s minecraft:lucky_block 16',
  '/give @s worldedit:wooden_axe 1',
  '/setblock ~ ~ ~ megatnt:tnt_10x',
  '/fill ~-2 ~ ~-2 ~2 ~3 ~2 minecraft:poplar_planks',
  '/tp @s 0 80 0',
  '/gamemode creative',
  '/gamemode survival',
  '/gamemode spectator',
  '/time set day',
  '/time set noon',
  '/time set sunset',
  '/time set night',
  '/weather clear',
  '/weather rain',
  '/weather thunder',
  '/weather hailstorm',
  '/weather sandstorm',
  '/weather tornado_f1',
  '/weather tornado_f5',
  '/weather hurricane',
  '/weather meteor_shower',
  '/summon minecraft:zombie ~ ~1 ~',
  '/summon minecraft:sheep ~ ~1 ~',
  '/execute in minecraft:the_nether run tp @s 0 68 0',
  '/execute in minecraft:the_end run tp @s 0 70 0',
  '/execute in minecraft:overworld run tp @s 0 75 0',
  '/item replace entity @s hotbar.0 with megatnt:tnt_100x 4',
  '/data get block ~ ~-1 ~',
  '/compute explosion_slice_budget 4096',
  '/posteffect raytracing',
  '/posteffect pbr',
  '/posteffect normal',
  '//wand',
  '//set minecraft:poplar_planks',
  '//replace minecraft:grass_block minecraft:dappled_grass',
  '//walls minecraft:cobblestone',
  '//sphere megatnt:tnt_5x 4',
  '//cyl minecraft:poplar_log 3 6',
  '//undo',
  '//redo',
];

export function filterCommandAutocomplete(input: string, blockIds: string[]): string[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return [];
  const lower = trimmed.toLowerCase();
  const matches = ALL_COMMANDS_26_3.filter((c) => c.toLowerCase().startsWith(lower));

  if (lower.startsWith('/give ') || lower.startsWith('/setblock ') || lower.startsWith('//set ')) {
    const parts = trimmed.split(/\s+/);
    const lastToken = parts[parts.length - 1].toLowerCase();
    for (const id of blockIds) {
      if (id.toLowerCase().includes(lastToken)) {
        const prefix = parts.slice(0, -1).join(' ');
        const candidate = `${prefix} ${id}`;
        if (!matches.includes(candidate)) matches.push(candidate);
      }
    }
  }
  return matches.slice(0, 8);
}
