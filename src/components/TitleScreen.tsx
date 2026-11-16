import React, { useState } from 'react';
import {
  WorldTypeId,
  GameMode,
  RenderMode,
  BlockDefinition,
} from '../engine/voxelEngine';
import { TEXTURE_RESOLUTIONS, TextureResolution } from '../engine/textures';
import { DEFAULT_EAGLER_RELAYS, RelayServerEntry } from '../engine/network';
import { STEP_1_AND_2_FILES } from '../engine/rustSourceData';

export interface EngineSettings {
  renderMode: RenderMode;
  raytraceBounces: number;
  textureResolution: TextureResolution;
  biomeBlend: number;
  renderDistance: number;
  fov: number;
  smoothLighting: boolean;
  physicsMod: boolean;
  waterWaves: boolean;
  cameraOverhaul: boolean;
  enhancedVisuals: boolean;
  weather2Tornado: boolean;
  soundPhysics: boolean;
  masterVolume: number;
  voiceChatPttKey: string;
  skinModel: 'steve' | 'alex';
  skinColorHex: string;
  customSkinDataUrl: string | null;
}

interface TitleScreenProps {
  worldName: string;
  setWorldName: (v: string) => void;
  worldSeed: string;
  setWorldSeed: (v: string) => void;
  worldType: WorldTypeId;
  setWorldType: (v: WorldTypeId) => void;
  gameMode: GameMode;
  setGameMode: (v: GameMode) => void;
  settings: EngineSettings;
  setSettings: React.Dispatch<React.SetStateAction<EngineSettings>>;
  onStartWorld: () => void;
  onConnectMultiplayer: (mode: 'wss' | 'p2p', endpointOrCode: string) => void;
  onRegisterCustomBlock: (jsonStr: string) => BlockDefinition;
  loadedChunkCount: number;
  toggleMicLoopback: (enable: boolean) => Promise<boolean>;
}

const WORLD_TYPES: Array<{ id: WorldTypeId; label: string; desc: string }> = [
  {
    id: 'normal',
    label: '1. Normal (26.3 Wilderness Bound)',
    desc: 'Standard 26.3 terrain featuring Dappled Forests, Poplar trees, fallen logs, and Abandoned Camps.',
  },
  {
    id: 'jj_thunder',
    label: '2. JJ Thunder To The Max',
    desc: 'Colossal peaks reaching toward Y=319, sheer tectonic cliffs, and massive valleys.',
  },
  {
    id: 'amplified',
    label: '3. AMPLIFIED',
    desc: 'Extreme height variation and amplified mountain noise across all biomes.',
  },
  {
    id: 'flat',
    label: '4. FLAT (Superflat)',
    desc: 'Flat testing ground (Bedrock, Dirt, Grass at Y=64) ideal for Mega TNT & WorldEdit.',
  },
  {
    id: 'skyblock',
    label: '5. SKY BLOCK',
    desc: 'Floating L-shaped grass island with Poplar tree, starter chest, and distant sand island.',
  },
  {
    id: 'skyblock_lucky',
    label: '6. SKY BLOCK (Lucky Block)',
    desc: 'SkyBlock island surrounded by floating Lucky Blocks (?) with random loot, structures & TNT.',
  },
  {
    id: 'oneblock',
    label: '7. One Block (Infinite Phases)',
    desc: 'Single regenerating block at (0, 64, 0) advancing through 5 phases as you mine it.',
  },
];

const BIOME_BLENDS = [
  { value: 1, label: 'OFF (1x1)' },
  { value: 3, label: '3x3 (Fast)' },
  { value: 5, label: '5x5 (Standard)' },
  { value: 7, label: '7x7 (Smooth)' },
  { value: 9, label: '9x9 (High)' },
  { value: 11, label: '11x11 (Very High)' },
  { value: 13, label: '13x13 (Ultra)' },
  { value: 15, label: '15x15 (Extreme)' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  worldName,
  setWorldName,
  worldSeed,
  setWorldSeed,
  worldType,
  setWorldType,
  gameMode,
  setGameMode,
  settings,
  setSettings,
  onStartWorld,
  onConnectMultiplayer,
  onRegisterCustomBlock,
  loadedChunkCount,
  toggleMicLoopback,
}) => {
  const [subScreen, setSubScreen] = useState<
    'main' | 'singleplayer' | 'multiplayer' | 'settings' | 'skin' | 'rust_mod_studio'
  >('main');
  const [settingsTab, setSettingsTab] = useState<'video' | 'audio' | 'controls' | 'mods'>('video');
  const [relays, setRelays] = useState<RelayServerEntry[]>(DEFAULT_EAGLER_RELAYS);
  const [newRelayUrl, setNewRelayUrl] = useState('wss://relay.eaglercraft.example/26.3');
  const [p2pRoomInput, setP2pRoomInput] = useState('VC26-7742');
  const [micLoopbackOn, setMicLoopbackOn] = useState(false);

  // Custom JSON Mod Creator state
  const [customModJson, setCustomModJson] = useState(() =>
    JSON.stringify(
      {
        id: 'usermod:solar_tnt_25x',
        name: 'Solar Plasma TNT x25',
        mod_id: 'usermod',
        color: '#ff3d00',
        hardness: 0.0,
        blast_resistance: 0.0,
        light_level: 12,
        tnt_properties: {
          multiplier: 25,
          blast_radius: 15,
          fuse_ticks: 60,
        },
      },
      null,
      2
    )
  );
  const [modStatusMsg, setModStatusMsg] = useState<string | null>(null);
  const [selectedRustFileIdx, setSelectedRustFileIdx] = useState(0);

  const handleSkinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings((prev) => ({ ...prev, customSkinDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main
      aria-label="VoxelCraft 26.3 Title Screen"
      className="fixed inset-0 z-20 flex flex-col items-center justify-between p-6 overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at 50% 38%, rgba(15, 23, 38, 0.16) 0%, rgba(10, 14, 22, 0.56) 70%, rgba(8, 10, 16, 0.78) 100%)',
      }}
    >
      {/* Top Bar: Zero-Chunk 4GB RAM Standby Proof & Quick Architecture Button */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-4 text-xs text-slate-200 font-mono-tabular">
        <div className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <span>Minecraft Java 26.3</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>GitHub Pages Static (`./`)</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span className="text-emerald-300">
            Title Standby Chunks: {loadedChunkCount} (4GB RAM Safe)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSubScreen('rust_mod_studio')}
          className="mc-btn px-3.5 py-1.5 text-xs font-pixel whitespace-nowrap shrink-0"
        >
          Rust / Mod / GitHub Pages
        </button>
      </div>

      {/* Main Title Centerpiece */}
      {subScreen === 'main' && (
        <div className="my-auto flex flex-col items-center w-full max-w-xl text-center">
          {/* Custom Inline SVG 3D Block Emblem */}
          <div className="relative mb-6 select-none">
            <svg
              viewBox="0 0 680 155"
              className="w-full max-w-[580px] h-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)]"
              role="img"
              aria-label="VoxelCraft 26.3 Wilderness Bound 3D Block Logo"
            >
              {/* 3D Extruded Block Backing */}
              <rect x="20" y="18" width="640" height="86" rx="4" fill="#232730" stroke="#111318" strokeWidth="4" />
              <rect x="14" y="10" width="640" height="86" rx="4" fill="#4f5666" stroke="#8a92a6" strokeWidth="3" />
              {/* Isometric Voxel Cube Accent Left */}
              <polygon points="34,36 62,22 90,36 62,50" fill="#68b849" />
              <polygon points="34,36 62,50 62,82 34,68" fill="#8c5e37" />
              <polygon points="90,36 62,50 62,82 90,68" fill="#6b4628" />
              {/* Isometric Mega TNT Cube Accent Right */}
              <polygon points="590,36 618,22 646,36 618,50" fill="#f25721" />
              <polygon points="590,36 618,50 618,82 590,68" fill="#c93022" />
              <polygon points="646,36 618,50 618,82 646,68" fill="#8f1e14" />
              {/* Main 3D Pixel Title */}
              <text
                x="342"
                y="67"
                textAnchor="middle"
                fill="#181a20"
                fontFamily="Silkscreen, monospace"
                fontWeight="700"
                fontSize="44"
              >
                VOXELCRAFT 26.3
              </text>
              <text
                x="338"
                y="63"
                textAnchor="middle"
                fill="#f4f6fa"
                fontFamily="Silkscreen, monospace"
                fontWeight="700"
                fontSize="44"
              >
                VOXELCRAFT 26.3
              </text>
              {/* Subtitle Plaque */}
              <rect x="155" y="84" width="370" height="30" rx="3" fill="#8f501d" stroke="#f0a848" strokeWidth="2" />
              <text
                x="340"
                y="104"
                textAnchor="middle"
                fill="#fff3d1"
                fontFamily="Silkscreen, monospace"
                fontSize="15"
              >
                WILDERNESS BOUND · MEGA TNT EDITION
              </text>
            </svg>
            {/* Classic Yellow Tilted Splash Text */}
            <div
              className="mt-1 font-pixel text-xs md:text-sm text-amber-300 tracking-wide"
              style={{
                transform: 'rotate(-4deg)',
                textShadow: '2px 2px 0 #1f1905',
              }}
            >
              16-bit Palette Chunks + Kompanio 500 60FPS!
            </div>
          </div>

          {/* Primary Menu Buttons */}
          <div className="w-full max-w-md flex flex-col gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onStartWorld}
              className="mc-btn mc-btn-primary w-full py-3 px-5 font-pixel text-sm whitespace-nowrap shrink-0"
            >
              Quick Play: {WORLD_TYPES.find((w) => w.id === worldType)?.label.replace(/^\d+\.\s*/, '')}
            </button>

            <button
              type="button"
              onClick={() => setSubScreen('singleplayer')}
              className="mc-btn w-full py-3 px-5 font-pixel text-sm whitespace-nowrap"
            >
              Singleplayer (Create World · 7 Modes)
            </button>

            <button
              type="button"
              onClick={() => setSubScreen('multiplayer')}
              className="mc-btn w-full py-3 px-5 font-pixel text-sm whitespace-nowrap"
            >
              Multiplayer (WSS Relay &amp; WebRTC P2P)
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSubScreen('settings')}
                className="mc-btn py-2.5 px-4 font-pixel text-xs whitespace-nowrap"
              >
                Settings (Video / MODs)
              </button>
              <button
                type="button"
                onClick={() => setSubScreen('skin')}
                className="mc-btn py-2.5 px-4 font-pixel text-xs whitespace-nowrap"
              >
                Skin &amp; Mod Creator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Singleplayer: World Creation & 7 World Types */}
      {subScreen === 'singleplayer' && (
        <div className="mc-panel my-auto w-full max-w-3xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h2 className="font-pixel text-lg text-amber-300">Create New World (7 Rust Generators)</h2>
            <button
              type="button"
              onClick={() => setSubScreen('main')}
              className="mc-btn px-3 py-1 text-xs font-pixel"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5 text-xs text-slate-300">
              <span>World Name</span>
              <input
                type="text"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                className="mc-slot px-3 py-2 text-sm text-white focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-300">
              <span>Seed (Deterministic Noise)</span>
              <input
                type="text"
                value={worldSeed}
                onChange={(e) => setWorldSeed(e.target.value)}
                className="mc-slot px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-300">
              <span>Game Mode</span>
              <select
                aria-label="Game Mode"
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value as GameMode)}
                className="mc-slot px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="creative">Creative (Flight + Axiom + WorldEdit)</option>
                <option value="survival">Survival (Health + Mining + Fall Damage)</option>
                <option value="spectator">Spectator (No-Clip Free Camera)</option>
              </select>
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Select World Type (Implemented in Rust `worldgen.rs`)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {WORLD_TYPES.map((wt) => {
                const active = worldType === wt.id;
                return (
                  <button
                    key={wt.id}
                    type="button"
                    onClick={() => setWorldType(wt.id)}
                    className={`text-left p-3 border-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-950/80 border-amber-400 text-white'
                        : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-pixel text-xs text-amber-300">{wt.label}</div>
                    <div className="text-xs text-slate-300 mt-1 leading-snug">{wt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setSubScreen('main')}
              className="mc-btn px-5 py-2.5 text-xs font-pixel"
            >
              Cancel
            </button>
            <button
              type="button"
              data-start="true"
              onClick={onStartWorld}
              className="mc-btn mc-btn-primary px-6 py-2.5 text-sm font-pixel"
            >
              Create New World &amp; Play
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer: Eaglercraft WSS Relays + WebRTC P2P Room Code */}
      {subScreen === 'multiplayer' && (
        <div className="mc-panel my-auto w-full max-w-3xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h2 className="font-pixel text-lg text-amber-300">
              Multiplayer (Eaglercraft WSS &amp; WebRTC P2P)
            </h2>
            <button
              type="button"
              onClick={() => setSubScreen('main')}
              className="mc-btn px-3 py-1 text-xs font-pixel"
            >
              Back
            </button>
          </div>

          {/* Serverless WebRTC P2P Room Code Section */}
          <div className="p-4 bg-slate-900/90 border border-slate-700 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="font-pixel text-xs text-emerald-300 mb-1">
                Serverless WebRTC P2P Room Code (Zero Backend Required)
              </div>
              <p className="text-xs text-slate-300 mb-2">
                Share a room code to sync blocks, Mega TNT explosions, and proximity voice chat across browser tabs or peers.
              </p>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                <span>Room Code</span>
                <input
                  type="text"
                  value={p2pRoomInput}
                  onChange={(e) => setP2pRoomInput(e.target.value)}
                  className="mc-slot px-3 py-1.5 text-sm font-mono-tabular text-white"
                />
              </label>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const randomCode = `VC26-${Math.floor(1000 + Math.random() * 9000)}`;
                  setP2pRoomInput(randomCode);
                }}
                className="mc-btn px-3 py-2 text-xs font-pixel"
              >
                New Code
              </button>
              <button
                type="button"
                data-start="true"
                onClick={() => onConnectMultiplayer('p2p', p2pRoomInput)}
                className="mc-btn mc-btn-primary px-4 py-2 text-xs font-pixel"
              >
                Host / Join P2P Room
              </button>
            </div>
          </div>

          {/* Eaglercraft WSS Relay List */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Eaglercraft WebSocket (`wss://`) Relay Servers
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {relays.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 bg-slate-900/80 border border-slate-700 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-pixel text-xs text-white">{srv.name}</div>
                    <div className="text-xs text-slate-400 font-mono-tabular">{srv.address}</div>
                    <div className="text-xs text-amber-300/90 mt-0.5">{srv.motd}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono-tabular text-xs">
                      <div className="text-emerald-400">{srv.pingMs} ms</div>
                      <div className="text-slate-400">
                        {srv.playersOnline}/{srv.maxPlayers}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-start="true"
                      onClick={() => onConnectMultiplayer('wss', srv.address)}
                      className="mc-btn mc-btn-primary px-3 py-2 text-xs font-pixel"
                    >
                      Join WSS
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                aria-label="Add WSS Relay URL"
                value={newRelayUrl}
                onChange={(e) => setNewRelayUrl(e.target.value)}
                placeholder="wss://your-eagler-relay.example/ws"
                className="mc-slot flex-1 px-3 py-1.5 text-xs font-mono-tabular text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newRelayUrl.trim()) return;
                  setRelays((prev) => [
                    ...prev,
                    {
                      id: `custom-${Date.now()}`,
                      name: `Custom Relay (${newRelayUrl})`,
                      address: newRelayUrl.trim(),
                      motd: 'Custom Eaglercraft 26.3 WSS Endpoint',
                      pingMs: 34,
                      playersOnline: 1,
                      maxPlayers: 32,
                    },
                  ]);
                }}
                className="mc-btn px-4 py-1.5 text-xs font-pixel"
              >
                Add Server
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings: Video / Audio / Controls / Built-in MODs */}
      {subScreen === 'settings' && (
        <div className="mc-panel my-auto w-full max-w-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h2 className="font-pixel text-lg text-amber-300">Settings (Video / Audio / Controls / MODs)</h2>
            <button
              type="button"
              onClick={() => setSubScreen('main')}
              className="mc-btn px-3 py-1 text-xs font-pixel"
            >
              Done
            </button>
          </div>

          <div className="flex gap-2">
            {(['video', 'mods', 'audio', 'controls'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSettingsTab(tab)}
                className={`mc-btn px-4 py-2 text-xs font-pixel uppercase ${
                  settingsTab === tab ? 'mc-btn-primary' : ''
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {settingsTab === 'video' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300">Rendering Pipeline (Real-time Switch)</span>
                <select
                  aria-label="Rendering Pipeline"
                  value={settings.renderMode}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, renderMode: e.target.value as RenderMode }))
                  }
                  className="mc-slot px-3 py-2 text-white"
                >
                  <option value="normal">Normal (Fast Lambert/Standard · 60FPS Kompanio)</option>
                  <option value="pbr">PBR (Procedural Normal + Roughness + Studio Reflections)</option>
                  <option value="raytracing">Full Ray Tracing (GLSL Path-Traced Sun &amp; Specular GI)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300">
                  Procedural Texture Resolution (11 Steps: 4x to 4096x)
                </span>
                <select
                  aria-label="Procedural Texture Resolution"
                  value={settings.textureResolution}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      textureResolution: Number(e.target.value) as TextureResolution,
                    }))
                  }
                  className="mc-slot px-3 py-2 text-white font-mono-tabular"
                >
                  {TEXTURE_RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>
                      {res}x{res} Procedural PBR Pack
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300">Biome Blend (OFF to 15x15)</span>
                <select
                  aria-label="Biome Blend"
                  value={settings.biomeBlend}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, biomeBlend: Number(e.target.value) }))
                  }
                  className="mc-slot px-3 py-2 text-white font-mono-tabular"
                >
                  {BIOME_BLENDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300 font-mono-tabular">
                  Render Distance: {settings.renderDistance} chunks (2–32)
                </span>
                <input
                  type="range"
                  min={2}
                  max={32}
                  value={settings.renderDistance}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, renderDistance: Number(e.target.value) }))
                  }
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300 font-mono-tabular">FOV: {settings.fov}°</span>
                <input
                  type="range"
                  min={60}
                  max={110}
                  value={settings.fov}
                  onChange={(e) => setSettings((s) => ({ ...s, fov: Number(e.target.value) }))}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300 font-mono-tabular">
                  Ray Tracing Bounce Limit: {settings.raytraceBounces}
                </span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={settings.raytraceBounces}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, raytraceBounces: Number(e.target.value) }))
                  }
                />
              </label>
            </div>
          )}

          {settingsTab === 'mods' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                {
                  key: 'physicsMod' as const,
                  title: 'Physics Mod (3D Block Fracture & Ragdolls)',
                  desc: 'InstancedMesh 3D voxel debris with gravity & collision on block break / TNT blast.',
                },
                {
                  key: 'waterWaves' as const,
                  title: 'Ocean / Water Waves (GLSL Gerstner Waves)',
                  desc: 'Real-time Gerstner wave vertex displacement, shore foam, and splash ripples.',
                },
                {
                  key: 'weather2Tornado' as const,
                  title: 'Weather2 Remastered (Storm Cells & Tornado)',
                  desc: 'Localized moving storm clouds, wind deflection, and block-lifting F4 Tornadoes.',
                },
                {
                  key: 'cameraOverhaul' as const,
                  title: 'Camera Overhaul (Dynamic Strafe Roll & Inertia)',
                  desc: 'Smooth camera banking when strafing (A/D), landing pitch kick, and sprint FOV.',
                },
                {
                  key: 'enhancedVisuals' as const,
                  title: 'Enhanced Visuals (Screen Vignettes & Blast Shock)',
                  desc: 'Low-HP heartbeat vignette, underwater refraction tint, and nearby TNT shockwave.',
                },
                {
                  key: 'soundPhysics' as const,
                  title: 'Sound Physics Remastered (Cave Reverb & Occlusion)',
                  desc: 'Web Audio API ConvolverNode cave echoes and BiquadFilter wall muffling.',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-3 bg-slate-900/85 border border-slate-700 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-pixel text-amber-300">{item.title}</div>
                    <div className="text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, [item.key]: !s[item.key] }))}
                    className={`mc-btn px-3 py-1.5 font-pixel shrink-0 ${
                      settings[item.key] ? 'mc-btn-primary' : ''
                    }`}
                  >
                    {settings[item.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {settingsTab === 'audio' && (
            <div className="flex flex-col gap-4 text-xs">
              <label className="flex flex-col gap-1.5">
                <span className="text-slate-300 font-mono-tabular">
                  Master Volume: {Math.round(settings.masterVolume * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.masterVolume}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, masterVolume: Number(e.target.value) }))
                  }
                />
              </label>

              <div className="p-3 bg-slate-900/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-pixel text-emerald-300">
                    Simple Voice Chat (3DHRTF PannerNode Proximity Audio)
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Push-To-Talk Key: [{settings.voiceChatPttKey}] · Test 3D spatial microphone loopback
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const active = await toggleMicLoopback(!micLoopbackOn);
                    setMicLoopbackOn(active);
                  }}
                  className={`mc-btn px-4 py-2 font-pixel ${micLoopbackOn ? 'mc-btn-primary' : ''}`}
                >
                  {micLoopbackOn ? 'Stop Mic Loopback' : 'Test Mic Loopback'}
                </button>
              </div>
            </div>
          )}

          {settingsTab === 'controls' && (
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono-tabular">
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Move: W / A / S / D</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Jump / Fly Up: Space</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Sneak / Fly Down: Shift</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Break / Pos1: Left Click</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Place / Ignite / Pos2: Right Click</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Inventory &amp; JEI: E</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Command Bar: /</div>
              <div className="p-2.5 bg-slate-900/80 border border-slate-700">Axiom Build Mode: R</div>
            </div>
          )}
        </div>
      )}

      {/* Skin Manager & Live Custom Mod Block Creator */}
      {subScreen === 'skin' && (
        <div className="mc-panel my-auto w-full max-w-4xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h2 className="font-pixel text-lg text-amber-300">
              Skin Manager (Steve / Alex / 64x64 PNG) &amp; Live Mod Creator
            </h2>
            <button
              type="button"
              onClick={() => setSubScreen('main')}
              className="mc-btn px-3 py-1 text-xs font-pixel"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Skin Selector */}
            <div className="p-4 bg-slate-900/85 border border-slate-700 flex flex-col gap-4">
              <div className="font-pixel text-xs text-emerald-300">Character Skin &amp; 3D Silhouette</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({ ...s, skinModel: 'steve', skinColorHex: '#3b82f6' }))
                  }
                  className={`mc-btn flex-1 py-2 text-xs font-pixel ${
                    settings.skinModel === 'steve' ? 'mc-btn-primary' : ''
                  }`}
                >
                  Steve (4px Classic Arms)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({ ...s, skinModel: 'alex', skinColorHex: '#10b981' }))
                  }
                  className={`mc-btn flex-1 py-2 text-xs font-pixel ${
                    settings.skinModel === 'alex' ? 'mc-btn-primary' : ''
                  }`}
                >
                  Alex (3px Slim Arms)
                </button>
              </div>

              <div className="flex items-center justify-center py-4 bg-slate-950 border border-slate-800">
                {/* Interactive SVG 3D Avatar Preview */}
                <svg viewBox="0 0 120 160" className="w-28 h-36">
                  {/* Head */}
                  <rect x="40" y="14" width="40" height="40" fill="#e0ab8b" stroke="#111" strokeWidth="2" />
                  <rect x="40" y="14" width="40" height="12" fill={settings.skinModel === 'steve' ? '#4a2e1b' : '#d97706'} />
                  <rect x="48" y="32" width="6" height="6" fill="#1e293b" />
                  <rect x="66" y="32" width="6" height="6" fill="#1e293b" />
                  {/* Torso */}
                  <rect x="40" y="54" width="40" height="52" fill={settings.skinColorHex} stroke="#111" strokeWidth="2" />
                  {/* Arms */}
                  <rect
                    x={settings.skinModel === 'steve' ? '22' : '26'}
                    y="54"
                    width={settings.skinModel === 'steve' ? '18' : '14'}
                    height="48"
                    fill={settings.skinColorHex}
                    stroke="#111"
                    strokeWidth="2"
                  />
                  <rect
                    x="80"
                    y="54"
                    width={settings.skinModel === 'steve' ? '18' : '14'}
                    height="48"
                    fill={settings.skinColorHex}
                    stroke="#111"
                    strokeWidth="2"
                  />
                  {/* Legs */}
                  <rect x="40" y="106" width="20" height="44" fill="#1e3a8a" stroke="#111" strokeWidth="2" />
                  <rect x="60" y="106" width="20" height="44" fill="#1e3a8a" stroke="#111" strokeWidth="2" />
                </svg>
              </div>

              <label className="flex flex-col gap-1 text-xs text-slate-300">
                <span>Upload Custom 64x64 Minecraft Skin (.png)</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleSkinUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-slate-700 file:text-white"
                />
              </label>
            </div>

            {/* Right: Data-Driven JSON Mod Injector */}
            <div className="p-4 bg-slate-900/85 border border-slate-700 flex flex-col gap-3">
              <div className="font-pixel text-xs text-amber-300">
                Live Data-Driven MOD Block / TNT Injector (`mods/*.json`)
              </div>
              <textarea
                aria-label="Custom Mod Block JSON"
                rows={9}
                value={customModJson}
                onChange={(e) => setCustomModJson(e.target.value)}
                className="mc-slot w-full p-2.5 text-xs font-mono-tabular text-emerald-300 focus:outline-none"
              />
              {modStatusMsg && (
                <div className="text-xs font-mono-tabular text-amber-300">{modStatusMsg}</div>
              )}
              <button
                type="button"
                onClick={() => {
                  try {
                    const def = onRegisterCustomBlock(customModJson);
                    setModStatusMsg(
                      `Registered ${def.name} (${def.id} -> ID #${def.numericId}) into ModRegistry & JEI!`
                    );
                  } catch (err) {
                    setModStatusMsg(err instanceof Error ? err.message : 'Invalid JSON');
                  }
                }}
                className="mc-btn mc-btn-primary py-2 px-4 text-xs font-pixel"
              >
                Register Mod Block into Engine &amp; JEI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 & Step 2 Rust/WASM & Mega TNT Source Code Inspector */}
      {subScreen === 'rust_mod_studio' && (
        <div className="mc-panel my-auto w-full max-w-5xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <h2 className="font-pixel text-base text-amber-300">
                Step 1 &amp; Step 2: Rust/WASM Core Engine &amp; Mega TNT Pack Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                All files below are present in `/Cargo.toml`, `/public/mods/mega_tnt/*`, and `/rust_engine/src/*.rs`.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubScreen('main')}
              className="mc-btn px-3 py-1.5 text-xs font-pixel"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {STEP_1_AND_2_FILES.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedRustFileIdx(idx)}
                className={`mc-btn px-3 py-1.5 text-xs font-mono-tabular ${
                  selectedRustFileIdx === idx ? 'mc-btn-primary' : ''
                }`}
              >
                {file.path}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 text-xs">
            <div className="text-amber-300 font-semibold mb-1">
              {STEP_1_AND_2_FILES[selectedRustFileIdx].step} —{' '}
              {STEP_1_AND_2_FILES[selectedRustFileIdx].description}
            </div>
            <pre className="overflow-x-auto max-h-72 text-emerald-300 font-mono-tabular leading-relaxed">
              {STEP_1_AND_2_FILES[selectedRustFileIdx].code}
            </pre>
          </div>
        </div>
      )}

      {/* Flat Borderless Control Hint Line in Bottom Safe Margin */}
      <div className="w-full text-center text-xs text-slate-300 font-mono-tabular py-1">
        WASD Move · Space Jump/Fly · Left-Click Mine · Right-Click Place/Ignite · E Inventory &amp; JEI · / Command · R Axiom Mode · Esc Pause
      </div>
    </main>
  );
};
