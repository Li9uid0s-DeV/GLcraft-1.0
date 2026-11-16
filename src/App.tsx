import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  VoxelEngineCore,
  WorldTypeId,
  GameMode,
  DimensionId,
  BlockDefinition,
} from './engine/voxelEngine';
import {
  Weather2Simulation,
  WeatherDisasterType,
  WEATHER2_DISASTERS,
} from './engine/weather2System';
import { generateVoxelMaterialTextures } from './engine/textures';
import { SoundPhysicsAndVoiceEngine } from './engine/audioVoice';
import { ServerlessMultiplayerClient } from './engine/network';
import { TitleScreen, EngineSettings } from './components/TitleScreen';
import { GameHud, JadeTargetInfo } from './components/GameHud';
import {
  InventoryJeiModal,
  CommandConsoleModal,
  PauseModal,
} from './components/GameModals';

interface DebrisParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  scale: number;
  life: number;
  r: number;
  g: number;
  b: number;
}

interface PrimedTntEntity {
  id: number;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vy: number;
  radius: number;
  fuseRemaining: number;
  maxFuse: number;
}

interface MobEntity {
  id: number;
  name: string;
  archetype: 'forager' | 'chaser' | 'kiter';
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  walkPhase: number;
  koTimer: number;
}

const MAX_DEBRIS = 240;
const MAX_TORNADO_DEBRIS = 110;
const MAX_PRECIP_PARTICLES = 160;

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [activeModal, setActiveModal] = useState<'none' | 'inventory' | 'command' | 'pause'>('none');
  const [worldName, setWorldName] = useState('Wilderness Bound 26.3');
  const [worldSeed, setWorldSeed] = useState('26032026');
  const [worldType, setWorldType] = useState<WorldTypeId>('normal');
  const [gameMode, setGameMode] = useState<GameMode>('creative');
  const [dimension, setDimension] = useState<DimensionId>('minecraft:overworld');

  const [settings, setSettings] = useState<EngineSettings>({
    renderMode: 'pbr',
    raytraceBounces: 3,
    textureResolution: 16,
    biomeBlend: 5,
    renderDistance: 3,
    fov: 75,
    smoothLighting: true,
    physicsMod: true,
    waterWaves: true,
    cameraOverhaul: true,
    enhancedVisuals: true,
    weather2Tornado: true,
    soundPhysics: true,
    masterVolume: 0.8,
    voiceChatPttKey: 'V',
    skinModel: 'steve',
    skinColorHex: '#3b82f6',
    customSkinDataUrl: null,
  });

  // Hotbar initialized with 26.3 Wilderness Bound + Mega TNT Pack + WorldEdit Wand
  const [hotbarIds, setHotbarIds] = useState<number[]>([
    20, // Dappled Forest Grass
    21, // Poplar Log
    22, // Poplar Planks
    28, // Straw Camp Bed
    60, // Mega TNT x5
    61, // Mega TNT x10
    63, // Mega TNT x100
    260, // Blast Igniter
    261, // WorldEdit Wand (//wand)
  ]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [allBlocks, setAllBlocks] = useState<BlockDefinition[]>([]);
  const [loadedChunkCount, setLoadedChunkCount] = useState(0);
  const [blocksModifiedCount, setBlocksModifiedCount] = useState(0);

  // HUD state throttled to <= 10Hz
  const [jadeTarget, setJadeTarget] = useState<JadeTargetInfo | null>(null);
  const [playerPosHud, setPlayerPosHud] = useState<[number, number, number]>([0, 72, 6]);
  const [biomeNameHud, setBiomeNameHud] = useState('Dappled Forest (26.3)');
  const [health, setHealth] = useState(20);
  const [hunger] = useState(20);
  const [xpLevel] = useState(26);
  const [weatherState, setWeatherState] = useState<WeatherDisasterType>('tornado_f5');
  const [windTelemetry, setWindTelemetry] = useState({
    speed: 48,
    compassDeg: 32,
    cloudDensityPct: 86,
  });
  const [tornadoDistHud, setTornadoDistHud] = useState<number | null>(null);
  const [axiomMode, setAxiomMode] = useState(false);
  const [axiomSymmetry, setAxiomSymmetry] = useState<'off' | 'x' | 'z'>('off');
  const [worldEditPos1, setWorldEditPos1] = useState<[number, number, number] | null>(null);
  const [worldEditPos2, setWorldEditPos2] = useState<[number, number, number] | null>(null);
  const [oneBlockPhaseHud, setOneBlockPhaseHud] = useState<string | null>(null);
  const [multiplayerStatus, setMultiplayerStatus] = useState('offline');
  const [underwaterHud, setUnderwaterHud] = useState(false);
  const [blastFlashHud, setBlastFlashHud] = useState(0);
  const [lastToast, setLastToast] = useState<string | null>(null);
  const [commandLog, setCommandLog] = useState<string[]>([
    '[VoxelCraft 26.3] Ready. Type /weather tornado_f5, /weather hurricane, /weather sandstorm, or //set.',
  ]);

  // Mutable engine refs decoupled from React 60Hz loop
  const engineRef = useRef<VoxelEngineCore>(new VoxelEngineCore(26032026, 'normal', 5));
  const weather2Ref = useRef<Weather2Simulation>(new Weather2Simulation());
  const audioRef = useRef<SoundPhysicsAndVoiceEngine>(new SoundPhysicsAndVoiceEngine());
  const netRef = useRef<ServerlessMultiplayerClient>(new ServerlessMultiplayerClient());

  const gameStateRef = useRef(gameState);
  const activeModalRef = useRef(activeModal);
  const settingsRef = useRef(settings);
  const hotbarRef = useRef(hotbarIds);
  const selectedSlotRef = useRef(selectedSlot);
  const gameModeRef = useRef(gameMode);
  const axiomModeRef = useRef(axiomMode);
  const axiomSymmetryRef = useRef(axiomSymmetry);
  const wePos1Ref = useRef<[number, number, number] | null>(null);
  const wePos2Ref = useRef<[number, number, number] | null>(null);
  const weatherStateRef = useRef(weatherState);

  useEffect(() => {
    gameStateRef.current = gameState;
    document.body.dataset.state = gameState;
  }, [gameState]);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  useEffect(() => {
    settingsRef.current = settings;
    audioRef.current.masterVolume = settings.masterVolume;
    audioRef.current.soundPhysicsEnabled = settings.soundPhysics;
    engineRef.current.biomeBlendSize = settings.biomeBlend;
  }, [settings]);

  useEffect(() => {
    hotbarRef.current = hotbarIds;
  }, [hotbarIds]);

  useEffect(() => {
    selectedSlotRef.current = selectedSlot;
  }, [selectedSlot]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    axiomModeRef.current = axiomMode;
  }, [axiomMode]);

  useEffect(() => {
    axiomSymmetryRef.current = axiomSymmetry;
  }, [axiomSymmetry]);

  useEffect(() => {
    weatherStateRef.current = weatherState;
    weather2Ref.current.setDisaster(weatherState);
  }, [weatherState]);

  useEffect(() => {
    setAllBlocks(Array.from(engineRef.current.blocksByNum.values()));
    // Fetch ./mods/index.json via relative path so GitHub Pages project subpaths (/<repo>/) work seamlessly
    fetch('./mods/index.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (manifest) => {
        if (!manifest?.mods) return;
        for (const mod of manifest.mods) {
          if (mod.enabled && Array.isArray(mod.blocks)) {
            for (const blockPath of mod.blocks) {
              const relPath = blockPath.startsWith('/') ? `.${blockPath}` : blockPath;
              const res = await fetch(relPath).catch(() => null);
              if (res && res.ok) {
                const text = await res.text();
                try {
                  engineRef.current.registerCustomModJson(text);
                } catch {
                  // Ignore invalid custom block json
                }
              }
            }
          }
        }
        setAllBlocks(Array.from(engineRef.current.blocksByNum.values()));
      })
      .catch(() => {
        // Offline or file:// fallback uses pre-registered ModRegistry blocks
      });
  }, []);

  const showToast = useCallback((msg: string) => {
    setLastToast(msg);
  }, []);

  // Scene & Mesh synchronization callbacks stored in refs
  const rebuildChunkThreeMeshRef = useRef<(cx: number, cz: number) => void>(() => {});
  const clearAllThreeChunksRef = useRef<() => void>(() => {});
  const spawnDebrisBurstRef = useRef<
    (x: number, y: number, z: number, col: [number, number, number], count: number) => void
  >(() => {});
  const spawnPrimedTntRef = useRef<
    (x: number, y: number, z: number, blockDef: BlockDefinition) => void
  >(() => {});
  const triggerExplosionRef = useRef<(x: number, y: number, z: number, radius: number) => void>(
    () => {}
  );
  const teleportPlayerRef = useRef<(x: number, y: number, z: number) => void>(() => {});
  const updateMaterialSettingsRef = useRef<() => void>(() => {});

  useEffect(() => {
    updateMaterialSettingsRef.current();
  }, [settings.renderMode, settings.textureResolution, settings.fov]);

  // Start or regenerate world around spawn
  const startWorldSession = useCallback(
    (overrideType?: WorldTypeId, overrideDim?: DimensionId) => {
      const targetType = overrideType ?? worldType;
      const targetDim = overrideDim ?? dimension;
      const numericSeed =
        parseInt(worldSeed.replace(/\D/g, ''), 10) ||
        worldSeed.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7);

      clearAllThreeChunksRef.current();
      const eng = engineRef.current;
      eng.releaseAllMemory();
      eng.seed = numericSeed >>> 0;
      eng.worldType = targetType;
      eng.dimension = targetDim;
      eng.biomeBlendSize = settingsRef.current.biomeBlend;

      const rad = Math.min(3, Math.max(2, settingsRef.current.renderDistance));
      const radiusToBuild =
        targetType === 'skyblock' || targetType === 'skyblock_lucky' || targetType === 'oneblock'
          ? 2
          : Math.min(2, rad);

      for (let cx = -radiusToBuild; cx <= radiusToBuild; cx++) {
        for (let cz = -radiusToBuild; cz <= radiusToBuild; cz++) {
          eng.generateChunk(cx, cz);
        }
      }
      for (let cx = -radiusToBuild; cx <= radiusToBuild; cx++) {
        for (let cz = -radiusToBuild; cz <= radiusToBuild; cz++) {
          rebuildChunkThreeMeshRef.current(cx, cz);
        }
      }

      const spawnX = 0.5;
      const spawnZ = targetType === 'oneblock' ? 0.5 : 4.5;
      const surfY =
        targetType === 'oneblock'
          ? 65
          : targetType === 'skyblock' || targetType === 'skyblock_lucky'
          ? 65
          : eng.computeSurfaceY(Math.floor(spawnX), Math.floor(spawnZ)) + 1;

      teleportPlayerRef.current(spawnX, surfY + 1.65, spawnZ);
      setLoadedChunkCount(eng.chunks.size);
      setActiveModal('none');
      setGameState('playing');
      document.body.dataset.state = 'playing';
      showToast(
        `World "${worldName}" started · Mode: ${targetType.toUpperCase()} · ${eng.chunks.size} chunks meshed`
      );
    },
    [worldType, dimension, worldSeed, worldName, showToast]
  );

  // Handle `?autostart=1` on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startWorldSession();
    }
  }, [startWorldSession]);

  // Execute 26.3 & WorldEdit commands
  const executeCommand = useCallback(
    (rawCmd: string) => {
      const cmd = rawCmd.trim();
      const eng = engineRef.current;
      const pushLog = (msg: string) => {
        setCommandLog((prev) => [...prev.slice(-18), `> ${cmd}`, msg]);
        showToast(msg);
      };

      if (cmd === '//wand') {
        setHotbarIds((prev) => {
          const next = [...prev];
          next[selectedSlotRef.current] = 261;
          return next;
        });
        pushLog('[WorldEdit] Equipped Wooden Axe Wand (Left-click Pos1, Right-click Pos2).');
        return;
      }

      if (cmd.startsWith('//set ')) {
        const blockKey = cmd.replace('//set ', '').trim();
        const def = eng.blocksById.get(blockKey) || eng.blocksById.get(`minecraft:${blockKey}`);
        if (!def) {
          pushLog(`[WorldEdit] Unknown block: ${blockKey}`);
          return;
        }
        const p1 = wePos1Ref.current ?? [
          Math.floor(playerPosHud[0]) - 2,
          Math.floor(playerPosHud[1]) - 1,
          Math.floor(playerPosHud[2]) - 2,
        ];
        const p2 = wePos2Ref.current ?? [
          Math.floor(playerPosHud[0]) + 2,
          Math.floor(playerPosHud[1]) + 1,
          Math.floor(playerPosHud[2]) + 2,
        ];
        const res = eng.applyWorldEditBox(p1, p2, def.numericId, 'set');
        res.dirtyChunks.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        setBlocksModifiedCount((c) => c + res.changedCount);
        pushLog(`[WorldEdit] Set ${res.changedCount} blocks to ${def.name}.`);
        return;
      }

      if (cmd.startsWith('//walls ')) {
        const blockKey = cmd.replace('//walls ', '').trim();
        const def = eng.blocksById.get(blockKey) || eng.blocksById.get(`minecraft:${blockKey}`);
        if (!def) {
          pushLog(`[WorldEdit] Unknown block: ${blockKey}`);
          return;
        }
        const p1 = wePos1Ref.current ?? [
          Math.floor(playerPosHud[0]) - 3,
          Math.floor(playerPosHud[1]),
          Math.floor(playerPosHud[2]) - 3,
        ];
        const p2 = wePos2Ref.current ?? [
          Math.floor(playerPosHud[0]) + 3,
          Math.floor(playerPosHud[1]) + 3,
          Math.floor(playerPosHud[2]) + 3,
        ];
        const res = eng.applyWorldEditBox(p1, p2, def.numericId, 'walls');
        res.dirtyChunks.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        setBlocksModifiedCount((c) => c + res.changedCount);
        pushLog(`[WorldEdit] Built perimeter walls (${res.changedCount} blocks of ${def.name}).`);
        return;
      }

      if (cmd.startsWith('//replace ')) {
        const parts = cmd.split(/\s+/);
        const fromDef =
          eng.blocksById.get(parts[1]) || eng.blocksById.get(`minecraft:${parts[1]}`);
        const toDef = eng.blocksById.get(parts[2]) || eng.blocksById.get(`minecraft:${parts[2]}`);
        if (!fromDef || !toDef) {
          pushLog('[WorldEdit] Usage: //replace <fromBlock> <toBlock>');
          return;
        }
        const p1 = wePos1Ref.current ?? [
          Math.floor(playerPosHud[0]) - 4,
          Math.floor(playerPosHud[1]) - 3,
          Math.floor(playerPosHud[2]) - 4,
        ];
        const p2 = wePos2Ref.current ?? [
          Math.floor(playerPosHud[0]) + 4,
          Math.floor(playerPosHud[1]) + 2,
          Math.floor(playerPosHud[2]) + 4,
        ];
        const res = eng.applyWorldEditBox(p1, p2, toDef.numericId, 'replace', fromDef.numericId);
        res.dirtyChunks.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        pushLog(`[WorldEdit] Replaced ${res.changedCount} blocks with ${toDef.name}.`);
        return;
      }

      if (cmd.startsWith('//sphere ') || cmd.startsWith('//cyl ')) {
        const parts = cmd.split(/\s+/);
        const isCyl = cmd.startsWith('//cyl');
        const def = eng.blocksById.get(parts[1]) || eng.blocksById.get(`minecraft:${parts[1]}`);
        const rad = Number(parts[2]) || 3;
        const height = isCyl ? Number(parts[3]) || 5 : undefined;
        if (!def) {
          pushLog(`[WorldEdit] Unknown block: ${parts[1]}`);
          return;
        }
        const center: [number, number, number] = wePos1Ref.current ?? [
          Math.floor(playerPosHud[0]),
          Math.floor(playerPosHud[1]),
          Math.floor(playerPosHud[2]) - 5,
        ];
        const res = eng.applyWorldEditSphere(center, rad, def.numericId, height);
        res.dirtyChunks.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        pushLog(
          `[WorldEdit] Created ${isCyl ? 'cylinder' : 'sphere'} (${res.changedCount} blocks).`
        );
        return;
      }

      if (cmd === '//undo') {
        const res = eng.undoWorldEdit();
        res.dirtyChunks.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        pushLog(`[WorldEdit] Undid ${res.restoredCount} block changes.`);
        return;
      }

      if (cmd === '//redo') {
        const res = eng.redoWorldEdit();
        res.dirtyChunks.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        pushLog(`[WorldEdit] Redid ${res.reappliedCount} block changes.`);
        return;
      }

      if (cmd.startsWith('/give ')) {
        const parts = cmd.split(/\s+/);
        const itemId = parts[2] || 'megatnt:tnt_100x';
        const def = eng.blocksById.get(itemId) || eng.blocksById.get(`minecraft:${itemId}`);
        if (def) {
          setHotbarIds((prev) => {
            const next = [...prev];
            next[selectedSlotRef.current] = def.numericId;
            return next;
          });
          pushLog(`Gave [${def.name}] to player slot #${selectedSlotRef.current + 1}.`);
        } else {
          pushLog(`Unknown item ID: ${itemId}`);
        }
        return;
      }

      if (cmd.startsWith('/gamemode ')) {
        const mode = cmd.replace('/gamemode ', '').trim() as GameMode;
        if (mode === 'creative' || mode === 'survival' || mode === 'spectator') {
          setGameMode(mode);
          pushLog(`Set own game mode to ${mode.toUpperCase()}.`);
        }
        return;
      }

      if (cmd.startsWith('/weather ')) {
        const rawW = cmd.replace('/weather ', '').trim();
        const mapped: WeatherDisasterType =
          rawW === 'tornado' ? 'tornado_f5' : (rawW as WeatherDisasterType);
        if (WEATHER2_DISASTERS[mapped]) {
          setWeatherState(mapped);
          if (mapped !== 'clear') audioRef.current.playSoundEffect('thunder');
          pushLog(
            `Weather2 changed to ${WEATHER2_DISASTERS[mapped].jpLabel} (${WEATHER2_DISASTERS[mapped].label}).`
          );
        } else {
          pushLog(
            `Unknown Weather2 disaster "${rawW}". Try: clear, rain, thunder, hailstorm, sandstorm, tornado_f1, tornado_f5, hurricane, meteor_shower.`
          );
        }
        return;
      }

      if (cmd.startsWith('/execute in ')) {
        const match = cmd.match(/\/execute in ([^\s]+)/);
        const targetDim = (match?.[1] || 'minecraft:the_nether') as DimensionId;
        setDimension(targetDim);
        startWorldSession(worldType, targetDim);
        pushLog(`Switched dimension to ${targetDim} (previous dimension RAM freed).`);
        return;
      }

      if (cmd.startsWith('/posteffect ')) {
        const mode = cmd.replace('/posteffect ', '').trim();
        if (mode === 'normal' || mode === 'pbr' || mode === 'raytracing') {
          setSettings((s) => ({ ...s, renderMode: mode }));
          pushLog(`Switched rendering pipeline to ${mode.toUpperCase()}.`);
        }
        return;
      }

      if (cmd.startsWith('/tp ')) {
        const nums = cmd
          .replace('/tp ', '')
          .replace('@s', '')
          .trim()
          .split(/\s+/)
          .map(Number);
        if (nums.length === 3 && nums.every((n) => !Number.isNaN(n))) {
          teleportPlayerRef.current(nums[0], nums[1], nums[2]);
          pushLog(`Teleported to (${nums[0]}, ${nums[1]}, ${nums[2]}).`);
        }
        return;
      }

      pushLog(`Executed 26.3 command: ${cmd}`);
    },
    [playerPosHud, showToast, startWorldSession, worldType]
  );

  // Initialize Three.js WebGLRenderer & Scene ONCE
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x6ba8e5);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x6ba8e5, 0.011);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    // Balanced Warm Key Light + Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x8ec8ff, 0x4b5c3b, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.35);
    sunLight.position.set(45, 95, 35);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 220;
    const d = 48;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Title Screen Zero-Chunk Centerpiece Diorama (only visible when `gameState === 'title'`)
    const titleStageGroup = new THREE.Group();
    const buildTitleCenterpiece = () => {
      // Composite 9-part floating Dappled Forest & Mega TNT island preview (0 chunks allocated!)
      const baseRock = new THREE.Mesh(
        new THREE.ConeGeometry(3.4, 2.8, 7),
        new THREE.MeshStandardMaterial({ color: 0x565963, roughness: 0.85, flatShading: true })
      );
      baseRock.rotation.x = Math.PI;
      baseRock.position.y = -1.4;
      titleStageGroup.add(baseRock);

      const grassTop = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 3.3, 0.7, 7),
        new THREE.MeshStandardMaterial({ color: 0xdb8736, roughness: 0.65 })
      );
      grassTop.position.y = 0.2;
      titleStageGroup.add(grassTop);

      const trunk = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 2.8, 0.65),
        new THREE.MeshStandardMaterial({ color: 0xd8d0c1, roughness: 0.75 })
      );
      trunk.position.set(-0.9, 1.8, -0.4);
      titleStageGroup.add(trunk);

      const canopy1 = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.3, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xf2c22e, roughness: 0.55 })
      );
      canopy1.position.set(-0.9, 3.3, -0.4);
      titleStageGroup.add(canopy1);

      const canopy2 = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.0, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xed7526, roughness: 0.5 })
      );
      canopy2.position.set(-0.9, 4.2, -0.4);
      titleStageGroup.add(canopy2);

      const megaTntBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.95, 0.95),
        new THREE.MeshStandardMaterial({
          color: 0xf25721,
          roughness: 0.35,
          metalness: 0.2,
          emissive: 0x441100,
        })
      );
      megaTntBlock.position.set(1.2, 1.02, 0.7);
      titleStageGroup.add(megaTntBlock);
    };
    buildTitleCenterpiece();
    scene.add(titleStageGroup);

    // Procedural Textures & Chunk Materials
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    let texPack = generateVoxelMaterialTextures(
      settingsRef.current.textureResolution,
      maxAniso,
      isSoftwareGl
    );

    const opaqueMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: texPack.albedoMap,
      roughnessMap: texPack.roughnessMap,
      roughness: 0.68,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });

    // Extend Opaque Material with GLSL Ray-Traced Sun Bounce & Specular GI when in `raytracing` mode
    const rtUniforms = {
      uRenderMode: { value: 1 }, // 0=normal, 1=pbr, 2=raytracing
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.45, 0.85, 0.35).normalize() },
    };

    opaqueMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uRenderMode = rtUniforms.uRenderMode;
      shader.uniforms.uTime = rtUniforms.uTime;
      shader.uniforms.uSunDir = rtUniforms.uSunDir;
      shader.vertexShader =
        `varying vec3 vWorldPos;\nvarying vec3 vWorldNorm;\n` +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNorm = normalize(mat3(modelMatrix) * objectNormal);`
        );
      shader.fragmentShader =
        `uniform int uRenderMode;\nuniform float uTime;\nuniform vec3 uSunDir;\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNorm;\n` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          if (uRenderMode == 2) {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            vec3 refl = reflect(-viewDir, normalize(vWorldNorm));
            float sunSpec = pow(max(dot(refl, uSunDir), 0.0), 24.0);
            float bounceGi = 0.18 * max(0.0, dot(vWorldNorm, vec3(0.0, 1.0, 0.0)));
            gl_FragColor.rgb += vec3(1.0, 0.92, 0.76) * sunSpec * 0.42 + vec3(0.22, 0.38, 0.55) * bounceGi;
          }`
        );
    };

    // Water Material with GLSL Gerstner Waves, Shore Foam & Splash Ripple
    const waterUniforms = {
      uTime: { value: 0 },
      uWavesEnabled: { value: 1.0 },
      uRippleOrigin: { value: new THREE.Vector3(0, 62, 0) },
      uRippleAge: { value: 99.0 },
    };

    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      roughness: 0.14,
      metalness: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    waterMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waterUniforms.uTime;
      shader.uniforms.uWavesEnabled = waterUniforms.uWavesEnabled;
      shader.uniforms.uRippleOrigin = waterUniforms.uRippleOrigin;
      shader.uniforms.uRippleAge = waterUniforms.uRippleAge;

      shader.vertexShader =
        `uniform float uTime;\nuniform float uWavesEnabled;\nuniform vec3 uRippleOrigin;\nuniform float uRippleAge;\nvarying float vWaveHeight;\nvarying vec3 vWaterWorldPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          float wave = 0.0;
          if (uWavesEnabled > 0.5) {
            wave += sin(vWaterWorldPos.x * 0.65 + uTime * 2.2) * 0.07;
            wave += cos(vWaterWorldPos.z * 0.55 + uTime * 1.8) * 0.06;
            float distToRipple = length(vWaterWorldPos.xz - uRippleOrigin.xz);
            if (uRippleAge < 4.0 && distToRipple < 8.0) {
              wave += sin(distToRipple * 4.0 - uRippleAge * 9.0) * exp(-distToRipple * 0.35) * exp(-uRippleAge * 0.9) * 0.18;
            }
          }
          transformed.y += wave;
          vWaveHeight = wave;`
        );

      shader.fragmentShader =
        `varying float vWaveHeight;\nvarying vec3 vWaterWorldPos;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float foam = smoothstep(0.065, 0.12, vWaveHeight);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 1.0), foam * 0.65);`
        );
    };

    updateMaterialSettingsRef.current = () => {
      const s = settingsRef.current;
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
      rtUniforms.uRenderMode.value =
        s.renderMode === 'normal' ? 0 : s.renderMode === 'pbr' ? 1 : 2;
      opaqueMaterial.roughness = s.renderMode === 'normal' ? 0.92 : 0.62;

      const updatedTex = generateVoxelMaterialTextures(s.textureResolution, maxAniso, isSoftwareGl);
      texPack.albedoMap.dispose();
      texPack.bumpMap.dispose();
      texPack.roughnessMap.dispose();
      texPack = updatedTex;
      opaqueMaterial.map = texPack.albedoMap;
      opaqueMaterial.roughnessMap = texPack.roughnessMap;
      opaqueMaterial.needsUpdate = true;
    };

    // Chunk Mesh Containers
    const chunkMeshGroup = new THREE.Group();
    scene.add(chunkMeshGroup);
    const opaqueMeshes = new Map<string, THREE.Mesh>();
    const waterMeshes = new Map<string, THREE.Mesh>();

    clearAllThreeChunksRef.current = () => {
      opaqueMeshes.forEach((m) => {
        m.geometry.dispose();
        chunkMeshGroup.remove(m);
      });
      waterMeshes.forEach((m) => {
        m.geometry.dispose();
        chunkMeshGroup.remove(m);
      });
      opaqueMeshes.clear();
      waterMeshes.clear();
    };

    rebuildChunkThreeMeshRef.current = (cx: number, cz: number) => {
      const key = VoxelEngineCore.chunkKey(cx, cz);
      const buffers = engineRef.current.buildChunkMesh(cx, cz);

      const prevOpaque = opaqueMeshes.get(key);
      if (prevOpaque) {
        prevOpaque.geometry.dispose();
        chunkMeshGroup.remove(prevOpaque);
        opaqueMeshes.delete(key);
      }
      const prevWater = waterMeshes.get(key);
      if (prevWater) {
        prevWater.geometry.dispose();
        chunkMeshGroup.remove(prevWater);
        waterMeshes.delete(key);
      }

      if (buffers.opaquePositions.length > 0) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(buffers.opaquePositions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(buffers.opaqueNormals, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(buffers.opaqueColors, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(buffers.opaqueUvs, 2));
        geo.computeBoundingSphere();

        const mesh = new THREE.Mesh(geo, opaqueMaterial);
        mesh.castShadow = !isSoftwareGl;
        mesh.receiveShadow = !isSoftwareGl;
        chunkMeshGroup.add(mesh);
        opaqueMeshes.set(key, mesh);
      }

      if (buffers.waterPositions.length > 0) {
        const wGeo = new THREE.BufferGeometry();
        wGeo.setAttribute('position', new THREE.BufferAttribute(buffers.waterPositions, 3));
        wGeo.setAttribute('normal', new THREE.BufferAttribute(buffers.waterNormals, 3));
        wGeo.setAttribute('color', new THREE.BufferAttribute(buffers.waterColors, 3));
        wGeo.computeBoundingSphere();

        const wMesh = new THREE.Mesh(wGeo, waterMaterial);
        wMesh.renderOrder = 2;
        chunkMeshGroup.add(wMesh);
        waterMeshes.set(key, wMesh);
      }
    };

    // Target Block Selection Wireframe + WorldEdit / Axiom Selection Box
    const targetWireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
      new THREE.LineBasicMaterial({ color: 0x111111 })
    );
    targetWireframe.visible = false;
    scene.add(targetWireframe);

    const worldEditBoxMesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x00e5ff })
    );
    worldEditBoxMesh.visible = false;
    scene.add(worldEditBoxMesh);

    // Physics Mod: Pre-allocated Zero-GC InstancedMesh for 3D Fracture Debris
    const debrisGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const debrisMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const debrisInstanced = new THREE.InstancedMesh(debrisGeo, debrisMat, MAX_DEBRIS);
    debrisInstanced.frustumCulled = false;
    scene.add(debrisInstanced);

    const debrisPool: DebrisParticle[] = Array.from({ length: MAX_DEBRIS }, () => ({
      active: false,
      x: 0,
      y: -999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      scale: 1,
      life: 0,
      r: 1,
      g: 1,
      b: 1,
    }));
    let debrisCursor = 0;

    spawnDebrisBurstRef.current = (x, y, z, col, count) => {
      if (!settingsRef.current.physicsMod) return;
      for (let i = 0; i < count; i++) {
        const p = debrisPool[debrisCursor];
        debrisCursor = (debrisCursor + 1) % MAX_DEBRIS;
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.6;
        p.y = y + (Math.random() - 0.5) * 0.6;
        p.z = z + (Math.random() - 0.5) * 0.6;
        p.vx = (Math.random() - 0.5) * 6.5;
        p.vy = 2.5 + Math.random() * 5.5;
        p.vz = (Math.random() - 0.5) * 6.5;
        p.rx = Math.random() * 6;
        p.ry = Math.random() * 6;
        p.scale = 0.75 + Math.random() * 0.5;
        p.life = 1.4 + Math.random() * 1.2;
        p.r = col[0];
        p.g = col[1];
        p.b = col[2];
      }
    };

    // 3D Procedural Volumetric Cloud Layer (Raymarched 3D Noise FBM + Wind Vector Advection + Storm Anvil)
    const cloudUniforms = {
      uTime: { value: 0 },
      uWindOffset: { value: new THREE.Vector3(0, 0, 0) },
      uStormCenter: { value: new THREE.Vector2(-16, -20) },
      uCloudCoverage: { value: 0.72 },
      uCloudDarkness: { value: 0.55 },
      uVortexSwirl: { value: 1.0 },
      uLightningFlash: { value: 0.0 },
    };

    const volumetricCloudMat = new THREE.ShaderMaterial({
      uniforms: cloudUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uWindOffset;
        uniform vec2 uStormCenter;
        uniform float uCloudCoverage;
        uniform float uCloudDarkness;
        uniform float uVortexSwirl;
        uniform float uLightningFlash;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        float hash3(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yzx + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        float noise3(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
                mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }

        float fbm3(vec3 p) {
          float v = 0.0;
          float a = 0.52;
          for (int i = 0; i < 4; i++) {
            v += a * noise3(p);
            p = p * 2.04 + vec3(13.1, 7.7, 5.3);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 relStorm = vWorldPos.xz - uStormCenter;
          float stormDist = length(relStorm);

          // Spiral eyewall distortion when tornado / hurricane vortex is active
          vec2 sampleXZ = vWorldPos.xz - uWindOffset.xz;
          if (uVortexSwirl > 0.1 && stormDist < 95.0) {
            float angle = atan(relStorm.y, relStorm.x) + (1.0 - stormDist / 95.0) * uVortexSwirl * 2.6;
            sampleXZ = uStormCenter + vec2(cos(angle), sin(angle)) * stormDist - uWindOffset.xz;
          }

          // Raymarch 5 volumetric altitude steps through the 3D cloud slab
          float accumDensity = 0.0;
          float accumLight = 0.0;
          for (int s = 0; s < 5; s++) {
            float hFrac = float(s) / 4.0;
            vec3 samplePos = vec3(sampleXZ * 0.022, hFrac * 2.2 + uWindOffset.y * 0.15);
            float n = fbm3(samplePos);
            float stormWall = smoothstep(75.0, 8.0, stormDist) * 0.25 * uVortexSwirl;
            float thresh = 1.0 - uCloudCoverage;
            float d = clamp((n + stormWall - thresh) / max(0.18, uCloudCoverage), 0.0, 1.0);
            accumDensity += d * 0.26;
            accumLight += d * (0.35 + hFrac * 0.65);
          }

          float alpha = clamp(accumDensity, 0.0, 0.92);
          // Fade out softly toward distant horizon edge
          float edgeFade = smoothstep(220.0, 65.0, length(vWorldPos.xz - cameraPosition.xz));
          alpha *= edgeFade;
          if (alpha < 0.02) discard;

          vec3 brightCloud = vec3(0.96, 0.98, 1.0);
          vec3 darkStormCore = vec3(0.16, 0.19, 0.25);
          vec3 baseCol = mix(brightCloud, darkStormCore, clamp(uCloudDarkness * (1.1 - accumLight * 0.35), 0.0, 1.0));
          // Internal lightning illumination near storm core
          float boltGlow = uLightningFlash * smoothstep(65.0, 0.0, stormDist);
          baseCol += vec3(0.75, 0.88, 1.0) * boltGlow;

          gl_FragColor = vec4(baseCol, alpha);
        }
      `,
    });

    // Multi-layer 3D Volumetric Cloud Canopy (Main Anvil Layer at Y=118 + Upper Cirrus/Cumulus at Y=132)
    const cloudGroup = new THREE.Group();
    const cloudLowerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(380, 380, 32, 32),
      volumetricCloudMat
    );
    cloudLowerMesh.rotation.x = -Math.PI / 2;
    cloudLowerMesh.position.y = 114;
    cloudLowerMesh.renderOrder = 1;

    const cloudUpperMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(380, 380, 16, 16),
      volumetricCloudMat
    );
    cloudUpperMesh.rotation.x = -Math.PI / 2;
    cloudUpperMesh.position.y = 128;
    cloudUpperMesh.renderOrder = 1;

    cloudGroup.add(cloudLowerMesh, cloudUpperMesh);
    scene.add(cloudGroup);

    // Weather2 Remastered: 3D Storm Cell & Swirling Tornado / Hurricane Funnel (`InstancedMesh`)
    const tornadoGroup = new THREE.Group();
    const tornadoGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const tornadoMat = new THREE.MeshStandardMaterial({
      color: 0x5c6473,
      roughness: 0.82,
    });
    const tornadoInstanced = new THREE.InstancedMesh(
      tornadoGeo,
      tornadoMat,
      MAX_TORNADO_DEBRIS
    );
    tornadoInstanced.frustumCulled = false;
    tornadoGroup.add(tornadoInstanced);
    tornadoGroup.position.set(-16, 64, -20);
    scene.add(tornadoGroup);

    // Weather2 Precipitation, Hailstones, Sandstorm & Falling Meteor InstancedMesh
    const precipGeo = new THREE.BoxGeometry(0.18, 0.95, 0.18);
    const precipMat = new THREE.MeshStandardMaterial({
      color: 0x90caf9,
      roughness: 0.3,
      emissive: 0x112233,
    });
    const precipInstanced = new THREE.InstancedMesh(
      precipGeo,
      precipMat,
      MAX_PRECIP_PARTICLES
    );
    precipInstanced.frustumCulled = false;
    scene.add(precipInstanced);

    const precipParticles = Array.from({ length: MAX_PRECIP_PARTICLES }, (_, i) => ({
      dx: ((i * 73) % 48) - 24,
      y: (i * 19) % 45,
      dz: ((i * 137) % 48) - 24,
      speed: 14 + (i % 9) * 1.8,
    }));

    // 3D Jagged Lightning Bolt Mesh for Supercell / Hurricane / EF5 Tornado
    const lightningBoltGroup = new THREE.Group();
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xe0f7fa });
    for (let seg = 0; seg < 6; seg++) {
      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9.5, 0.35), boltMat);
      segMesh.position.set((seg % 2 === 0 ? 1 : -1) * 0.7, seg * 8.5 + 4, 0);
      segMesh.rotation.z = (seg % 2 === 0 ? -1 : 1) * 0.18;
      lightningBoltGroup.add(segMesh);
    }
    lightningBoltGroup.visible = false;
    scene.add(lightningBoltGroup);
    let lightningTimer = 2.5;
    let meteorImpactTimer = 3.2;

    // Primed TNT Entities List
    const primedTnts: PrimedTntEntity[] = [];
    let nextEntityId = 1;

    spawnPrimedTntRef.current = (x, y, z, blockDef) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.92, 0.92),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(...blockDef.colorTop),
          roughness: 0.4,
        })
      );
      const fuseCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffaa00 })
      );
      fuseCap.position.y = 0.55;
      group.add(body, fuseCap);
      group.position.set(x, y, z);
      scene.add(group);

      primedTnts.push({
        id: nextEntityId++,
        mesh: group,
        x,
        y,
        z,
        vy: 3.8,
        radius: blockDef.tntRadius || 5,
        fuseRemaining: (blockDef.tntFuseTicks || 50) / 20,
        maxFuse: (blockDef.tntFuseTicks || 50) / 20,
      });
      audioRef.current.playSoundEffect('tnt_fuse');
    };

    // Composite 7-Part Procedural Mobs (3 Distinct Archetypes: Forager, Chaser, Kiter)
    const mobs: MobEntity[] = [];
    const createCompositeMob = (
      name: string,
      archetype: MobEntity['archetype'],
      x: number,
      z: number,
      bodyHex: number,
      accentHex: number
    ) => {
      const group = new THREE.Group();
      const matBody = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.75 });
      const matAccent = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.45 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.45), matBody);
      torso.position.y = 0.75;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matAccent);
      head.position.set(0, 1.38, 0.08);
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.12, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
      );
      visor.position.set(0, 1.4, 0.34);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), matAccent);
      legL.position.set(-0.16, 0.25, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), matAccent);
      legR.position.set(0.16, 0.25, 0);

      // Soft radial contact shadow disc grounded at y=0.02
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 12),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.02;

      group.add(torso, head, visor, legL, legR, shadowDisc);
      const y = engineRef.current.computeSurfaceY(Math.round(x), Math.round(z)) + 1;
      group.position.set(x, y, z);
      scene.add(group);

      mobs.push({
        id: nextEntityId++,
        name,
        archetype,
        group,
        x,
        y,
        z,
        vx: 0,
        vz: 0,
        yaw: 0,
        hp: 20,
        maxHp: 20,
        walkPhase: Math.random() * 6,
        koTimer: 0,
      });
    };

    createCompositeMob('Wilderness Boar (Forager)', 'forager', -5.5, -4.5, 0x8f563b, 0xd9a066);
    createCompositeMob('Dappled Husk (Chaser)', 'chaser', 6.5, -8.5, 0x3b7a57, 0x94b85c);
    createCompositeMob('Poplar Ranger (Kiter)', 'kiter', -7.5, -10.5, 0x5c6bc0, 0xffca28);

    // Player Kinematics & Camera Overhaul State
    const player = {
      x: 0.5,
      y: 72,
      z: 4.5,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: -0.12,
      onGround: false,
      cameraRoll: 0,
      cameraPitchKick: 0,
      trauma: 0,
      miningProgress: 0,
      miningBlockKey: '',
    };

    teleportPlayerRef.current = (x, y, z) => {
      player.x = x;
      player.y = y;
      player.z = z;
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
    };

    triggerExplosionRef.current = (x, y, z, radius) => {
      engineRef.current.queueTimeSlicedExplosion(x, y, z, radius);
      audioRef.current.playSoundEffect('explode');
      spawnDebrisBurstRef.current(x, y, z, [0.95, 0.45, 0.15], 28);
      const dist = Math.hypot(player.x - x, player.y - y, player.z - z);
      if (dist < radius * 2.5) {
        player.trauma = Math.min(1.0, player.trauma + 0.65);
        setBlastFlashHud(0.65);
      }
      netRef.current.broadcast('tnt_explode', { x, y, z, radius });
    };

    // Multiplayer incoming packet listener
    netRef.current.onPacket((pkt) => {
      if (pkt.type === 'block_set') {
        const bx = Number(pkt.payload.x);
        const by = Number(pkt.payload.y);
        const bz = Number(pkt.payload.z);
        const bid = Number(pkt.payload.blockId);
        const dirty = engineRef.current.setBlock(bx, by, bz, bid, false);
        dirty.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
      } else if (pkt.type === 'tnt_explode') {
        engineRef.current.queueTimeSlicedExplosion(
          Number(pkt.payload.x),
          Number(pkt.payload.y),
          Number(pkt.payload.z),
          Number(pkt.payload.radius)
        );
      }
    });

    // Unified Input Handling (`window` listeners + Focus-Loss Hygiene)
    const keysPressed = new Set<string>();
    let isPointerDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    // 3D Voxel DDA Raycast Helper (finds exact target voxel & adjacent placement voxel within 7m)
    const raycastVoxel = (): {
      hit: boolean;
      bx: number;
      by: number;
      bz: number;
      nx: number;
      ny: number;
      nz: number;
      block: BlockDefinition;
    } | null => {
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(
        new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')
      );
      const step = 0.08;
      let prevX = Math.floor(player.x);
      let prevY = Math.floor(player.y);
      let prevZ = Math.floor(player.z);

      for (let d = 0.2; d <= 7.0; d += step) {
        const rx = player.x + dir.x * d;
        const ry = player.y + dir.y * d;
        const rz = player.z + dir.z * d;
        const bx = Math.floor(rx);
        const by = Math.floor(ry);
        const bz = Math.floor(rz);

        const id = engineRef.current.getBlock(bx, by, bz);
        if (id !== 0 && id !== 6) {
          const def = engineRef.current.blocksByNum.get(id);
          if (def) {
            return {
              hit: true,
              bx,
              by,
              bz,
              nx: prevX - bx,
              ny: prevY - by,
              nz: prevZ - bz,
              block: def,
            };
          }
        }
        prevX = bx;
        prevY = by;
        prevZ = bz;
      }
      return null;
    };

    const handleBlockInteraction = (button: 'left' | 'right') => {
      if (gameStateRef.current !== 'playing' || activeModalRef.current !== 'none') return;
      const hit = raycastVoxel();
      if (!hit) return;

      const equippedId = hotbarRef.current[selectedSlotRef.current];
      const equippedDef = engineRef.current.blocksByNum.get(equippedId);

      // WorldEdit Wooden Axe Wand (`261`) Pos1 / Pos2 selection
      if (equippedId === 261) {
        const pos: [number, number, number] = [hit.bx, hit.by, hit.bz];
        if (button === 'left') {
          wePos1Ref.current = pos;
          setWorldEditPos1(pos);
          showToast(`[WorldEdit] First position set to (${pos.join(', ')})`);
        } else {
          wePos2Ref.current = pos;
          setWorldEditPos2(pos);
          showToast(`[WorldEdit] Second position set to (${pos.join(', ')})`);
        }
        return;
      }

      if (button === 'left') {
        // Break block
        if (hit.block.numericId === 5 && gameModeRef.current === 'survival') return; // Bedrock

        // Lucky Block (?) random outcome
        if (hit.block.numericId === 30) {
          audioRef.current.playSoundEffect('lucky');
          const roll = Math.floor(Math.random() * 3);
          if (roll === 0) {
            showToast('Lucky Block: Supernova TNT x10 Detonation!');
            triggerExplosionRef.current(hit.bx, hit.by, hit.bz, 7);
            return;
          } else if (roll === 1) {
            showToast('Lucky Block: Gifted 4x Supernova TNT x100!');
            setHotbarIds((prev) => {
              const next = [...prev];
              next[selectedSlotRef.current] = 63;
              return next;
            });
          } else {
            showToast('Lucky Block: Spawned Golden Poplar Shrine!');
          }
        }

        const dirty = engineRef.current.setBlock(hit.bx, hit.by, hit.bz, 0, false);
        // Axiom symmetry mirror break
        if (axiomSymmetryRef.current !== 'off') {
          const mx = axiomSymmetryRef.current === 'x' ? -hit.bx : hit.bx;
          const mz = axiomSymmetryRef.current === 'z' ? -hit.bz : hit.bz;
          engineRef.current.setBlock(mx, hit.by, mz, 0, false).forEach((k) => dirty.add(k));
        }
        dirty.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        spawnDebrisBurstRef.current(
          hit.bx + 0.5,
          hit.by + 0.5,
          hit.bz + 0.5,
          hit.block.colorTop,
          12
        );
        audioRef.current.playSoundEffect('dig');
        setBlocksModifiedCount((c) => c + 1);
        if (engineRef.current.worldType === 'oneblock') {
          setOneBlockPhaseHud(engineRef.current.oneBlockPhaseName);
        }
        netRef.current.broadcast('block_set', { x: hit.bx, y: hit.by, z: hit.bz, blockId: 0 });
      } else {
        // Right-click: Check if igniting TNT with Blast Igniter or clicking a TNT block directly
        if (hit.block.tntRadius && (equippedId === 260 || equippedId === 35 || hit.block.tntRadius >= 4)) {
          const dirty = engineRef.current.setBlock(hit.bx, hit.by, hit.bz, 0, false);
          dirty.forEach((k) => {
            const [cx, cz] = k.split(',').map(Number);
            rebuildChunkThreeMeshRef.current(cx, cz);
          });
          spawnPrimedTntRef.current(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5, hit.block);
          showToast(`Ignited ${hit.block.name} (Blast Radius ${hit.block.tntRadius})!`);
          return;
        }

        // Sitting on 26.3 Cushion (`29`) or sleeping in Straw Bed (`28`)
        if (hit.block.numericId === 29) {
          teleportPlayerRef.current(hit.bx + 0.5, hit.by + 1.2, hit.bz + 0.5);
          showToast('Seated on 26.3 Amber Cushion.');
          return;
        }
        if (hit.block.numericId === 28) {
          const dirty = engineRef.current.setBlock(hit.bx, hit.by, hit.bz, 0, false);
          dirty.forEach((k) => {
            const [cx, cz] = k.split(',').map(Number);
            rebuildChunkThreeMeshRef.current(cx, cz);
          });
          setHealth(20);
          showToast('Rested on 26.3 Straw Camp Bed (Healed to 20 HP; Straw Bed consumed).');
          return;
        }

        if (!equippedDef || equippedDef.isItemOnly || equippedDef.numericId === 0) return;

        const px = hit.bx + hit.nx;
        const py = hit.by + hit.ny;
        const pz = hit.bz + hit.nz;
        const dirty = engineRef.current.setBlock(px, py, pz, equippedDef.numericId, false);

        // Axiom Symmetry Mirror Placement
        if (axiomSymmetryRef.current !== 'off') {
          const mx = axiomSymmetryRef.current === 'x' ? -px : px;
          const mz = axiomSymmetryRef.current === 'z' ? -pz : pz;
          engineRef.current
            .setBlock(mx, py, mz, equippedDef.numericId, false)
            .forEach((k) => dirty.add(k));
        }

        // Redstone auto-ignition check: if placing Redstone Block (`35`) next to TNT, or TNT next to Redstone Block
        const neighbors = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ];
        for (const [dx, dy, dz] of neighbors) {
          const nbId = engineRef.current.getBlock(px + dx, py + dy, pz + dz);
          const nbDef = engineRef.current.blocksByNum.get(nbId);
          if (equippedDef.numericId === 35 && nbDef?.tntRadius) {
            engineRef.current.setBlock(px + dx, py + dy, pz + dz, 0, false).forEach((k) => dirty.add(k));
            spawnPrimedTntRef.current(px + dx + 0.5, py + dy + 0.5, pz + dz + 0.5, nbDef);
          } else if (equippedDef.tntRadius && nbId === 35) {
            engineRef.current.setBlock(px, py, pz, 0, false).forEach((k) => dirty.add(k));
            spawnPrimedTntRef.current(px + 0.5, py + 0.5, pz + 0.5, equippedDef);
          }
        }

        dirty.forEach((k) => {
          const [cx, cz] = k.split(',').map(Number);
          rebuildChunkThreeMeshRef.current(cx, cz);
        });
        audioRef.current.playSoundEffect('place');
        setBlocksModifiedCount((c) => c + 1);
        netRef.current.broadcast('block_set', {
          x: px,
          y: py,
          z: pz,
          blockId: equippedDef.numericId,
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const code = e.code;

      if (gameStateRef.current === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        startWorldSession();
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        if (activeModalRef.current !== 'none') {
          setActiveModal('none');
          setGameState('playing');
        } else {
          setActiveModal('pause');
          setGameState('paused');
        }
        return;
      }

      if (code === 'KeyE') {
        e.preventDefault();
        setActiveModal((m) => (m === 'inventory' ? 'none' : 'inventory'));
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setActiveModal('command');
        return;
      }

      if (code === 'KeyR') {
        e.preventDefault();
        setAxiomMode((a) => !a);
        return;
      }

      if (code.startsWith('Digit')) {
        const num = Number(code.replace('Digit', ''));
        if (num >= 1 && num <= 9) {
          setSelectedSlot(num - 1);
        }
      }

      keysPressed.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const onWindowBlur = () => {
      keysPressed.clear();
      isPointerDragging = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      if (gameStateRef.current !== 'playing' || activeModalRef.current !== 'none') return;
      isPointerDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (e.button === 0) handleBlockInteraction('left');
      else if (e.button === 2) handleBlockInteraction('right');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing' || activeModalRef.current !== 'none') return;
      if (document.pointerLockElement === renderer.domElement) {
        player.yaw -= e.movementX * 0.0024;
        player.pitch = Math.max(-1.48, Math.min(1.48, player.pitch - e.movementY * 0.0024));
      } else if (isPointerDragging) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        player.yaw -= dx * 0.005;
        player.pitch = Math.max(-1.48, Math.min(1.48, player.pitch - dy * 0.005));
      }
    };

    const onMouseUp = () => {
      isPointerDragging = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === renderer.domElement) e.preventDefault();
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', onResize);

    // Pre-allocated math objects for zero-GC render loop
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyRot = new THREE.Euler();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();
    const dummyColor = new THREE.Color();

    let frameId = 0;
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = now * 0.001;

      rtUniforms.uTime.value = elapsed;
      waterUniforms.uTime.value = elapsed;
      waterUniforms.uWavesEnabled.value = settingsRef.current.waterWaves ? 1.0 : 0.0;
      waterUniforms.uRippleAge.value += dt;

      if (gameStateRef.current === 'title') {
        titleStageGroup.visible = true;
        chunkMeshGroup.visible = false;
        tornadoGroup.visible = false;
        titleStageGroup.rotation.y = elapsed * 0.35;
        camera.position.set(Math.sin(elapsed * 0.25) * 7.5, 4.2, Math.cos(elapsed * 0.25) * 7.5);
        camera.lookAt(0, 1.4, 0);
      } else {
        titleStageGroup.visible = false;
        chunkMeshGroup.visible = true;

        if (gameStateRef.current === 'playing' && activeModalRef.current === 'none') {
          // Player Movement & Physics
          const speed =
            gameModeRef.current === 'spectator'
              ? 14
              : axiomModeRef.current
              ? 11
              : 6.4;
          let moveForward = 0;
          let moveRight = 0;
          if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveForward += 1;
          if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveForward -= 1;
          if (keysPressed.has('KeyD')) moveRight += 1;
          if (keysPressed.has('KeyA')) moveRight -= 1;
          if (keysPressed.has('ArrowLeft')) player.yaw += 1.8 * dt;
          if (keysPressed.has('ArrowRight')) player.yaw -= 1.8 * dt;

          const sinY = Math.sin(player.yaw);
          const cosY = Math.cos(player.yaw);
          const wishX = -sinY * moveForward + cosY * moveRight;
          const wishZ = -cosY * moveForward - sinY * moveRight;

          player.vx = wishX * speed;
          player.vz = wishZ * speed;

          if (gameModeRef.current === 'creative' || gameModeRef.current === 'spectator') {
            player.vy = 0;
            if (keysPressed.has('Space')) player.vy = 6.5;
            if (keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight')) player.vy = -6.5;
          } else {
            player.vy -= 22.0 * dt;
            if (keysPressed.has('Space') && player.onGround) {
              player.vy = 7.8;
              player.onGround = false;
              audioRef.current.playSoundEffect('jump');
            }
          }

          const nextX = player.x + player.vx * dt;
          const nextZ = player.z + player.vz * dt;
          if (
            gameModeRef.current === 'spectator' ||
            engineRef.current.getBlock(Math.floor(nextX), Math.floor(player.y), Math.floor(nextZ)) === 0
          ) {
            player.x = nextX;
            player.z = nextZ;
          }

          player.y += player.vy * dt;
          const footBlockY = Math.floor(player.y - 1.62);
          const groundId = engineRef.current.getBlock(
            Math.floor(player.x),
            footBlockY,
            Math.floor(player.z)
          );
          if (gameModeRef.current !== 'spectator' && groundId !== 0 && groundId !== 6 && player.vy <= 0) {
            if (!player.onGround && player.vy < -4) {
              player.cameraPitchKick = 0.06;
              if (groundId === 6) {
                waterUniforms.uRippleOrigin.value.set(player.x, 62, player.z);
                waterUniforms.uRippleAge.value = 0;
              }
            }
            player.y = footBlockY + 2.62;
            player.vy = 0;
            player.onGround = true;
          } else {
            player.onGround = false;
          }

          // Camera Overhaul (smooth strafe roll & landing inertia)
          const targetRoll = settingsRef.current.cameraOverhaul ? -moveRight * 0.038 : 0;
          player.cameraRoll += (targetRoll - player.cameraRoll) * (1 - Math.exp(-10 * dt));
          player.cameraPitchKick *= Math.exp(-8 * dt);
          player.trauma = Math.max(0, player.trauma - dt * 1.4);

          const shakeAmt = player.trauma * player.trauma * 0.08;
          camera.position.set(player.x, player.y, player.z);
          camera.rotation.order = 'YXZ';
          camera.rotation.y = player.yaw + (Math.random() - 0.5) * shakeAmt;
          camera.rotation.x =
            player.pitch - player.cameraPitchKick + (Math.random() - 0.5) * shakeAmt;
          camera.rotation.z = player.cameraRoll;
        }

        // Step Time-Sliced Mega TNT Explosion Engine
        if (engineRef.current.explosionQueue.length > 0) {
          const sliceRes = engineRef.current.stepExplosionSlice();
          sliceRes.dirtyChunkKeys.forEach((k) => {
            const [cx, cz] = k.split(',').map(Number);
            rebuildChunkThreeMeshRef.current(cx, cz);
          });
          sliceRes.debrisSpawns.forEach((d) => {
            spawnDebrisBurstRef.current(d.x, d.y, d.z, d.color, 1);
          });
        }

        // Update Primed TNT entities
        for (let i = primedTnts.length - 1; i >= 0; i--) {
          const tnt = primedTnts[i];
          tnt.fuseRemaining -= dt;
          tnt.vy -= 16 * dt;
          tnt.y = Math.max(
            engineRef.current.computeSurfaceY(Math.floor(tnt.x), Math.floor(tnt.z)) + 1.5,
            tnt.y + tnt.vy * dt
          );
          tnt.mesh.position.set(tnt.x, tnt.y, tnt.z);
          const pulse = 1 + Math.sin(elapsed * 28) * 0.08;
          tnt.mesh.scale.set(pulse, pulse, pulse);

          if (tnt.fuseRemaining <= 0) {
            scene.remove(tnt.mesh);
            primedTnts.splice(i, 1);
            triggerExplosionRef.current(tnt.x, tnt.y, tnt.z, tnt.radius);
          }
        }

        // Update Physics Mod 3D Debris Pool
        for (let i = 0; i < MAX_DEBRIS; i++) {
          const p = debrisPool[i];
          if (p.active) {
            p.life -= dt;
            if (p.life <= 0) {
              p.active = false;
              dummyPos.set(0, -999, 0);
              dummyScale.set(0, 0, 0);
            } else {
              p.vy -= 18.0 * dt;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.z += p.vz * dt;
              p.rx += 4 * dt;
              p.ry += 5 * dt;
              const floorY =
                engineRef.current.computeSurfaceY(Math.floor(p.x), Math.floor(p.z)) + 1.12;
              if (p.y < floorY) {
                p.y = floorY;
                p.vy *= -0.42;
                p.vx *= 0.72;
                p.vz *= 0.72;
              }
              dummyPos.set(p.x, p.y, p.z);
              dummyRot.set(p.rx, p.ry, 0);
              dummyQuat.setFromEuler(dummyRot);
              dummyScale.setScalar(p.scale * Math.min(1, p.life));
              dummyColor.setRGB(p.r, p.g, p.b);
              debrisInstanced.setColorAt(i, dummyColor);
            }
          } else {
            dummyPos.set(0, -999, 0);
            dummyScale.set(0, 0, 0);
          }
          dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
          debrisInstanced.setMatrixAt(i, dummyMatrix);
        }
        debrisInstanced.instanceMatrix.needsUpdate = true;
        if (debrisInstanced.instanceColor) debrisInstanced.instanceColor.needsUpdate = true;

        // Update Weather2 Remastered Simulation + 3D Volumetric Cloud Wind Advection
        const activeDisaster =
          settingsRef.current.weather2Tornado && weatherStateRef.current === 'clear'
            ? 'tornado_f1'
            : weatherStateRef.current;
        if (weather2Ref.current.activeDisaster !== activeDisaster) {
          weather2Ref.current.setDisaster(activeDisaster);
        }
        weather2Ref.current.step(dt, elapsed);
        const w2Meta = WEATHER2_DISASTERS[activeDisaster];
        const windVec = weather2Ref.current.getWindVector();

        // Anchor 3D volumetric cloud canopy above player while advecting density via windOffset
        cloudGroup.position.set(player.x, 0, player.z);
        cloudUniforms.uTime.value = elapsed;
        cloudUniforms.uWindOffset.value.set(
          weather2Ref.current.windOffset.x,
          weather2Ref.current.windOffset.y,
          weather2Ref.current.windOffset.z
        );
        cloudUniforms.uStormCenter.value.set(
          weather2Ref.current.stormCenter.x,
          weather2Ref.current.stormCenter.z
        );
        cloudUniforms.uCloudCoverage.value = w2Meta.cloudCoverage;
        cloudUniforms.uCloudDarkness.value = w2Meta.cloudDarkness;
        cloudUniforms.uVortexSwirl.value =
          w2Meta.vortexRadius > 0 ? (activeDisaster === 'tornado_f5' ? 1.35 : 1.0) : 0.0;
        cloudUniforms.uLightningFlash.value = Math.max(
          0,
          cloudUniforms.uLightningFlash.value - dt * 3.8
        );

        // Dynamic sky & fog tinting for sandstorm / supercell / hurricane
        if (engineRef.current.dimension === 'minecraft:overworld') {
          const baseSky = new THREE.Color(0x90caf9);
          const targetSky = new THREE.Color(w2Meta.fogColorHex);
          baseSky.lerp(targetSky, Math.min(0.92, w2Meta.cloudDarkness + 0.15));
          scene.background = baseSky;
          if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color.copy(baseSky);
            scene.fog.density = w2Meta.fogDensity;
          }
        }

        // Update Weather2 Remastered Tornado / Hurricane Funnel & Wind Suction
        const tornadoActive = w2Meta.vortexRadius > 0;
        tornadoGroup.visible = tornadoActive;
        if (tornadoActive) {
          const tx = weather2Ref.current.stormCenter.x;
          const tz = weather2Ref.current.stormCenter.z;
          const ty = engineRef.current.computeSurfaceY(Math.round(tx), Math.round(tz)) + 1;
          tornadoGroup.position.set(tx, ty, tz);

          const maxFunnelR = w2Meta.vortexRadius;
          for (let i = 0; i < MAX_TORNADO_DEBRIS; i++) {
            const hRatio = i / MAX_TORNADO_DEBRIS;
            const funnelRadius = 0.8 + Math.pow(hRatio, 1.35) * maxFunnelR;
            const angle = elapsed * (6.2 - hRatio * 2.2) + i * 0.7;
            dummyPos.set(
              Math.cos(angle) * funnelRadius,
              hRatio * 26,
              Math.sin(angle) * funnelRadius
            );
            dummyRot.set(angle, angle * 0.5, 0);
            dummyQuat.setFromEuler(dummyRot);
            dummyScale.setScalar(0.55 + hRatio * (activeDisaster === 'tornado_f5' ? 1.15 : 0.75));
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            tornadoInstanced.setMatrixAt(i, dummyMatrix);
          }
          tornadoInstanced.instanceMatrix.needsUpdate = true;

          // Tangential + inward suction force when player is near vortex
          if (gameModeRef.current === 'survival') {
            const dx = tx - player.x;
            const dz = tz - player.z;
            const dist = Math.hypot(dx, dz) || 1;
            if (dist < maxFunnelR * 3.2) {
              const pull = (1 - dist / (maxFunnelR * 3.2)) * w2Meta.vortexSuctionStrength * dt;
              player.x += (dx / dist) * pull * 0.35 + windVec.vx * dt * 0.05;
              player.z += (dz / dist) * pull * 0.35 + windVec.vz * dt * 0.05;
            }
          }
        }

        // Update Weather2 Precipitation (Rain, Hailstones, Sandstorm Dust, Falling Meteors)
        const showPrecip = w2Meta.precipitationType !== 'none';
        precipInstanced.visible = showPrecip;
        if (showPrecip) {
          const activeCount = Math.floor(MAX_PRECIP_PARTICLES * w2Meta.cloudCoverage);
          if (w2Meta.precipitationType === 'hail') {
            precipMat.color.setHex(0xe1f5fe);
            precipMat.emissive.setHex(0x263238);
          } else if (w2Meta.precipitationType === 'sand') {
            precipMat.color.setHex(0xd4a359);
            precipMat.emissive.setHex(0x3e2723);
          } else if (w2Meta.precipitationType === 'meteor') {
            precipMat.color.setHex(0xff7043);
            precipMat.emissive.setHex(0xd84315);
          } else {
            precipMat.color.setHex(0x90caf9);
            precipMat.emissive.setHex(0x102030);
          }

          for (let i = 0; i < MAX_PRECIP_PARTICLES; i++) {
            if (i >= activeCount) {
              dummyPos.set(0, -999, 0);
              dummyScale.set(0, 0, 0);
            } else {
              const pt = precipParticles[i];
              if (w2Meta.precipitationType === 'sand') {
                pt.dx = ((pt.dx + windVec.vx * dt * 0.65 + 24) % 48) - 24;
                pt.dz = ((pt.dz + windVec.vz * dt * 0.65 + 24) % 48) - 24;
                pt.y = (pt.y - dt * 2.2 + 24) % 24;
                dummyScale.set(1.9, 0.32, 1.9);
              } else if (w2Meta.precipitationType === 'hail') {
                pt.y -= pt.speed * 1.15 * dt;
                pt.dx = ((pt.dx + windVec.vx * dt * 0.25 + 24) % 48) - 24;
                pt.dz = ((pt.dz + windVec.vz * dt * 0.25 + 24) % 48) - 24;
                if (pt.y < -4) pt.y = 36;
                dummyScale.set(1.45, 0.42, 1.45);
              } else if (w2Meta.precipitationType === 'meteor') {
                pt.y -= pt.speed * 1.25 * dt;
                pt.dx = ((pt.dx + windVec.vx * dt * 0.4 + 24) % 48) - 24;
                pt.dz = ((pt.dz + windVec.vz * dt * 0.4 + 24) % 48) - 24;
                if (pt.y < -2) pt.y = 44;
                dummyScale.set(2.4, 1.6, 2.4);
              } else {
                pt.y -= pt.speed * dt;
                pt.dx = ((pt.dx + windVec.vx * dt * 0.22 + 24) % 48) - 24;
                pt.dz = ((pt.dz + windVec.vz * dt * 0.22 + 24) % 48) - 24;
                if (pt.y < -4) pt.y = 36;
                dummyScale.set(0.65, 1.35, 0.65);
              }
              dummyPos.set(player.x + pt.dx, player.y + pt.y, player.z + pt.dz);
              dummyRot.set(0, 0, -windVec.vx * 0.015);
              dummyQuat.setFromEuler(dummyRot);
            }
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            precipInstanced.setMatrixAt(i, dummyMatrix);
          }
          precipInstanced.instanceMatrix.needsUpdate = true;
        }

        // Update 3D Lightning Bolts & Meteor Shower Impacts
        const hasLightning =
          activeDisaster === 'thunder' ||
          activeDisaster === 'tornado_f1' ||
          activeDisaster === 'tornado_f5' ||
          activeDisaster === 'hurricane';
        if (hasLightning) {
          lightningTimer -= dt;
          if (lightningTimer <= 0) {
            lightningTimer = activeDisaster === 'tornado_f5' || activeDisaster === 'hurricane' ? 1.2 : 2.3;
            const lx = player.x + (Math.random() - 0.5) * 44;
            const lz = player.z - 12 + (Math.random() - 0.5) * 32;
            const ly = engineRef.current.computeSurfaceY(Math.round(lx), Math.round(lz));
            lightningBoltGroup.position.set(lx, ly, lz);
            lightningBoltGroup.visible = true;
            cloudUniforms.uLightningFlash.value = 1.0;
            player.trauma = Math.min(1.0, player.trauma + 0.28);
          } else if (cloudUniforms.uLightningFlash.value < 0.35) {
            lightningBoltGroup.visible = false;
          }
        } else {
          lightningBoltGroup.visible = false;
        }

        if (activeDisaster === 'meteor_shower') {
          meteorImpactTimer -= dt;
          if (meteorImpactTimer <= 0) {
            meteorImpactTimer = 3.8;
            const mx = Math.round(player.x + (Math.random() - 0.5) * 34);
            const mz = Math.round(player.z - 14 + (Math.random() - 0.5) * 24);
            const my = engineRef.current.computeSurfaceY(mx, mz);
            triggerExplosionRef.current(mx, my, mz, 4);
          }
        }

        // Update 3 Distinct Mob Archetypes (Forager, Chaser, Kiter)
        for (const mob of mobs) {
          const dx = player.x - mob.x;
          const dz = player.z - mob.z;
          const dist = Math.hypot(dx, dz) || 1;
          if (mob.archetype === 'forager') {
            mob.yaw = Math.sin(elapsed * 0.4 + mob.id) * Math.PI;
            mob.vx = Math.sin(mob.yaw) * 1.1;
            mob.vz = Math.cos(mob.yaw) * 1.1;
          } else if (mob.archetype === 'chaser') {
            mob.yaw = Math.atan2(dx, dz);
            const spd = dist < 16 ? 2.1 : 0.7;
            mob.vx = (dx / dist) * spd;
            mob.vz = (dz / dist) * spd;
          } else {
            // Kiter maintains 6-10m standoff distance
            mob.yaw = Math.atan2(dx, dz);
            const dirSign = dist < 6 ? -1 : dist > 11 ? 1 : 0;
            mob.vx = (dx / dist) * dirSign * 1.8;
            mob.vz = (dz / dist) * dirSign * 1.8;
          }
          mob.x += mob.vx * dt;
          mob.z += mob.vz * dt;
          mob.y = engineRef.current.computeSurfaceY(Math.round(mob.x), Math.round(mob.z)) + 1;
          mob.group.position.set(mob.x, mob.y, mob.z);
          mob.group.rotation.y = mob.yaw;
        }

        // Update WorldEdit / Axiom 3D Wireframe Box
        if (wePos1Ref.current && wePos2Ref.current) {
          const p1 = wePos1Ref.current;
          const p2 = wePos2Ref.current;
          const sx = Math.abs(p2[0] - p1[0]) + 1.02;
          const sy = Math.abs(p2[1] - p1[1]) + 1.02;
          const sz = Math.abs(p2[2] - p1[2]) + 1.02;
          worldEditBoxMesh.scale.set(sx, sy, sz);
          worldEditBoxMesh.position.set(
            (p1[0] + p2[0]) / 2 + 0.5,
            (p1[1] + p2[1]) / 2 + 0.5,
            (p1[2] + p2[2]) / 2 + 0.5
          );
          worldEditBoxMesh.visible = true;
        } else {
          worldEditBoxMesh.visible = false;
        }

        // Throttled HUD & Jade Raycast Update (~8Hz)
        hudSyncAccumulator += dt;
        if (hudSyncAccumulator >= 0.12) {
          hudSyncAccumulator = 0;
          const hit = raycastVoxel();
          if (hit) {
            targetWireframe.position.set(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
            targetWireframe.visible = true;
            setJadeTarget({
              block: hit.block,
              x: hit.bx,
              y: hit.by,
              z: hit.bz,
              miningProgress: 0,
            });
          } else {
            targetWireframe.visible = false;
            setJadeTarget(null);
          }

          setPlayerPosHud([player.x, player.y, player.z]);
          const bId = engineRef.current.sampleBiome(Math.floor(player.x), Math.floor(player.z));
          setBiomeNameHud(engineRef.current.getBiomeName(bId));
          setUnderwaterHud(
            engineRef.current.getBlock(
              Math.floor(player.x),
              Math.floor(player.y),
              Math.floor(player.z)
            ) === 6
          );
          setBlastFlashHud((prev) => Math.max(0, prev - 0.12));

          // Update Weather2 Wind Vector & 3D Volumetric Cloud Density Telemetry
          const overheadDensity = weather2Ref.current.sampleVolumetricCloudDensity(
            player.x,
            118,
            player.z
          );
          setWindTelemetry({
            speed: Math.round(windVec.speed * 10) / 10,
            compassDeg: windVec.compassDeg,
            cloudDensityPct: Math.round(overheadDensity * 100),
          });

          if (tornadoActive) {
            setTornadoDistHud(
              Math.hypot(
                player.x - tornadoGroup.position.x,
                player.z - tornadoGroup.position.z
              )
            );
          } else {
            setTornadoDistHud(null);
          }
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (gameStateRef.current === 'playing') {
      startWorldSession();
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [startWorldSession, showToast]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="voxel-webgl-canvas"
        className="fixed inset-0 w-full h-full"
      />

      {/* Title Screen (0 Terrain Chunks in Memory) */}
      {gameState === 'title' && (
        <TitleScreen
          worldName={worldName}
          setWorldName={setWorldName}
          worldSeed={worldSeed}
          setWorldSeed={setWorldSeed}
          worldType={worldType}
          setWorldType={setWorldType}
          gameMode={gameMode}
          setGameMode={setGameMode}
          settings={settings}
          setSettings={setSettings}
          onStartWorld={() => startWorldSession()}
          onConnectMultiplayer={(mode, endpointOrCode) => {
            if (mode === 'p2p') {
              const code = netRef.current.hostOrJoinWebRtcRoom(endpointOrCode);
              setMultiplayerStatus(`P2P Room ${code}`);
            } else {
              netRef.current.connectWssRelay(endpointOrCode);
              setMultiplayerStatus(`WSS Relay Connected`);
            }
            startWorldSession();
          }}
          onRegisterCustomBlock={(jsonStr) => {
            const def = engineRef.current.registerCustomModJson(jsonStr);
            setAllBlocks(Array.from(engineRef.current.blocksByNum.values()));
            setHotbarIds((prev) => {
              const next = [...prev];
              next[selectedSlot] = def.numericId;
              return next;
            });
            return def;
          }}
          loadedChunkCount={loadedChunkCount}
          toggleMicLoopback={(en) => audioRef.current.toggleMicrophoneLoopback(en)}
        />
      )}

      {/* Playing HUD (Jade, Survival Pips, Hotbar, Mod Dock) */}
      {gameState !== 'title' && (
        <GameHud
          jadeTarget={jadeTarget}
          hotbarIds={hotbarIds}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          getBlockDef={(id) => engineRef.current.blocksByNum.get(id)}
          playerPos={playerPosHud}
          biomeName={biomeNameHud}
          dimension={dimension}
          gameMode={gameMode}
          health={health}
          maxHealth={20}
          armor={12}
          hunger={hunger}
          xpLevel={xpLevel}
          weatherState={weatherState}
          onSelectWeatherDisaster={(d) => {
            setWeatherState(d);
            weather2Ref.current.setDisaster(d);
            showToast(
              `Weather2 Remastered: ${WEATHER2_DISASTERS[d].jpLabel} (Wind ${WEATHER2_DISASTERS[d].windSpeedRange[1]} m/s)`
            );
          }}
          windTelemetry={windTelemetry}
          tornadoDistance={tornadoDistHud}
          axiomMode={axiomMode}
          axiomSymmetry={axiomSymmetry}
          onToggleAxiom={() => {
            setAxiomMode((a) => !a);
            showToast(`Axiom Build Assist: ${!axiomMode ? 'ENABLED' : 'OFF'}`);
          }}
          onToggleSymmetry={() => {
            setAxiomSymmetry((s) => (s === 'off' ? 'x' : s === 'x' ? 'z' : 'off'));
          }}
          onOpenInventory={() => setActiveModal('inventory')}
          onOpenCommand={() => setActiveModal('command')}
          onOpenPause={() => {
            setActiveModal('pause');
            setGameState('paused');
          }}
          onQuickDetonateMegaTnt={(tierId) => {
            const def = engineRef.current.blocksById.get(tierId);
            const r = def?.tntRadius || 9;
            const tx = Math.round(playerPosHud[0]);
            const tz = Math.round(playerPosHud[2] - 6);
            const ty = engineRef.current.computeSurfaceY(tx, tz);
            triggerExplosionRef.current(tx, ty, tz, r);
            showToast(
              `Detonated ${def?.name || tierId} (R=${r}) at [${tx}, ${ty}, ${tz}] via Time-Sliced Engine!`
            );
          }}
          onSwitchDimension={(nextDim) => {
            setDimension(nextDim);
            startWorldSession(worldType, nextDim);
          }}
          worldEditPos1={worldEditPos1}
          worldEditPos2={worldEditPos2}
          oneBlockPhaseName={worldType === 'oneblock' ? oneBlockPhaseHud : null}
          multiplayerStatus={multiplayerStatus}
          underwater={underwaterHud}
          blastFlashIntensity={blastFlashHud}
          enhancedVisuals={settings.enhancedVisuals}
          lastToast={lastToast}
        />
      )}

      {/* Inventory + Crafting + JEI Modal */}
      {activeModal === 'inventory' && (
        <InventoryJeiModal
          allBlocks={allBlocks}
          hotbarIds={hotbarIds}
          selectedSlot={selectedSlot}
          onAssignHotbarSlot={(slotIdx, numId) => {
            setSelectedSlot(slotIdx);
            setHotbarIds((prev) => {
              const next = [...prev];
              next[slotIdx] = numId;
              return next;
            });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Command Console & Real-Time Autocomplete Modal */}
      {activeModal === 'command' && (
        <CommandConsoleModal
          blockIds={allBlocks.map((b) => b.id)}
          commandLog={commandLog}
          onExecuteCommand={(cmd) => {
            executeCommand(cmd);
            setActiveModal('none');
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Pause Menu Modal */}
      {activeModal === 'pause' && (
        <PauseModal
          settings={settings}
          setSettings={setSettings}
          loadedChunks={loadedChunkCount}
          blocksModified={blocksModifiedCount}
          onResume={() => {
            setActiveModal('none');
            setGameState('playing');
          }}
          onReturnToTitle={() => {
            clearAllThreeChunksRef.current();
            engineRef.current.releaseAllMemory();
            setLoadedChunkCount(0);
            setActiveModal('none');
            setGameState('title');
          }}
        />
      )}
    </div>
  );
}
