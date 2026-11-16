/**
 * TaCZ (Timeless and Classics Zero) 3D Tactical Firearm & Ballistics Engine
 * + Do a Barrel Roll 6-DOF Flight Physics State
 * + Default Fabric Optimization Stack (Sodium, Lithium, ModernFix, ImmediatelyFast, Indium)
 */

export type TaczFireMode = 'AUTO' | 'SEMI' | 'BOLT' | 'LAUNCHER';
export type TaczOpticType = 'iron' | 'eotech_holo' | 'acog_4x' | 'sniper_8x';
export type TaczMuzzleType = 'standard' | 'suppressor' | 'compensator' | 'explosive_tip';

export interface TaczGunSpec {
  itemId: string;
  numericId: number;
  name: string;
  jpName: string;
  caliber: string;
  rpm: number;
  damage: number;
  magCapacity: number;
  reloadSeconds: number;
  recoilPitch: number;
  recoilYaw: number;
  adsZoomFovFactor: number;
  fireMode: TaczFireMode;
  muzzleVelocity: number;
  explosiveRadius: number;
  defaultOptic: TaczOpticType;
  bodyColorHex: string;
  accentColorHex: string;
  description: string;
}

export const TACZ_GUN_REGISTRY: TaczGunSpec[] = [
  {
    itemId: 'tacz:m4a1',
    numericId: 270,
    name: 'TaCZ M4A1 Carbine (5.56mm)',
    jpName: 'M4A1 タクティカルカービン',
    caliber: '5.56x45mm NATO',
    rpm: 800,
    damage: 8,
    magCapacity: 30,
    reloadSeconds: 1.6,
    recoilPitch: 0.018,
    recoilYaw: 0.008,
    adsZoomFovFactor: 0.68,
    fireMode: 'AUTO',
    muzzleVelocity: 110,
    explosiveRadius: 0,
    defaultOptic: 'eotech_holo',
    bodyColorHex: '#2b3038',
    accentColorHex: '#d4a359',
    description:
      'Timeless and Classics Zero signature assault carbine. Left-click to fire, Right-click for Holographic Sight ADS, [T] to reload.',
  },
  {
    itemId: 'tacz:ai_awp',
    numericId: 271,
    name: 'TaCZ AI-AWP Magnum Sniper',
    jpName: 'AWP マグナムスナイパーライフル',
    caliber: '.338 Lapua Magnum',
    rpm: 55,
    damage: 28,
    magCapacity: 5,
    reloadSeconds: 2.2,
    recoilPitch: 0.065,
    recoilYaw: 0.012,
    adsZoomFovFactor: 0.28,
    fireMode: 'BOLT',
    muzzleVelocity: 180,
    explosiveRadius: 0,
    defaultOptic: 'sniper_8x',
    bodyColorHex: '#2e4732',
    accentColorHex: '#1b1d22',
    description:
      'High-precision bolt-action sniper rifle with 8x Mil-Dot scopezoom. Penetrates blocks and deals massive impact damage.',
  },
  {
    itemId: 'tacz:rpg7',
    numericId: 272,
    name: 'TaCZ RPG-7 Warhead Launcher',
    jpName: 'RPG-7 対戦車ロケットランチャー',
    caliber: 'PG-7V 85mm HEAT',
    rpm: 30,
    damage: 45,
    magCapacity: 1,
    reloadSeconds: 2.4,
    recoilPitch: 0.08,
    recoilYaw: 0.02,
    adsZoomFovFactor: 0.75,
    fireMode: 'LAUNCHER',
    muzzleVelocity: 58,
    explosiveRadius: 6,
    defaultOptic: 'iron',
    bodyColorHex: '#5c4028',
    accentColorHex: '#383c42',
    description:
      'Fires high-explosive anti-tank rockets that detonate a 3D voxel crater on impact.',
  },
  {
    itemId: 'tacz:deagle_golden',
    numericId: 273,
    name: 'TaCZ Golden Desert Eagle .50 AE',
    jpName: 'デザートイーグル .50 AE ゴールド',
    caliber: '.50 Action Express',
    rpm: 240,
    damage: 16,
    magCapacity: 7,
    reloadSeconds: 1.4,
    recoilPitch: 0.045,
    recoilYaw: 0.014,
    adsZoomFovFactor: 0.78,
    fireMode: 'SEMI',
    muzzleVelocity: 125,
    explosiveRadius: 0,
    defaultOptic: 'eotech_holo',
    bodyColorHex: '#e6b832',
    accentColorHex: '#23262d',
    description:
      'Heavy .50 AE hand cannon with high stopping power and crisp metallic slide recoil.',
  },
];

export function getTaczGunByNumericId(numId: number): TaczGunSpec | undefined {
  return TACZ_GUN_REGISTRY.find((g) => g.numericId === numId);
}

export function getTaczGunByItemId(itemId: string): TaczGunSpec | undefined {
  return TACZ_GUN_REGISTRY.find((g) => g.itemId === itemId);
}

export interface TaczAttachmentLoadout {
  optic: TaczOpticType;
  muzzle: TaczMuzzleType;
  extendedMag: boolean;
}

export interface DoABarrelRollConfig {
  enabled: boolean;
  mouseRollSensitivity: number;
  bankedTurnStrength: number;
  thrustSpeed: number;
  invertPitch: boolean;
  showAvionicsHud: boolean;
}

export interface SodiumOptimizationSettings {
  // Sodium 0.6.5
  sodiumEnabled: boolean;
  chunkFadeInMode: 'smooth_rise' | 'fade_only' | 'off';
  chunkFadeDurationSec: number;
  compactVertexFormat: boolean;
  blockFaceCulling: boolean;
  fogOcclusion: boolean;
  cloudCulling: boolean;
  chunkUpdateThreads: number;
  alwaysDeferChunkUpdates: boolean;
  maxFps: number;
  vSync: boolean;
  guiScale: number;
  brightnessGamma: number;
  // Lithium 0.14.2
  lithiumEnabled: boolean;
  lithiumPhysicsOptimization: boolean;
  lithiumEntityAiThrottle: boolean;
  lithiumExplosionHashGrid: boolean;
  // ModernFix 5.20.0
  modernFixEnabled: boolean;
  modernFixDynamicResources: boolean;
  modernFixFerriteStateDedup: boolean;
  // ImmediatelyFast 1.3.3
  immediatelyFastEnabled: boolean;
  immediatelyFastHudBatching: boolean;
  immediatelyFastParticleBatching: boolean;
  // Indium 1.0.35
  indiumEnabled: boolean;
  indiumFrapiAmbientOcclusion: boolean;
}

export const DEFAULT_SODIUM_OPTIMIZATION_SETTINGS: SodiumOptimizationSettings = {
  sodiumEnabled: true,
  chunkFadeInMode: 'smooth_rise',
  chunkFadeDurationSec: 0.65,
  compactVertexFormat: true,
  blockFaceCulling: true,
  fogOcclusion: true,
  cloudCulling: true,
  chunkUpdateThreads: 4,
  alwaysDeferChunkUpdates: true,
  maxFps: 120,
  vSync: true,
  guiScale: 2,
  brightnessGamma: 100,
  lithiumEnabled: true,
  lithiumPhysicsOptimization: true,
  lithiumEntityAiThrottle: true,
  lithiumExplosionHashGrid: true,
  modernFixEnabled: true,
  modernFixDynamicResources: true,
  modernFixFerriteStateDedup: true,
  immediatelyFastEnabled: true,
  immediatelyFastHudBatching: true,
  immediatelyFastParticleBatching: true,
  indiumEnabled: true,
  indiumFrapiAmbientOcclusion: true,
};

export const DEFAULT_BARREL_ROLL_CONFIG: DoABarrelRollConfig = {
  enabled: false,
  mouseRollSensitivity: 1.0,
  bankedTurnStrength: 1.25,
  thrustSpeed: 16.5,
  invertPitch: false,
  showAvionicsHud: true,
};
