import * as THREE from 'three';
import { generateUnifiedBlockAtlas } from './voxelAtlasAndLighting';

export const TEXTURE_RESOLUTIONS = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096] as const;
export type TextureResolution = (typeof TEXTURE_RESOLUTIONS)[number];

/**
 * Generates the unified 16x16-tile Pixel-Art Block Texture Atlas (`albedoMap`, `bumpMap`, `roughnessMap`)
 * with deterministic top/side/bottom shading and NearestFilter pixel art crispness (§1).
 */
export function generateVoxelMaterialTextures(
  requestedRes: TextureResolution,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  return generateUnifiedBlockAtlas(requestedRes, maxAnisotropy, isSoftwareGl);
}

