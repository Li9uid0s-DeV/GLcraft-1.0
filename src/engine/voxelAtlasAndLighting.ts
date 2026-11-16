import * as THREE from 'three';
import {
  BlockDefinition,
  CHUNK_HEIGHT,
  MIN_Y,
  MAX_Y,
  SUBCHUNK_COUNT,
  ChunkColumn,
} from './voxelEngine';

/**
 * §1. Texture Atlas (16x16 pixel art per tile on a single 16x16 tile grid = 256x256 canvas)
 * Every block face is drawn via deterministic procedural Canvas pixel rules (palette + top/side/bottom shading).
 * Zero external assets or Mojang textures are used.
 */
export const ATLAS_GRID_SIZE = 16; // 16x16 tiles in the atlas
export const ATLAS_TILE_PX = 16; // 16x16 pixels per block face

export interface BlockTileUv {
  top: [number, number]; // [tileX, tileY]
  side: [number, number];
  bottom: [number, number];
}

// Map block numericId to [tileX, tileY] in the 16x16 atlas grid
export function getBlockAtlasTiles(numericId: number): BlockTileUv {
  switch (numericId) {
    case 1: // Stone
      return { top: [1, 0], side: [1, 0], bottom: [1, 0] };
    case 2: // Grass Block
      return { top: [0, 0], side: [3, 0], bottom: [2, 0] };
    case 3: // Dirt
      return { top: [2, 0], side: [2, 0], bottom: [2, 0] };
    case 4: // Cobblestone
      return { top: [0, 1], side: [0, 1], bottom: [0, 1] };
    case 5: // Bedrock
      return { top: [1, 1], side: [1, 1], bottom: [1, 1] };
    case 7: // Sand
      return { top: [2, 1], side: [2, 1], bottom: [2, 1] };
    case 8: // Oak Log
      return { top: [5, 1], side: [4, 1], bottom: [5, 1] };
    case 9: // Oak Leaves
      return { top: [4, 3], side: [4, 3], bottom: [4, 3] };
    case 10: // Snow Block
      return { top: [2, 4], side: [2, 4], bottom: [2, 4] };
    case 20: // Dappled Forest Grass
      return { top: [0, 0], side: [6, 0], bottom: [2, 0] };
    case 21: // Poplar Log
      return { top: [7, 1], side: [6, 1], bottom: [7, 1] };
    case 22: // Poplar Planks
      return { top: [8, 1], side: [8, 1], bottom: [8, 1] };
    case 23: // Golden Poplar Leaves
      return { top: [5, 3], side: [5, 3], bottom: [5, 3] };
    case 24: // Amber Poplar Leaves
      return { top: [6, 3], side: [6, 3], bottom: [6, 3] };
    case 25: // Crimson Poplar Leaves
      return { top: [7, 3], side: [7, 3], bottom: [7, 3] };
    case 26: // Red Wilderness Shrub
      return { top: [8, 3], side: [8, 3], bottom: [8, 3] };
    case 27: // Bracket Fungus
      return { top: [9, 3], side: [9, 3], bottom: [8, 1] };
    case 28: // Straw Bed
      return { top: [0, 2], side: [1, 2], bottom: [8, 1] };
    case 29: // Amber Cushion
      return { top: [2, 2], side: [2, 2], bottom: [2, 2] };
    case 30: // Lucky Block (?)
      return { top: [3, 2], side: [4, 2], bottom: [3, 2] };
    case 31: // Standard TNT
      return { top: [9, 0], side: [8, 0], bottom: [10, 0] };
    case 32: // Camp Chest
      return { top: [5, 2], side: [6, 2], bottom: [5, 2] };
    case 33: // Netherrack
      return { top: [7, 2], side: [7, 2], bottom: [7, 2] };
    case 34: // End Stone
      return { top: [8, 2], side: [8, 2], bottom: [8, 2] };
    case 35: // Redstone Block
      return { top: [9, 2], side: [9, 2], bottom: [9, 2] };
    case 36: // Weather2 Storm Radar
      return { top: [10, 2], side: [11, 2], bottom: [1, 0] };
    case 60: // TNT x5
      return { top: [9, 0], side: [11, 0], bottom: [10, 0] };
    case 61: // TNT x10
      return { top: [9, 0], side: [12, 0], bottom: [10, 0] };
    case 62: // TNT x50
      return { top: [9, 0], side: [13, 0], bottom: [10, 0] };
    case 63: // TNT x100
      return { top: [9, 0], side: [14, 0], bottom: [10, 0] };
    default:
      return { top: [0, 4], side: [0, 4], bottom: [0, 4] };
  }
}

export function getAtlasUvRect(
  numericId: number,
  faceIndex: number
): [number, number, number, number] {
  const tiles = getBlockAtlasTiles(numericId);
  const [tx, ty] = faceIndex === 0 ? tiles.top : faceIndex === 1 ? tiles.bottom : tiles.side;
  const step = 1 / ATLAS_GRID_SIZE;
  const pad = 0.0015; // Prevent bleeding at mipmap boundaries
  const u0 = tx * step + pad;
  const v0 = 1 - (ty + 1) * step + pad;
  const u1 = (tx + 1) * step - pad;
  const v1 = 1 - ty * step - pad;
  return [u0, v0, u1, v1];
}

function pixelHash(x: number, y: number, seed: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Draws a 16x16 pixel-art tile into a 2D canvas context with top-bright / bottom-dark beveling and domain pattern rules.
 */
function drawPixelArtTile(
  ctx: CanvasRenderingContext2D,
  rCtx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  tileScale: number,
  pattern:
    | 'grass_top'
    | 'stone'
    | 'dirt'
    | 'grass_side'
    | 'dappled_side'
    | 'cobble'
    | 'bedrock'
    | 'sand'
    | 'oak_bark'
    | 'log_top'
    | 'poplar_bark'
    | 'planks'
    | 'leaves'
    | 'tnt_side'
    | 'tnt_top'
    | 'tnt_bottom'
    | 'lucky'
    | 'chest'
    | 'radar_top'
    | 'radar_side'
    | 'generic_bevel',
  baseGray = 225,
  roughBase = 185
): void {
  const ox = tx * 16;
  const oy = ty * 16;
  const seed = tx * 31 + ty * 97;

  for (let py = 0; py < 16; py++) {
    for (let px = 0; px < 16; px++) {
      const h = pixelHash(px, py, seed);
      let lum = baseGray;
      let rough = roughBase;

      // Subtle top-bright, bottom-dark shading rule per specification §1 & §4.3
      const edgeBevel = py === 0 ? 10 : py === 15 ? -14 : px === 0 ? 5 : px === 15 ? -6 : 0;

      switch (pattern) {
        case 'grass_top': {
          // Organic grass blade speckles (bright grayscale so vertex biome color tints cleanly)
          const blade = (px + py * 2) % 5 === 0 && h > 0.35 ? 14 : h < 0.25 ? -14 : 0;
          lum = 232 + blade + (h - 0.5) * 18;
          rough = 195;
          break;
        }
        case 'stone': {
          // Horizontal strata cracks + mineral speckles
          const crack = (py % 4 === 1 && ((px + py * 3) % 7 < 4)) ? -26 : 0;
          lum = 226 + crack + (h - 0.5) * 24 + edgeBevel * 0.4;
          rough = 205;
          break;
        }
        case 'dirt': {
          // Loamy pebbles and soil clods
          const pebble = h > 0.84 ? 22 : h < 0.18 ? -24 : 0;
          lum = 222 + pebble + (h - 0.5) * 20;
          rough = 220;
          break;
        }
        case 'grass_side':
        case 'dappled_side': {
          // Top 3..5 pixels have overhanging grass fringe, lower pixels are dirt
          const fringeDepth = 3 + Math.floor(pixelHash(px, 0, seed) * 3);
          if (py < fringeDepth) {
            lum = 235 + (h - 0.5) * 16;
            rough = 190;
          } else if (py === fringeDepth) {
            lum = 175; // Drop shadow under grass overhang
            rough = 215;
          } else {
            lum = 212 + (h - 0.5) * 24;
            rough = 220;
          }
          break;
        }
        case 'cobble': {
          // Irregular stone cellular grid
          const cell = Math.sin(px * 0.95 + (py % 3)) * Math.cos(py * 0.95);
          const mortar = Math.abs(cell) < 0.22 ? -42 : 12;
          lum = 220 + mortar + (h - 0.5) * 22;
          rough = 215;
          break;
        }
        case 'bedrock': {
          const band = ((px * 3 + py * 5) % 7 === 0) ? -55 : h > 0.7 ? 28 : -15;
          lum = 195 + band;
          rough = 230;
          break;
        }
        case 'sand': {
          // Rippled wind dunes
          const ripple = Math.sin((px + py * 2) * 0.6) * 10;
          lum = 238 + ripple + (h - 0.5) * 12;
          rough = 185;
          break;
        }
        case 'oak_bark': {
          // Vertical bark ridges
          const ridge = px % 4 === 0 ? -32 : px % 2 === 0 ? 12 : -6;
          lum = 220 + ridge + (h - 0.5) * 18;
          rough = 210;
          break;
        }
        case 'poplar_bark': {
          // Pale birch/poplar bark with horizontal dark lenticel eyes
          const lenticel = py % 5 === 2 && px >= 4 && px <= 11 && h > 0.35 ? -65 : 0;
          lum = 240 + lenticel + (h - 0.5) * 12;
          rough = 195;
          break;
        }
        case 'log_top': {
          const dx = px - 7.5;
          const dy = py - 7.5;
          const dist = Math.hypot(dx, dy);
          const ring = dist > 6.5 ? -36 : Math.floor(dist) % 2 === 0 ? 10 : -12;
          lum = 228 + ring;
          rough = 195;
          break;
        }
        case 'planks': {
          // Horizontal wood planks with seam & grain
          const hSeam = py % 4 === 0 ? -34 : 0;
          const vJoint = (py < 4 && px === 7) || (py >= 4 && py < 8 && px === 12) || (py >= 8 && py < 12 && px === 4) || (py >= 12 && px === 10) ? -28 : 0;
          lum = 234 + hSeam + vJoint + (h - 0.5) * 12;
          rough = 175;
          break;
        }
        case 'leaves': {
          // Leaf cluster stipple with deep shadow gaps
          const gap = (px + py) % 3 === 0 && h < 0.42 ? -48 : 14;
          lum = 226 + gap + (h - 0.5) * 18;
          rough = 200;
          break;
        }
        case 'tnt_side': {
          // Classic TNT sticks with center white label band
          if (py >= 5 && py <= 10) {
            const isLetter =
              py >= 6 &&
              py <= 9 &&
              ((px >= 2 && px <= 4 && (py === 6 || px === 3)) ||
                (px >= 6 && px <= 9 && (px === 6 || px === 9 || px - 6 === py - 6)) ||
                (px >= 11 && px <= 13 && (py === 6 || px === 12)));
            lum = isLetter ? 45 : 250;
            rough = 140;
          } else {
            const stickSeam = px % 4 === 0 ? -34 : 8;
            lum = 224 + stickSeam + (py === 4 || py === 11 ? -28 : 0);
            rough = 175;
          }
          break;
        }
        case 'tnt_top': {
          const fuse = px >= 6 && px <= 9 && py >= 6 && py <= 9;
          const grid = px % 4 === 0 || py % 4 === 0 ? -28 : 8;
          lum = fuse ? 65 : 228 + grid;
          rough = 170;
          break;
        }
        case 'tnt_bottom': {
          const grid = px % 4 === 0 || py % 4 === 0 ? -24 : 4;
          lum = 212 + grid;
          rough = 185;
          break;
        }
        case 'lucky': {
          // Beveled gold frame + question mark pixel glyph
          const border = px === 0 || py === 0 || px === 15 || py === 15;
          const qMark =
            (py === 3 && px >= 6 && px <= 9) ||
            ((py === 4 || py === 5) && (px === 5 || px === 10)) ||
            (py === 6 && px >= 8 && px <= 9) ||
            ((py === 7 || py === 8) && (px === 7 || px === 8)) ||
            ((py === 11 || py === 12) && (px === 7 || px === 8));
          lum = qMark ? 255 : border ? 185 + edgeBevel : 230 + (h - 0.5) * 14;
          rough = qMark ? 95 : 135;
          break;
        }
        case 'chest': {
          const border = px === 0 || py === 0 || px === 15 || py === 15;
          const latch = px >= 7 && px <= 8 && py >= 5 && py <= 8;
          const lidSeam = py === 5;
          lum = latch ? 255 : lidSeam ? 110 : border ? 175 : 228 + (h - 0.5) * 14;
          rough = latch ? 90 : 175;
          break;
        }
        case 'radar_top': {
          const dx = px - 7.5;
          const dy = py - 7.5;
          const r = Math.hypot(dx, dy);
          const ring = Math.abs(r - 6) < 0.8 || Math.abs(r - 3) < 0.7 || px === 8 || py === 8;
          lum = ring ? 255 : r < 6.5 ? 165 : 215;
          rough = 110;
          break;
        }
        case 'radar_side':
        case 'generic_bevel': {
          lum = baseGray + edgeBevel + (h - 0.5) * 18;
          rough = roughBase;
          break;
        }
      }

      const c = Math.max(25, Math.min(255, Math.round(lum)));
      ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
      ctx.fillRect(
        Math.floor((ox + px) * tileScale),
        Math.floor((oy + py) * tileScale),
        Math.ceil(tileScale),
        Math.ceil(tileScale)
      );

      const rc = Math.max(20, Math.min(255, Math.round(rough)));
      rCtx.fillStyle = `rgb(${rc}, ${rc}, ${rc})`;
      rCtx.fillRect(
        Math.floor((ox + px) * tileScale),
        Math.floor((oy + py) * tileScale),
        Math.ceil(tileScale),
        Math.ceil(tileScale)
      );
    }
  }
}

/**
 * Generates the unified 16x16-tile Block Texture Atlas (`albedoMap`, `bumpMap`, `roughnessMap`)
 */
export function generateUnifiedBlockAtlas(
  requestedRes: number,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const tileScale = isSoftwareGl ? 1 : requestedRes >= 64 ? 2 : 1;
  const atlasSize = ATLAS_GRID_SIZE * ATLAS_TILE_PX * tileScale; // 256x256 or 512x512

  const isBrowser = typeof document !== 'undefined';
  if (!isBrowser) {
    const dummy = new THREE.Texture();
    return {
      albedoMap: dummy as THREE.CanvasTexture,
      bumpMap: dummy as THREE.CanvasTexture,
      roughnessMap: dummy as THREE.CanvasTexture,
    };
  }

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = atlasSize;
  albedoCanvas.height = atlasSize;
  const aCtx = albedoCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = atlasSize;
  roughCanvas.height = atlasSize;
  const rCtx = roughCanvas.getContext('2d')!;

  // Fill default beveled tiles across all 16x16 slots first
  for (let ty = 0; ty < ATLAS_GRID_SIZE; ty++) {
    for (let tx = 0; tx < ATLAS_GRID_SIZE; tx++) {
      drawPixelArtTile(aCtx, rCtx, tx, ty, tileScale, 'generic_bevel');
    }
  }

  // Row 0: Core terrain & TNT
  drawPixelArtTile(aCtx, rCtx, 0, 0, tileScale, 'grass_top');
  drawPixelArtTile(aCtx, rCtx, 1, 0, tileScale, 'stone');
  drawPixelArtTile(aCtx, rCtx, 2, 0, tileScale, 'dirt');
  drawPixelArtTile(aCtx, rCtx, 3, 0, tileScale, 'grass_side');
  drawPixelArtTile(aCtx, rCtx, 6, 0, tileScale, 'dappled_side');
  drawPixelArtTile(aCtx, rCtx, 8, 0, tileScale, 'tnt_side');
  drawPixelArtTile(aCtx, rCtx, 9, 0, tileScale, 'tnt_top');
  drawPixelArtTile(aCtx, rCtx, 10, 0, tileScale, 'tnt_bottom');
  drawPixelArtTile(aCtx, rCtx, 11, 0, tileScale, 'tnt_side');
  drawPixelArtTile(aCtx, rCtx, 12, 0, tileScale, 'tnt_side');
  drawPixelArtTile(aCtx, rCtx, 13, 0, tileScale, 'tnt_side');
  drawPixelArtTile(aCtx, rCtx, 14, 0, tileScale, 'tnt_side');

  // Row 1: Cobble, Bedrock, Sand, Logs & Planks
  drawPixelArtTile(aCtx, rCtx, 0, 1, tileScale, 'cobble');
  drawPixelArtTile(aCtx, rCtx, 1, 1, tileScale, 'bedrock');
  drawPixelArtTile(aCtx, rCtx, 2, 1, tileScale, 'sand');
  drawPixelArtTile(aCtx, rCtx, 4, 1, tileScale, 'oak_bark');
  drawPixelArtTile(aCtx, rCtx, 5, 1, tileScale, 'log_top');
  drawPixelArtTile(aCtx, rCtx, 6, 1, tileScale, 'poplar_bark');
  drawPixelArtTile(aCtx, rCtx, 7, 1, tileScale, 'log_top');
  drawPixelArtTile(aCtx, rCtx, 8, 1, tileScale, 'planks');

  // Row 2: Utility, Lucky Block, Chest, Dimensions, Radar
  drawPixelArtTile(aCtx, rCtx, 0, 2, tileScale, 'planks');
  drawPixelArtTile(aCtx, rCtx, 1, 2, tileScale, 'planks');
  drawPixelArtTile(aCtx, rCtx, 2, 2, tileScale, 'generic_bevel');
  drawPixelArtTile(aCtx, rCtx, 3, 2, tileScale, 'lucky');
  drawPixelArtTile(aCtx, rCtx, 4, 2, tileScale, 'lucky');
  drawPixelArtTile(aCtx, rCtx, 5, 2, tileScale, 'planks');
  drawPixelArtTile(aCtx, rCtx, 6, 2, tileScale, 'chest');
  drawPixelArtTile(aCtx, rCtx, 7, 2, tileScale, 'cobble');
  drawPixelArtTile(aCtx, rCtx, 8, 2, tileScale, 'cobble');
  drawPixelArtTile(aCtx, rCtx, 9, 2, tileScale, 'generic_bevel', 240, 115);
  drawPixelArtTile(aCtx, rCtx, 10, 2, tileScale, 'radar_top');
  drawPixelArtTile(aCtx, rCtx, 11, 2, tileScale, 'radar_side');

  // Row 3: Foliage & Leaves
  for (let tx = 4; tx <= 9; tx++) {
    drawPixelArtTile(aCtx, rCtx, tx, 3, tileScale, 'leaves');
  }

  // Row 4: Snow & Custom Blocks
  drawPixelArtTile(aCtx, rCtx, 2, 4, tileScale, 'sand', 246, 170);

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.magFilter = THREE.NearestFilter;
  albedoMap.minFilter = THREE.NearestFilter;
  albedoMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.magFilter = THREE.NearestFilter;
  roughnessMap.minFilter = THREE.NearestFilter;

  return { albedoMap, bumpMap: roughnessMap, roughnessMap };
}

/**
 * §1. Lighting: Sunlight (0..15) + Block Light (0..15) Flood-Fill Propagation
 * Computes a compact per-chunk light field so overhangs/caves darken naturally
 * and placed light-emitting blocks illuminate their surroundings up to 15 blocks.
 */
export class ChunkLightMap {
  // 16 x 128 x 16 compact active band around Y = 32..159 (where all caves, trees, camps & builds live)
  static readonly LIGHT_MIN_Y = 32;
  static readonly LIGHT_HEIGHT = 128;
  // High nibble (bits 4..7) = skyLight (0..15), Low nibble (bits 0..3) = blockLight (0..15)
  readonly data = new Uint8Array(16 * ChunkLightMap.LIGHT_HEIGHT * 16);

  private idx(lx: number, wy: number, lz: number): number {
    const ry = Math.max(0, Math.min(ChunkLightMap.LIGHT_HEIGHT - 1, wy - ChunkLightMap.LIGHT_MIN_Y));
    return (ry << 8) | (lz << 4) | lx;
  }

  getSkyLight(lx: number, wy: number, lz: number): number {
    if (wy >= ChunkLightMap.LIGHT_MIN_Y + ChunkLightMap.LIGHT_HEIGHT) return 15;
    if (wy < ChunkLightMap.LIGHT_MIN_Y) return 4;
    return (this.data[this.idx(lx, wy, lz)] >> 4) & 15;
  }

  getBlockLight(lx: number, wy: number, lz: number): number {
    if (wy < ChunkLightMap.LIGHT_MIN_Y || wy >= ChunkLightMap.LIGHT_MIN_Y + ChunkLightMap.LIGHT_HEIGHT) {
      return 0;
    }
    return this.data[this.idx(lx, wy, lz)] & 15;
  }

  setLight(lx: number, wy: number, lz: number, sky: number, block: number): void {
    if (wy < ChunkLightMap.LIGHT_MIN_Y || wy >= ChunkLightMap.LIGHT_MIN_Y + ChunkLightMap.LIGHT_HEIGHT) {
      return;
    }
    this.data[this.idx(lx, wy, lz)] = ((sky & 15) << 4) | (block & 15);
  }
}

export function computeChunkFloodFillLighting(
  chunk: ChunkColumn,
  blocksByNum: Map<number, BlockDefinition>
): ChunkLightMap {
  const lightMap = new ChunkLightMap();
  const minY = ChunkLightMap.LIGHT_MIN_Y;
  const maxY = minY + ChunkLightMap.LIGHT_HEIGHT - 1;

  const skyQueue: number[] = [];
  const blockQueue: number[] = [];

  // Pass 1: Vertical Sunlight cast from top down + collect emissive block light sources
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      let sky = 15;
      for (let wy = maxY; wy >= minY; wy--) {
        const blockId = chunk.getBlock(lx, wy - MIN_Y, lz);
        const def = blocksByNum.get(blockId);
        if (blockId !== 0) {
          if (def?.isLiquid || blockId === 9 || blockId === 23 || blockId === 24 || blockId === 25) {
            sky = Math.max(0, sky - 2); // Leaves & water attenuate sunlight gradually
          } else if (def?.opaque) {
            sky = 0; // Solid roof blocks direct sunlight (creates dark caves/overhangs)
          }
        }
        const emit = def?.lightLevel ?? 0;
        lightMap.setLight(lx, wy, lz, sky, emit);
        if (sky > 1 && blockId === 0) {
          skyQueue.push(lx, wy, lz);
        }
        if (emit > 1) {
          blockQueue.push(lx, wy, lz);
        }
      }
    }
  }

  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  // Pass 2: BFS Flood-Fill Block Light (0..15) so torches/Lucky Blocks/Redstone/TNT illuminate caves
  let head = 0;
  while (head < blockQueue.length) {
    const x = blockQueue[head++];
    const y = blockQueue[head++];
    const z = blockQueue[head++];
    const cur = lightMap.getBlockLight(x, y, z);
    if (cur <= 1) continue;

    for (let d = 0; d < 6; d++) {
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      const nz = z + dirs[d][2];
      if (nx < 0 || nx >= 16 || nz < 0 || nz >= 16 || ny < minY || ny > maxY) continue;
      const nbId = chunk.getBlock(nx, ny - MIN_Y, nz);
      const nbDef = blocksByNum.get(nbId);
      if (nbId !== 0 && nbDef?.opaque && !nbDef.isLiquid) continue;

      const nextVal = cur - 1;
      if (nextVal > lightMap.getBlockLight(nx, ny, nz)) {
        const s = lightMap.getSkyLight(nx, ny, nz);
        lightMap.setLight(nx, ny, nz, s, nextVal);
        blockQueue.push(nx, ny, nz);
      }
    }
  }

  // Pass 3: Horizontal Sky Light Flood-Fill into cave entrances and under tree canopies
  head = 0;
  const maxSkySteps = 2400; // Bounded for <1ms per chunk
  let steps = 0;
  while (head < skyQueue.length && steps < maxSkySteps) {
    const x = skyQueue[head++];
    const y = skyQueue[head++];
    const z = skyQueue[head++];
    const cur = lightMap.getSkyLight(x, y, z);
    if (cur <= 2) continue;

    for (let d = 0; d < 6; d++) {
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      const nz = z + dirs[d][2];
      if (nx < 0 || nx >= 16 || nz < 0 || nz >= 16 || ny < minY || ny > maxY) continue;
      const nbId = chunk.getBlock(nx, ny - MIN_Y, nz);
      if (nbId !== 0) continue;

      const nextVal = cur - 1;
      if (nextVal > lightMap.getSkyLight(nx, ny, nz)) {
        const b = lightMap.getBlockLight(nx, ny, nz);
        lightMap.setLight(nx, ny, nz, nextVal, b);
        skyQueue.push(nx, ny, nz);
        steps++;
      }
    }
  }

  return lightMap;
}

/**
 * §7. Distant Horizons 3.3.4 (by James Seibel, Leonardo Amato, Cola, coolGi, Ran, Leetom, pshsh, Karnatour)
 * Extracted from `/public/assets/aistudio/DistantHorizons-3.3.4-26.3-fabric-neoforge_ba3e5c85.zip`:
 * - `assets/distanthorizons/shaders/terrain/gl/vert.vert` (earth curvature `uEarthRadius`, packed skylight/blocklight, TAA jitter)
 * - `assets/distanthorizons/shaders/terrain/gl/frag.frag` (`quantize(fixedVPos, uNoiseSteps)`, luminance curve `-(2x-1)^2 + 1`, `uNoiseDropoff`, `bayerMatrix4x4` dither fade)
 * - `assets/distanthorizons/lang/en_us.json` (`lodChunkRenderDistanceRadius`, `horizontalQuality`, `verticalQuality`, `ditherDhFade`, `enableDhFog`, `enableSsao`)
 */
export interface DistantHorizonsConfig {
  enabled: boolean;
  lodChunkRenderDistanceRadius: number; // default 32..128 chunks (in browser 3x-4x Near radius)
  horizontalQuality: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  verticalQuality: 'HEIGHT_MAP' | 'LOW' | 'MEDIUM' | 'HIGH';
  ditherDhFade: boolean;
  enableDhFog: boolean;
  enableSsao: boolean;
  noiseEnabled: boolean;
  noiseSteps: number; // default 4 steps per block from frag.frag
  noiseIntensity: number; // default 0.07
  noiseDropoff: number; // default 1024 blocks
  earthCurveRatio: number; // 0 = flat, >0 = planetary curvature radius (uEarthRadius)
}

export const DEFAULT_DISTANT_HORIZONS_CONFIG: DistantHorizonsConfig = {
  enabled: true,
  lodChunkRenderDistanceRadius: 16,
  horizontalQuality: 'HIGH',
  verticalQuality: 'MEDIUM',
  ditherDhFade: true,
  enableDhFog: true,
  enableSsao: true,
  noiseEnabled: true,
  noiseSteps: 4,
  noiseIntensity: 0.065,
  noiseDropoff: 256,
  earthCurveRatio: 0,
};

export const DISTANT_HORIZONS_ARCHIVE_METADATA = {
  id: 'distanthorizons',
  version: '3.3.4',
  minecraftTarget: '26.3',
  archiveUrl: './assets/aistudio/DistantHorizons-3.3.4-26.3-fabric-neoforge_ba3e5c85.zip',
  authors: ['James Seibel', 'Leonardo Amato', 'Cola', 'coolGi', 'Ran', 'Leetom', 'pshsh', 'Karnatour'],
  entrypoints: {
    client: 'com.seibel.distanthorizons.fabric.FabricMain',
    modmenu: 'com.seibel.distanthorizons.fabric.wrappers.config.ModMenuIntegration',
  },
  shaders: [
    'assets/distanthorizons/shaders/terrain/gl/vert.vert',
    'assets/distanthorizons/shaders/terrain/gl/frag.frag',
    'assets/distanthorizons/shaders/ssao/gl/ao.frag',
    'assets/distanthorizons/shaders/generic/gl/instanced/vert.vert',
  ],
};

export interface DistantHorizonsLodBuffers {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
}

/**
 * Exact `applyNoise` quantized luminance equation ported from DistantHorizons 3.3.4 `terrain/gl/frag.frag`:
 * `lum = (r + g + b) / 3.0; noiseAmp = (1.0 - pow(lum * 2.0 - 1.0, 2.0)) * uNoiseIntensity;`
 */
function applyDh334QuantizedNoise(
  rgb: [number, number, number],
  wx: number,
  wy: number,
  wz: number,
  viewDistBlocks: number,
  cfg: DistantHorizonsConfig
): [number, number, number] {
  if (!cfg.noiseEnabled || cfg.noiseIntensity <= 0) return rgb;
  const steps = Math.max(1, cfg.noiseSteps);
  const qx = Math.floor(wx * steps) / steps;
  const qy = Math.floor(wy * steps) / steps;
  const qz = Math.floor(wz * steps) / steps;

  // Deterministic hash matching frag.frag `rand(vec3 co)`
  const s = Math.sin(qx * 12.9898 + qz * 78.233 + Math.sin(qy * 91.3458) * 47453.5453) * 43758.5453;
  const rand01 = s - Math.floor(s);

  const lum = (rgb[0] + rgb[1] + rgb[2]) / 3.0;
  let noiseAmp = (1.0 - Math.pow(lum * 2.0 - 1.0, 2.0)) * cfg.noiseIntensity;
  const randomValue = rand01 * 2.0 * noiseAmp - noiseAmp;

  let nr = Math.max(0, Math.min(1, rgb[0] + (1.0 - rgb[0]) * randomValue));
  let ng = Math.max(0, Math.min(1, rgb[1] + (1.0 - rgb[1]) * randomValue));
  let nb = Math.max(0, Math.min(1, rgb[2] + (1.0 - rgb[2]) * randomValue));

  if (cfg.noiseDropoff > 0) {
    const distF = Math.min(viewDistBlocks / cfg.noiseDropoff, 1.0);
    nr = nr + (rgb[0] - nr) * distF;
    ng = ng + (rgb[1] - ng) * distF;
    nb = nb + (rgb[2] - nb) * distF;
  }
  return [nr, ng, nb];
}

export function buildDistantHorizonsLodMesh(
  cx: number,
  cz: number,
  stepSize: 2 | 4, // 2 = Mid LOD (2x2), 4 = Far LOD (4x4 column pillars)
  computeSurfaceY: (wx: number, wz: number) => number,
  sampleBiome: (wx: number, wz: number) => number,
  blendedGrassColor: (wx: number, wz: number) => [number, number, number],
  fogColorRgb: [number, number, number],
  fogBlendFactor: number, // 0.0 (near) .. 0.78 (distant horizon)
  dhConfig: DistantHorizonsConfig = DEFAULT_DISTANT_HORIZONS_CONFIG
): DistantHorizonsLodBuffers {
  const pos: number[] = [];
  const norm: number[] = [];
  const col: number[] = [];

  const blend = dhConfig.enableDhFog ? Math.max(0, Math.min(0.85, fogBlendFactor)) : 0;
  const viewDistEst = fogBlendFactor * 220;

  const tintWithFogAndDhNoise = (
    r: number,
    g: number,
    b: number,
    shade: number,
    wx: number,
    wy: number,
    wz: number
  ): [number, number, number] => {
    const [nr, ng, nb] = applyDh334QuantizedNoise(
      [r * shade, g * shade, b * shade],
      wx,
      wy,
      wz,
      viewDistEst,
      dhConfig
    );
    return [
      nr + (fogColorRgb[0] - nr) * blend,
      ng + (fogColorRgb[1] - ng) * blend,
      nb + (fogColorRgb[2] - nb) * blend,
    ];
  };

  for (let lz = 0; lz < 16; lz += stepSize) {
    for (let lx = 0; lx < 16; lx += stepSize) {
      const wx = cx * 16 + lx;
      const wz = cz * 16 + lz;

      // Average surface height across the stepSize x stepSize cell
      let sumY = 0;
      let samples = 0;
      for (let dz = 0; dz < stepSize; dz += 2) {
        for (let dx = 0; dx < stepSize; dx += 2) {
          sumY += computeSurfaceY(wx + dx, wz + dz);
          samples++;
        }
      }
      const rawY = Math.round(sumY / Math.max(1, samples));
      const isWater = rawY < 62;

      // Earth curvature transformation from DistantHorizons `terrain/gl/vert.vert` (`uEarthRadius`)
      let curveDrop = 0;
      if (dhConfig.earthCurveRatio > 100) {
        const localRadius = dhConfig.earthCurveRatio + rawY;
        const phi = Math.hypot(wx, wz) / localRadius;
        curveDrop = (Math.cos(phi) - 1.0) * localRadius;
      }

      const topY = (isWater ? 62 : rawY + 1) + curveDrop;
      const baseY = Math.max(46, topY - (stepSize === 4 ? 18 : 12));

      let baseColor: [number, number, number];
      if (isWater) {
        baseColor = [0.16, 0.50, 0.88];
      } else if (rawY >= 110) {
        baseColor = [0.93, 0.96, 1.0]; // Alpine snow peak
      } else if (rawY <= 63) {
        baseColor = [0.86, 0.80, 0.60]; // Sand coast
      } else {
        const biome = sampleBiome(wx + 1, wz + 1);
        baseColor = blendedGrassColor(wx + 1, wz + 1);
        // Slightly warm autumn canopy tint in Dappled Forest
        if (biome === 2 && ((wx + wz) & 3) === 0) {
          baseColor = [0.91, 0.61, 0.18];
        }
      }

      const x0 = wx;
      const x1 = wx + stepSize;
      const z0 = wz;
      const z1 = wz + stepSize;

      // Top face (+Y)
      const [tr, tg, tb] = tintWithFogAndDhNoise(baseColor[0], baseColor[1], baseColor[2], 1.0, wx, topY, wz);
      pos.push(x0, topY, z0, x0, topY, z1, x1, topY, z1, x0, topY, z0, x1, topY, z1, x1, topY, z0);
      for (let i = 0; i < 6; i++) {
        norm.push(0, 1, 0);
        col.push(tr, tg, tb);
      }

      // 4 Pillar Side Faces so height columns never show gaps
      const sideRgb: [number, number, number] = isWater
        ? [0.12, 0.40, 0.75]
        : rawY >= 95
        ? [0.50, 0.52, 0.55]
        : [0.48, 0.35, 0.23];

      // +X face (EDhDirection SSAO & directional shading multipliers)
      const [pxr, pxg, pxb] = tintWithFogAndDhNoise(sideRgb[0], sideRgb[1], sideRgb[2], 0.82, x1, topY - 2, wz);
      pos.push(x1, baseY, z0, x1, topY, z0, x1, topY, z1, x1, baseY, z0, x1, topY, z1, x1, baseY, z1);
      for (let i = 0; i < 6; i++) {
        norm.push(1, 0, 0);
        col.push(pxr, pxg, pxb);
      }

      // -X face
      const [nxr, nxg, nxb] = tintWithFogAndDhNoise(sideRgb[0], sideRgb[1], sideRgb[2], 0.76, x0, topY - 2, wz);
      pos.push(x0, baseY, z1, x0, topY, z1, x0, topY, z0, x0, baseY, z1, x0, topY, z0, x0, baseY, z0);
      for (let i = 0; i < 6; i++) {
        norm.push(-1, 0, 0);
        col.push(nxr, nxg, nxb);
      }

      // +Z face
      const [pzr, pzg, pzb] = tintWithFogAndDhNoise(sideRgb[0], sideRgb[1], sideRgb[2], 0.88, wx, topY - 2, z1);
      pos.push(x0, baseY, z1, x1, baseY, z1, x1, topY, z1, x0, baseY, z1, x1, topY, z1, x0, topY, z1);
      for (let i = 0; i < 6; i++) {
        norm.push(0, 0, 1);
        col.push(pzr, pzg, pzb);
      }

      // -Z face
      const [nzr, nzg, nzb] = tintWithFogAndDhNoise(sideRgb[0], sideRgb[1], sideRgb[2], 0.72, wx, topY - 2, z0);
      pos.push(x1, baseY, z0, x0, baseY, z0, x0, topY, z0, x1, baseY, z0, x0, topY, z0, x1, topY, z0);
      for (let i = 0; i < 6; i++) {
        norm.push(0, 0, -1);
        col.push(nzr, nzg, nzb);
      }
    }
  }

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(norm),
    colors: new Float32Array(col),
  };
}

