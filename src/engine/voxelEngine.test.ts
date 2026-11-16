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
  const modSummary = installBuiltinJavaModPreset(BUILTIN_JAVA_MOD_JARS[0], engine);
  assert.ok(modSummary.addedBlocks.length >= 4);
  assert.ok(engine.blocksById.has('twilightforest:aurora_block'));
  assert.ok(engine.recipes.length > beforeRecipeCount);
});



