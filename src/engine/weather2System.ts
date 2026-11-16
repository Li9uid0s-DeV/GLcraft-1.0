/**
 * Weather2 Remastered & ProtoManly's Weather (PMWeather) Engine
 * - 3D Volumetric Cumulonimbus / Supercell Cloud Density & Wall Cloud Modeling
 * - Global Wind Vector + Local Cyclonic Wind Field (Tangential Swirl, Radial Inflow, Vertical Updraft)
 * - 9 Distinct Disasters with Real-time Advection & Environment Debris Coupling
 */

export type WeatherDisasterType =
  | 'clear'
  | 'rain'
  | 'thunder'
  | 'hailstorm'
  | 'sandstorm'
  | 'tornado_f1'
  | 'tornado_f5'
  | 'hurricane'
  | 'meteor_shower';

export interface WeatherDisasterMeta {
  id: WeatherDisasterType;
  label: string;
  jpLabel: string;
  windSpeedRange: [number, number]; // m/s
  cloudCoverage: number; // 0.0 .. 1.0
  cloudDarkness: number; // 0.0 .. 1.0
  anvilHeight: number; // ProtoManly's Weather cumulonimbus vertical thickness
  wallCloudLowering: number; // Mesocyclone wall cloud drop (blocks)
  fogColorHex: number;
  fogDensity: number;
  vortexRadius: number; // 0 if no funnel
  vortexSuctionStrength: number;
  vortexSwirlGain: number; // Multiplier for uVortexSwirl uniform
  precipitationType: 'none' | 'rain' | 'hail' | 'sand' | 'meteor';
}

export interface LocalWindFieldSample {
  vx: number;
  vy: number;
  vz: number;
  localSpeed: number;
  stormProximity: number; // 0.0 (far) .. 1.0 (at disaster core)
  swirlIntensity: number;
}

export const WEATHER2_DISASTERS: Record<WeatherDisasterType, WeatherDisasterMeta> = {
  clear: {
    id: 'clear',
    label: 'Clear Cumulus (PMWeather)',
    jpLabel: '晴天（立体積雲）',
    windSpeedRange: [3.5, 7.5],
    cloudCoverage: 0.42,
    cloudDarkness: 0.14,
    anvilHeight: 18,
    wallCloudLowering: 0,
    fogColorHex: 0x6ba8e5,
    fogDensity: 0.008,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    vortexSwirlGain: 0.08,
    precipitationType: 'none',
  },
  rain: {
    id: 'rain',
    label: 'Heavy Rainstorm',
    jpLabel: '暴風雨（乱層雲）',
    windSpeedRange: [12, 18],
    cloudCoverage: 0.74,
    cloudDarkness: 0.56,
    anvilHeight: 32,
    wallCloudLowering: 4,
    fogColorHex: 0x4b5d73,
    fogDensity: 0.015,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    vortexSwirlGain: 0.25,
    precipitationType: 'rain',
  },
  thunder: {
    id: 'thunder',
    label: 'PMWeather Supercell',
    jpLabel: 'スーパーセル巨大積乱雲',
    windSpeedRange: [18, 26],
    cloudCoverage: 0.86,
    cloudDarkness: 0.78,
    anvilHeight: 48,
    wallCloudLowering: 9,
    fogColorHex: 0x2f3b4c,
    fogDensity: 0.019,
    vortexRadius: 0,
    vortexSuctionStrength: 3.5,
    vortexSwirlGain: 0.65,
    precipitationType: 'rain',
  },
  hailstorm: {
    id: 'hailstorm',
    label: 'Severe Hail Mesocyclone',
    jpLabel: '巨大雹嵐（メソサイクロン）',
    windSpeedRange: [20, 29],
    cloudCoverage: 0.88,
    cloudDarkness: 0.72,
    anvilHeight: 46,
    wallCloudLowering: 8,
    fogColorHex: 0x4c5f6e,
    fogDensity: 0.021,
    vortexRadius: 0,
    vortexSuctionStrength: 4.0,
    vortexSwirlGain: 0.58,
    precipitationType: 'hail',
  },
  sandstorm: {
    id: 'sandstorm',
    label: 'Haboob Sandstorm Wall',
    jpLabel: '巨大砂嵐（ハブーブ砂壁）',
    windSpeedRange: [26, 38],
    cloudCoverage: 0.92,
    cloudDarkness: 0.64,
    anvilHeight: 38,
    wallCloudLowering: 12,
    fogColorHex: 0xb87d3e,
    fogDensity: 0.03,
    vortexRadius: 0,
    vortexSuctionStrength: 5.0,
    vortexSwirlGain: 0.45,
    precipitationType: 'sand',
  },
  tornado_f1: {
    id: 'tornado_f1',
    label: 'EF1 Rope Tornado & Wall Cloud',
    jpLabel: 'EF1 ロープ竜巻＆壁雲',
    windSpeedRange: [30, 42],
    cloudCoverage: 0.85,
    cloudDarkness: 0.78,
    anvilHeight: 50,
    wallCloudLowering: 13,
    fogColorHex: 0x3b4754,
    fogDensity: 0.019,
    vortexRadius: 6.0,
    vortexSuctionStrength: 9.0,
    vortexSwirlGain: 1.15,
    precipitationType: 'rain',
  },
  tornado_f5: {
    id: 'tornado_f5',
    label: 'EF5 Wedge Supercell Tornado',
    jpLabel: 'EF5 超巨大ウェッジ竜巻',
    windSpeedRange: [48, 72],
    cloudCoverage: 0.96,
    cloudDarkness: 0.93,
    anvilHeight: 62,
    wallCloudLowering: 18,
    fogColorHex: 0x1e252d,
    fogDensity: 0.025,
    vortexRadius: 13.5,
    vortexSuctionStrength: 18.5,
    vortexSwirlGain: 1.85,
    precipitationType: 'rain',
  },
  hurricane: {
    id: 'hurricane',
    label: 'Cat-5 Eyewall Hurricane',
    jpLabel: 'カテゴリー5 超大型ハリケーン',
    windSpeedRange: [42, 60],
    cloudCoverage: 0.95,
    cloudDarkness: 0.86,
    anvilHeight: 58,
    wallCloudLowering: 15,
    fogColorHex: 0x263644,
    fogDensity: 0.026,
    vortexRadius: 10.5,
    vortexSuctionStrength: 13.5,
    vortexSwirlGain: 1.55,
    precipitationType: 'rain',
  },
  meteor_shower: {
    id: 'meteor_shower',
    label: 'Apocalyptic Pyrocumulonimbus',
    jpLabel: '隕石嵐（火災積乱雲）',
    windSpeedRange: [18, 28],
    cloudCoverage: 0.82,
    cloudDarkness: 0.84,
    anvilHeight: 52,
    wallCloudLowering: 10,
    fogColorHex: 0x4a231b,
    fogDensity: 0.021,
    vortexRadius: 0,
    vortexSuctionStrength: 4.5,
    vortexSwirlGain: 0.75,
    precipitationType: 'meteor',
  },
};

export const WEATHER2_DISASTER_LIST: WeatherDisasterMeta[] = Object.values(WEATHER2_DISASTERS);

/**
 * §6: ProtoManly's Weather (PMWeather) Authentic Mod Parameters & Storm Cell Lifecycle
 * Extracted from ProtoManly's Weather (`pmweather-common.toml` / `ServerConfig`):
 * - Stage 1 (`chanceInOneOfStage1`): Ordinary Cumulonimbus Thunderstorm
 * - Stage 2 (`chanceInOneOfSquall` / `chanceInOneOfStage2`): Squall Line or Rotating Supercell Mesocyclone
 * - Stage 3 (`chanceInOneOfStage3`): Tornado Touchdown (EF0..EF5, up to 321 mph)
 * - WSR-88D Radar Modes: Reflectivity (`dBZ`), Radial Velocity (Hook Echo), Thermodynamic Debug (`CAPE`, `3CAPE`, `SRH`, `LCL`)
 */
export type PmWeatherStage =
  | 'stage0_developing'
  | 'stage1_thunderstorm'
  | 'stage2_squall'
  | 'stage2_supercell'
  | 'stage3_tornado'
  | 'dissipating';

export type EfRating = 'NONE' | 'EF0' | 'EF1' | 'EF2' | 'EF3' | 'EF4' | 'EF5';
export type Wsr88dRadarMode = 'reflectivity_dbz' | 'velocity_doppler' | 'thermodynamic_cape';

export interface PmWeatherServerConfig {
  spawnRangeBlocks: number; // default 384 in PMWeather
  stormChancePerMinute: number; // default 0.35
  chanceInOneOfStage1: number; // default 3
  chanceInOneOfSquall: number; // default 4
  chanceInOneOfStage2: number; // default 3 (Supercell)
  chanceInOneOfStage3: number; // default 2 (Tornado touchdown)
  maxIntensityEfCap: number; // 0..5 (EF0..EF5)
  tornadoBlockDestruction: boolean; // §6 Phase 3: ON/OFF toggle for lifting terrain blocks
  maxBlocksDestroyedPerTick: number; // Per-tick cap to prevent frame drops (§6 Phase 3)
  aimAtPlayer: boolean;
  radarMode: Wsr88dRadarMode;
}

export const DEFAULT_PMWEATHER_CONFIG: PmWeatherServerConfig = {
  spawnRangeBlocks: 384,
  stormChancePerMinute: 0.35,
  chanceInOneOfStage1: 3,
  chanceInOneOfSquall: 4,
  chanceInOneOfStage2: 3,
  chanceInOneOfStage3: 2,
  maxIntensityEfCap: 5,
  tornadoBlockDestruction: true,
  maxBlocksDestroyedPerTick: 3,
  aimAtPlayer: true,
  radarMode: 'reflectivity_dbz',
};

export interface PmStormCell {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  intensity: number; // 0.0 .. 1.0
  stage: PmWeatherStage;
  ageSec: number;
  lifetimeSec: number;
  funnelDescent: number; // 0.0 (aloft) .. 1.0 (touchdown over ~10 seconds per §6 Phase 2)
  windSpeedMph: number; // 40 .. 321 mph
  efRating: EfRating;
  dbzReflectivity: number; // 15 .. 72 dBZ on WSR-88D Radar
  capeJkg: number; // Convective Available Potential Energy (J/kg, up to 5500+)
  srhM2s2: number; // Storm-Relative Helicity (m^2/s^2, 150..650)
  hasHookEcho: boolean;
}

/**
 * Enhanced Fujita Scale (EF0–EF5) wind speed classification used in ProtoManly's Weather (§6 Phase 3).
 */
export function computeEfRatingFromMph(mph: number, touchedDown: boolean): EfRating {
  if (!touchedDown || mph < 65) return 'NONE';
  if (mph < 86) return 'EF0';
  if (mph < 111) return 'EF1';
  if (mph < 136) return 'EF2';
  if (mph < 166) return 'EF3';
  if (mph < 200) return 'EF4';
  return 'EF5';
}

export function formatTornadoHudLabel(efRating: EfRating, windMph: number): string {
  if (efRating === 'NONE') return '竜巻未接地（上空渦）';
  return `竜巻接地：${efRating} (${Math.round(windMph)} mph)`;
}

/**
 * §6 Phase 3: Determines whether a block at `(hardness, numericId)` can be lifted by the tornado wind field.
 * - Bedrock (5) and liquids (6) are never lifted.
 * - Soft blocks (leaves, shrub, grass, sand, dirt, snow, TNT) are lifted first (EF0–EF2).
 * - Hard blocks (logs, planks, cobblestone, stone) require strong EF3–EF5 wind speeds.
 */
export function canTornadoLiftBlock(
  blockNumericId: number,
  blockHardness: number,
  windStrengthMph: number,
  blockDestructionEnabled: boolean
): boolean {
  if (!blockDestructionEnabled) return false;
  if (blockNumericId === 0 || blockNumericId === 5 || blockNumericId === 6) return false;
  if (blockHardness < 0) return false;
  // Convert wind mph (65..300) into an effective hardness threshold (0.25 .. 2.8)
  const effectiveWindHardness = Math.max(0, (windStrengthMph - 62) / 72);
  return blockHardness <= effectiveWindHardness;
}

/**
 * §6 Phase 1: Generates a jagged 3D lightning bolt polyline from cloud altitude (`yStart = 112`)
 * down to ground `(xEnd, yEnd, zEnd)` via recursive midpoint displacement.
 */
export function generateJaggedLightningBolt(
  xStart: number,
  yStart: number,
  zStart: number,
  xEnd: number,
  yEnd: number,
  zEnd: number,
  seed = 1
): Array<[number, number, number]> {
  let pts: Array<[number, number, number]> = [
    [xStart, yStart, zStart],
    [xEnd, yEnd, zEnd],
  ];
  let disp = 6.5;
  let s = seed;
  const randSigned = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967295) * 2 - 1;
  };
  for (let iter = 0; iter < 4; iter++) {
    const next: Array<[number, number, number]> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a[0] + b[0]) * 0.5 + randSigned() * disp;
      const my = (a[1] + b[1]) * 0.5 + randSigned() * (disp * 0.25);
      const mz = (a[2] + b[2]) * 0.5 + randSigned() * disp;
      next.push(a, [mx, my, mz]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    disp *= 0.52;
  }
  return pts;
}

export class Weather2Simulation {
  activeDisaster: WeatherDisasterType = 'clear';
  windAngleRad = 0.55; // Wind blowing direction in radians
  windSpeed = 5.5; // m/s
  windOffset = { x: 0, y: 0, z: 0 }; // Cumulative 3D cloud advection offset
  stormCenter = { x: -18, z: -22 };
  lightningFlash = 0;
  pmConfig: PmWeatherServerConfig = { ...DEFAULT_PMWEATHER_CONFIG };
  stormCells: PmStormCell[] = [];
  private nextCellId = 1;

  constructor() {
    this.seedInitialStormCells();
  }

  seedInitialStormCells(): void {
    this.stormCells = [
      {
        id: this.nextCellId++,
        x: -18,
        z: -22,
        vx: 1.8,
        vz: 1.1,
        radius: 36,
        intensity: 0.28,
        stage: 'stage1_thunderstorm',
        ageSec: 12,
        lifetimeSec: 240,
        funnelDescent: 0,
        windSpeedMph: 48,
        efRating: 'NONE',
        dbzReflectivity: 38,
        capeJkg: 1850,
        srhM2s2: 190,
        hasHookEcho: false,
      },
      {
        id: this.nextCellId++,
        x: 34,
        z: -38,
        vx: -1.4,
        vz: 1.5,
        radius: 44,
        intensity: 0.62,
        stage: 'stage2_supercell',
        ageSec: 45,
        lifetimeSec: 300,
        funnelDescent: 0.25,
        windSpeedMph: 74,
        efRating: 'NONE',
        dbzReflectivity: 56,
        capeJkg: 3420,
        srhM2s2: 380,
        hasHookEcho: true,
      },
    ];
  }

  setDisaster(disaster: WeatherDisasterType): void {
    this.activeDisaster = disaster;
    const meta = WEATHER2_DISASTERS[disaster];
    this.windSpeed = (meta.windSpeedRange[0] + meta.windSpeedRange[1]) * 0.5;

    // Synchronize primary storm cell with selected disaster so WSR-88D radar & EF HUD reflect it immediately
    if (this.stormCells.length === 0) {
      this.seedInitialStormCells();
    }
    const primary = this.stormCells[0];
    primary.x = this.stormCenter.x;
    primary.z = this.stormCenter.z;

    if (disaster === 'clear') {
      primary.stage = 'stage0_developing';
      primary.intensity = 0.18;
      primary.funnelDescent = 0;
      primary.windSpeedMph = 24;
      primary.efRating = 'NONE';
      primary.dbzReflectivity = 18;
      primary.capeJkg = 650;
      primary.srhM2s2 = 60;
      primary.hasHookEcho = false;
    } else if (disaster === 'rain' || disaster === 'sandstorm') {
      primary.stage = 'stage1_thunderstorm';
      primary.intensity = 0.52;
      primary.funnelDescent = 0;
      primary.windSpeedMph = 52;
      primary.efRating = 'NONE';
      primary.dbzReflectivity = 44;
      primary.capeJkg = 1950;
      primary.srhM2s2 = 180;
      primary.hasHookEcho = false;
    } else if (disaster === 'thunder' || disaster === 'hailstorm' || disaster === 'meteor_shower') {
      primary.stage = 'stage2_supercell';
      primary.intensity = 0.78;
      primary.funnelDescent = 0.35;
      primary.windSpeedMph = 78;
      primary.efRating = 'NONE';
      primary.dbzReflectivity = 59;
      primary.capeJkg = 3650;
      primary.srhM2s2 = 410;
      primary.hasHookEcho = true;
    } else if (disaster === 'tornado_f1') {
      primary.stage = 'stage3_tornado';
      primary.intensity = 0.86;
      // Start descent or complete touchdown
      primary.funnelDescent = Math.max(primary.funnelDescent, 0.85);
      primary.windSpeedMph = 104;
      primary.efRating = computeEfRatingFromMph(primary.windSpeedMph, true);
      primary.dbzReflectivity = 64;
      primary.capeJkg = 4200;
      primary.srhM2s2 = 490;
      primary.hasHookEcho = true;
    } else if (disaster === 'tornado_f5' || disaster === 'hurricane') {
      primary.stage = 'stage3_tornado';
      primary.intensity = 0.98;
      primary.funnelDescent = 1.0;
      const capEf = this.pmConfig.maxIntensityEfCap;
      const maxMphByCap = [80, 105, 130, 158, 192, 268][Math.max(0, Math.min(5, capEf))];
      primary.windSpeedMph = disaster === 'hurricane' ? Math.min(maxMphByCap, 162) : maxMphByCap;
      primary.efRating = computeEfRatingFromMph(primary.windSpeedMph, true);
      primary.dbzReflectivity = 71;
      primary.capeJkg = 5480;
      primary.srhM2s2 = 640;
      primary.hasHookEcho = true;
    }
  }

  getActiveTornadoCell(): PmStormCell | null {
    return (
      this.stormCells.find((c) => c.stage === 'stage3_tornado' && c.funnelDescent >= 0.5) ?? null
    );
  }

  getPrimaryStormCell(): PmStormCell {
    if (this.stormCells.length === 0) this.seedInitialStormCells();
    return this.stormCells[0];
  }

  getWindVector(): { vx: number; vz: number; speed: number; compassDeg: number } {
    const vx = Math.cos(this.windAngleRad) * this.windSpeed;
    const vz = Math.sin(this.windAngleRad) * this.windSpeed;
    const compassDeg = ((Math.round((this.windAngleRad * 180) / Math.PI) % 360) + 360) % 360;
    return { vx, vz, speed: this.windSpeed, compassDeg };
  }

  /**
   * Computes the dynamic `vortexSwirl` uniform value from the current `windVec` and disaster metadata.
   */
  computeVortexSwirl(windVec = this.getWindVector()): number {
    const meta = WEATHER2_DISASTERS[this.activeDisaster];
    const normalizedWind = Math.min(2.2, windVec.speed / 28.0);
    return meta.vortexSwirlGain * (0.45 + 0.55 * normalizedWind);
  }

  /**
   * Evaluates the local 3D wind vector field at `(wx, wy, wz)`, combining global wind advection
   * with cyclonic tangential swirl, inward radial suction, and vertical updraft near `stormCenter`.
   */
  sampleLocalWindField(wx: number, wy: number, wz: number): LocalWindFieldSample {
    const meta = WEATHER2_DISASTERS[this.activeDisaster];
    const globalWind = this.getWindVector();
    const dx = wx - this.stormCenter.x;
    const dz = wz - this.stormCenter.z;
    const dist = Math.hypot(dx, dz);

    const influenceRadius = Math.max(28, meta.vortexRadius * 4.2 + 22);
    const stormProximity = Math.max(0, Math.min(1, 1 - dist / influenceRadius));
    const swirlIntensity = this.computeVortexSwirl(globalWind) * stormProximity;

    let vx = globalWind.vx;
    let vy = 0;
    let vz = globalWind.vz;

    let vortexSpeedContrib = 0;
    if (stormProximity > 0.001 && dist > 0.05) {
      const nx = dx / dist;
      const nz = dz / dist;
      // Counter-clockwise tangential vector (-nz, nx)
      const tx = -nz;
      const tz = nx;

      // Rankine-like vortex tangential speed peaks near vortexRadius
      const coreR = Math.max(3.5, meta.vortexRadius || 7.0);
      const rankineProfile =
        dist < coreR * 0.5
          ? Math.max(0.7, dist / (coreR * 0.5))
          : Math.min(1.0, coreR / Math.max(coreR, dist * 0.65));
      const tangentialSpeed =
        (globalWind.speed * 1.05 + meta.vortexSuctionStrength * 2.2) *
        rankineProfile *
        stormProximity;

      // Inward radial inflow near surface, outward anvil divergence above Y=115
      const altitudeDivergence = wy > 115 ? 0.35 : -0.65;
      const radialSpeed =
        (meta.vortexSuctionStrength * 0.65 + globalWind.speed * 0.15) *
        stormProximity *
        altitudeDivergence;

      const dvx = tx * tangentialSpeed + nx * radialSpeed;
      const dvz = tz * tangentialSpeed + nz * radialSpeed;
      vx += dvx;
      vz += dvz;

      // Strong mesocyclone updraft near the disaster core
      const updraftStrength =
        meta.vortexRadius > 0
          ? meta.vortexSuctionStrength * 1.15
          : globalWind.speed * 0.22 * meta.vortexSwirlGain;
      vy = updraftStrength * Math.pow(stormProximity, 1.25);
      vortexSpeedContrib = Math.hypot(dvx, vy, dvz);
    }

    const localSpeed = Math.max(Math.hypot(vx, vy, vz), globalWind.speed + vortexSpeedContrib * 0.75);
    return {
      vx,
      vy,
      vz,
      localSpeed,
      stormProximity,
      swirlIntensity,
    };
  }

  step(dt: number, elapsedSec: number): void {
    const meta = WEATHER2_DISASTERS[this.activeDisaster];
    // Smoothly vary wind angle and speed within disaster's physical envelope
    this.windAngleRad += Math.sin(elapsedSec * 0.17) * 0.04 * dt;
    const targetSpeed =
      meta.windSpeedRange[0] +
      (meta.windSpeedRange[1] - meta.windSpeedRange[0]) * (0.5 + 0.5 * Math.sin(elapsedSec * 0.43));
    this.windSpeed += (targetSpeed - this.windSpeed) * Math.min(1, dt * 2.5);

    const { vx, vz } = this.getWindVector();
    // Advect 3D volumetric cloud coordinates along the live wind vector
    this.windOffset.x += vx * dt * 0.48;
    this.windOffset.z += vz * dt * 0.48;
    this.windOffset.y = Math.sin(elapsedSec * 0.24) * 1.6;

    // Move storm cell / tornado center along wind vector bounded around playable arena
    this.stormCenter.x += vx * dt * 0.22;
    this.stormCenter.z += vz * dt * 0.22;
    if (this.stormCenter.x > 42) this.stormCenter.x = -42;
    if (this.stormCenter.x < -42) this.stormCenter.x = 42;
    if (this.stormCenter.z > 42) this.stormCenter.z = -42;
    if (this.stormCenter.z < -42) this.stormCenter.z = 42;

    // Step PMWeather Storm Cells (§6 Phase 1–3)
    if (this.stormCells.length === 0) {
      this.seedInitialStormCells();
    }
    for (let i = 0; i < this.stormCells.length; i++) {
      const cell = this.stormCells[i];
      cell.ageSec += dt;
      if (i === 0) {
        cell.x = this.stormCenter.x;
        cell.z = this.stormCenter.z;
        cell.vx = vx * 0.22;
        cell.vz = vz * 0.22;
      } else {
        cell.x += cell.vx * dt;
        cell.z += cell.vz * dt;
        if (cell.x > 64) cell.x = -64;
        if (cell.x < -64) cell.x = 64;
        if (cell.z > 64) cell.z = -64;
        if (cell.z < -64) cell.z = 64;
      }

      // ~10s funnel descent when in Stage 3 Tornado (§6 Phase 2)
      if (cell.stage === 'stage3_tornado') {
        cell.funnelDescent = Math.min(1.0, cell.funnelDescent + dt / 10.0);
        const capEf = this.pmConfig.maxIntensityEfCap;
        const maxMphByCap = [80, 105, 130, 158, 192, 268][Math.max(0, Math.min(5, capEf))];
        const baseMph = this.activeDisaster === 'tornado_f1' ? 104 : 235;
        cell.windSpeedMph = Math.min(maxMphByCap, baseMph + Math.sin(elapsedSec * 0.8) * 12);
        cell.efRating = computeEfRatingFromMph(cell.windSpeedMph, cell.funnelDescent >= 0.65);
      } else {
        cell.funnelDescent = Math.max(0, cell.funnelDescent - dt / 8.0);
        cell.efRating = 'NONE';
      }
    }

    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.2);
  }

  private hash3(ix: number, iy: number, iz: number): number {
    let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 2147483647)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  private noise3D(x: number, y: number, z: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fy = y - iy;
    const fz = z - iz;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const w = fz * fz * (3 - 2 * fz);

    const n000 = this.hash3(ix, iy, iz);
    const n100 = this.hash3(ix + 1, iy, iz);
    const n010 = this.hash3(ix, iy + 1, iz);
    const n110 = this.hash3(ix + 1, iy + 1, iz);
    const n001 = this.hash3(ix, iy, iz + 1);
    const n101 = this.hash3(ix + 1, iy, iz + 1);
    const n011 = this.hash3(ix, iy + 1, iz + 1);
    const n111 = this.hash3(ix + 1, iy + 1, iz + 1);

    const nx00 = n000 + (n100 - n000) * u;
    const nx10 = n010 + (n110 - n010) * u;
    const nx01 = n001 + (n101 - n001) * u;
    const nx11 = n011 + (n111 - n011) * u;
    const nxy0 = nx00 + (nx10 - nx00) * v;
    const nxy1 = nx01 + (nx11 - nx01) * v;
    return nxy0 + (nxy1 - nxy0) * w;
  }

  /**
   * Evaluates ProtoManly's Weather (PMWeather) 3D volumetric cumulonimbus & supercell cloud density (0.0 .. 1.0)
   * at world coordinates `(wx, wy, wz)`, including wind advection, upper-level anvil shear, and wall cloud lowering.
   */
  sampleVolumetricCloudDensity(wx: number, wy: number, wz: number): number {
    const meta = WEATHER2_DISASTERS[this.activeDisaster];
    const windVec = this.getWindVector();
    const dxStorm = wx - this.stormCenter.x;
    const dzStorm = wz - this.stormCenter.z;
    const distToStorm = Math.hypot(dxStorm, dzStorm);

    // Mesocyclone spiral coordinate twist near stormCenter
    const swirl = this.computeVortexSwirl(windVec);
    let sampleX = wx - this.windOffset.x;
    let sampleZ = wz - this.windOffset.z;
    if (swirl > 0.1 && distToStorm < 85) {
      const twistAngle = (1 - distToStorm / 85) * swirl * 1.85;
      const cosA = Math.cos(twistAngle);
      const sinA = Math.sin(twistAngle);
      const rx = dxStorm * cosA - dzStorm * sinA;
      const rz = dxStorm * sinA + dzStorm * cosA;
      sampleX = this.stormCenter.x + rx - this.windOffset.x;
      sampleZ = this.stormCenter.z + rz - this.windOffset.z;
    }

    // Upper-level anvil wind shear (clouds tilt downwind with altitude like PMWeather supercells)
    const altitudeAboveBase = Math.max(0, wy - 104);
    sampleX -= (windVec.vx * altitudeAboveBase) * 0.04;
    sampleZ -= (windVec.vz * altitudeAboveBase) * 0.04;

    const sx = sampleX * 0.019;
    const sy = (wy - this.windOffset.y) * 0.042;
    const sz = sampleZ * 0.019;

    let fbm = 0;
    let amp = 0.55;
    let freq = 1.0;
    for (let i = 0; i < 4; i++) {
      fbm += this.noise3D(sx * freq, sy * freq, sz * freq) * amp;
      freq *= 2.03;
      amp *= 0.5;
    }

    // Supercell wall cloud & anvil boost near storm center
    const stormWallBoost = Math.max(0, 1 - distToStorm / 52) * (0.24 + swirl * 0.12);
    const threshold = 1.0 - meta.cloudCoverage;
    const raw = (fbm + stormWallBoost - threshold) / Math.max(0.15, meta.cloudCoverage);
    return Math.max(0, Math.min(1, raw));
  }
}

