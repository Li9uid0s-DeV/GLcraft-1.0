/**
 * Holds the complete Step 1 & Step 2 Rust/WASM & Mod architecture files so users can inspect,
 * copy, or download them directly inside the in-game Rust/WASM & Mod Studio modal.
 */

export interface CodeArtifactFile {
  step: 'Step 1: Project & Mod Manifests' | 'Step 2: Rust/WASM Core Engine';
  path: string;
  language: 'toml' | 'json' | 'javascript' | 'rust';
  description: string;
  code: string;
}

export const STEP_1_AND_2_FILES: CodeArtifactFile[] = [
  {
    step: 'Step 1: Project & Mod Manifests',
    path: 'Cargo.toml',
    language: 'toml',
    description: 'Rust WebAssembly crate configuration (`wasm-bindgen`, LTO release profile for 4GB RAM).',
    code: `[package]
name = "voxelcraft_26_3_wasm"
version = "0.26.3"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]
path = "rust_engine/src/lib.rs"

[dependencies]
wasm-bindgen = "0.2.95"
js-sys = "0.3.72"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde-wasm-bindgen = "0.6.5"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true`,
  },
  {
    step: 'Step 1: Project & Mod Manifests',
    path: 'mods/index.json',
    language: 'json',
    description: 'Master data-driven Mod Registry index loading Vanilla 26.3 Wilderness Bound + Mega TNT Pack.',
    code: `{
  "schema_version": "26.3.0",
  "engine": "voxelcraft-wasm-26.3",
  "mods": [
    {
      "id": "vanilla_26_3",
      "name": "Minecraft 26.3: Wilderness Bound (Base)",
      "version": "26.3.0",
      "enabled": true
    },
    {
      "id": "megatnt",
      "name": "Mega TNT Pack",
      "version": "1.4.0",
      "enabled": true,
      "path": "/mods/mega_tnt",
      "manifest": "/mods/mega_tnt/mod.json",
      "blocks": [
        "/mods/mega_tnt/blocks/tnt_5x.json",
        "/mods/mega_tnt/blocks/tnt_10x.json",
        "/mods/mega_tnt/blocks/tnt_50x.json",
        "/mods/mega_tnt/blocks/tnt_100x.json"
      ],
      "items": ["/mods/mega_tnt/items/blast_igniter.json"],
      "recipes": ["/mods/mega_tnt/recipes/tnt_recipes.json"],
      "script": "/mods/mega_tnt/script.js"
    }
  ]
}`,
  },
  {
    step: 'Step 1: Project & Mod Manifests',
    path: 'mods/mega_tnt/blocks/tnt_100x.json',
    language: 'json',
    description: 'Mega TNT x100 block definition with time-sliced detonation budget (4096 blocks/tick).',
    code: `{
  "id": "megatnt:tnt_100x",
  "numeric_id": 63,
  "name": "TNT x100 (Supernova Core)",
  "mod_id": "megatnt",
  "category": "explosives",
  "hardness": 0.0,
  "blast_resistance": 0.0,
  "opaque": true,
  "light_level": 9,
  "tnt_properties": {
    "multiplier": 100,
    "blast_radius": 36,
    "fuse_ticks": 120,
    "spawns_debris": true,
    "incendiary": true,
    "slice_budget_per_tick": 4096
  }
}`,
  },
  {
    step: 'Step 2: Rust/WASM Core Engine',
    path: 'rust_engine/src/lib.rs',
    language: 'rust',
    description: 'wasm-bindgen entry point with zero-chunk Title Screen, dimension eviction, and zero-copy TypedArray pointers.',
    code: `// Exposes VoxelEngineWasm to JS with zero-copy Float32Array mesh pointers
#[wasm_bindgen]
impl VoxelEngineWasm {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32, world_type_id: u8, biome_blend_radius: u8) -> VoxelEngineWasm { ... }

    #[wasm_bindgen]
    pub fn switch_dimension(&mut self, dimension_id: &str) {
        self.chunks.clear();
        self.chunks.shrink_to_fit();
        self.meshes.clear();
        self.meshes.shrink_to_fit();
        self.current_dimension = dimension_id.to_string();
    }
}`,
  },
  {
    step: 'Step 2: Rust/WASM Core Engine',
    path: 'rust_engine/src/chunk.rs',
    language: 'rust',
    description: '16-bit palette-compressed subchunk storage (16x384x16) with 0-byte allocation for all-air subchunks.',
    code: `pub struct PaletteSubChunk {
    pub palette: Vec<u16>,
    pub data: Vec<u16>,
    pub non_air_count: u16,
}`,
  },
  {
    step: 'Step 1: Project & Mod Manifests',
    path: '.github/workflows/deploy-pages.yml',
    language: 'toml',
    description: 'GitHub Pages automatic static build & deployment workflow (relative base: "./" + .nojekyll + 404.html).',
    code: `name: Deploy VoxelCraft 26.3 to GitHub Pages

on:
  push:
    branches: ["main", "master"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm install
      - run: |
          npm run build
          cp dist/index.html dist/404.html
          touch dist/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4`,
  },
];
