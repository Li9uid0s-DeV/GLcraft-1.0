/**
 * Weather2 Remastered - 3D Volumetric Cloud Advection, Wind Vector Physics & Multi-Disaster Engine
 * Provides pure deterministic math for CPU storm cell tracking + GPU GLSL volumetric shader uniforms.
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
  fogColorHex: number;
  fogDensity: number;
  vortexRadius: number; // 0 if no funnel
  vortexSuctionStrength: number;
  precipitationType: 'none' | 'rain' | 'hail' | 'sand' | 'meteor';
}

export const WEATHER2_DISASTERS: Record<WeatherDisasterType, WeatherDisasterMeta> = {
  clear: {
    id: 'clear',
    label: 'Clear Cumulus',
    jpLabel: '晴天（積雲）',
    windSpeedRange: [3, 7],
    cloudCoverage: 0.36,
    cloudDarkness: 0.12,
    fogColorHex: 0x6ba8e5,
    fogDensity: 0.009,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    precipitationType: 'none',
  },
  rain: {
    id: 'rain',
    label: 'Heavy Rainstorm',
    jpLabel: '暴風雨',
    windSpeedRange: [11, 16],
    cloudCoverage: 0.72,
    cloudDarkness: 0.55,
    fogColorHex: 0x4b5d73,
    fogDensity: 0.016,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    precipitationType: 'rain',
  },
  thunder: {
    id: 'thunder',
    label: 'Supercell Lightning',
    jpLabel: 'スーパーセル雷雨',
    windSpeedRange: [16, 23],
    cloudCoverage: 0.84,
    cloudDarkness: 0.76,
    fogColorHex: 0x2f3b4c,
    fogDensity: 0.02,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    precipitationType: 'rain',
  },
  hailstorm: {
    id: 'hailstorm',
    label: 'Severe Hailstorm',
    jpLabel: '巨大雹嵐（ひょう嵐）',
    windSpeedRange: [18, 26],
    cloudCoverage: 0.86,
    cloudDarkness: 0.68,
    fogColorHex: 0x4c5f6e,
    fogDensity: 0.022,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    precipitationType: 'hail',
  },
  sandstorm: {
    id: 'sandstorm',
    label: 'Haboob Sandstorm',
    jpLabel: '巨大砂嵐（ハブーブ）',
    windSpeedRange: [24, 34],
    cloudCoverage: 0.92,
    cloudDarkness: 0.62,
    fogColorHex: 0xb87d3e,
    fogDensity: 0.032,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    precipitationType: 'sand',
  },
  tornado_f1: {
    id: 'tornado_f1',
    label: 'EF1 Rope Tornado',
    jpLabel: 'EF1 ロープ竜巻',
    windSpeedRange: [28, 38],
    cloudCoverage: 0.82,
    cloudDarkness: 0.75,
    fogColorHex: 0x3b4754,
    fogDensity: 0.019,
    vortexRadius: 5.5,
    vortexSuctionStrength: 7.5,
    precipitationType: 'rain',
  },
  tornado_f5: {
    id: 'tornado_f5',
    label: 'EF5 Wedge Tornado',
    jpLabel: 'EF5 超巨大ウェッジ竜巻',
    windSpeedRange: [45, 68],
    cloudCoverage: 0.95,
    cloudDarkness: 0.92,
    fogColorHex: 0x222930,
    fogDensity: 0.026,
    vortexRadius: 12.5,
    vortexSuctionStrength: 16.0,
    precipitationType: 'rain',
  },
  hurricane: {
    id: 'hurricane',
    label: 'Cat-5 Hurricane / Typhoon',
    jpLabel: 'カテゴリー5 超大型ハリケーン',
    windSpeedRange: [38, 55],
    cloudCoverage: 0.94,
    cloudDarkness: 0.85,
    fogColorHex: 0x283845,
    fogDensity: 0.028,
    vortexRadius: 9.5,
    vortexSuctionStrength: 11.5,
    precipitationType: 'rain',
  },
  meteor_shower: {
    id: 'meteor_shower',
    label: 'Apocalyptic Firestorm',
    jpLabel: '隕石嵐（ファイアストーム）',
    windSpeedRange: [15, 25],
    cloudCoverage: 0.78,
    cloudDarkness: 0.82,
    fogColorHex: 0x4a231b,
    fogDensity: 0.021,
    vortexRadius: 0,
    vortexSuctionStrength: 0,
    precipitationType: 'meteor',
  },
};

export const WEATHER2_DISASTER_LIST: WeatherDisasterMeta[] = Object.values(WEATHER2_DISASTERS);

export class Weather2Simulation {
  activeDisaster: WeatherDisasterType = 'clear';
  windAngleRad = 0.55; // Wind blowing direction in radians
  windSpeed = 5.2; // m/s
  windOffset = { x: 0, y: 0, z: 0 }; // Cumulative 3D cloud advection offset
  stormCenter = { x: -16, z: -20 };
  lightningFlash = 0;

  setDisaster(disaster: WeatherDisasterType): void {
    this.activeDisaster = disaster;
    const meta = WEATHER2_DISASTERS[disaster];
    this.windSpeed = (meta.windSpeedRange[0] + meta.windSpeedRange[1]) * 0.5;
  }

  getWindVector(): { vx: number; vz: number; speed: number; compassDeg: number } {
    const vx = Math.cos(this.windAngleRad) * this.windSpeed;
    const vz = Math.sin(this.windAngleRad) * this.windSpeed;
    const compassDeg = ((Math.round((this.windAngleRad * 180) / Math.PI) % 360) + 360) % 360;
    return { vx, vz, speed: this.windSpeed, compassDeg };
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
    this.windOffset.x += vx * dt * 0.45;
    this.windOffset.z += vz * dt * 0.45;
    this.windOffset.y = Math.sin(elapsedSec * 0.2) * 1.5;

    // Move storm cell / tornado center along wind vector bounded around playable arena
    this.stormCenter.x += vx * dt * 0.22;
    this.stormCenter.z += vz * dt * 0.22;
    if (this.stormCenter.x > 42) this.stormCenter.x = -42;
    if (this.stormCenter.x < -42) this.stormCenter.x = 42;
    if (this.stormCenter.z > 42) this.stormCenter.z = -42;
    if (this.stormCenter.z < -42) this.stormCenter.z = 42;

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
   * Evaluates 3D volumetric FBM cloud density (0.0 .. 1.0) at world coordinates `(wx, wy, wz)`,
   * advected by `windOffset` and boosted near the active storm cell center.
   */
  sampleVolumetricCloudDensity(wx: number, wy: number, wz: number): number {
    const meta = WEATHER2_DISASTERS[this.activeDisaster];
    const sx = (wx - this.windOffset.x) * 0.018;
    const sy = (wy - this.windOffset.y) * 0.045;
    const sz = (wz - this.windOffset.z) * 0.018;

    let fbm = 0;
    let amp = 0.55;
    let freq = 1.0;
    for (let i = 0; i < 4; i++) {
      fbm += this.noise3D(sx * freq, sy * freq, sz * freq) * amp;
      freq *= 2.02;
      amp *= 0.5;
    }

    // Storm cell proximity wall boost
    const distToStorm = Math.hypot(wx - this.stormCenter.x, wz - this.stormCenter.z);
    const stormWallBoost = Math.max(0, 1 - distToStorm / 45) * 0.28;
    const threshold = 1.0 - meta.cloudCoverage;
    const raw = (fbm + stormWallBoost - threshold) / Math.max(0.15, meta.cloudCoverage);
    return Math.max(0, Math.min(1, raw));
  }
}
