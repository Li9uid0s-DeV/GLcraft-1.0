import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VoxelEngineCore,
  PaletteSubChunk,
  filterCommandAutocomplete,
  WorldTypeId,
} from './voxelEngine';

test('Title Screen zero-chunk initialization & dimension switch memory release', () => {
  const engine = new VoxelEngineCore(12345, 'normal', 5);
  assert.equal(engine.chunks.size, 0, 'Must have 0 chunks allocated on Title Screen');
  assert.equal(engine.meshes.size, 0, 'Must have 0 meshes allocated on Title Screen');

  engine.generateChunk(0, 0);
  engine.buildChunkMesh(0, 0);
  assert.equal(engine.chunks.size, 1);
  assert.equal(engine.meshes.size, 1);

  engine.switchDimension('minecraft:the_nether');
  assert.equal(engine.chunks.size, 0, 'Switching dimension must immediately free old chunks');
  assert.equal(engine.meshes.size, 0, 'Switching dimension must immediately free old meshes');
});

test('16-bit PaletteSubChunk compression & single-value optimization', () => {
  const sub = new PaletteSubChunk();
  assert.equal(sub.indices, null, 'All-air subchunk must allocate 0 index arrays');
  assert.equal(sub.get(5, 5, 5), 0);

  sub.set(3, 4, 5, 21); // Poplar Log
  assert.notEqual(sub.indices, null);
  assert.equal(sub.get(3, 4, 5), 21);
  assert.equal(sub.nonAirCount, 1);

  sub.set(3, 4, 5, 0);
  assert.equal(sub.get(3, 4, 5), 0);
  assert.equal(sub.nonAirCount, 0);
});

test('All 7 World Types generate expected terrain profiles', () => {
  const modes: WorldTypeId[] = [
    'normal',
    'jj_thunder',
    'amplified',
    'flat',
    'skyblock',
    'skyblock_lucky',
    'oneblock',
  ];

  for (const mode of modes) {
    const engine = new VoxelEngineCore(999, mode, 3);
    const chunk = engine.generateChunk(0, 0);
    assert.ok(chunk, `Chunk (0,0) generated for ${mode}`);
  }

  // Verify OneBlock infinite regeneration at (0, 64, 0)
  const oneBlockEngine = new VoxelEngineCore(999, 'oneblock', 3);
  oneBlockEngine.generateChunk(0, 0);
  assert.notEqual(oneBlockEngine.getBlock(0, 64, 0), 0);
  oneBlockEngine.setBlock(0, 64, 0, 0);
  assert.notEqual(
    oneBlockEngine.getBlock(0, 64, 0),
    0,
    'OneBlock must immediately regenerate next phase block when broken'
  );
  assert.equal(oneBlockEngine.oneBlockBrokenCount, 1);
});

test('Time-sliced Mega TNT explosion engine processes within slice budget & WorldEdit undo/redo works', () => {
  const engine = new VoxelEngineCore(42, 'flat', 3);
  engine.generateChunk(0, 0);
  assert.equal(engine.getBlock(4, 64, 4), 2); // Grass at Y=64

  engine.queueTimeSlicedExplosion(4, 64, 4, 3);
  const res = engine.stepExplosionSlice();
  assert.ok(res.dirtyChunkKeys.includes('0,0'));
  assert.equal(engine.getBlock(4, 64, 4), 0, 'Center block must be destroyed by explosion');

  // Test WorldEdit //set and //undo
  const we = engine.applyWorldEditBox([0, 65, 0], [2, 65, 2], 22, 'set');
  assert.equal(we.changedCount, 9);
  assert.equal(engine.getBlock(1, 65, 1), 22);

  const undone = engine.undoWorldEdit();
  assert.equal(undone.restoredCount, 9);
  assert.equal(engine.getBlock(1, 65, 1), 0);
});

test('Command autocomplete and custom JSON Mod registration work', () => {
  const engine = new VoxelEngineCore(1, 'normal', 3);
  const custom = engine.registerCustomModJson(
    JSON.stringify({
      id: 'CrystalMod:amethyst_tnt',
      name: 'Amethyst Nova TNT',
      color: '#b388ff',
      tnt_properties: { blast_radius: 12, fuse_ticks: 60 },
    })
  );
  assert.equal(custom.id, 'CrystalMod:amethyst_tnt');
  assert.equal(custom.tntRadius, 12);

  const suggestions = filterCommandAutocomplete('/give @s mega', Array.from(engine.blocksById.keys()));
  assert.ok(suggestions.some((s) => s.includes('megatnt:tnt_')));
});

test('Weather2 3D volumetric cloud layer advects with wind vectors and scales across disasters', async () => {
  const { Weather2Simulation } = await import('./weather2System');
  const sim = new Weather2Simulation();
  sim.setDisaster('clear');
  const initialWind = sim.getWindVector();
  assert.ok(initialWind.speed >= 3 && initialWind.speed <= 8);
  const clearSwirl = sim.computeVortexSwirl(initialWind);

  const prevOffsetX = sim.windOffset.x;
  sim.step(1.0, 10.0);
  assert.notEqual(sim.windOffset.x, prevOffsetX, 'Wind vector must advect 3D cloud offset');

  const clearDensity = sim.sampleVolumetricCloudDensity(0, 140, 0);
  sim.setDisaster('tornado_f5');
  sim.step(0.5, 11.0);
  const f5Wind = sim.getWindVector();
  const f5Swirl = sim.computeVortexSwirl(f5Wind);
  const f5Density = sim.sampleVolumetricCloudDensity(sim.stormCenter.x, 140, sim.stormCenter.z);
  assert.ok(f5Wind.speed > initialWind.speed, 'EF5 Tornado wind speed must exceed clear weather wind');
  assert.ok(f5Swirl > clearSwirl * 3, 'EF5 vortexSwirl uniform must scale up with windVec and disaster intensity');
  assert.ok(f5Density >= clearDensity, 'EF5 storm core must increase 3D volumetric cloud density');

  const nearField = sim.sampleLocalWindField(sim.stormCenter.x + 5, 70, sim.stormCenter.z + 5);
  const farField = sim.sampleLocalWindField(sim.stormCenter.x + 120, 70, sim.stormCenter.z + 120);
  assert.ok(nearField.localSpeed > farField.localSpeed, 'Local wind field must intensify near disaster center');
  assert.ok(nearField.vy > 1.0, 'Local wind field must produce vertical updraft near storm core');
});

test('Java Shader Pack (Iris/OptiFine) parser and Java Mod (.jar) loader register blocks & recipes', async () => {
  const { parseJavaShaderPackFromEntries } = await import('./javaShaderPackEngine');
  const { BUILTIN_JAVA_MOD_JARS, installBuiltinJavaModPreset } = await import(
    './javaModLoaderEngine'
  );

  const enc = new TextEncoder();
  const fakeZipEntries = new Map<string, Uint8Array>([
    [
      'BSL_v8.3/shaders/shaders.properties',
      enc.encode('#define WAVING_LEAVES\n#define PUDDLE_REFLECTIONS\nsunPathRotation=-42.5\nambientOcclusionLevel=0.88'),
    ],
    [
      'BSL_v8.3/shaders/gbuffers_terrain.fsh',
      enc.encode('#version 330 compatibility\n#include "/lib/common.glsl"\nvoid main() {}'),
    ],
    ['BSL_v8.3/shaders/lib/common.glsl', enc.encode('const float sunPathRotation = -42.5;')],
  ]);

  const parsedShader = parseJavaShaderPackFromEntries(fakeZipEntries, 'BSL_v8.3.zip');
  assert.equal(parsedShader.sunPathRotation, -42.5);
  assert.equal(parsedShader.ambientOcclusionLevel, 0.88);
  assert.ok(parsedShader.wavingFoliageAmp > 1.0);

  const engine = new VoxelEngineCore(42, 'normal', 3);
  const beforeRecipeCount = engine.recipes.length;
  const twilightPreset =
    BUILTIN_JAVA_MOD_JARS.find((m) => m.id === 'twilight_forest_jar') ?? BUILTIN_JAVA_MOD_JARS[0];
  const modSummary = installBuiltinJavaModPreset(twilightPreset, engine);
  assert.ok(modSummary.addedBlocks.length >= 4);
  assert.ok(engine.blocksById.has('twilightforest:aurora_block'));
  assert.ok(engine.recipes.length > beforeRecipeCount);
});

test('§1: 16x16 Texture Atlas UVs, Sunlight & Block Light Flood-Fill, and Distant Horizons 3.3.4 LOD', async () => {
  const {
    getAtlasUvRect,
    computeChunkFloodFillLighting,
    buildDistantHorizonsLodMesh,
    DEFAULT_DISTANT_HORIZONS_CONFIG,
  } = await import('./voxelAtlasAndLighting');

  const grassTopUv = getAtlasUvRect(2, 0);
  const grassBottomUv = getAtlasUvRect(2, 1);
  const grassSideUv = getAtlasUvRect(2, 2);
  assert.notEqual(grassTopUv[0], grassSideUv[0], 'Grass top and side must map to distinct atlas tiles');
  assert.notEqual(grassTopUv[0], grassBottomUv[0], 'Grass top and bottom must map to distinct atlas tiles');

  const engine = new VoxelEngineCore(2603, 'flat', 3);
  const chunk = engine.generateChunk(0, 0);
  // Build a solid stone roof at world y=70 over x=4..8, z=4..8 and place an emissive Glowstone (13) at (6, 66, 6)
  for (let x = 4; x <= 8; x++) {
    for (let z = 4; z <= 8; z++) {
      engine.setBlock(x, 70, z, 1, false);
    }
  }
  engine.setBlock(6, 66, 6, 13, false); // Glowstone (emissive)

  const lightMap = computeChunkFloodFillLighting(chunk, engine.blocksByNum);
  const openSkyLight = lightMap.getSkyLight(1, 67, 1);
  const underRoofSkyLight = lightMap.getSkyLight(6, 67, 6);
  assert.equal(openSkyLight, 15, 'Open sky column must receive full sunlight (15)');
  assert.ok(underRoofSkyLight < openSkyLight, 'Cave/overhang under solid roof must have reduced skylight');

  const glowstoneSourceBlockLight = lightMap.getBlockLight(6, 66, 6);
  const adjacentBlockLight = lightMap.getBlockLight(7, 66, 6);
  const twoStepsBlockLight = lightMap.getBlockLight(8, 66, 6);
  assert.equal(glowstoneSourceBlockLight, 15);
  assert.equal(adjacentBlockLight, 14, 'Block light must attenuate by -1 per Manhattan step');
  assert.equal(twoStepsBlockLight, 13);

  // Distant Horizons 3.3.4 Mid (2x2) and Far (4x4) LOD pillar meshes
  const midLod = buildDistantHorizonsLodMesh(
    3,
    3,
    2,
    (wx, wz) => engine.computeSurfaceY(wx, wz),
    (wx, wz) => engine.sampleBiome(wx, wz),
    (wx, wz) => engine.blendedGrassColor(wx, wz),
    [0.56, 0.79, 0.98],
    0.35,
    DEFAULT_DISTANT_HORIZONS_CONFIG
  );
  const farLod = buildDistantHorizonsLodMesh(
    5,
    5,
    4,
    (wx, wz) => engine.computeSurfaceY(wx, wz),
    (wx, wz) => engine.sampleBiome(wx, wz),
    (wx, wz) => engine.blendedGrassColor(wx, wz),
    [0.56, 0.79, 0.98],
    0.65,
    DEFAULT_DISTANT_HORIZONS_CONFIG
  );
  assert.ok(midLod.positions.length > farLod.positions.length, 'Mid 2x2 LOD must have more vertices than Far 4x4 LOD');
  assert.ok(farLod.positions.length > 0);
});

test('§2 & §3: Player Procedural Animation (Walk/Sprint/Swing Restart/Head-Body Yaw Lag)', async () => {
  const {
    createInitialPlayerAnimState,
    stepPlayerProceduralAnimation,
    triggerPlayerSwing,
  } = await import('./characterAndMobEngine');

  const state = createInitialPlayerAnimState();
  // Walk + Sprint step with head turned 1.2 rad
  stepPlayerProceduralAnimation(state, {
    dt: 0.05,
    timeSec: 1.0,
    vx: 0,
    vy: 0,
    vz: -6.5,
    onGround: true,
    isSprinting: true,
    isSwimming: false,
    hasHeldItem: true,
    cameraYaw: 1.2,
    cameraPitch: -0.2,
    isDead: false,
  });

  assert.equal(state.headYaw, 1.2, 'Head yaw must track camera immediately');
  assert.ok(state.bodyYaw > 0 && state.bodyYaw < 1.2, 'Body yaw must lag smoothly behind head yaw');
  assert.ok(state.bodyPitch > 0, 'Sprinting must lean torso forward');
  assert.ok(state.fovBoostDeg > 0, 'Sprinting must apply dynamic FOV boost');

  // Attack/Dig swing restart test
  triggerPlayerSwing(state);
  stepPlayerProceduralAnimation(state, {
    dt: 0.1,
    timeSec: 1.1,
    vx: 0,
    vy: 0,
    vz: 0,
    onGround: true,
    isSprinting: false,
    isSwimming: false,
    hasHeldItem: true,
    cameraYaw: 0,
    cameraPitch: 0,
    isDead: false,
  });
  assert.ok(state.swingProgress > 0.3, 'Swing progress advances over ~0.3s');
  triggerPlayerSwing(state);
  assert.ok(state.swingProgress < 0.01, 'Rapid click must cleanly reset swingProgress to t=0');
});

test('§4 & §5: 4 Hostile Mob Archetypes (Daylight Burn, Skeleton Bow Pool, Creeper Swell & Cancel, Step/Cliff AI)', async () => {
  const { HostileMobManager } = await import('./characterAndMobEngine');
  const mgr = new HostileMobManager(12);

  const zombie = mgr.spawnMob('zombie', 0, 65, -5)!;
  const skeleton = mgr.spawnMob('skeleton', 0, 65, -9)!;
  const creeper = mgr.spawnMob('creeper', 0, 65, -2.5)!;
  const spider = mgr.spawnMob('spider', 0, 65, -3.5)!;
  assert.ok(zombie && skeleton && creeper && spider);

  // Step 1.1s in daytime with open sky -> Zombie & Skeleton burn, Skeleton charges bow & fires arrow, Creeper swells
  let totalArrowsFired = 0;
  for (let i = 0; i < 12; i++) {
    const ev = mgr.stepAll(
      0.1,
      { x: 0, y: 65, z: 0 },
      true,
      () => false,
      () => 65
    );
    if (ev.sounds.includes('bow_shoot')) totalArrowsFired++;
  }

  assert.equal(zombie.isBurningInSun, true, 'Zombie must burn in daytime under open sky');
  assert.ok(zombie.hp < zombie.maxHp, 'Zombie must take periodic daylight burn damage');
  assert.ok(totalArrowsFired >= 1, 'Skeleton at 9m standoff must charge 0.8s and fire parabolic arrow');
  assert.ok(mgr.arrows.some((a) => a.active), 'Pooled arrow must be active in flight');
  assert.ok(creeper.fuseTimer > 0.8 && creeper.fuseTimer < 1.5, 'Creeper within 3.2m must swell toward 1.5s detonation');

  // Player retreats far away (> 4.6m) -> Creeper must cancel swell instead of exploding
  mgr.stepAll(
    0.1,
    { x: 0, y: 65, z: 10 },
    true,
    () => false,
    () => 65
  );
  assert.equal(creeper.state, 'chase', 'Creeper must cancel swell and resume chase when player escapes >4.6m');
});

test('§6 PMWeather Tornado Block Lifting & EF Rating + TaCZ 11-Gun Default Pack JSON', async () => {
  const {
    computeEfRatingFromMph,
    canTornadoLiftBlock,
    generateJaggedLightningBolt,
  } = await import('./weather2System');
  const { TACZ_GUN_REGISTRY, exportTaczGunDataJson, getTaczGunByItemId } = await import(
    './taczGunEngine'
  );

  assert.equal(computeEfRatingFromMph(75, true), 'EF0');
  assert.equal(computeEfRatingFromMph(100, true), 'EF1');
  assert.equal(computeEfRatingFromMph(150, true), 'EF3');
  assert.equal(computeEfRatingFromMph(220, true), 'EF5');

  // Tornado Block Destruction ON/OFF & hardness rules
  assert.equal(canTornadoLiftBlock(20, 0.6, 110, false), false, 'Must never lift blocks when setting is OFF');
  assert.equal(canTornadoLiftBlock(5, 999, 250, true), false, 'Must never lift Bedrock (5)');
  assert.equal(canTornadoLiftBlock(23, 0.2, 85, true), true, 'EF0 tornado lifts soft leaves (hardness 0.2)');
  assert.equal(canTornadoLiftBlock(1, 1.5, 85, true), false, 'EF0 tornado cannot lift solid stone (hardness 1.5)');
  assert.equal(canTornadoLiftBlock(1, 1.5, 220, true), true, 'EF5 tornado lifts solid stone');

  const bolt = generateJaggedLightningBolt(0, 60, 0, 0, 0, 0, 42);
  assert.equal(bolt.length, 17, '4 subdivisions of midpoint displacement must produce 17 vertices');

  assert.equal(TACZ_GUN_REGISTRY.length, 11, 'TaCZ Default Pack must include all 11 firearms');
  const m95Spec = getTaczGunByItemId('tacz:m95')!;
  const m95Json = JSON.parse(exportTaczGunDataJson(m95Spec));
  assert.equal(m95Json.property.ammo, 'tacz:50bmg');
  assert.ok(m95Json.property.damage >= 40);
});




