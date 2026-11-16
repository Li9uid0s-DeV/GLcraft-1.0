import * as THREE from 'three';

/**
 * §2, §3, §4, §5: Player Character Rig, 64x64 Canvas Skin, Exponentially Damped Procedural Animation,
 * 4 Hostile Mob Archetypes (Zombie, Skeleton, Spider, Camo Bomber), AI State Machine & Pooled Arrows.
 * All textures are procedurally generated on Canvas (`NearestFilter`). Zero external assets used.
 */

export const PX_SCALE = 1 / 16; // 16 pixels = 1.0 voxel block
export const MAX_ACTIVE_MOBS = 24;
export const MOB_DESPAWN_DIST = 64;
export const MOB_DETECT_DIST = 16;

export type MobArchetype = 'zombie' | 'skeleton' | 'spider' | 'creeper';
export type MobAiState = 'idle' | 'alert' | 'chase' | 'attack' | 'hurt' | 'dead';

/**
 * Builds a BoxGeometry with pixel dimensions `(wPx, hPx, dPx)` scaled by `1/16`,
 * shifted by `pivotOffsetPx` so `group.rotation` rotates around the anatomical joint
 * (neck bottom, shoulder top, hip top), and maps per-face UVs onto a `(texW x texH)` pixel sheet.
 */
export function createUvBoxGeometry(
  wPx: number,
  hPx: number,
  dPx: number,
  uOrigin: number,
  vOrigin: number,
  pivotOffsetPx: [number, number, number] = [0, 0, 0],
  texW = 64,
  texH = 64
): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(wPx * PX_SCALE, hPx * PX_SCALE, dPx * PX_SCALE);
  geom.translate(
    pivotOffsetPx[0] * PX_SCALE,
    pivotOffsetPx[1] * PX_SCALE,
    pivotOffsetPx[2] * PX_SCALE
  );

  // Standard Minecraft Box-UV layout relative to (uOrigin, vOrigin):
  // Top:    [u + d,         v,     w, d]
  // Bottom: [u + d + w,     v,     w, d]
  // Right:  [u,             v + d, d, h]
  // Front:  [u + d,         v + d, w, h]
  // Left:   [u + d + w,     v + d, d, h]
  // Back:   [u + d + w + d, v + d, w, h]
  const uvAttr = geom.attributes.uv as THREE.BufferAttribute;
  const setFaceUv = (faceIdx: number, x: number, y: number, w: number, h: number) => {
    const pad = 0.08;
    const u0 = (x + pad) / texW;
    const u1 = (x + w - pad) / texW;
    const v1 = 1 - (y + pad) / texH;
    const v0 = 1 - (y + h - pad) / texH;
    const base = faceIdx * 4;
    uvAttr.setXY(base + 0, u0, v1);
    uvAttr.setXY(base + 1, u1, v1);
    uvAttr.setXY(base + 2, u0, v0);
    uvAttr.setXY(base + 3, u1, v0);
  };

  // Three.js BoxGeometry face order: 0:+X(Left), 1:-X(Right), 2:+Y(Top), 3:-Y(Bottom), 4:+Z(Front), 5:-Z(Back)
  setFaceUv(0, uOrigin + dPx + wPx, vOrigin + dPx, dPx, hPx);
  setFaceUv(1, uOrigin, vOrigin + dPx, dPx, hPx);
  setFaceUv(2, uOrigin + dPx, vOrigin, wPx, dPx);
  setFaceUv(3, uOrigin + dPx + wPx, vOrigin, wPx, dPx);
  setFaceUv(4, uOrigin + dPx, vOrigin + dPx, wPx, hPx);
  setFaceUv(5, uOrigin + dPx + wPx + dPx, vOrigin + dPx, wPx, hPx);
  uvAttr.needsUpdate = true;
  return geom;
}

function hashPx(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function fillPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  noiseAmp = 10,
  seed = 1
): void {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const n = (hashPx(px, py, seed) - 0.5) * 2 * noiseAmp;
      const edge = py === y ? 6 : py === y + h - 1 ? -8 : 0;
      const r = Math.max(0, Math.min(255, Math.round(rgb[0] + n + edge)));
      const g = Math.max(0, Math.min(255, Math.round(rgb[1] + n + edge)));
      const b = Math.max(0, Math.min(255, Math.round(rgb[2] + n + edge)));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

/**
 * §2.2: 64x64 Canvas-generated Player Skin Texture (Explorer Jacket, Hair, Eyes, Boots)
 */
export function generatePlayerSkinTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Base warm skin tone on Head (0,0..32,16)
  fillPixelRect(ctx, 0, 0, 32, 16, [232, 182, 146], 8, 11);
  // Dark espresso hair on top, back & sides of head
  fillPixelRect(ctx, 8, 0, 8, 8, [58, 38, 26], 10, 12);
  fillPixelRect(ctx, 0, 8, 8, 5, [58, 38, 26], 10, 13);
  fillPixelRect(ctx, 16, 8, 16, 6, [58, 38, 26], 10, 14);
  // Bangs on forehead (Front face is x=8..15, y=8..15)
  fillPixelRect(ctx, 8, 8, 8, 2, [64, 42, 28], 8, 15);
  // Crisp eyes (white sclera + teal-blue iris)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 11, 1, 1);
  ctx.fillRect(14, 11, 1, 1);
  ctx.fillStyle = '#1b768f';
  ctx.fillRect(10, 11, 1, 1);
  ctx.fillRect(13, 11, 1, 1);
  // Nose/mouth shadow
  ctx.fillStyle = '#b87d5b';
  ctx.fillRect(11, 13, 2, 1);

  // Hat outer layer (32,0..64,16): Explorer goggles strap on forehead
  fillPixelRect(ctx, 40, 9, 8, 2, [45, 52, 62], 5, 16);
  ctx.fillStyle = '#f5b942';
  ctx.fillRect(41, 9, 2, 2);
  ctx.fillRect(45, 9, 2, 2);

  // Torso (16,16..40,32): Teal-cyan adventurer tunic with leather belt
  fillPixelRect(ctx, 16, 16, 24, 16, [38, 138, 148], 12, 21);
  fillPixelRect(ctx, 20, 30, 8, 2, [72, 46, 28], 6, 22); // Belt
  ctx.fillStyle = '#f0c43e';
  ctx.fillRect(23, 30, 2, 2); // Gold buckle

  // Right Arm (40,16..56,32) & Left Arm (32,48..48,64): Rolled sleeves + skin hands
  fillPixelRect(ctx, 40, 16, 16, 10, [34, 124, 134], 10, 31);
  fillPixelRect(ctx, 40, 26, 16, 6, [232, 182, 146], 8, 32);
  fillPixelRect(ctx, 32, 48, 16, 10, [34, 124, 134], 10, 33);
  fillPixelRect(ctx, 32, 58, 16, 6, [232, 182, 146], 8, 34);

  // Right Leg (0,16..16,32) & Left Leg (16,48..32,64): Indigo field trousers + dark boots
  fillPixelRect(ctx, 0, 16, 16, 13, [48, 62, 108], 10, 41);
  fillPixelRect(ctx, 0, 29, 16, 3, [46, 36, 30], 6, 42);
  fillPixelRect(ctx, 16, 48, 16, 13, [48, 62, 108], 10, 43);
  fillPixelRect(ctx, 16, 61, 16, 3, [46, 36, 30], 6, 44);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

/**
 * §4.3: 64x64 / 64x32 Canvas-generated Hostile Mob Skins (Zero Mojang Assets)
 */
export function generateMobSkinTexture(archetype: MobArchetype): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  if (archetype === 'zombie') {
    // Mossy green undead skin + tattered teal shirt & indigo pants
    fillPixelRect(ctx, 0, 0, 32, 16, [84, 136, 76], 16, 101);
    ctx.fillStyle = '#182414';
    ctx.fillRect(9, 11, 2, 2);
    ctx.fillRect(13, 11, 2, 2);
    ctx.fillRect(10, 14, 4, 1);
    fillPixelRect(ctx, 16, 16, 24, 16, [44, 112, 118], 18, 102);
    fillPixelRect(ctx, 40, 16, 16, 16, [84, 136, 76], 16, 103);
    fillPixelRect(ctx, 0, 16, 16, 16, [52, 56, 96], 14, 104);
  } else if (archetype === 'skeleton') {
    // weathered ivory bone + dark ribcage & hollow eye sockets
    fillPixelRect(ctx, 0, 0, 64, 64, [216, 214, 204], 14, 201);
    ctx.fillStyle = '#242220';
    ctx.fillRect(9, 10, 2, 2);
    ctx.fillRect(13, 10, 2, 2);
    ctx.fillRect(11, 12, 2, 1);
    ctx.fillRect(9, 14, 6, 1);
    // Ribcage horizontal hollow bars on torso
    for (let ry = 21; ry <= 29; ry += 2) {
      ctx.fillRect(21, ry, 2, 1);
      ctx.fillRect(25, ry, 2, 1);
    }
  } else if (archetype === 'spider') {
    // Dark charcoal chitin + crimson eye cluster
    fillPixelRect(ctx, 0, 0, 64, 64, [38, 34, 42], 14, 301);
    ctx.fillStyle = '#e6192e';
    ctx.fillRect(9, 9, 2, 2);
    ctx.fillRect(13, 9, 2, 2);
    ctx.fillRect(8, 11, 1, 1);
    ctx.fillRect(15, 11, 1, 1);
    ctx.fillStyle = '#70292f';
    ctx.fillRect(20, 20, 8, 8);
  } else {
    // Original Camo Stalker (爆発型): digital leaf-moss camouflage + original glowing amber-black visor face
    fillPixelRect(ctx, 0, 0, 64, 64, [72, 168, 64], 28, 401);
    // Original geometric visor & vent face (distinct from Mojang layout)
    ctx.fillStyle = '#142612';
    ctx.fillRect(9, 9, 6, 2); // Visor band
    ctx.fillRect(11, 12, 2, 3); // Vertical respirator slot
    ctx.fillRect(9, 13, 1, 2);
    ctx.fillRect(14, 13, 1, 2);
    ctx.fillStyle = '#b8ff66';
    ctx.fillRect(10, 9, 1, 1);
    ctx.fillRect(13, 9, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export interface PlayerCharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  heldItemMesh: THREE.Mesh;
  material: THREE.MeshLambertMaterial;
}

export function createPlayerCharacterRig(): PlayerCharacterRig {
  const skinTex = generatePlayerSkinTexture();
  const material = new THREE.MeshLambertMaterial({ map: skinTex });

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  // Waist center is at Y = 12px (0.75 blocks above ground)
  bodyGroup.position.set(0, 12 * PX_SCALE, 0);
  root.add(bodyGroup);

  // Torso: 8x12x4 (centered on waist to neck: 0..12px)
  const torsoGeom = createUvBoxGeometry(8, 12, 4, 16, 16, [0, 6, 0]);
  const torsoMesh = new THREE.Mesh(torsoGeom, material);
  bodyGroup.add(torsoMesh);

  // Head: 8x8x8 with neck bottom pivot at Y = 12px above waist
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 12 * PX_SCALE, 0);
  const headGeom = createUvBoxGeometry(8, 8, 8, 0, 0, [0, 4, 0]);
  const hatGeom = createUvBoxGeometry(8.5, 8.5, 8.5, 32, 0, [0, 4, 0]);
  headGroup.add(new THREE.Mesh(headGeom, material));
  headGroup.add(new THREE.Mesh(hatGeom, material));
  bodyGroup.add(headGroup);

  // Right Arm: 4x12x4 with shoulder top pivot at (-6px, 11px, 0)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-6 * PX_SCALE, 11 * PX_SCALE, 0);
  const rightArmGeom = createUvBoxGeometry(4, 12, 4, 40, 16, [0, -5, 0]);
  rightArmGroup.add(new THREE.Mesh(rightArmGeom, material));

  // Held block/item indicator at right hand tip
  const heldGeom = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const heldMat = new THREE.MeshLambertMaterial({ color: 0xfad11f });
  const heldItemMesh = new THREE.Mesh(heldGeom, heldMat);
  heldItemMesh.position.set(0, -9.5 * PX_SCALE, -3 * PX_SCALE);
  rightArmGroup.add(heldItemMesh);
  bodyGroup.add(rightArmGroup);

  // Left Arm: 4x12x4 with shoulder top pivot at (+6px, 11px, 0)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(6 * PX_SCALE, 11 * PX_SCALE, 0);
  const leftArmGeom = createUvBoxGeometry(4, 12, 4, 32, 48, [0, -5, 0]);
  leftArmGroup.add(new THREE.Mesh(leftArmGeom, material));
  bodyGroup.add(leftArmGroup);

  // Right Leg: 4x12x4 with hip top pivot at (-2px, 0, 0)
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-2 * PX_SCALE, 0, 0);
  const rightLegGeom = createUvBoxGeometry(4, 12, 4, 0, 16, [0, -6, 0]);
  rightLegGroup.add(new THREE.Mesh(rightLegGeom, material));
  bodyGroup.add(rightLegGroup);

  // Left Leg: 4x12x4 with hip top pivot at (+2px, 0, 0)
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(2 * PX_SCALE, 0, 0);
  const leftLegGeom = createUvBoxGeometry(4, 12, 4, 16, 48, [0, -6, 0]);
  leftLegGroup.add(new THREE.Mesh(leftLegGeom, material));
  bodyGroup.add(leftLegGroup);

  return {
    root,
    bodyGroup,
    headGroup,
    rightArmGroup,
    leftArmGroup,
    rightLegGroup,
    leftLegGroup,
    heldItemMesh,
    material,
  };
}

/**
 * §3: Player Procedural Animation State & Pure Update Function
 */
export interface PlayerAnimState {
  walkCycle: number;
  limbSwingAmount: number;
  swingProgress: number; // 0 = idle, 0.001..1.0 = active ~0.3s swing
  hurtTimer: number; // 0.2s red flash on hit
  deathTimer: number; // 0..1 topple to -90 deg
  headYaw: number;
  headPitch: number;
  bodyYaw: number;
  bodyPitch: number;
  rightArmPitch: number;
  rightArmYaw: number;
  rightArmRoll: number;
  leftArmPitch: number;
  leftArmRoll: number;
  rightLegPitch: number;
  leftLegPitch: number;
  rightLegRoll: number;
  leftLegRoll: number;
  fovBoostDeg: number;
}

export function createInitialPlayerAnimState(): PlayerAnimState {
  return {
    walkCycle: 0,
    limbSwingAmount: 0,
    swingProgress: 0,
    hurtTimer: 0,
    deathTimer: 0,
    headYaw: 0,
    headPitch: 0,
    bodyYaw: 0,
    bodyPitch: 0,
    rightArmPitch: 0,
    rightArmYaw: 0,
    rightArmRoll: 0,
    leftArmPitch: 0,
    leftArmRoll: 0,
    rightLegPitch: 0,
    leftLegPitch: 0,
    rightLegRoll: 0,
    leftLegRoll: 0,
    fovBoostDeg: 0,
  };
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function normalizeAngleDiff(a: number, b: number): number {
  let diff = (a - b) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Triggers or restarts the ~0.3s dominant-arm attack/dig swing cleanly from t=0 (§3.1.6).
 */
export function triggerPlayerSwing(state: PlayerAnimState): void {
  state.swingProgress = 0.001;
}

export function triggerPlayerHurt(state: PlayerAnimState): void {
  state.hurtTimer = 0.2;
}

export function stepPlayerProceduralAnimation(
  state: PlayerAnimState,
  input: {
    dt: number;
    timeSec: number;
    vx: number;
    vy: number;
    vz: number;
    onGround: boolean;
    isSprinting: boolean;
    isSwimming: boolean;
    hasHeldItem: boolean;
    cameraYaw: number;
    cameraPitch: number;
    isDead: boolean;
  }
): PlayerAnimState {
  const dt = Math.min(0.1, Math.max(0.001, input.dt));
  const horizSpeed = Math.hypot(input.vx, input.vz);

  // 1. Head tracks camera look immediately; Body yaw follows with exponential lag & clamps neck twist to +-50 deg (§3.1.8)
  state.headYaw = input.cameraYaw;
  state.headPitch = Math.max(-1.2, Math.min(1.2, input.cameraPitch));

  const yawLagSpeed = horizSpeed > 0.25 ? 14.0 : 5.5;
  const yawDiff = normalizeAngleDiff(state.headYaw, state.bodyYaw);
  state.bodyYaw += yawDiff * (1 - Math.exp(-yawLagSpeed * dt));
  const clampedDiff = normalizeAngleDiff(state.headYaw, state.bodyYaw);
  const maxNeckRad = 0.87; // ~50 deg
  if (Math.abs(clampedDiff) > maxNeckRad) {
    state.bodyYaw = state.headYaw - Math.sign(clampedDiff) * maxNeckRad;
  }

  // 2. Walk & Sprint cycle accumulation (§3.1.1 & §3.1.2)
  const targetSwingAmt = input.onGround
    ? Math.min(1.35, (horizSpeed / 4.5) * (input.isSprinting ? 1.32 : 1.0))
    : Math.min(0.45, horizSpeed / 7.0);
  state.limbSwingAmount = damp(state.limbSwingAmount, targetSwingAmt, 14, dt);
  if (horizSpeed > 0.05) {
    state.walkCycle += horizSpeed * dt * (input.isSprinting ? 3.2 : 2.6);
  }

  // 3. Target limb poses (Walk + Idle breathing + Jump/Fall + Swim + Held Item)
  const breatheX = Math.sin(input.timeSec * 2.1) * 0.045;
  const breatheZ = (Math.cos(input.timeSec * 1.6) + 1) * 0.035;

  let targetRightArmPitch = Math.sin(state.walkCycle + Math.PI) * 0.78 * state.limbSwingAmount + breatheX;
  let targetLeftArmPitch = Math.sin(state.walkCycle) * 0.78 * state.limbSwingAmount - breatheX;
  let targetRightArmRoll = breatheZ;
  let targetLeftArmRoll = -breatheZ;
  let targetRightArmYaw = 0;

  let targetRightLegPitch = Math.sin(state.walkCycle) * 0.86 * state.limbSwingAmount;
  let targetLeftLegPitch = Math.sin(state.walkCycle + Math.PI) * 0.86 * state.limbSwingAmount;
  let targetRightLegRoll = 0;
  let targetLeftLegRoll = 0;
  let targetBodyPitch = input.isSprinting && horizSpeed > 1.0 ? 0.22 : 0;

  // Held Item forward arm bend (§3.1.7)
  if (input.hasHeldItem) {
    targetRightArmPitch = targetRightArmPitch * 0.5 - 0.34;
  }

  // Jump / Fall pose (§3.1.4): legs open slightly, arms raise with downward fall speed
  if (!input.onGround && !input.isSwimming) {
    const fallLift = Math.min(0.95, Math.max(0.15, -input.vy * 0.08));
    targetRightArmRoll += fallLift * 0.55;
    targetLeftArmRoll -= fallLift * 0.55;
    targetRightArmPitch -= fallLift * 0.45;
    targetLeftArmPitch -= fallLift * 0.45;
    targetRightLegRoll = 0.08;
    targetLeftLegRoll = -0.08;
  }

  // Swim crawl pose (§3.1.5)
  if (input.isSwimming) {
    targetBodyPitch = 1.28;
    targetRightArmPitch = Math.sin(input.timeSec * 6.5) * 1.25;
    targetLeftArmPitch = Math.sin(input.timeSec * 6.5 + Math.PI) * 1.25;
    targetRightLegPitch = Math.sin(input.timeSec * 8.0) * 0.55;
    targetLeftLegPitch = Math.sin(input.timeSec * 8.0 + Math.PI) * 0.55;
  }

  // Attack / Dig ~0.3s eased swing arc (§3.1.6)
  if (state.swingProgress > 0) {
    state.swingProgress += dt / 0.28;
    if (state.swingProgress >= 1.0) {
      state.swingProgress = 0;
    } else {
      const s = Math.sin(Math.sqrt(state.swingProgress) * Math.PI);
      targetRightArmPitch -= s * 1.45;
      targetRightArmYaw -= Math.sin(state.swingProgress * Math.PI) * 0.42;
    }
  }

  // Hurt & Death timers (§3.1.9 & §3.1.10)
  if (state.hurtTimer > 0) {
    state.hurtTimer = Math.max(0, state.hurtTimer - dt);
  }
  if (input.isDead) {
    state.deathTimer = Math.min(1, state.deathTimer + dt / 0.2);
  } else {
    state.deathTimer = 0;
  }

  // Exponential damping so transitions never snap
  state.bodyPitch = damp(state.bodyPitch, targetBodyPitch, 14, dt);
  state.rightArmPitch = damp(state.rightArmPitch, targetRightArmPitch, 18, dt);
  state.rightArmYaw = damp(state.rightArmYaw, targetRightArmYaw, 18, dt);
  state.rightArmRoll = damp(state.rightArmRoll, targetRightArmRoll, 16, dt);
  state.leftArmPitch = damp(state.leftArmPitch, targetLeftArmPitch, 16, dt);
  state.leftArmRoll = damp(state.leftArmRoll, targetLeftArmRoll, 16, dt);
  state.rightLegPitch = damp(state.rightLegPitch, targetRightLegPitch, 16, dt);
  state.leftLegPitch = damp(state.leftLegPitch, targetLeftLegPitch, 16, dt);
  state.rightLegRoll = damp(state.rightLegRoll, targetRightLegRoll, 14, dt);
  state.leftLegRoll = damp(state.leftLegRoll, targetLeftLegRoll, 14, dt);
  state.fovBoostDeg = damp(state.fovBoostDeg, input.isSprinting && horizSpeed > 1.2 ? 9.5 : 0, 10, dt);

  return state;
}

export function applyAnimStateToPlayerRig(
  rig: PlayerCharacterRig,
  state: PlayerAnimState,
  px: number,
  pyFeet: number,
  pz: number,
  visible: boolean,
  heldColorHex = '#fad11f'
): void {
  rig.root.visible = visible;
  if (!visible) return;

  rig.root.position.set(px, pyFeet, pz);
  rig.root.rotation.set(0, -state.bodyYaw + Math.PI, state.deathTimer * (-Math.PI / 2));

  rig.bodyGroup.rotation.x = state.bodyPitch;
  const relHeadYaw = normalizeAngleDiff(state.headYaw, state.bodyYaw);
  rig.headGroup.rotation.set(state.headPitch, -relHeadYaw, 0);

  rig.rightArmGroup.rotation.set(state.rightArmPitch, state.rightArmYaw, state.rightArmRoll);
  rig.leftArmGroup.rotation.set(state.leftArmPitch, 0, state.leftArmRoll);
  rig.rightLegGroup.rotation.set(state.rightLegPitch, 0, state.rightLegRoll);
  rig.leftLegGroup.rotation.set(state.leftLegPitch, 0, state.leftLegRoll);

  // Red tint on hurt or death
  if (state.hurtTimer > 0 || state.deathTimer > 0) {
    rig.material.color.setHex(0xff5555);
  } else {
    rig.material.color.setHex(0xffffff);
  }
  (rig.heldItemMesh.material as THREE.MeshLambertMaterial).color.set(heldColorHex);
}

/**
 * §4 & §5: Hostile Mob Entities, AI State Machine, Sunlight Burn, Creeper Swell & Pooled Arrows
 */
export interface HostileMobEntity {
  id: number;
  archetype: MobArchetype;
  state: MobAiState;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  bodyYaw: number;
  hp: number;
  maxHp: number;
  walkCycle: number;
  hurtTimer: number;
  deathTimer: number;
  attackCooldown: number;
  bowChargeTimer: number; // Skeleton 0.8s bow draw
  fuseTimer: number; // Creeper 0..1.5s swell timer
  burnTickTimer: number; // Zombie/Skeleton daylight burning
  isBurningInSun: boolean;
  wanderAngle: number;
  wanderTimer: number;
  meshGroup?: THREE.Group;
  headGroup?: THREE.Group;
  limbGroups?: THREE.Group[];
  material?: THREE.MeshLambertMaterial;
}

export interface PooledArrow {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  fromMobId: number;
  mesh?: THREE.Mesh;
}

export interface MobStepEvents {
  playerDamaged: number;
  playerKnockback: [number, number];
  creeperExplosions: Array<{ x: number; y: number; z: number; radius: number }>;
  sounds: Array<'hurt' | 'mob_death' | 'creeper_hisss' | 'bow_shoot' | 'zombie_burn'>;
  flameParticles: Array<{ x: number; y: number; z: number }>;
  deathSmokeParticles: Array<{ x: number; y: number; z: number }>;
}

export function createHostileMobMesh(archetype: MobArchetype): {
  group: THREE.Group;
  headGroup: THREE.Group;
  limbGroups: THREE.Group[];
  material: THREE.MeshLambertMaterial;
} {
  const tex = generateMobSkinTexture(archetype);
  const material = new THREE.MeshLambertMaterial({ map: tex });
  const group = new THREE.Group();
  const limbGroups: THREE.Group[] = [];

  if (archetype === 'spider') {
    // §4.2(c): Wide 2-segment body + 8 angled legs (4 per side)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 6 * PX_SCALE, -4 * PX_SCALE);
    headGroup.add(new THREE.Mesh(createUvBoxGeometry(8, 6, 8, 0, 0, [0, 0, 0]), material));
    group.add(headGroup);

    const abdomen = new THREE.Mesh(createUvBoxGeometry(10, 8, 12, 16, 16, [0, 7, 6]), material);
    group.add(abdomen);

    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 4 * PX_SCALE, 6 * PX_SCALE, (-3 + idx * 3) * PX_SCALE);
      const legMesh = new THREE.Mesh(createUvBoxGeometry(10, 2, 2, 0, 16, [side * 5, 0, 0]), material);
      legGroup.add(legMesh);
      legGroup.rotation.z = side * -0.48;
      group.add(legGroup);
      limbGroups.push(legGroup);
    }
    return { group, headGroup, limbGroups, material };
  }

  if (archetype === 'creeper') {
    // §4.2(d): Head 8x8x8, tall torso 8x12x4, 4 short legs 4x6x4, no arms
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 18 * PX_SCALE, 0);
    headGroup.add(new THREE.Mesh(createUvBoxGeometry(8, 8, 8, 0, 0, [0, 4, 0]), material));
    group.add(headGroup);

    const torso = new THREE.Mesh(createUvBoxGeometry(8, 12, 4, 16, 16, [0, 12, 0]), material);
    group.add(torso);

    const legOffsets: Array<[number, number]> = [
      [-2, -4],
      [2, -4],
      [-2, 4],
      [2, 4],
    ];
    for (const [lx, lz] of legOffsets) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx * PX_SCALE, 6 * PX_SCALE, lz * PX_SCALE);
      legGroup.add(new THREE.Mesh(createUvBoxGeometry(4, 6, 4, 0, 16, [0, -3, 0]), material));
      group.add(legGroup);
      limbGroups.push(legGroup);
    }
    return { group, headGroup, limbGroups, material };
  }

  // Zombie (4px limbs) or Skeleton (2px thin limbs)
  const limbW = archetype === 'skeleton' ? 2 : 4;
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 24 * PX_SCALE, 0);
  headGroup.add(new THREE.Mesh(createUvBoxGeometry(8, 8, 8, 0, 0, [0, 4, 0]), material));
  group.add(headGroup);

  const torso = new THREE.Mesh(createUvBoxGeometry(8, 12, 4, 16, 16, [0, 18, 0]), material);
  group.add(torso);

  const rArm = new THREE.Group();
  rArm.position.set(-5.5 * PX_SCALE, 23 * PX_SCALE, 0);
  rArm.add(new THREE.Mesh(createUvBoxGeometry(limbW, 12, limbW, 40, 16, [0, -5, 0]), material));
  group.add(rArm);

  const lArm = new THREE.Group();
  lArm.position.set(5.5 * PX_SCALE, 23 * PX_SCALE, 0);
  lArm.add(new THREE.Mesh(createUvBoxGeometry(limbW, 12, limbW, 40, 16, [0, -5, 0]), material));
  group.add(lArm);

  const rLeg = new THREE.Group();
  rLeg.position.set(-2 * PX_SCALE, 12 * PX_SCALE, 0);
  rLeg.add(new THREE.Mesh(createUvBoxGeometry(limbW, 12, limbW, 0, 16, [0, -6, 0]), material));
  group.add(rLeg);

  const lLeg = new THREE.Group();
  lLeg.position.set(2 * PX_SCALE, 12 * PX_SCALE, 0);
  lLeg.add(new THREE.Mesh(createUvBoxGeometry(limbW, 12, limbW, 0, 16, [0, -6, 0]), material));
  group.add(lLeg);

  limbGroups.push(rArm, lArm, rLeg, lLeg);
  return { group, headGroup, limbGroups, material };
}

/**
 * Checks 1-ray line-of-sight between `(x0, y0, z0)` and `(x1, y1, z1)` against solid blocks (§4.1).
 */
export function hasLineOfSight(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  isSolidBlock: (wx: number, wy: number, wz: number) => boolean
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.5) return true;
  const steps = Math.min(20, Math.ceil(dist * 1.2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const wx = Math.floor(x0 + dx * t);
    const wy = Math.floor(y0 + dy * t);
    const wz = Math.floor(z0 + dz * t);
    if (isSolidBlock(wx, wy, wz)) return false;
  }
  return true;
}

export class HostileMobManager {
  mobs: HostileMobEntity[] = [];
  arrows: PooledArrow[] = [];
  private nextId = 1;

  constructor(poolSize = 24) {
    for (let i = 0; i < poolSize; i++) {
      this.arrows.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        fromMobId: 0,
      });
    }
  }

  spawnMob(archetype: MobArchetype, x: number, y: number, z: number): HostileMobEntity | null {
    if (this.mobs.length >= MAX_ACTIVE_MOBS) return null;
    const maxHp = archetype === 'spider' ? 16 : 20;
    const entity: HostileMobEntity = {
      id: this.nextId++,
      archetype,
      state: 'idle',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      bodyYaw: 0,
      hp: maxHp,
      maxHp,
      walkCycle: 0,
      hurtTimer: 0,
      deathTimer: 0,
      attackCooldown: 0,
      bowChargeTimer: 0,
      fuseTimer: 0,
      burnTickTimer: 0,
      isBurningInSun: false,
      wanderAngle: (this.nextId * 1.7) % (Math.PI * 2),
      wanderTimer: 2.0,
    };
    this.mobs.push(entity);
    return entity;
  }

  damageMob(
    mobId: number,
    damage: number,
    attackerX: number,
    attackerZ: number
  ): { killed: boolean; mob?: HostileMobEntity } {
    const mob = this.mobs.find((m) => m.id === mobId && m.state !== 'dead');
    if (!mob) return { killed: false };
    mob.hp = Math.max(0, mob.hp - damage);
    mob.hurtTimer = 0.2;
    const dx = mob.x - attackerX;
    const dz = mob.z - attackerZ;
    const len = Math.hypot(dx, dz) || 1;
    mob.vx = (dx / len) * 5.2;
    mob.vy = 3.2;
    mob.vz = (dz / len) * 5.2;
    if (mob.hp <= 0) {
      mob.state = 'dead';
      mob.deathTimer = 0.001;
      return { killed: true, mob };
    }
    mob.state = 'hurt';
    return { killed: false, mob };
  }

  private firePooledArrow(fromMob: HostileMobEntity, targetX: number, targetY: number, targetZ: number): void {
    const slot = this.arrows.find((a) => !a.active);
    if (!slot) return;
    const dx = targetX - fromMob.x;
    const dy = targetY - (fromMob.y + 1.45);
    const dz = targetZ - fromMob.z;
    const horizDist = Math.hypot(dx, dz) || 1;
    const speed = 19.0;
    slot.active = true;
    slot.x = fromMob.x;
    slot.y = fromMob.y + 1.45;
    slot.z = fromMob.z;
    slot.vx = (dx / horizDist) * speed;
    // Parabolic gravity compensation arc (§5)
    slot.vy = (dy / horizDist) * speed + horizDist * 0.24;
    slot.vz = (dz / horizDist) * speed;
    slot.age = 0;
    slot.fromMobId = fromMob.id;
  }

  stepAll(
    dt: number,
    playerPos: { x: number; y: number; z: number },
    isDaytime: boolean,
    isSolidBlock: (wx: number, wy: number, wz: number) => boolean,
    computeGroundY: (wx: number, wz: number) => number,
    hasSkyAccess?: (wx: number, wy: number, wz: number) => boolean
  ): MobStepEvents {
    const events: MobStepEvents = {
      playerDamaged: 0,
      playerKnockback: [0, 0],
      creeperExplosions: [],
      sounds: [],
      flameParticles: [],
      deathSmokeParticles: [],
    };
    const stepDt = Math.min(0.1, Math.max(0.001, dt));

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      const dx = playerPos.x - m.x;
      const dy = playerPos.y - m.y;
      const dz = playerPos.z - m.z;
      const distToPlayer = Math.hypot(dx, dy, dz);
      const horizDist = Math.hypot(dx, dz);

      // Despawn beyond 64 blocks (§4.1)
      if (distToPlayer > MOB_DESPAWN_DIST) {
        this.mobs.splice(i, 1);
        continue;
      }

      // Death state topple & removal after 0.25s (§3.1.10)
      if (m.state === 'dead') {
        m.deathTimer += stepDt / 0.2;
        if (m.deathTimer >= 1.15) {
          events.deathSmokeParticles.push({ x: m.x, y: m.y + 0.8, z: m.z });
          this.mobs.splice(i, 1);
        }
        continue;
      }

      if (m.hurtTimer > 0) {
        m.hurtTimer = Math.max(0, m.hurtTimer - stepDt);
        if (m.hurtTimer === 0 && m.state === 'hurt') {
          m.state = 'chase';
        }
      }
      if (m.attackCooldown > 0) {
        m.attackCooldown = Math.max(0, m.attackCooldown - stepDt);
      }

      // Daytime Sunlight Burning for Zombie & Skeleton (§4.1)
      const burnsInSun = m.archetype === 'zombie' || m.archetype === 'skeleton';
      const skyClear = hasSkyAccess
        ? hasSkyAccess(Math.floor(m.x), Math.floor(m.y + 1.8), Math.floor(m.z))
        : !isSolidBlock(Math.floor(m.x), Math.floor(m.y + 2), Math.floor(m.z));
      m.isBurningInSun = Boolean(isDaytime && burnsInSun && skyClear);

      if (m.isBurningInSun) {
        m.burnTickTimer += stepDt;
        events.flameParticles.push({ x: m.x, y: m.y + 1.1, z: m.z });
        if (m.burnTickTimer >= 1.0) {
          m.burnTickTimer = 0;
          m.hp -= 2;
          m.hurtTimer = 0.16;
          events.sounds.push('zombie_burn');
          if (m.hp <= 0) {
            m.state = 'dead';
            m.deathTimer = 0.001;
            events.sounds.push('mob_death');
            continue;
          }
        }
      } else {
        m.burnTickTimer = 0;
      }

      // Detection within 16 blocks + 1-ray line of sight (§4.1)
      const canSeePlayer =
        distToPlayer <= MOB_DETECT_DIST &&
        hasLineOfSight(m.x, m.y + 1.4, m.z, playerPos.x, playerPos.y + 1.4, playerPos.z, isSolidBlock);

      if (canSeePlayer) {
        m.yaw = Math.atan2(dx, dz);
        if (m.state === 'idle') m.state = 'alert';
        if (m.state === 'alert') m.state = 'chase';
      } else if (distToPlayer > MOB_DETECT_DIST * 1.25) {
        m.state = 'idle';
        m.fuseTimer = Math.max(0, m.fuseTimer - stepDt * 2);
      }

      // Archetype-specific AI behavior (§4.2)
      let desiredSpeed = 0;
      let moveDirX = Math.sin(m.yaw);
      let moveDirZ = Math.cos(m.yaw);

      if (m.state === 'idle') {
        m.wanderTimer -= stepDt;
        if (m.wanderTimer <= 0) {
          m.wanderAngle += 1.9;
          m.wanderTimer = 3.0;
        }
        m.yaw = m.wanderAngle;
        moveDirX = Math.sin(m.yaw);
        moveDirZ = Math.cos(m.yaw);
        desiredSpeed = 0.9;
      } else if (m.archetype === 'zombie') {
        desiredSpeed = 2.45;
        if (horizDist <= 1.65 && Math.abs(dy) < 1.8) {
          m.state = 'attack';
          if (m.attackCooldown <= 0) {
            m.attackCooldown = 1.0;
            events.playerDamaged += 3;
            events.playerKnockback = [moveDirX * 4.5, moveDirZ * 4.5];
            events.sounds.push('hurt');
          }
        }
      } else if (m.archetype === 'skeleton') {
        // Standoff archer: retreats when too close (< 5.5m), charges bow for 0.8s within 14m
        if (horizDist < 5.5) {
          desiredSpeed = 2.4;
          moveDirX = -Math.sin(m.yaw);
          moveDirZ = -Math.cos(m.yaw);
          m.bowChargeTimer = 0;
        } else if (horizDist <= 14.0 && canSeePlayer) {
          m.state = 'attack';
          desiredSpeed = 0;
          m.bowChargeTimer += stepDt;
          if (m.bowChargeTimer >= 0.8) {
            m.bowChargeTimer = 0;
            this.firePooledArrow(m, playerPos.x, playerPos.y + 1.2, playerPos.z);
            events.sounds.push('bow_shoot');
          }
        } else {
          desiredSpeed = 2.3;
          m.bowChargeTimer = 0;
        }
      } else if (m.archetype === 'spider') {
        desiredSpeed = 3.65;
        // Jump pounce when 2.5..5.0 blocks away
        if (horizDist >= 2.2 && horizDist <= 4.8 && m.vy === 0 && m.attackCooldown <= 0) {
          m.vy = 4.6;
          m.vx = moveDirX * 5.2;
          m.vz = moveDirZ * 5.2;
          m.attackCooldown = 1.2;
        }
        if (horizDist <= 1.75 && Math.abs(dy) < 1.6 && m.attackCooldown <= 0) {
          m.state = 'attack';
          m.attackCooldown = 0.85;
          events.playerDamaged += 2;
          events.playerKnockback = [moveDirX * 3.8, moveDirZ * 3.8];
          events.sounds.push('hurt');
        }
      } else if (m.archetype === 'creeper') {
        // Silent approach -> stop within 3.2m -> 1.5s white flash & 1.0..1.25 swell -> explode (or cancel if > 4.6m)
        if (horizDist <= 3.2) {
          m.state = 'attack';
          desiredSpeed = 0;
          if (m.fuseTimer === 0) {
            events.sounds.push('creeper_hisss');
          }
          m.fuseTimer += stepDt;
          if (m.fuseTimer >= 1.5) {
            events.creeperExplosions.push({ x: m.x, y: m.y + 0.5, z: m.z, radius: 4 });
            if (horizDist <= 5.5) {
              const dmg = Math.max(2, Math.round((1 - horizDist / 6.0) * 14));
              events.playerDamaged += dmg;
              events.playerKnockback = [moveDirX * 8.5, moveDirZ * 8.5];
            }
            this.mobs.splice(i, 1);
            continue;
          }
        } else if (horizDist > 4.6 && m.fuseTimer > 0) {
          // Player escaped blast trigger zone: cancel swell smoothly
          m.fuseTimer = Math.max(0, m.fuseTimer - stepDt * 2.2);
          m.state = 'chase';
          desiredSpeed = 2.35;
        } else {
          desiredSpeed = m.fuseTimer > 0 ? 0.4 : 2.35;
        }
      }

      // Ground-hugging steering with 1-block auto step-jump, cliff stop check, and wall stop (§4.1)
      const nextX = m.x + moveDirX * desiredSpeed * stepDt;
      const nextZ = m.z + moveDirZ * desiredSpeed * stepDt;
      const probeX = Math.floor(m.x + moveDirX * 0.65);
      const probeZ = Math.floor(m.z + moveDirZ * 0.65);
      const footY = Math.floor(m.y + 0.05);

      const blockedAtFoot = isSolidBlock(probeX, footY, probeZ);
      const blockedAtHead = isSolidBlock(probeX, footY + 1, probeZ);
      const blockedAboveHead = isSolidBlock(probeX, footY + 2, probeZ);
      const groundAhead = computeGroundY(probeX, probeZ);
      const dropDepth = m.y - groundAhead;

      if (dropDepth > 3.5 && m.state !== 'hurt') {
        // Cliff ahead: stop & turn rather than walking off a high cliff (§4.1)
        desiredSpeed = 0;
        m.wanderAngle += Math.PI * 0.75;
      } else if (blockedAtFoot) {
        if (!blockedAtHead && !blockedAboveHead) {
          // 1-block step: jump up onto the block
          m.y = footY + 1;
          m.x = nextX;
          m.z = nextZ;
        } else {
          // 2-block wall: cannot pass
          desiredSpeed = 0;
        }
      } else if (!blockedAtHead) {
        m.x = nextX;
        m.z = nextZ;
      }

      // Apply knockback / jump velocity & gravity
      m.x += m.vx * stepDt;
      m.z += m.vz * stepDt;
      m.vx *= Math.exp(-8 * stepDt);
      m.vz *= Math.exp(-8 * stepDt);

      const floorY = computeGroundY(Math.floor(m.x), Math.floor(m.z));
      if (m.y > floorY || m.vy > 0) {
        m.vy -= 22.0 * stepDt;
        m.y += m.vy * stepDt;
        if (m.y <= floorY) {
          m.y = floorY;
          m.vy = 0;
        }
      } else {
        m.y = floorY;
        m.vy = 0;
      }

      m.walkCycle += desiredSpeed * stepDt * 3.1;
      const yawDiff = normalizeAngleDiff(m.yaw, m.bodyYaw);
      m.bodyYaw += yawDiff * (1 - Math.exp(-10 * stepDt));
    }

    // Step pooled parabolic arrows (§5)
    for (const arrow of this.arrows) {
      if (!arrow.active) continue;
      arrow.age += stepDt;
      if (arrow.age > 5.0) {
        arrow.active = false;
        continue;
      }
      arrow.vy -= 16.0 * stepDt;
      arrow.x += arrow.vx * stepDt;
      arrow.y += arrow.vy * stepDt;
      arrow.z += arrow.vz * stepDt;

      if (isSolidBlock(Math.floor(arrow.x), Math.floor(arrow.y), Math.floor(arrow.z))) {
        arrow.active = false;
        continue;
      }
      const pdx = arrow.x - playerPos.x;
      const pdy = arrow.y - (playerPos.y + 0.9);
      const pdz = arrow.z - playerPos.z;
      if (Math.hypot(pdx, pdz) < 0.65 && Math.abs(pdy) < 1.0) {
        arrow.active = false;
        events.playerDamaged += 3;
        const hLen = Math.hypot(arrow.vx, arrow.vz) || 1;
        events.playerKnockback = [(arrow.vx / hLen) * 4.5, (arrow.vz / hLen) * 4.5];
        events.sounds.push('hurt');
      }
    }

    return events;
  }

  syncMobMeshesToScene(scene: THREE.Scene): void {
    for (const m of this.mobs) {
      if (!m.meshGroup) {
        const built = createHostileMobMesh(m.archetype);
        m.meshGroup = built.group;
        m.headGroup = built.headGroup;
        m.limbGroups = built.limbGroups;
        m.material = built.material;
        scene.add(m.meshGroup);
      }

      m.meshGroup.position.set(m.x, m.y, m.z);
      m.meshGroup.rotation.set(0, -m.bodyYaw + Math.PI, m.state === 'dead' ? m.deathTimer * (-Math.PI / 2) : 0);

      // Creeper swell scale 1.0 -> 1.25 + white flash (§4.2(d))
      if (m.archetype === 'creeper' && m.fuseTimer > 0) {
        const swellRatio = Math.min(1, m.fuseTimer / 1.5);
        const s = 1.0 + swellRatio * 0.25;
        m.meshGroup.scale.set(s, s, s);
        const flashWhite = Math.floor(m.fuseTimer * 12) % 2 === 0;
        m.material?.color.setHex(flashWhite ? 0xffffff : 0x99ff99);
      } else {
        m.meshGroup.scale.set(1, 1, 1);
        if (m.hurtTimer > 0 || m.state === 'dead') {
          m.material?.color.setHex(0xff5555);
        } else if (m.isBurningInSun) {
          m.material?.color.setHex(0xffaa55);
        } else {
          m.material?.color.setHex(0xffffff);
        }
      }

      // Limb animation per archetype
      const limbs = m.limbGroups ?? [];
      if (m.archetype === 'zombie' && limbs.length === 4) {
        // Arms stretched horizontally forward (-1.45 rad)
        limbs[0].rotation.x = -1.45 + Math.sin(m.walkCycle) * 0.12;
        limbs[1].rotation.x = -1.45 - Math.sin(m.walkCycle) * 0.12;
        limbs[2].rotation.x = Math.sin(m.walkCycle) * 0.65;
        limbs[3].rotation.x = -Math.sin(m.walkCycle) * 0.65;
      } else if (m.archetype === 'skeleton' && limbs.length === 4) {
        const bowLift = m.bowChargeTimer > 0 ? -1.38 : Math.sin(m.walkCycle + Math.PI) * 0.55;
        limbs[0].rotation.x = bowLift;
        limbs[1].rotation.x = m.bowChargeTimer > 0 ? -1.25 : Math.sin(m.walkCycle) * 0.55;
        limbs[2].rotation.x = Math.sin(m.walkCycle) * 0.65;
        limbs[3].rotation.x = -Math.sin(m.walkCycle) * 0.65;
      } else if (m.archetype === 'spider' && limbs.length === 8) {
        for (let l = 0; l < 8; l++) {
          limbs[l].rotation.y = Math.sin(m.walkCycle * 1.8 + l * 0.85) * 0.38;
        }
      } else if (m.archetype === 'creeper' && limbs.length === 4) {
        limbs[0].rotation.x = Math.sin(m.walkCycle) * 0.55;
        limbs[1].rotation.x = -Math.sin(m.walkCycle) * 0.55;
        limbs[2].rotation.x = -Math.sin(m.walkCycle) * 0.55;
        limbs[3].rotation.x = Math.sin(m.walkCycle) * 0.55;
      }
    }
  }
}
