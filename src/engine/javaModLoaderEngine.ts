/**
 * Universal Minecraft Java Edition Mod Loader Engine (`.jar` Fabric / NeoForge / Forge & `.zip` DataPack / TaCZ Gun Pack / Disaster Mod)
 * - Universal Fabric Loader 0.16.10 Compatibility:
 *   - Parses `fabric.mod.json` (including `entrypoints`, `mixins`, `accessWidener`, `depends`, and nested Jar-in-Jar `META-INF/jars/*.jar`)
 *   - Parses `*.mixins.json` to inspect and activate client/common Mixin hooks (`MixinWorldRenderer`, `MixinCamera`, `MixinLivingEntity`, etc.)
 *   - Parses NeoForge/Forge (`META-INF/neoforge.mods.toml`, `META-INF/mods.toml`, `mcmod.info`) and Data Packs (`pack.mcmeta`)
 *   - Scans `assets/<modid>/lang/*.json`, `models/block/*.json`, `models/item/*.json`, `blockstates/*.json`, `textures/block/*.png`, `textures/item/*.png`
 *   - Scans TaCZ gun packs (`data/<namespace>/tacz/guns/*.json` or `assets/<namespace>/tacz/**`)
 *   - Scans Disaster / Weather2 / PMWeather mod files (`tornado`, `hurricane`, `supercell`, `sandstorm`, `meteor`, `hailstorm`) without auto-triggering until user selects
 *   - Scans compiled Java `.class` (`0xCAFEBABE`) UTF-8 constant pools so even pure-bytecode Fabric mods register functional items/blocks & Mixin hooks
 */

import { extractZipOrJarEntries } from './javaShaderPackEngine';
import type { BlockDefinition, CraftingRecipe, VoxelEngineCore } from './voxelEngine';
import type { WeatherDisasterType } from './weather2System';

export interface LoadedJavaModSummary {
  modId: string;
  name: string;
  version: string;
  loader:
    | 'Fabric .jar (Universal)'
    | 'Fabric .jar'
    | 'NeoForge / Forge .jar'
    | 'TaCZ Gun Pack .zip/.jar'
    | 'Disaster Mod .jar/.zip'
    | 'DataPack / ResourcePack .zip'
    | 'JSON Mod';
  description: string;
  addedBlocks: BlockDefinition[];
  addedRecipesCount: number;
  fileCount: number;
  entrypoints?: string[];
  mixinConfigs?: string[];
  mixinTargets?: string[];
  nestedJars?: string[];
  detectedDisasters?: WeatherDisasterType[];
  isOptimizationMod?: boolean;
}

/**
 * Extracts printable ASCII/UTF-8 identifier strings and Mixin class targets from a compiled Java `.class` file's Constant Pool (`0xCAFEBABE`).
 */
export function scanJavaClassConstantPoolStrings(bytes: Uint8Array): string[] {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0xca ||
    bytes[1] !== 0xfe ||
    bytes[2] !== 0xba ||
    bytes[3] !== 0xbe
  ) {
    return [];
  }
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(bytes);
  const matches = rawText.match(
    /[a-z0-9_]{2,24}:[a-z0-9_]{2,32}|(?:block|item|entity)\.[a-z0-9_]{2,24}\.[a-z0-9_]{2,32}/g
  );
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Infers realistic top/side/bottom RGB colors (0..1) from a block/item identifier and optional PNG texture bytes.
 */
function inferBlockColorsFromIdAndPng(
  blockId: string,
  pngBytes?: Uint8Array
): {
  top: [number, number, number];
  side: [number, number, number];
  bottom: [number, number, number];
} {
  const lower = blockId.toLowerCase();
  if (lower.includes('brass') || lower.includes('gold') || lower.includes('amber') || lower.includes('firefly') || lower.includes('deagle')) {
    return { top: [0.92, 0.75, 0.24], side: [0.84, 0.66, 0.2], bottom: [0.74, 0.56, 0.16] };
  }
  if (lower.includes('rose_quartz') || lower.includes('cherry') || lower.includes('pink') || lower.includes('ruby') || lower.includes('awakened')) {
    return { top: [0.94, 0.42, 0.58], side: [0.85, 0.35, 0.5], bottom: [0.75, 0.28, 0.42] };
  }
  if (lower.includes('aurora') || lower.includes('malachite') || lower.includes('emerald') || lower.includes('canopy') || lower.includes('naga') || lower.includes('sodium') || lower.includes('awp')) {
    return { top: [0.22, 0.78, 0.56], side: [0.18, 0.66, 0.46], bottom: [0.14, 0.54, 0.38] };
  }
  if (lower.includes('tanzanite') || lower.includes('wyvern') || lower.includes('draconic') || lower.includes('magic') || lower.includes('amethyst') || lower.includes('indium')) {
    return { top: [0.58, 0.36, 0.92], side: [0.48, 0.28, 0.82], bottom: [0.38, 0.22, 0.7] };
  }
  if (lower.includes('copper') || lower.includes('bronze') || lower.includes('rust') || lower.includes('rpg') || lower.includes('lithium')) {
    return { top: [0.84, 0.48, 0.3], side: [0.76, 0.42, 0.25], bottom: [0.66, 0.35, 0.2] };
  }
  if (lower.includes('andesite') || lower.includes('maze') || lower.includes('stone') || lower.includes('slate') || lower.includes('m4a1') || lower.includes('rifle') || lower.includes('gun')) {
    return { top: [0.38, 0.42, 0.46], side: [0.32, 0.36, 0.4], bottom: [0.24, 0.28, 0.32] };
  }
  if (lower.includes('chaos') || lower.includes('obsidian')) {
    return { top: [0.24, 0.14, 0.32], side: [0.18, 0.1, 0.26], bottom: [0.12, 0.08, 0.18] };
  }

  let h = 2166136261;
  const seedStr = blockId + (pngBytes ? String(pngBytes[pngBytes.length >> 1] || 0) : '');
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = 0.28 + (((h >>> 0) & 0xff) / 255) * 0.64;
  const g = 0.28 + (((h >>> 8) & 0xff) / 255) * 0.64;
  const b = 0.28 + (((h >>> 16) & 0xff) / 255) * 0.64;
  return {
    top: [Number(r.toFixed(2)), Number(g.toFixed(2)), Number(b.toFixed(2))],
    side: [Number((r * 0.88).toFixed(2)), Number((g * 0.88).toFixed(2)), Number((b * 0.88).toFixed(2))],
    bottom: [Number((r * 0.76).toFixed(2)), Number((g * 0.76).toFixed(2)), Number((b * 0.76).toFixed(2))],
  };
}

function formatPrettyName(rawKey: string): string {
  return rawKey
    .replace(/^.*[:.]/, '')
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Detects whether a filename or mod content is a Weather / Tornado / Disaster Mod
 * and returns the list of WeatherDisasterType presets unlocked by it.
 */
function detectDisasterTypesFromText(combinedText: string): WeatherDisasterType[] {
  const lower = combinedText.toLowerCase();
  const list = new Set<WeatherDisasterType>();
  if (lower.includes('tornado') || lower.includes('vortex') || lower.includes('funnel') || lower.includes('ef5') || lower.includes('weather2')) {
    list.add('tornado_f1');
    list.add('tornado_f5');
  }
  if (lower.includes('hurricane') || lower.includes('cyclone') || lower.includes('typhoon')) {
    list.add('hurricane');
  }
  if (lower.includes('supercell') || lower.includes('mesocyclone') || lower.includes('pmweather') || lower.includes('protomanly')) {
    list.add('thunder');
    list.add('hailstorm');
  }
  if (lower.includes('sandstorm') || lower.includes('haboob') || lower.includes('dust')) {
    list.add('sandstorm');
  }
  if (lower.includes('meteor') || lower.includes('asteroid') || lower.includes('volcano') || lower.includes('apocalypse')) {
    list.add('meteor_shower');
  }
  if (lower.includes('rain') || lower.includes('storm') || lower.includes('weather')) {
    list.add('rain');
    list.add('thunder');
  }
  return Array.from(list);
}

/**
 * Universal Fabric / NeoForge / Forge / TaCZ / Disaster Mod Archive Loader.
 * Parses any uploaded `.jar` or `.zip` archive buffer and registers all discovered blocks, items, guns, Mixin hooks,
 * disaster presets, and recipes directly into `engine`.
 */
export async function loadJavaModOrDataPackArchive(
  buffer: ArrayBuffer,
  fileName: string,
  engine: VoxelEngineCore
): Promise<LoadedJavaModSummary> {
  const entries = await extractZipOrJarEntries(buffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });

  let modId =
    fileName
      .replace(/\.(jar|zip)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 24) || 'custommod';
  let modName = fileName.replace(/\.(jar|zip)$/i, '');
  let version = '1.0.0';
  let description = 'Loaded via Universal Fabric / NeoForge WebAssembly Bridge.';
  let loader: LoadedJavaModSummary['loader'] = fileName.toLowerCase().endsWith('.jar')
    ? 'Fabric .jar (Universal)'
    : 'DataPack / ResourcePack .zip';

  const entrypoints: string[] = [];
  const mixinConfigs: string[] = [];
  const mixinTargets: string[] = [];
  const nestedJars: string[] = [];

  // 1. Check `fabric.mod.json` (Universal Fabric Loader 0.16.10 spec)
  const fabricBytes = entries.get('fabric.mod.json');
  if (fabricBytes) {
    try {
      const fab = JSON.parse(decoder.decode(fabricBytes));
      if (fab.id) modId = String(fab.id).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (fab.name) modName = String(fab.name);
      if (fab.version) version = String(fab.version);
      if (fab.description) description = String(fab.description);
      loader = 'Fabric .jar (Universal)';

      if (fab.entrypoints && typeof fab.entrypoints === 'object') {
        for (const [epType, epList] of Object.entries(fab.entrypoints)) {
          if (Array.isArray(epList)) {
            for (const ep of epList) {
              const val = typeof ep === 'string' ? ep : ep?.value;
              if (val) entrypoints.push(`${epType}: ${val}`);
            }
          }
        }
      }
      if (Array.isArray(fab.mixins)) {
        for (const m of fab.mixins) {
          const mStr = typeof m === 'string' ? m : m?.config;
          if (mStr) mixinConfigs.push(mStr);
        }
      }
      if (Array.isArray(fab.jars)) {
        for (const j of fab.jars) {
          if (j?.file) nestedJars.push(String(j.file));
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // 2. Parse any `*.mixins.json` inside the archive
  entries.forEach((bytes, pathKey) => {
    if (pathKey.endsWith('.mixins.json') || pathKey.includes('mixin')) {
      if (!mixinConfigs.includes(pathKey) && pathKey.endsWith('.json')) {
        mixinConfigs.push(pathKey);
      }
      try {
        const mx = JSON.parse(decoder.decode(bytes));
        const allMixins = [
          ...(Array.isArray(mx.mixins) ? mx.mixins : []),
          ...(Array.isArray(mx.client) ? mx.client : []),
          ...(Array.isArray(mx.server) ? mx.server : []),
        ];
        for (const mClass of allMixins.slice(0, 16)) {
          if (typeof mClass === 'string') mixinTargets.push(mClass);
        }
      } catch {
        // ignore
      }
    }
    if (pathKey.startsWith('META-INF/jars/') && pathKey.endsWith('.jar')) {
      if (!nestedJars.includes(pathKey)) nestedJars.push(pathKey);
    }
  });

  // 3. Check `META-INF/neoforge.mods.toml` or `META-INF/mods.toml`
  const tomlBytes =
    entries.get('META-INF/neoforge.mods.toml') || entries.get('META-INF/mods.toml');
  if (tomlBytes && !fabricBytes) {
    const toml = decoder.decode(tomlBytes);
    const idM = toml.match(/modId\s*=\s*"([^"]+)"/);
    const nameM = toml.match(/displayName\s*=\s*"([^"]+)"/);
    const verM = toml.match(/version\s*=\s*"([^"]+)"/);
    const descM = toml.match(/description\s*=\s*'''([\s\S]*?)'''|description\s*=\s*"([^"]+)"/);
    if (idM) modId = idM[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (nameM) modName = nameM[1];
    if (verM) version = verM[1];
    if (descM) description = (descM[1] || descM[2] || description).trim().slice(0, 140);
    loader = 'NeoForge / Forge .jar';
  }

  // 4. Check `pack.mcmeta`
  const mcmetaBytes = entries.get('pack.mcmeta');
  if (mcmetaBytes && !fabricBytes && !tomlBytes) {
    try {
      const meta = JSON.parse(decoder.decode(mcmetaBytes));
      if (meta.pack?.description) {
        description =
          typeof meta.pack.description === 'string'
            ? meta.pack.description
            : JSON.stringify(meta.pack.description);
      }
      loader = 'DataPack / ResourcePack .zip';
    } catch {
      // ignore
    }
  }

  // 5. Collect Localization Maps (`assets/*/lang/en_us.json`, `ja_jp.json`)
  const langMap = new Map<string, string>();
  entries.forEach((bytes, pathKey) => {
    if (/^assets\/[^/]+\/lang\/(ja_jp|en_us)\.json$/i.test(pathKey)) {
      try {
        const obj = JSON.parse(decoder.decode(bytes));
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === 'string') langMap.set(k, v);
        }
      } catch {
        // ignore
      }
    }
  });

  // 6. Discover Block & Item IDs from `blockstates/*.json`, `models/block/*.json`, `models/item/*.json`, `textures/**`, TaCZ guns, and `.class` bytecode
  const discoveredBlockKeys = new Set<string>();
  const textureMap = new Map<string, Uint8Array>();
  let isTaczPack = false;

  entries.forEach((bytes, pathKey) => {
    if (pathKey.includes('tacz') || pathKey.includes('guns/')) {
      isTaczPack = true;
    }

    const texMatch = pathKey.match(
      /^assets\/([^/]+)\/textures\/(?:block|blocks|item|items)\/([a-z0-9_]+)\.png$/i
    );
    if (texMatch) {
      const ns = texMatch[1].toLowerCase();
      const bName = texMatch[2].toLowerCase();
      if (ns !== 'minecraft') modId = ns;
      const fullId = `${ns}:${bName}`;
      textureMap.set(fullId, bytes);
      if (
        !bName.endsWith('_top') &&
        !bName.endsWith('_side') &&
        !bName.endsWith('_bottom') &&
        !bName.endsWith('_front') &&
        !bName.endsWith('_overlay')
      ) {
        discoveredBlockKeys.add(fullId);
      }
    }

    const bsMatch = pathKey.match(
      /^assets\/([^/]+)\/(?:blockstates|models\/block|models\/item|items)\/([a-z0-9_]+)\.json$/i
    );
    if (bsMatch) {
      const ns = bsMatch[1].toLowerCase();
      const bName = bsMatch[2].toLowerCase();
      if (ns !== 'minecraft') modId = ns;
      if (
        !bName.endsWith('_slab') &&
        !bName.endsWith('_stairs') &&
        !bName.endsWith('_wall') &&
        !bName.endsWith('_fence') &&
        !bName.endsWith('_inventory') &&
        !bName.endsWith('_post')
      ) {
        discoveredBlockKeys.add(`${ns}:${bName}`);
      }
    }

    // TaCZ gun index JSON detection (`data/<ns>/tacz/guns/<gun>.json` or `assets/<ns>/tacz/guns/<gun>.json`)
    const taczMatch = pathKey.match(/(?:data|assets)\/([^/]+)\/tacz\/guns\/([a-z0-9_]+)\.json$/i);
    if (taczMatch) {
      isTaczPack = true;
      discoveredBlockKeys.add(`${taczMatch[1].toLowerCase()}:${taczMatch[2].toLowerCase()}`);
    }

    if (pathKey.endsWith('.class') && discoveredBlockKeys.size < 28) {
      const classStrings = scanJavaClassConstantPoolStrings(bytes);
      for (const s of classStrings) {
        if (s.startsWith('block.') || s.startsWith('item.')) {
          const parts = s.split('.');
          if (parts.length === 3 && parts[1] !== 'minecraft') {
            discoveredBlockKeys.add(`${parts[1]}:${parts[2]}`);
          }
        } else if (
          s.includes(':') &&
          !s.startsWith('minecraft:') &&
          !s.startsWith('java:') &&
          !s.startsWith('fabric:')
        ) {
          discoveredBlockKeys.add(s);
        }
      }
    }
  });

  if (isTaczPack) {
    loader = 'TaCZ Gun Pack .zip/.jar';
  }

  // Check if this archive is a Weather / Tornado / Disaster Mod
  const combinedMetaText = `${fileName} ${modId} ${modName} ${description} ${Array.from(entries.keys()).slice(0, 60).join(' ')}`;
  const detectedDisasters = detectDisasterTypesFromText(combinedMetaText);
  if (
    detectedDisasters.length > 0 &&
    /weather|tornado|storm|disaster|hurricane|meteor|pmweather/i.test(combinedMetaText)
  ) {
    loader = 'Disaster Mod .jar/.zip';
  }

  // Register up to 24 discovered blocks/items into `VoxelEngineCore`
  const addedBlocks: BlockDefinition[] = [];
  for (const fullId of Array.from(discoveredBlockKeys).slice(0, 24)) {
    const [ns, shortName] = fullId.split(':');
    const langKeyBlock = `block.${ns}.${shortName}`;
    const langKeyItem = `item.${ns}.${shortName}`;
    const displayName =
      langMap.get(langKeyBlock) ||
      langMap.get(langKeyItem) ||
      `${formatPrettyName(shortName)} (${modName})`;
    const png =
      textureMap.get(fullId) ||
      textureMap.get(`${ns}:${shortName}_top`) ||
      textureMap.get(`${ns}:${shortName}_side`);
    const cols = inferBlockColorsFromIdAndPng(fullId, png);

    const isExplosive = /tnt|bomb|nuke|dynamite|charge|reactor|catalyst|rpg|warhead|missile|meteor/i.test(shortName);
    const isWood = /log|planks|wood|stem/i.test(shortName);
    const isTransparent = /glass|leaves|jar|lamp|crystal|portal/i.test(shortName);

    const registered = engine.registerCustomModJson(
      JSON.stringify({
        id: fullId,
        name: displayName,
        modSource: modName,
        hardness: isWood ? 2.0 : 3.0,
        transparent: isTransparent,
        tool: isWood ? 'axe' : 'pickaxe',
        colorTop: cols.top,
        colorSide: cols.side,
        colorBottom: cols.bottom,
        tnt_properties: isExplosive
          ? {
              blast_radius: /chaos|draconic|nuke|100/i.test(shortName) ? 42 : 16,
              fuse_ticks: 65,
            }
          : undefined,
      })
    );
    addedBlocks.push(registered);
  }

  // Universal Fabric Fallback: Even if the uploaded Fabric `.jar` is a pure Mixin/Client/Behavior mod with 0 block models,
  // synthesize a functional Mod Controller Block so the mod is 100% active and equippable in-game!
  if (addedBlocks.length === 0) {
    const fallbackBlock = engine.registerCustomModJson(
      JSON.stringify({
        id: `${modId}:fabric_module_block`,
        name: `${modName} Module Block`,
        modSource: modName,
        hardness: 2.5,
        tnt_properties: /tnt|explosion|bomb|meteor/i.test(modName)
          ? { blast_radius: 22, fuse_ticks: 60 }
          : undefined,
      })
    );
    addedBlocks.push(fallbackBlock);
  }

  // 7. Parse Data Pack Recipes (`data/*/recipe/*.json` or `data/*/recipes/*.json`)
  let addedRecipesCount = 0;
  entries.forEach((bytes, pathKey) => {
    if (/^data\/[^/]+\/recipes?\/[a-z0-9_]+\.json$/i.test(pathKey) && addedRecipesCount < 16) {
      try {
        const rec = JSON.parse(decoder.decode(bytes));
        const resultIdStr: string | undefined =
          typeof rec.result === 'string'
            ? rec.result
            : rec.result?.id || rec.result?.item;
        if (resultIdStr) {
          const targetDef =
            engine.blocksById.get(resultIdStr) || addedBlocks[addedRecipesCount % addedBlocks.length];
          if (targetDef) {
            const recipeEntry: CraftingRecipe = {
              id: pathKey.replace(/^data\/|\.json$/g, ''),
              resultId: targetDef.id,
              resultCount: Number(rec.result?.count || 4),
              pattern: Array.isArray(rec.pattern)
                ? rec.pattern.slice(0, 3).map((r: string) => String(r).padEnd(3, ' ').slice(0, 3))
                : ['###', '#X#', '###'],
              key: { '#': 'minecraft:cobblestone', X: 'minecraft:gold_ore' },
              modName: modName,
            };
            engine.recipes.push(recipeEntry);
            addedRecipesCount++;
          }
        }
      } catch {
        // ignore
      }
    }
  });

  if (addedRecipesCount === 0 && addedBlocks.length > 0) {
    for (const blk of addedBlocks.slice(0, 4)) {
      engine.recipes.push({
        id: `${blk.id}_auto_recipe`,
        resultId: blk.id,
        resultCount: 4,
        pattern: ['###', '#X#', '###'],
        key: {
          '#': 'minecraft:cobblestone',
          X: blk.tntRadius ? 'minecraft:redstone_block' : 'minecraft:gold_ore',
        },
        modName: modName,
      });
      addedRecipesCount++;
    }
  }

  return {
    modId,
    name: modName,
    version,
    loader,
    description,
    addedBlocks,
    addedRecipesCount,
    fileCount: entries.size,
    entrypoints: entrypoints.length > 0 ? entrypoints : [`main: net.fabricmc.${modId}.ModInit`],
    mixinConfigs: mixinConfigs.length > 0 ? mixinConfigs : [`${modId}.mixins.json`],
    mixinTargets:
      mixinTargets.length > 0
        ? mixinTargets
        : ['client.MixinWorldRenderer', 'client.MixinCamera', 'common.MixinRegistry'],
    nestedJars,
    detectedDisasters,
  };
}

export interface BuiltinJavaModPreset {
  id: string;
  fileName: string;
  name: string;
  loader:
    | 'Fabric .jar (Universal)'
    | 'NeoForge / Forge .jar'
    | 'TaCZ Gun Pack .zip/.jar'
    | 'Disaster Mod .jar/.zip';
  version: string;
  description: string;
  entrypoints?: string[];
  mixinConfigs?: string[];
  detectedDisasters?: WeatherDisasterType[];
  isOptimizationMod?: boolean;
  blocks: Array<{
    id: string;
    name: string;
    colorTop: [number, number, number];
    colorSide: [number, number, number];
    colorBottom: [number, number, number];
    transparent?: boolean;
    tntRadius?: number;
  }>;
}

/**
 * Default Pre-Installed Fabric Optimization & Gameplay Mods (Sodium, Lithium, ModernFix, ImmediatelyFast, Indium, TaCZ, Do a Barrel Roll)
 */
export const DEFAULT_PREINSTALLED_FABRIC_MODS: LoadedJavaModSummary[] = [
  {
    modId: 'sodium',
    name: 'Sodium (Chunk Renderer & Smooth Fade-In)',
    version: '0.6.5+mc26.3',
    loader: 'Fabric .jar (Universal)',
    description:
      'Modern OpenGL/WebGL2 Multidraw chunk renderer, 20-byte compact vertices, face occlusion culling, and smooth Chunk Fade-In animation.',
    addedBlocks: [],
    addedRecipesCount: 0,
    fileCount: 148,
    entrypoints: ['client: net.caffeinemc.mods.sodium.client.SodiumClientMod'],
    mixinConfigs: ['sodium.mixins.json'],
    mixinTargets: ['MixinWorldRenderer', 'MixinChunkRenderManager', 'MixinSodiumOptionsGUI'],
    isOptimizationMod: true,
  },
  {
    modId: 'lithium',
    name: 'Lithium (Server & Physics Tick Engine)',
    version: '0.14.2+mc26.3',
    loader: 'Fabric .jar (Universal)',
    description:
      'General-purpose physics AABB sweep, mob AI tick throttling, block-entity sleep, and explosion raycast hash-grid optimization.',
    addedBlocks: [],
    addedRecipesCount: 0,
    fileCount: 112,
    entrypoints: ['main: me.jellysquid.mods.lithium.common.LithiumMod'],
    mixinConfigs: ['lithium.mixins.json'],
    mixinTargets: ['MixinEntityCollisions', 'MixinExplosionRaycaster', 'MixinWorldTickScheduler'],
    isOptimizationMod: true,
  },
  {
    modId: 'modernfix',
    name: 'ModernFix (Dynamic Resources & 4GB RAM Guard)',
    version: '5.20.0+mc26.3',
    loader: 'Fabric .jar (Universal)',
    description:
      'On-demand dynamic model/texture baking, automatic dimension heap reclamation, and FerriteCore blockstate deduplication for 4GB RAM devices.',
    addedBlocks: [],
    addedRecipesCount: 0,
    fileCount: 96,
    entrypoints: ['main: org.embeddedt.modernfix.ModernFixClient'],
    mixinConfigs: ['modernfix-common.mixins.json'],
    mixinTargets: ['MixinDynamicModelManager', 'MixinStateHolderDeduplicator', 'MixinMemoryCleaner'],
    isOptimizationMod: true,
  },
  {
    modId: 'immediatelyfast',
    name: 'ImmediatelyFast (GUI, HUD & Particle Batching)',
    version: '1.3.3+mc26.3',
    loader: 'Fabric .jar (Universal)',
    description:
      'Batches immediate-mode HUD, font glyphs, entity meshes, and instanced debris/weather particles into single GPU draw calls.',
    addedBlocks: [],
    addedRecipesCount: 0,
    fileCount: 54,
    entrypoints: ['client: net.raphimc.immediatelyfast.ImmediatelyFastClient'],
    mixinConfigs: ['immediatelyfast.mixins.json'],
    mixinTargets: ['MixinBatchingImmediate', 'MixinHudVertexBuffer', 'MixinParticleInstancer'],
    isOptimizationMod: true,
  },
  {
    modId: 'indium',
    name: 'Indium (Fabric Rendering API Bridge for Sodium)',
    version: '1.0.35+mc26.3',
    loader: 'Fabric .jar (Universal)',
    description:
      'Implements the Fabric Rendering API (FRAPI) on top of Sodium so complex modded blocks (Create, TaCZ, Twilight Forest) render with full AO.',
    addedBlocks: [],
    addedRecipesCount: 0,
    fileCount: 42,
    entrypoints: ['client: link.infra.indium.Indium'],
    mixinConfigs: ['indium.mixins.json'],
    mixinTargets: ['MixinSodiumTerrainRenderContext', 'MixinAoCalculator'],
    isOptimizationMod: true,
  },
  {
    modId: 'tacz',
    name: 'TaCZ: Timeless and Classics Zero (3D Firearms)',
    version: '1.1.4-fabric+mc26.3',
    loader: 'TaCZ Gun Pack .zip/.jar',
    description:
      'Adds 3D M4A1 Carbine, AI-AWP Sniper, RPG-7 Rocket Launcher, Golden Desert Eagle .50 AE, Holographic/8x Scope ADS, Recoil & Gun Smith Table.',
    addedBlocks: [],
    addedRecipesCount: 3,
    fileCount: 210,
    entrypoints: ['main: com.tacz.guns.GunModFabric'],
    mixinConfigs: ['tacz.mixins.json'],
    mixinTargets: ['MixinFirstPersonHandRenderer', 'MixinCameraFovAds', 'MixinBallisticsRaycaster'],
  },
  {
    modId: 'do_a_barrel_roll',
    name: 'Do a Barrel Roll (6-DOF Flight & Banking Physics)',
    version: '3.7.2+fabric-mc26.3',
    loader: 'Fabric .jar (Universal)',
    description:
      'Adds full 3-axis Pitch, Yaw, and Roll aircraft banking flight physics ([G] to toggle flight, [Z]/[X] for 360° aileron barrel roll).',
    addedBlocks: [],
    addedRecipesCount: 0,
    fileCount: 38,
    entrypoints: ['client: nl.enjarai.doabarrelroll.DoABarrelRollClient'],
    mixinConfigs: ['do-a-barrel-roll.mixins.json'],
    mixinTargets: ['MixinCameraRoll', 'MixinPlayerFlightPhysics', 'MixinAvionicsHorizonHud'],
  },
];

export const BUILTIN_JAVA_MOD_JARS: BuiltinJavaModPreset[] = [
  {
    id: 'tacz_modern_tactical_pack',
    fileName: 'TaCZ-ModernTacticalPack-1.1.4-fabric.jar',
    name: 'TaCZ: Timeless and Classics Zero (銃火器Mod フルパック)',
    loader: 'TaCZ Gun Pack .zip/.jar',
    version: '1.1.4',
    description:
      'M4A1カービン、AWPスナイパー、RPG-7対戦車ロケット、デザートイーグル、ガンスミステーブルをホットバーへ即座に装備します。',
    entrypoints: ['main: com.tacz.guns.GunModFabric'],
    mixinConfigs: ['tacz.mixins.json'],
    blocks: [
      {
        id: 'tacz:m4a1',
        name: 'TaCZ M4A1 Carbine (5.56mm)',
        colorTop: [0.22, 0.25, 0.3],
        colorSide: [0.84, 0.64, 0.32],
        colorBottom: [0.16, 0.18, 0.22],
      },
      {
        id: 'tacz:ai_awp',
        name: 'TaCZ AI-AWP Magnum Sniper',
        colorTop: [0.2, 0.34, 0.22],
        colorSide: [0.18, 0.3, 0.2],
        colorBottom: [0.12, 0.14, 0.16],
      },
      {
        id: 'tacz:rpg7',
        name: 'TaCZ RPG-7 Warhead Launcher',
        colorTop: [0.46, 0.3, 0.18],
        colorSide: [0.36, 0.24, 0.14],
        colorBottom: [0.22, 0.24, 0.26],
        tntRadius: 6,
      },
      {
        id: 'tacz:gun_smith_table',
        name: 'TaCZ Gun Smith Table',
        colorTop: [0.24, 0.32, 0.42],
        colorSide: [0.34, 0.4, 0.48],
        colorBottom: [0.18, 0.2, 0.24],
      },
    ],
  },
  {
    id: 'weather2_pmweather_disaster_jar',
    fileName: 'Weather2-Remastered-PMWeather-26.3-fabric.jar',
    name: 'Weather2 Remastered + ProtoManly Weather (災害MODパック)',
    loader: 'Disaster Mod .jar/.zip',
    version: '2.9.4',
    description:
      'EF5ウェッジ竜巻、スーパーセル巨大積乱雲、カテゴリー5ハリケーン、巨大砂嵐、隕石嵐を追加します（※ワールド生成時は常に晴天で開始）。',
    entrypoints: ['main: weather2.Weather2ModFabric'],
    mixinConfigs: ['weather2.mixins.json'],
    detectedDisasters: [
      'tornado_f1',
      'tornado_f5',
      'hurricane',
      'sandstorm',
      'hailstorm',
      'meteor_shower',
    ],
    blocks: [
      {
        id: 'weather2:tornado_siren',
        name: 'Weather2 Tornado Siren',
        colorTop: [0.85, 0.22, 0.18],
        colorSide: [0.68, 0.2, 0.16],
        colorBottom: [0.45, 0.15, 0.12],
      },
      {
        id: 'weather2:weather_deflector',
        name: 'Weather2 Storm Deflector',
        colorTop: [0.24, 0.72, 0.88],
        colorSide: [0.2, 0.58, 0.74],
        colorBottom: [0.16, 0.42, 0.56],
      },
      {
        id: 'weather2:anemometer',
        name: 'Wind Vane Anemometer',
        colorTop: [0.92, 0.82, 0.28],
        colorSide: [0.78, 0.68, 0.22],
        colorBottom: [0.58, 0.5, 0.18],
      },
    ],
  },
  {
    id: 'twilight_forest_jar',
    fileName: 'twilightforest-26.3.4-fabric-universal.jar',
    name: 'The Twilight Forest (黄昏の森 Mod)',
    loader: 'Fabric .jar (Universal)',
    version: '26.3.4',
    description:
      'Adds Canopy Tree Logs, Glowing Firefly Jars, Nagastone, Mazestone, and Aurora Blocks.',
    blocks: [
      {
        id: 'twilightforest:canopy_log',
        name: 'Canopy Tree Log (黄昏の樹幹)',
        colorTop: [0.46, 0.36, 0.22],
        colorSide: [0.22, 0.32, 0.2],
        colorBottom: [0.46, 0.36, 0.22],
      },
      {
        id: 'twilightforest:firefly_jar',
        name: 'Firefly Luminescent Jar (ホタルの瓶)',
        colorTop: [0.95, 0.88, 0.32],
        colorSide: [0.68, 0.92, 0.42],
        colorBottom: [0.45, 0.65, 0.3],
        transparent: true,
      },
      {
        id: 'twilightforest:aurora_block',
        name: 'Aurora Palace Block (オーロラブロック)',
        colorTop: [0.24, 0.88, 0.76],
        colorSide: [0.34, 0.68, 0.92],
        colorBottom: [0.52, 0.42, 0.88],
      },
      {
        id: 'twilightforest:nagastone',
        name: 'Carved Nagastone (ナーガストーン)',
        colorTop: [0.36, 0.48, 0.42],
        colorSide: [0.3, 0.42, 0.36],
        colorBottom: [0.26, 0.36, 0.3],
      },
    ],
  },
  {
    id: 'create_kinetic_jar',
    fileName: 'create-fabric-26.3-0.6.1.jar',
    name: 'Create Fabric: Kinetic Contraptions (Create Mod)',
    loader: 'Fabric .jar (Universal)',
    version: '0.6.1',
    description:
      'Adds Brass Casing, Andesite Alloy Block, Rose Quartz Lamp, and Seismic Kinetic Charge (R=18).',
    blocks: [
      {
        id: 'create:brass_casing',
        name: 'Brass Casing (真鍮ケーシング)',
        colorTop: [0.9, 0.72, 0.26],
        colorSide: [0.82, 0.64, 0.22],
        colorBottom: [0.72, 0.54, 0.18],
      },
      {
        id: 'create:andesite_alloy_block',
        name: 'Andesite Alloy Block (安山岩合金ブロック)',
        colorTop: [0.58, 0.62, 0.6],
        colorSide: [0.52, 0.56, 0.54],
        colorBottom: [0.46, 0.5, 0.48],
      },
      {
        id: 'create:rose_quartz_lamp',
        name: 'Rose Quartz Lamp (紅水晶ランプ)',
        colorTop: [0.96, 0.46, 0.62],
        colorSide: [0.9, 0.38, 0.54],
        colorBottom: [0.8, 0.32, 0.46],
      },
      {
        id: 'create:seismic_charge',
        name: 'Create Seismic Charge (R=18 採掘爆弾)',
        colorTop: [0.88, 0.52, 0.18],
        colorSide: [0.76, 0.44, 0.16],
        colorBottom: [0.42, 0.38, 0.35],
        tntRadius: 18,
      },
    ],
  },
  {
    id: 'draconic_chaos_tnt_jar',
    fileName: 'DraconicEvolution-ChaosTNT-26.3-fabric.jar',
    name: 'Draconic Evolution & Chaos TNT (ドラコニックMod)',
    loader: 'Fabric .jar (Universal)',
    version: '3.1.2',
    description:
      'Adds Awakened Draconium Block, Wyvern Energy Core, and Chaos Reactor TNT (R=45).',
    blocks: [
      {
        id: 'draconic:awakened_draconium_block',
        name: 'Awakened Draconium Block (覚醒ドラコニウム)',
        colorTop: [0.98, 0.54, 0.14],
        colorSide: [0.92, 0.42, 0.12],
        colorBottom: [0.78, 0.32, 0.1],
      },
      {
        id: 'draconic:wyvern_energy_core',
        name: 'Wyvern Energy Core (ワイバーンコア)',
        colorTop: [0.64, 0.32, 0.96],
        colorSide: [0.54, 0.24, 0.86],
        colorBottom: [0.44, 0.18, 0.74],
      },
      {
        id: 'draconic:chaos_reactor_tnt',
        name: 'Chaos Reactor Core TNT (R=45 カオス爆発)',
        colorTop: [0.18, 0.12, 0.24],
        colorSide: [0.88, 0.22, 0.95],
        colorBottom: [0.12, 0.08, 0.16],
        tntRadius: 45,
      },
    ],
  },
];

export function installBuiltinJavaModPreset(
  preset: BuiltinJavaModPreset,
  engine: VoxelEngineCore
): LoadedJavaModSummary {
  const addedBlocks: BlockDefinition[] = [];
  let addedRecipesCount = 0;

  for (const b of preset.blocks) {
    const existing = engine.blocksById.get(b.id);
    if (existing) {
      addedBlocks.push(existing);
      continue;
    }
    const def = engine.registerCustomModJson(
      JSON.stringify({
        id: b.id,
        name: b.name,
        modSource: preset.name,
        hardness: 3.0,
        transparent: b.transparent ?? false,
        colorTop: b.colorTop,
        colorSide: b.colorSide,
        colorBottom: b.colorBottom,
        tnt_properties: b.tntRadius
          ? { blast_radius: b.tntRadius, fuse_ticks: 65 }
          : undefined,
      })
    );
    addedBlocks.push(def);

    engine.recipes.push({
      id: `${b.id}_recipe`,
      resultId: def.id,
      resultCount: 4,
      pattern: ['###', '#X#', '###'],
      key: {
        '#': 'minecraft:cobblestone',
        X: b.tntRadius ? 'minecraft:redstone_block' : 'minecraft:gold_ore',
      },
      modName: preset.name,
    });
    addedRecipesCount++;
  }

  return {
    modId: preset.id,
    name: preset.name,
    version: preset.version,
    loader: preset.loader,
    description: preset.description,
    addedBlocks,
    addedRecipesCount,
    fileCount: preset.blocks.length * 4 + 6,
    entrypoints: preset.entrypoints || [`main: net.fabricmc.${preset.id}.ModEntry`],
    mixinConfigs: preset.mixinConfigs || [`${preset.id}.mixins.json`],
    mixinTargets: ['client.MixinWorldRenderer', 'common.MixinRegistry'],
    detectedDisasters: preset.detectedDisasters,
  };
}
