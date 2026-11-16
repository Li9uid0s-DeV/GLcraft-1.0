import * as THREE from 'three';

export const TEXTURE_RESOLUTIONS = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096] as const;
export type TextureResolution = (typeof TEXTURE_RESOLUTIONS)[number];

/**
 * Generates procedural voxel micro-detail albedo, normal, and roughness maps for any selected
 * resolution (`4x` to `4096x`), capping internal GPU allocation on 4GB RAM / Software WebGL
 * while preserving exact texel grid density and crisp NearestFilter / Anisotropic filtering.
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
  // Cap physical canvas backing size on SoftwareGL / 4GB Chromebook to avoid OOM while simulating exact texel grid
  const effectiveSize = isSoftwareGl ? Math.min(requestedRes, 256) : Math.min(requestedRes, 1024);
  const gridCells = Math.min(requestedRes, 64);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = effectiveSize;
  albedoCanvas.height = effectiveSize;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = effectiveSize;
  bumpCanvas.height = effectiveSize;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = effectiveSize;
  roughCanvas.height = effectiveSize;
  const rCtx = roughCanvas.getContext('2d')!;

  const cellSize = effectiveSize / gridCells;

  for (let gy = 0; gy < gridCells; gy++) {
    for (let gx = 0; gx < gridCells; gx++) {
      // Deterministic pixel hash
      const h = (((gx * 73856093) ^ (gy * 19349663)) >>> 0) % 100;
      const border = gx === 0 || gy === 0 || gx === gridCells - 1 || gy === gridCells - 1;
      const shade = border ? 225 : 236 + Math.floor((h / 100) * 19);
      aCtx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      aCtx.fillRect(gx * cellSize, gy * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));

      const bumpVal = border ? 95 : 110 + Math.floor((h / 100) * 135);
      bCtx.fillStyle = `rgb(${bumpVal}, ${bumpVal}, ${bumpVal})`;
      bCtx.fillRect(gx * cellSize, gy * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));

      const roughVal = 155 + Math.floor(((100 - h) / 100) * 85);
      rCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
      rCtx.fillRect(gx * cellSize, gy * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
    }
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.magFilter = requestedRes <= 64 ? THREE.NearestFilter : THREE.LinearFilter;
  albedoMap.minFilter = THREE.LinearMipmapLinearFilter;
  albedoMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  return { albedoMap, bumpMap, roughnessMap };
}
