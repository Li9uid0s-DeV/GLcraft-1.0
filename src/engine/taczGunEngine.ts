/**
 * TaCZ (Timeless and Classics Zero) 3D Tactical Firearm & Ballistics Engine
 * + Do a Barrel Roll 6-DOF Flight Physics State
 * + Default Fabric Optimization Stack (Sodium, Lithium, ModernFix, ImmediatelyFast, Indium)
 */

export type TaczFireMode = 'AUTO' | 'SEMI' | 'BOLT' | 'LAUNCHER';
export type TaczOpticType = 'iron' | 'eotech_holo' | 'acog_4x' | 'sniper_8x';
export type TaczMuzzleType = 'standard' | 'suppressor' | 'compensator' | 'explosive_tip';

export interface TaczGunJsonProperty {
  ammo: string;
  ammo_amount: number;
  bolt: 'open_bolt' | 'closed_bolt' | 'manual_action';
  rpm: number;
  damage: number;
  headshot_multiplier: number;
  armor_ignore: number;
  weight: number;
  bullet_speed: number;
  inaccuracy: {
    stand: number;
    move: number;
    sneak: number;
    lie: number;
    zoom: number;
  };
}

export interface TaczGunSpec {
  itemId: string;
  numericId: number;
  name: string;
  jpName: string;
  weaponClass: 'assault_rifle' | 'sniper' | 'smg' | 'pistol' | 'shotgun' | 'mg' | 'launcher';
  caliber: string;
  rpm: number;
  damage: number;
  headshotMultiplier: number;
  armorIgnore: number;
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
  taczDataJson: TaczGunJsonProperty;
}

export const TACZ_GUN_REGISTRY: TaczGunSpec[] = [
  {
    itemId: 'tacz:m4a1',
    numericId: 270,
    name: 'TaCZ M4A1 Carbine (5.56mm)',
    jpName: 'M4A1 タクティカルカービン',
    weaponClass: 'assault_rifle',
    caliber: '5.56x45mm NATO (tacz:556x45)',
    rpm: 800,
    damage: 8.5,
    headshotMultiplier: 1.75,
    armorIgnore: 0.3,
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
      'Timeless and Classics Zero default pack `data/tacz/guns/m4a1.json` (800 RPM, 5.56x45mm, closed_bolt). Left-click to fire, Right-click for ADS, [T] to reload.',
    taczDataJson: {
      ammo: 'tacz:556x45',
      ammo_amount: 30,
      bolt: 'closed_bolt',
      rpm: 800,
      damage: 8.5,
      headshot_multiplier: 1.75,
      armor_ignore: 0.3,
      weight: 3.1,
      bullet_speed: 310,
      inaccuracy: { stand: 1.8, move: 3.4, sneak: 1.1, lie: 0.75, zoom: 0.18 },
    },
  },
  {
    itemId: 'tacz:ai_awp',
    numericId: 271,
    name: 'TaCZ AI-AWP Magnum Sniper',
    jpName: 'AWP マグナムスナイパー (.338)',
    weaponClass: 'sniper',
    caliber: '.338 Lapua Magnum (tacz:338)',
    rpm: 50,
    damage: 28,
    headshotMultiplier: 2.5,
    armorIgnore: 0.75,
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
      'TaCZ default pack `data/tacz/guns/ai_awp.json` (.338 Lapua Magnum, manual_action, 2.5x headshot multiplier). 8x Mil-Dot scope zoom.',
    taczDataJson: {
      ammo: 'tacz:338',
      ammo_amount: 5,
      bolt: 'manual_action',
      rpm: 50,
      damage: 28.0,
      headshot_multiplier: 2.5,
      armor_ignore: 0.75,
      weight: 6.5,
      bullet_speed: 450,
      inaccuracy: { stand: 3.6, move: 6.2, sneak: 2.1, lie: 1.0, zoom: 0.02 },
    },
  },
  {
    itemId: 'tacz:rpg7',
    numericId: 272,
    name: 'TaCZ RPG-7 Warhead Launcher',
    jpName: 'RPG-7 対戦車ロケットランチャー',
    weaponClass: 'launcher',
    caliber: 'PG-7V 85mm HEAT (tacz:rpg_rocket)',
    rpm: 30,
    damage: 45,
    headshotMultiplier: 1.0,
    armorIgnore: 0.9,
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
      'TaCZ default pack `data/tacz/guns/rpg7.json` (`tacz:rpg_rocket`, open_bolt). Detonates a 3D voxel crater on impact.',
    taczDataJson: {
      ammo: 'tacz:rpg_rocket',
      ammo_amount: 1,
      bolt: 'open_bolt',
      rpm: 30,
      damage: 45.0,
      headshot_multiplier: 1.0,
      armor_ignore: 0.9,
      weight: 7.0,
      bullet_speed: 115,
      inaccuracy: { stand: 2.2, move: 4.8, sneak: 1.4, lie: 1.0, zoom: 0.35 },
    },
  },
  {
    itemId: 'tacz:deagle_golden',
    numericId: 273,
    name: 'TaCZ Golden Desert Eagle .50 AE',
    jpName: 'デザートイーグル .50 AE ゴールド',
    weaponClass: 'pistol',
    caliber: '.50 Action Express (tacz:50ae)',
    rpm: 240,
    damage: 16,
    headshotMultiplier: 2.0,
    armorIgnore: 0.45,
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
      'TaCZ default pack `data/tacz/guns/deagle_golden.json` (.50 AE hand cannon, 240 RPM, 2.0x headshot multiplier).',
    taczDataJson: {
      ammo: 'tacz:50ae',
      ammo_amount: 7,
      bolt: 'closed_bolt',
      rpm: 240,
      damage: 16.0,
      headshot_multiplier: 2.0,
      armor_ignore: 0.45,
      weight: 2.0,
      bullet_speed: 260,
      inaccuracy: { stand: 1.6, move: 3.1, sneak: 1.0, lie: 0.8, zoom: 0.22 },
    },
  },
  {
    itemId: 'tacz:ak47',
    numericId: 276,
    name: 'TaCZ AKM 7.62x39mm Assault Rifle',
    jpName: 'AKM 7.62mm アサルトライフル',
    weaponClass: 'assault_rifle',
    caliber: '7.62x39mm Soviet (tacz:762x39)',
    rpm: 600,
    damage: 11,
    headshotMultiplier: 1.85,
    armorIgnore: 0.38,
    magCapacity: 30,
    reloadSeconds: 1.85,
    recoilPitch: 0.028,
    recoilYaw: 0.012,
    adsZoomFovFactor: 0.7,
    fireMode: 'AUTO',
    muzzleVelocity: 105,
    explosiveRadius: 0,
    defaultOptic: 'iron',
    bodyColorHex: '#6e4226',
    accentColorHex: '#25282c',
    description:
      'TaCZ default pack `data/tacz/guns/ak47.json` (600 RPM, heavy 7.62x39mm stopping power with wood furniture).',
    taczDataJson: {
      ammo: 'tacz:762x39',
      ammo_amount: 30,
      bolt: 'closed_bolt',
      rpm: 600,
      damage: 11.0,
      headshot_multiplier: 1.85,
      armor_ignore: 0.38,
      weight: 3.5,
      bullet_speed: 285,
      inaccuracy: { stand: 2.1, move: 3.9, sneak: 1.3, lie: 0.9, zoom: 0.24 },
    },
  },
  {
    itemId: 'tacz:hk416d',
    numericId: 277,
    name: 'TaCZ HK416D Operator Carbine',
    jpName: 'HK416D 特殊部隊カービン',
    weaponClass: 'assault_rifle',
    caliber: '5.56x45mm NATO (tacz:556x45)',
    rpm: 850,
    damage: 8.2,
    headshotMultiplier: 1.75,
    armorIgnore: 0.32,
    magCapacity: 30,
    reloadSeconds: 1.55,
    recoilPitch: 0.015,
    recoilYaw: 0.007,
    adsZoomFovFactor: 0.65,
    fireMode: 'AUTO',
    muzzleVelocity: 115,
    explosiveRadius: 0,
    defaultOptic: 'eotech_holo',
    bodyColorHex: '#3a3832',
    accentColorHex: '#c29b61',
    description:
      'TaCZ default pack `data/tacz/guns/hk416d.json` (850 RPM short-stroke gas piston carbine with low recoil).',
    taczDataJson: {
      ammo: 'tacz:556x45',
      ammo_amount: 30,
      bolt: 'closed_bolt',
      rpm: 850,
      damage: 8.2,
      headshot_multiplier: 1.75,
      armor_ignore: 0.32,
      weight: 3.3,
      bullet_speed: 315,
      inaccuracy: { stand: 1.65, move: 3.2, sneak: 1.0, lie: 0.7, zoom: 0.15 },
    },
  },
  {
    itemId: 'tacz:vector45',
    numericId: 278,
    name: 'TaCZ KRISS Vector .45 ACP SMG',
    jpName: 'KRISS Vector .45 サブマシンガン',
    weaponClass: 'smg',
    caliber: '.45 ACP (tacz:45acp)',
    rpm: 1200,
    damage: 6.5,
    headshotMultiplier: 1.5,
    armorIgnore: 0.2,
    magCapacity: 33,
    reloadSeconds: 1.35,
    recoilPitch: 0.011,
    recoilYaw: 0.009,
    adsZoomFovFactor: 0.76,
    fireMode: 'AUTO',
    muzzleVelocity: 92,
    explosiveRadius: 0,
    defaultOptic: 'eotech_holo',
    bodyColorHex: '#23272e',
    accentColorHex: '#5ac8fa',
    description:
      'TaCZ default pack `data/tacz/guns/vector45.json` (1,200 RPM Super V recoil mitigation system). Shreds targets at close range.',
    taczDataJson: {
      ammo: 'tacz:45acp',
      ammo_amount: 33,
      bolt: 'closed_bolt',
      rpm: 1200,
      damage: 6.5,
      headshot_multiplier: 1.5,
      armor_ignore: 0.2,
      weight: 2.7,
      bullet_speed: 240,
      inaccuracy: { stand: 2.0, move: 3.0, sneak: 1.4, lie: 1.1, zoom: 0.28 },
    },
  },
  {
    itemId: 'tacz:m95',
    numericId: 279,
    name: 'TaCZ Barrett M95 .50 BMG Anti-Materiel',
    jpName: 'バレット M95 .50 BMG 対物ライフル',
    weaponClass: 'sniper',
    caliber: '.50 BMG (tacz:50bmg)',
    rpm: 38,
    damage: 42,
    headshotMultiplier: 2.8,
    armorIgnore: 0.95,
    magCapacity: 5,
    reloadSeconds: 2.6,
    recoilPitch: 0.085,
    recoilYaw: 0.018,
    adsZoomFovFactor: 0.24,
    fireMode: 'BOLT',
    muzzleVelocity: 210,
    explosiveRadius: 2,
    defaultOptic: 'sniper_8x',
    bodyColorHex: '#383d3b',
    accentColorHex: '#ff6b35',
    description:
      'TaCZ default pack `data/tacz/guns/m95.json` (.50 BMG bullpup anti-materiel rifle, 95% armor ignore, shatters blocks on impact).',
    taczDataJson: {
      ammo: 'tacz:50bmg',
      ammo_amount: 5,
      bolt: 'manual_action',
      rpm: 38,
      damage: 42.0,
      headshot_multiplier: 2.8,
      armor_ignore: 0.95,
      weight: 10.3,
      bullet_speed: 520,
      inaccuracy: { stand: 4.5, move: 7.5, sneak: 2.4, lie: 0.85, zoom: 0.01 },
    },
  },
  {
    itemId: 'tacz:m870',
    numericId: 280,
    name: 'TaCZ Remington M870 12-Gauge Shotgun',
    jpName: 'M870 12ゲージ ポンプショットガン',
    weaponClass: 'shotgun',
    caliber: '12 Gauge Buckshot (tacz:12g)',
    rpm: 75,
    damage: 22,
    headshotMultiplier: 1.5,
    armorIgnore: 0.25,
    magCapacity: 8,
    reloadSeconds: 2.0,
    recoilPitch: 0.055,
    recoilYaw: 0.015,
    adsZoomFovFactor: 0.8,
    fireMode: 'SEMI',
    muzzleVelocity: 95,
    explosiveRadius: 0,
    defaultOptic: 'iron',
    bodyColorHex: '#4f3829',
    accentColorHex: '#22252a',
    description:
      'TaCZ default pack `data/tacz/guns/m870.json` (12-Gauge pump-action tactical shotgun with devastating close-quarters knockback).',
    taczDataJson: {
      ammo: 'tacz:12g',
      ammo_amount: 8,
      bolt: 'manual_action',
      rpm: 75,
      damage: 22.0,
      headshot_multiplier: 1.5,
      armor_ignore: 0.25,
      weight: 3.6,
      bullet_speed: 220,
      inaccuracy: { stand: 3.8, move: 4.9, sneak: 2.8, lie: 2.4, zoom: 1.8 },
    },
  },
  {
    itemId: 'tacz:m249',
    numericId: 281,
    name: 'TaCZ FN M249 SAW Light Machine Gun',
    jpName: 'M249 SAW 分隊支援機関銃 (100発)',
    weaponClass: 'mg',
    caliber: '5.56x45mm NATO Belt (tacz:556x45)',
    rpm: 775,
    damage: 8.8,
    headshotMultiplier: 1.65,
    armorIgnore: 0.32,
    magCapacity: 100,
    reloadSeconds: 3.4,
    recoilPitch: 0.022,
    recoilYaw: 0.014,
    adsZoomFovFactor: 0.68,
    fireMode: 'AUTO',
    muzzleVelocity: 112,
    explosiveRadius: 0,
    defaultOptic: 'acog_4x',
    bodyColorHex: '#2f353b',
    accentColorHex: '#6b7c59',
    description:
      'TaCZ default pack `data/tacz/guns/m249.json` (100-round belt-fed squad automatic weapon, open_bolt, 775 RPM sustained suppression).',
    taczDataJson: {
      ammo: 'tacz:556x45',
      ammo_amount: 100,
      bolt: 'open_bolt',
      rpm: 775,
      damage: 8.8,
      headshot_multiplier: 1.65,
      armor_ignore: 0.32,
      weight: 7.5,
      bullet_speed: 315,
      inaccuracy: { stand: 2.6, move: 5.2, sneak: 1.6, lie: 0.85, zoom: 0.25 },
    },
  },
  {
    itemId: 'tacz:glock_17',
    numericId: 282,
    name: 'TaCZ Glock 17 9x19mm Sidearm',
    jpName: 'グロック17 9mm タクティカルピストル',
    weaponClass: 'pistol',
    caliber: '9x19mm Parabellum (tacz:9mm)',
    rpm: 400,
    damage: 7.5,
    headshotMultiplier: 1.8,
    armorIgnore: 0.2,
    magCapacity: 17,
    reloadSeconds: 1.15,
    recoilPitch: 0.016,
    recoilYaw: 0.007,
    adsZoomFovFactor: 0.82,
    fireMode: 'SEMI',
    muzzleVelocity: 98,
    explosiveRadius: 0,
    defaultOptic: 'iron',
    bodyColorHex: '#1f2328',
    accentColorHex: '#8b949e',
    description:
      'TaCZ default pack `data/tacz/guns/glock_17.json` (9x19mm polymer-framed sidearm with fast 1.15s tactical reload).',
    taczDataJson: {
      ammo: 'tacz:9mm',
      ammo_amount: 17,
      bolt: 'closed_bolt',
      rpm: 400,
      damage: 7.5,
      headshot_multiplier: 1.8,
      armor_ignore: 0.2,
      weight: 0.9,
      bullet_speed: 250,
      inaccuracy: { stand: 1.4, move: 2.5, sneak: 0.9, lie: 0.7, zoom: 0.2 },
    },
  },
];

export function exportTaczGunDataJson(gun: TaczGunSpec): string {
  return JSON.stringify(
    {
      schema: 'tacz_default_gun_pack_v1.1.4',
      id: gun.itemId,
      property: gun.taczDataJson,
      recoil: {
        pitch: [
          { time: 0, value: [gun.recoilPitch, gun.recoilPitch * 1.15] },
          { time: 0.22, value: [0, 0] },
        ],
        yaw: [
          { time: 0, value: [-gun.recoilYaw, gun.recoilYaw] },
          { time: 0.22, value: [0, 0] },
        ],
      },
      allow_attachment_types: ['scope', 'muzzle', 'grip', 'extended_mag', 'stock'],
    },
    null,
    2
  );
}

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
