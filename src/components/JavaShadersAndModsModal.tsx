import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Upload,
  Package,
  FileCode2,
  Check,
  Sliders,
  Layers,
  X,
  PlusCircle,
  Zap,
  Crosshair,
  Plane,
  CloudSun,
  RefreshCw,
} from 'lucide-react';
import {
  extractZipOrJarEntries,
  parseJavaShaderPackFromEntries,
  type JavaShaderPackProfile,
} from '../engine/javaShaderPackEngine';
import {
  BUILTIN_JAVA_MOD_JARS,
  DEFAULT_PREINSTALLED_FABRIC_MODS,
  installBuiltinJavaModPreset,
  loadJavaModOrDataPackArchive,
  type BuiltinJavaModPreset,
  type LoadedJavaModSummary,
} from '../engine/javaModLoaderEngine';
import {
  TACZ_GUN_REGISTRY,
  type DoABarrelRollConfig,
  type SodiumOptimizationSettings,
  type TaczAttachmentLoadout,
  type TaczMuzzleType,
  type TaczOpticType,
} from '../engine/taczGunEngine';
import type { BlockDefinition, VoxelEngineCore } from '../engine/voxelEngine';
import type { EngineSettings } from './TitleScreen';
import { TEXTURE_RESOLUTIONS, type TextureResolution } from '../engine/textures';
import { WEATHER2_DISASTERS, type WeatherDisasterType } from '../engine/weather2System';

interface JavaShadersAndModsModalProps {
  initialTab?: 'shaders' | 'mods' | 'sodium' | 'tacz_flight';
  shaderPacks: JavaShaderPackProfile[];
  activeShaderPackId: string;
  onSelectShaderPack: (pack: JavaShaderPackProfile) => void;
  onAddShaderPack: (pack: JavaShaderPackProfile) => void;
  onUpdateActiveShaderPack: (updated: JavaShaderPackProfile) => void;
  loadedJavaMods: LoadedJavaModSummary[];
  onAddLoadedJavaMod: (mod: LoadedJavaModSummary) => void;
  onEquipModBlockToHotbar: (blockDef: BlockDefinition) => void;
  settings: EngineSettings;
  setSettings: React.Dispatch<React.SetStateAction<EngineSettings>>;
  sodiumSettings: SodiumOptimizationSettings;
  setSodiumSettings: React.Dispatch<React.SetStateAction<SodiumOptimizationSettings>>;
  barrelRollConfig: DoABarrelRollConfig;
  setBarrelRollConfig: React.Dispatch<React.SetStateAction<DoABarrelRollConfig>>;
  taczLoadout: TaczAttachmentLoadout;
  setTaczLoadout: React.Dispatch<React.SetStateAction<TaczAttachmentLoadout>>;
  onReplayChunkFadeIn: () => void;
  onSelectWeatherDisaster: (disaster: WeatherDisasterType) => void;
  currentWeather: WeatherDisasterType;
  loadedChunkCount: number;
  engine: VoxelEngineCore;
  onClose: () => void;
}

export const JavaShadersAndModsModal: React.FC<JavaShadersAndModsModalProps> = ({
  initialTab = 'shaders',
  shaderPacks,
  activeShaderPackId,
  onSelectShaderPack,
  onAddShaderPack,
  onUpdateActiveShaderPack,
  loadedJavaMods,
  onAddLoadedJavaMod,
  onEquipModBlockToHotbar,
  settings,
  setSettings,
  sodiumSettings,
  setSodiumSettings,
  barrelRollConfig,
  setBarrelRollConfig,
  taczLoadout,
  setTaczLoadout,
  onReplayChunkFadeIn,
  onSelectWeatherDisaster,
  currentWeather,
  loadedChunkCount,
  engine,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'shaders' | 'mods' | 'sodium' | 'tacz_flight'>(
    initialTab
  );
  const [sodiumSubTab, setSodiumSubTab] = useState<
    'general' | 'quality' | 'performance' | 'optimizations'
  >('performance');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Universal Fabric Loader 0.16.10 Active · Sodium + Lithium + ModernFix + ImmediatelyFast + Indium + TaCZ + Do a Barrel Roll 標準搭載'
  );
  const [selectedGlslFileKey, setSelectedGlslFileKey] = useState<string>(
    'shaders/shaders.properties'
  );

  const shaderZipInputRef = useRef<HTMLInputElement>(null);
  const modJarInputRef = useRef<HTMLInputElement>(null);

  const activePack =
    shaderPacks.find((p) => p.id === activeShaderPackId) || shaderPacks[0];

  const handleShaderZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatusMessage(`Reading Java Shader Pack "${file.name}"...`);
      const buffer = await file.arrayBuffer();
      const entries = await extractZipOrJarEntries(buffer);
      const parsedPack = parseJavaShaderPackFromEntries(entries, file.name);
      onAddShaderPack(parsedPack);
      onSelectShaderPack(parsedPack);
      setStatusMessage(
        `Java Shader Pack "${parsedPack.name}" を適用しました！（GLSLファイル ${Object.keys(parsedPack.rawFiles).length} 個・sunPathRotation=${parsedPack.sunPathRotation}°）`
      );
    } catch (err) {
      setStatusMessage(
        `シェーダーパック解析エラー: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
    e.target.value = '';
  };

  const handleModFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatusMessage(`Analyzing Universal Fabric / Forge / Disaster Mod "${file.name}"...`);
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const def = engine.registerCustomModJson(text);
        const summary: LoadedJavaModSummary = {
          modId: def.id.split(':')[0] || 'customjson',
          name: def.name,
          version: '1.0.0',
          loader: 'JSON Mod',
          description: `Custom JSON block definition (${def.id})`,
          addedBlocks: [def],
          addedRecipesCount: 1,
          fileCount: 1,
          entrypoints: ['json: Registry.register(BLOCK)'],
          mixinConfigs: [],
        };
        onAddLoadedJavaMod(summary);
        onEquipModBlockToHotbar(def);
        setStatusMessage(`JSON Mod "${def.name}" を登録しホットバーへ装備しました！`);
      } else {
        const buffer = await file.arrayBuffer();
        const summary = await loadJavaModOrDataPackArchive(buffer, file.name, engine);
        onAddLoadedJavaMod(summary);
        if (summary.addedBlocks[0]) {
          onEquipModBlockToHotbar(summary.addedBlocks[0]);
        }
        const disasterNote =
          summary.detectedDisasters && summary.detectedDisasters.length > 0
            ? ` ・ 災害プリセット(${summary.detectedDisasters.join(', ')})を登録しました（※天候は晴天のまま維持されます）`
            : '';
        setStatusMessage(
          `Universal Loader: "${summary.name}" (${summary.loader}) をロードしました！追加要素: ${summary.addedBlocks.length}個 / レシピ: ${summary.addedRecipesCount}個${disasterNote}`
        );
      }
    } catch (err) {
      setStatusMessage(
        `MOD読み込みエラー: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
    e.target.value = '';
  };

  const handleInstallBuiltinJar = (preset: BuiltinJavaModPreset) => {
    const already = loadedJavaMods.find((m) => m.modId === preset.id);
    if (already) {
      if (already.addedBlocks[0]) onEquipModBlockToHotbar(already.addedBlocks[0]);
      setStatusMessage(`"${preset.name}" は既に導入済みです（先頭アイテムをホットバーに装備しました）。`);
      return;
    }
    const summary = installBuiltinJavaModPreset(preset, engine);
    onAddLoadedJavaMod(summary);
    if (summary.addedBlocks[0]) {
      onEquipModBlockToHotbar(summary.addedBlocks[0]);
    }
    setStatusMessage(
      `${preset.fileName} をロードしました！${summary.addedBlocks.length}種類のアイテム・ブロックをホットバー＆JEIに追加しました。`
    );
  };

  const rawFileKeys = Object.keys(activePack.rawFiles);
  const currentFileKey = rawFileKeys.includes(selectedGlslFileKey)
    ? selectedGlslFileKey
    : rawFileKeys[0] || 'shaders/shaders.properties';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-label="Java Edition Shaders, Universal Fabric Mods and Sodium Settings Manager"
    >
      <div className="mc-panel w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#181a1f] border-2 border-[#4d525c] text-[#f4f1ea] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#101216] border-b-2 border-[#2d323b]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#42f59b]" />
            <div>
              <h2 className="mc-font text-sm tracking-wider text-[#42f59b]">
                SODIUM VIDEO SETTINGS · UNIVERSAL FABRIC MOD LOADER · IRIS SHADERS · TACZ &amp; BARREL ROLL
              </h2>
              <p className="text-[11px] text-[#9aa0a6]">
                Sodium / Lithium / ModernFix / ImmediatelyFast / Indium 標準搭載 · 全Fabric MOD (.jar) / 災害MOD / シェーダーパック (.zip) 対応
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Shaders and Mods Manager"
            className="mc-btn px-3 py-1.5 text-xs flex items-center gap-1"
          >
            <X className="w-4 h-4" /> CLOSE [ESC]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2.5 bg-[#13151a] border-b border-[#2c3038]">
          <button
            onClick={() => setActiveTab('sodium')}
            className={`px-3.5 py-2 text-xs mc-font border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sodium'
                ? 'bg-[#181a1f] border-[#42f59b] text-[#42f59b]'
                : 'bg-[#101216] border-[#2c3038] text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            SODIUM &amp; OPTIMIZATIONS (5 ACTIVE)
          </button>
          <button
            onClick={() => setActiveTab('tacz_flight')}
            className={`px-3.5 py-2 text-xs mc-font border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'tacz_flight'
                ? 'bg-[#181a1f] border-[#38bdf8] text-[#38bdf8]'
                : 'bg-[#101216] border-[#2c3038] text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            TACZ GUNS &amp; DO A BARREL ROLL
          </button>
          <button
            onClick={() => setActiveTab('mods')}
            className={`px-3.5 py-2 text-xs mc-font border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'mods'
                ? 'bg-[#181a1f] border-[#c084fc] text-[#c084fc]'
                : 'bg-[#101216] border-[#2c3038] text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            FABRIC / DISASTER MOD LOADER (.JAR / .ZIP) ({DEFAULT_PREINSTALLED_FABRIC_MODS.length + loadedJavaMods.length})
          </button>
          <button
            onClick={() => setActiveTab('shaders')}
            className={`px-3.5 py-2 text-xs mc-font border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'shaders'
                ? 'bg-[#181a1f] border-[#f5b82e] text-[#f5b82e]'
                : 'bg-[#101216] border-[#2c3038] text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            IRIS / OPTIFINE SHADER PACKS ({shaderPacks.length})
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-4 py-2 bg-[#0e151d] border-b border-[#223242] text-xs font-mono text-[#7dd3fc] flex flex-wrap items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#42f59b] flex items-center gap-1">
              <CloudSun className="w-3.5 h-3.5" />
              World Spawn Weather: CLEAR (晴天固定)
            </span>
            <span className="text-[#f5b82e]">
              Chunk Fade-In: {sodiumSettings.chunkFadeInMode.toUpperCase()} ({sodiumSettings.chunkFadeDurationSec}s)
            </span>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: SODIUM VIDEO SETTINGS & OPTIMIZATION MODS (Sodium, Lithium, ModernFix, ImmediatelyFast, Indium) */}
          {activeTab === 'sodium' && (
            <div className="space-y-4">
              {/* Sodium Top Telemetry & Sub-Navigation Bar */}
              <div className="p-3 bg-[#111419] border border-[#2d3440] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'performance' as const, label: 'Performance & Chunk Fade-In' },
                    { id: 'quality' as const, label: 'Quality & Smooth Lighting' },
                    { id: 'general' as const, label: 'General Video' },
                    {
                      id: 'optimizations' as const,
                      label: 'Sodium / Lithium / ModernFix / ImmediatelyFast / Indium',
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setSodiumSubTab(st.id)}
                      className={`px-3 py-1.5 text-xs font-pixel border transition-colors ${
                        sodiumSubTab === st.id
                          ? 'bg-[#1c3329] border-[#42f59b] text-[#42f59b]'
                          : 'bg-[#161920] border-[#2e3440] text-[#c2c7d0] hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="px-2 py-1 bg-[#16241d] border border-[#2f5e45] text-[#42f59b]">
                    Sodium 0.6.5 Multidraw
                  </span>
                  <span className="px-2 py-1 bg-[#18202c] border border-[#2e4568] text-[#7dd3fc]">
                    Active Chunks: {loadedChunkCount}
                  </span>
                </div>
              </div>

              {sodiumSubTab === 'performance' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 p-4 bg-[#12151a] border border-[#2e3440] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#262b36] pb-2">
                      <div>
                        <h3 className="mc-font text-xs text-[#42f59b]">
                          SODIUM CHUNK RENDERER &amp; CHUNK FADE-IN ANIMATION
                        </h3>
                        <p className="text-[11px] text-[#9aa0a6]">
                          本家マイクラ（Sodium / ChunkAnimator）と同様に、チャンク生成・移動時に滑らかにフェードイン＆せり上がる演出を制御します
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onReplayChunkFadeIn();
                          setStatusMessage(
                            '全チャンクのフェードインアニメーション（Sodium Smooth Chunk Fade-In）を再生しました！'
                          );
                        }}
                        className="mc-btn px-3 py-1.5 text-xs text-[#42f59b] flex items-center gap-1.5 shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replay Chunk Fade-In
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <label className="space-y-1">
                        <span className="text-[#c2c7d0] font-semibold">
                          Chunk Fade-In Mode (チャンク出現アニメーション)
                        </span>
                        <select
                          aria-label="Chunk Fade-In Mode"
                          value={sodiumSettings.chunkFadeInMode}
                          onChange={(e) =>
                            setSodiumSettings((s) => ({
                              ...s,
                              chunkFadeInMode: e.target.value as SodiumOptimizationSettings['chunkFadeInMode'],
                            }))
                          }
                          className="mc-slot w-full px-2.5 py-2 text-white"
                        >
                          <option value="smooth_rise">
                            Smooth Fade + Rise (Sodium + ChunkAnimator)
                          </option>
                          <option value="fade_only">Smooth Opacity Fade Only (Sodium 標準)</option>
                          <option value="off">Instant (アニメーションなし)</option>
                        </select>
                      </label>

                      <label className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#c2c7d0] font-semibold">
                            Chunk Fade Duration (フェード時間)
                          </span>
                          <span className="text-[#42f59b] font-mono">
                            {sodiumSettings.chunkFadeDurationSec.toFixed(2)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.2}
                          max={1.6}
                          step={0.05}
                          value={sodiumSettings.chunkFadeDurationSec}
                          onChange={(e) =>
                            setSodiumSettings((s) => ({
                              ...s,
                              chunkFadeDurationSec: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#42f59b]"
                        />
                      </label>

                      <label className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#c2c7d0] font-semibold">
                            Chunk Update Threads (並列メッシュ構築)
                          </span>
                          <span className="text-[#42f59b] font-mono">
                            {sodiumSettings.chunkUpdateThreads} Threads
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={8}
                          step={1}
                          value={sodiumSettings.chunkUpdateThreads}
                          onChange={(e) =>
                            setSodiumSettings((s) => ({
                              ...s,
                              chunkUpdateThreads: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#42f59b]"
                        />
                      </label>

                      <label className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#c2c7d0] font-semibold">
                            Render Distance (描画チャンク距離)
                          </span>
                          <span className="text-[#42f59b] font-mono">
                            {settings.renderDistance} Chunks
                          </span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={5}
                          step={1}
                          value={settings.renderDistance}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              renderDistance: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#42f59b]"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
                      {[
                        {
                          key: 'compactVertexFormat' as const,
                          title: 'Use Compact Vertex Format (20-Byte)',
                          desc: '頂点フォーマットを16bit圧縮しVRAM使用量を40%削減',
                        },
                        {
                          key: 'blockFaceCulling' as const,
                          title: 'Use Block Face Culling',
                          desc: '隣接する不透明ブロック間の隠れた面を100%カリング',
                        },
                        {
                          key: 'fogOcclusion' as const,
                          title: 'Use Fog Occlusion',
                          desc: 'フォグ奥のチャンク描画をスキップしてGPU負荷を軽減',
                        },
                        {
                          key: 'alwaysDeferChunkUpdates' as const,
                          title: 'Always Defer Chunk Updates',
                          desc: '爆発やブロック破壊時のチャンク再構築を非同期フレーム分散',
                        },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setSodiumSettings((s) => ({ ...s, [item.key]: !s[item.key] }))
                          }
                          className={`p-2.5 border text-left transition-colors ${
                            sodiumSettings[item.key]
                              ? 'bg-[#172921] border-[#42f59b] text-white'
                              : 'bg-[#15181f] border-[#2e3440] text-[#9aa0a6]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-pixel text-[11px]">
                            <span>{item.title}</span>
                            <span
                              className={
                                sodiumSettings[item.key] ? 'text-[#42f59b]' : 'text-[#9aa0a6]'
                              }
                            >
                              {sodiumSettings[item.key] ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9aa0a6] mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right 5 Columns: Default Installed Optimization Mods Live Toggles */}
                  <div className="lg:col-span-5 p-4 bg-[#12151a] border border-[#2e3440] space-y-3">
                    <div className="mc-font text-xs text-[#42f59b] border-b border-[#262b36] pb-2">
                      DEFAULT PRE-INSTALLED FABRIC OPTIMIZATION STACK
                    </div>
                    {[
                      {
                        key: 'sodiumEnabled' as const,
                        name: 'Sodium 0.6.5',
                        badge: 'Renderer + Chunk Fade',
                        desc: 'Multidraw WebGL2 Chunk Renderer & Smooth Chunk Fade-In.',
                      },
                      {
                        key: 'lithiumEnabled' as const,
                        name: 'Lithium 0.14.2',
                        badge: 'Physics & Tick AI',
                        desc: 'AABB collision sweep, entity AI tick throttling & fast TNT raycast.',
                      },
                      {
                        key: 'modernFixEnabled' as const,
                        name: 'ModernFix 5.20.0',
                        badge: 'Dynamic Resources / 4GB RAM',
                        desc: 'On-demand model baking, FerriteCore state dedup & dimension RAM GC.',
                      },
                      {
                        key: 'immediatelyFastEnabled' as const,
                        name: 'ImmediatelyFast 1.3.3',
                        badge: 'HUD & Particle Batching',
                        desc: 'Batches GUI, HUD, text & instanced debris into single draw calls.',
                      },
                      {
                        key: 'indiumEnabled' as const,
                        name: 'Indium 1.0.35',
                        badge: 'FRAPI Mesh Bridge',
                        desc: 'Fabric Rendering API compatibility layer for Sodium & modded blocks.',
                      },
                    ].map((mod) => (
                      <div
                        key={mod.key}
                        className="p-2.5 bg-[#161a22] border border-[#2c3340] flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="mc-font text-xs text-white">{mod.name}</span>
                            <span className="px-1.5 py-0.5 bg-[#1f2937] text-[10px] font-mono text-[#42f59b]">
                              {mod.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9aa0a6]">{mod.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSodiumSettings((s) => ({ ...s, [mod.key]: !s[mod.key] }))
                          }
                          className={`px-3 py-1.5 text-xs font-pixel border shrink-0 ${
                            sodiumSettings[mod.key]
                              ? 'bg-[#193326] border-[#42f59b] text-[#42f59b]'
                              : 'bg-[#1b1e24] border-[#3a3f4b] text-[#9aa0a6]'
                          }`}
                        >
                          {sodiumSettings[mod.key] ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sodiumSubTab === 'quality' && (
                <div className="p-4 bg-[#12151a] border border-[#2e3440] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <label className="space-y-1">
                    <span className="text-[#c2c7d0] font-semibold">
                      Smooth Lighting (4-Level Vertex Ambient Occlusion)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((s) => ({ ...s, smoothLighting: !s.smoothLighting }));
                        engine.smoothLightingEnabled = !settings.smoothLighting;
                        onReplayChunkFadeIn();
                      }}
                      className={`w-full py-2 px-3 font-pixel border ${
                        settings.smoothLighting
                          ? 'bg-[#193326] border-[#42f59b] text-[#42f59b]'
                          : 'bg-[#181b20] border-[#343946] text-[#9aa0a6]'
                      }`}
                    >
                      {settings.smoothLighting ? 'HIGH (4-Level Corner AO)' : 'OFF (Flat Shade)'}
                    </button>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#c2c7d0] font-semibold">
                      Biome Blend (バイオーム境界グラデーション)
                    </span>
                    <select
                      value={settings.biomeBlend}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, biomeBlend: Number(e.target.value) }))
                      }
                      className="mc-slot w-full px-2.5 py-2 text-white"
                    >
                      {[1, 3, 5, 7, 9, 11, 13, 15].map((b) => (
                        <option key={b} value={b}>
                          {b}x{b} ({b === 1 ? 'Fast' : b <= 5 ? 'Standard' : 'Smooth'})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#c2c7d0] font-semibold">
                      Texture Pack Resolution (4x4 〜 4096x4096)
                    </span>
                    <select
                      value={settings.textureResolution}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          textureResolution: Number(e.target.value) as TextureResolution,
                        }))
                      }
                      className="mc-slot w-full px-2.5 py-2 text-white font-mono"
                    >
                      {TEXTURE_RESOLUTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}x{r} Procedural Atlas
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {sodiumSubTab === 'general' && (
                <div className="p-4 bg-[#12151a] border border-[#2e3440] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span>FOV (視野角)</span>
                      <span className="text-[#42f59b] font-mono">{settings.fov}°</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={110}
                      value={settings.fov}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, fov: Number(e.target.value) }))
                      }
                      className="w-full accent-[#42f59b]"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span>Brightness (明るさ / Gamma)</span>
                      <span className="text-[#42f59b] font-mono">
                        {sodiumSettings.brightnessGamma}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={sodiumSettings.brightnessGamma}
                      onChange={(e) =>
                        setSodiumSettings((s) => ({
                          ...s,
                          brightnessGamma: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#42f59b]"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span>Max Framerate</span>
                      <span className="text-[#42f59b] font-mono">{sodiumSettings.maxFps} FPS</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={240}
                      step={10}
                      value={sodiumSettings.maxFps}
                      onChange={(e) =>
                        setSodiumSettings((s) => ({ ...s, maxFps: Number(e.target.value) }))
                      }
                      className="w-full accent-[#42f59b]"
                    />
                  </label>
                </div>
              )}

              {sodiumSubTab === 'optimizations' && (
                <div className="p-4 bg-[#12151a] border border-[#2e3440] space-y-3 text-xs">
                  <div className="text-[#42f59b] mc-font">
                    ACTIVE FABRIC MIXIN PIPELINE (Sodium + Lithium + ModernFix + ImmediatelyFast + Indium)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DEFAULT_PREINSTALLED_FABRIC_MODS.map((m) => (
                      <div key={m.modId} className="p-3 bg-[#161922] border border-[#2d3342] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-pixel text-[#42f59b]">{m.name}</span>
                          <span className="text-[10px] font-mono text-[#7dd3fc]">v{m.version}</span>
                        </div>
                        <p className="text-[11px] text-[#c2c7d0]">{m.description}</p>
                        <div className="text-[10px] font-mono text-[#9aa0a6]">
                          Mixins: {(m.mixinTargets || []).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TACZ GUNS & DO A BARREL ROLL FLIGHT */}
          {activeTab === 'tacz_flight' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left 7 Columns: TaCZ Firearms & Gun Smith Attachments */}
              <div className="lg:col-span-7 p-4 bg-[#12151a] border border-[#2e3440] space-y-4">
                <div className="flex items-center justify-between border-b border-[#262b36] pb-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-[#f5b82e]" />
                    <span className="mc-font text-xs text-[#f5b82e]">
                      TACZ: TIMELESS AND CLASSICS ZERO (3D TACTICAL FIREARMS &amp; GUNSMITH)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#9aa0a6]">
                    Left-Click: Fire · Right-Click: Sight ADS · [T]: Reload
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TACZ_GUN_REGISTRY.map((gun) => {
                    const blockDef = engine.blocksByNum.get(gun.numericId);
                    return (
                      <div
                        key={gun.itemId}
                        className="p-3 bg-[#161a22] border border-[#2f3644] flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="mc-font text-xs text-[#f5b82e]">{gun.name}</span>
                            <span className="px-1.5 py-0.5 bg-[#232936] text-[10px] font-mono text-[#7dd3fc]">
                              {gun.fireMode} · {gun.rpm} RPM
                            </span>
                          </div>
                          <div className="text-[11px] text-[#42f59b] font-semibold mt-0.5">
                            {gun.jpName} ({gun.caliber})
                          </div>
                          <p className="text-[11px] text-[#9aa0a6] mt-1">{gun.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (blockDef) {
                              onEquipModBlockToHotbar(blockDef);
                              setStatusMessage(
                                `TaCZ "${gun.name}" をホットバーに装備しました！（左クリック: 射撃 / 右クリック: ADSサイト覗き込み / [T]: リロード）`
                              );
                            }
                          }}
                          className="mc-btn w-full py-1.5 text-xs font-pixel text-[#f5b82e] flex items-center justify-center gap-1.5"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          Equip {gun.name.replace('TaCZ ', '')} to Hotbar
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Gunsmith Attachment Customizer */}
                <div className="p-3 bg-[#151921] border border-[#2c3342] space-y-2.5 text-xs">
                  <div className="mc-font text-xs text-[#7dd3fc]">
                    TACZ GUN SMITH TABLE ATTACHMENT CUSTOMIZER
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-[#9aa0a6]">Optic Sight (照準器)</span>
                      <select
                        value={taczLoadout.optic}
                        onChange={(e) =>
                          setTaczLoadout((l) => ({
                            ...l,
                            optic: e.target.value as TaczOpticType,
                          }))
                        }
                        className="mc-slot w-full px-2 py-1.5 text-white"
                      >
                        <option value="eotech_holo">EOTech Holographic (1.5x)</option>
                        <option value="acog_4x">Trijicon ACOG 4x Scope</option>
                        <option value="sniper_8x">Leupold 8x Mil-Dot Scope</option>
                        <option value="iron">Tactical Iron Sights</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[#9aa0a6]">Muzzle / Payload (銃口・弾頭)</span>
                      <select
                        value={taczLoadout.muzzle}
                        onChange={(e) =>
                          setTaczLoadout((l) => ({
                            ...l,
                            muzzle: e.target.value as TaczMuzzleType,
                          }))
                        }
                        className="mc-slot w-full px-2 py-1.5 text-white"
                      >
                        <option value="standard">Standard Flash Hider</option>
                        <option value="suppressor">Tactical Suppressor (消音・低反動)</option>
                        <option value="compensator">Muzzle Brake (-45% Recoil)</option>
                        <option value="explosive_tip">HE Explosive Rounds (榴弾着弾爆発)</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[#9aa0a6]">Magazine (弾倉拡張)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTaczLoadout((l) => ({ ...l, extendedMag: !l.extendedMag }))
                        }
                        className={`w-full py-1.5 px-2.5 font-pixel border ${
                          taczLoadout.extendedMag
                            ? 'bg-[#193326] border-[#42f59b] text-[#42f59b]'
                            : 'bg-[#181b22] border-[#343946] text-[#9aa0a6]'
                        }`}
                      >
                        {taczLoadout.extendedMag ? 'Extended Drum (+50% Ammo)' : 'Standard Mag'}
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Do a Barrel Roll Flight Physics */}
              <div className="lg:col-span-5 p-4 bg-[#12151a] border border-[#2e3440] space-y-4">
                <div className="flex items-center justify-between border-b border-[#262b36] pb-2">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-[#38bdf8]" />
                    <span className="mc-font text-xs text-[#38bdf8]">
                      DO A BARREL ROLL (6-DOF FLIGHT &amp; BANKING MOD)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#42f59b]">Key [G] / [Z] / [X]</span>
                </div>

                <p className="text-xs text-[#c2c7d0]">
                  <strong>Do a Barrel Roll</strong> を有効化すると、エリトラ・航空機と同じ3軸（Pitch / Yaw / Roll）バンク旋回飛行が可能になります。ゲーム中に <code>G</code> キーで飛行モードを切り替え、<code>Z</code> / <code>X</code> キーで360°エルロン・バレルロール機動を行います。
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setBarrelRollConfig((c) => ({ ...c, enabled: !c.enabled }));
                    setStatusMessage(
                      `Do a Barrel Roll 3D Flight Mode: ${!barrelRollConfig.enabled ? 'ENABLED ([Z]/[X] で360°バレルロール)' : 'OFF'}`
                    );
                  }}
                  className={`w-full py-2.5 px-4 font-pixel text-xs border transition-colors flex items-center justify-center gap-2 ${
                    barrelRollConfig.enabled
                      ? 'bg-[#142d3d] border-[#38bdf8] text-[#38bdf8]'
                      : 'bg-[#181b22] border-[#343946] text-[#c2c7d0]'
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  Do a Barrel Roll Flight Mode [G]: {barrelRollConfig.enabled ? 'ACTIVE (飛行中)' : 'STANDBY (地上歩行)'}
                </button>

                <div className="space-y-3 text-xs">
                  <label className="block space-y-1">
                    <div className="flex justify-between">
                      <span>Roll Banking Sensitivity (ロール感度)</span>
                      <span className="text-[#38bdf8] font-mono">
                        {barrelRollConfig.mouseRollSensitivity.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={2.0}
                      step={0.05}
                      value={barrelRollConfig.mouseRollSensitivity}
                      onChange={(e) =>
                        setBarrelRollConfig((c) => ({
                          ...c,
                          mouseRollSensitivity: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#38bdf8]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="flex justify-between">
                      <span>Thrust Cruise Speed (巡航推力速度)</span>
                      <span className="text-[#38bdf8] font-mono">
                        {barrelRollConfig.thrustSpeed.toFixed(1)} m/s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={32}
                      step={0.5}
                      value={barrelRollConfig.thrustSpeed}
                      onChange={(e) =>
                        setBarrelRollConfig((c) => ({
                          ...c,
                          thrustSpeed: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#38bdf8]"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNIVERSAL FABRIC / NEOFORGE / DISASTER MOD LOADER (.JAR / .ZIP) */}
          {activeTab === 'mods' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Universal Fabric / Disaster Mod File Upload + One-Click Packages */}
              <div className="lg:col-span-6 space-y-3">
                <div className="p-3.5 bg-[#121418] border border-[#32363e] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="mc-font text-xs text-[#c084fc]">
                      UNIVERSAL FABRIC / NEOFORGE / DISASTER MOD IMPORTER (.JAR / .ZIP)
                    </span>
                    <span className="text-[10px] font-mono text-[#42f59b]">
                      All Fabric .jar Supported
                    </span>
                  </div>
                  <p className="text-xs text-[#c2c7d0]">
                    あらゆる <strong>Fabric MOD (<code>.jar</code>)</strong>、<strong>災害MOD (Weather2 / PMWeather <code>.jar</code> / <code>.zip</code>)</strong>、<strong>TaCZ銃パック</strong> をそのまま読み込めます。<code>fabric.mod.json</code>・<code>*.mixins.json</code>・ネストされた <code>META-INF/jars/*.jar</code>・<code>.class</code> バイトコード定数プールまで自動解析して有効化します（※ワールド生成時は常に晴天で開始し、災害MODを取り込んだ後に任意のタイミングで災害を起動できます）。
                  </p>
                  <input
                    ref={modJarInputRef}
                    type="file"
                    accept=".jar,.zip,.json"
                    onChange={handleModFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => modJarInputRef.current?.click()}
                    className="mc-btn w-full py-2 text-xs flex items-center justify-center gap-2 text-[#c084fc]"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Any Fabric Mod (.jar) / Disaster Mod (.jar/.zip) / TaCZ Pack...
                  </button>
                </div>

                {/* Built-in One-Click Java .jar Mods */}
                <div className="space-y-2">
                  <div className="mc-font text-xs text-[#9aa0a6] px-1">
                    ONE-CLICK FABRIC / FORGE / DISASTER MOD PACKAGES (.JAR)
                  </div>
                  {BUILTIN_JAVA_MOD_JARS.map((preset) => {
                    const isInstalled = loadedJavaMods.some((m) => m.modId === preset.id);
                    return (
                      <div
                        key={preset.id}
                        className="p-3 bg-[#14161a] border border-[#2c3038] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="mc-font text-xs text-[#42f59b]">{preset.name}</span>
                            <span className="px-1.5 py-0.5 bg-[#202631] text-[10px] font-mono text-[#7dd3fc]">
                              {preset.loader}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#9aa0a6]">
                            {preset.fileName} · {preset.blocks.length} Items/Blocks
                          </div>
                          <p className="text-xs text-[#c2c7d0]">{preset.description}</p>
                        </div>
                        <button
                          onClick={() => handleInstallBuiltinJar(preset)}
                          className="mc-btn px-3 py-2 text-xs shrink-0 flex items-center gap-1.5 text-[#f5b82e]"
                        >
                          {isInstalled ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#42f59b]" /> EQUIP
                            </>
                          ) : (
                            <>
                              <PlusCircle className="w-3.5 h-3.5" /> LOAD .JAR
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Loaded Fabric Mods, Mixin Inspector & Disaster Trigger */}
              <div className="lg:col-span-6 space-y-3">
                <div className="p-3.5 bg-[#121418] border border-[#32363e] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#262930] pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#42f59b]" />
                      <span className="mc-font text-xs text-[#42f59b]">
                        ACTIVE FABRIC MODS ({DEFAULT_PREINSTALLED_FABRIC_MODS.length + loadedJavaMods.length}) &amp; BLOCKS
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#9aa0a6]">
                      Current Weather: {WEATHER2_DISASTERS[currentWeather].jpLabel}
                    </span>
                  </div>

                  {/* Quick Weather Reset to Clear (Sunny) */}
                  <div className="p-2.5 bg-[#13221c] border border-[#2a5240] flex items-center justify-between gap-2 text-xs">
                    <span>
                      ワールド標準天候は <strong>晴天 (Clear)</strong> です。災害MOD導入後にテストしたい場合のみ切り替え可能です。
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectWeatherDisaster('clear');
                        setStatusMessage('天候を「晴天（Clear Cumulus）」にリセットしました。');
                      }}
                      className="mc-btn px-2.5 py-1 text-xs font-pixel text-[#42f59b] shrink-0"
                    >
                      晴天に戻す (Clear)
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {loadedJavaMods.map((mod) => (
                      <div
                        key={mod.modId}
                        className="p-3 bg-[#171a21] border border-[#3b4254] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="mc-font text-xs text-[#c084fc]">
                            {mod.name} (v{mod.version})
                          </span>
                          <span className="text-[10px] font-mono text-[#7dd3fc]">
                            {mod.loader} · {mod.addedBlocks.length} items
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9aa0a6]">{mod.description}</p>
                        {mod.entrypoints && mod.entrypoints.length > 0 && (
                          <div className="text-[10px] font-mono text-[#42f59b] truncate">
                            Entrypoint: {mod.entrypoints[0]}
                          </div>
                        )}
                        {mod.detectedDisasters && mod.detectedDisasters.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-mono text-[#f5b82e]">
                              Disaster Mod Presets:
                            </span>
                            {mod.detectedDisasters.map((dKey) => (
                              <button
                                key={dKey}
                                type="button"
                                onClick={() => {
                                  onSelectWeatherDisaster(dKey);
                                  setStatusMessage(
                                    `災害MODプリセット「${WEATHER2_DISASTERS[dKey].jpLabel}」を起動しました！`
                                  );
                                }}
                                className="px-2 py-0.5 bg-[#2a1d1d] border border-[#f87171] text-[10px] font-pixel text-[#fca5a5]"
                              >
                                Launch {WEATHER2_DISASTERS[dKey].jpLabel}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {mod.addedBlocks.map((blk) => (
                            <button
                              key={blk.id}
                              onClick={() => {
                                onEquipModBlockToHotbar(blk);
                                setStatusMessage(
                                  `ホットバーに「${blk.name} (${blk.id})」を装備しました！`
                                );
                              }}
                              className="p-1.5 bg-[#101217] hover:bg-[#232834] border border-[#2e3442] text-left flex items-center gap-2 transition-colors"
                            >
                              <span
                                className="w-4 h-4 shrink-0 border border-white/30"
                                style={{
                                  backgroundColor: `rgb(${Math.round(
                                    blk.colorTop[0] * 255
                                  )}, ${Math.round(blk.colorTop[1] * 255)}, ${Math.round(
                                    blk.colorTop[2] * 255
                                  )})`,
                                }}
                              />
                              <div className="truncate">
                                <div className="text-[11px] font-semibold text-[#f4f1ea] truncate">
                                  {blk.name}
                                </div>
                                <div className="text-[9px] font-mono text-[#9aa0a6] truncate">
                                  {blk.id}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {DEFAULT_PREINSTALLED_FABRIC_MODS.map((mod) => (
                      <div
                        key={mod.modId}
                        className="p-2.5 bg-[#14171e] border border-[#282e3b] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="mc-font text-xs text-[#42f59b]">
                            {mod.name} (v{mod.version})
                          </span>
                          <span className="px-1.5 py-0.5 bg-[#192b22] text-[10px] font-mono text-[#42f59b]">
                            DEFAULT ACTIVE
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9aa0a6]">{mod.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IRIS / OPTIFINE SHADER PACKS */}
          {activeTab === 'shaders' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Shader Pack List & .zip Upload */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3 bg-[#121418] border border-[#32363e] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="mc-font text-xs text-[#f5b82e]">
                      IMPORT JAVA SHADER PACK (.ZIP)
                    </span>
                    <span className="text-[10px] font-mono text-[#9aa0a6]">
                      OptiFine / Iris 1.20〜26.3
                    </span>
                  </div>
                  <p className="text-xs text-[#c2c7d0]">
                    お手持ちのJava版シェーダーパック（BSL, Complementary, SEUS, Sildur等の{' '}
                    <code>.zip</code> ファイル）を選択すると、内部の{' '}
                    <code>shaders/shaders.properties</code>・<code>gbuffers_terrain.fsh</code>・
                    <code>final.fsh</code> を自動解析してワールドに即時反映します。
                  </p>
                  <input
                    ref={shaderZipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleShaderZipUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => shaderZipInputRef.current?.click()}
                    className="mc-btn w-full py-2 text-xs flex items-center justify-center gap-2 text-[#f5b82e]"
                  >
                    <Upload className="w-4 h-4" />
                    Select Java Shader Pack (.zip) File...
                  </button>
                </div>

                {/* Installed Shader Pack Selector */}
                <div className="space-y-1.5">
                  <div className="mc-font text-xs text-[#9aa0a6] px-1">
                    AVAILABLE JAVA SHADER PACKS
                  </div>
                  {shaderPacks.map((pack) => {
                    const isSelected = pack.id === activePack.id;
                    return (
                      <button
                        key={pack.id}
                        onClick={() => {
                          onSelectShaderPack(pack);
                          setStatusMessage(`Active Shader Pack: ${pack.name}`);
                        }}
                        className={`w-full text-left p-2.5 border transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#262b36] border-[#f5b82e] text-white'
                            : 'bg-[#14161a] border-[#2c3038] text-[#c2c7d0] hover:border-[#5f6672]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="mc-font text-xs text-[#f5b82e]">{pack.name}</span>
                          </div>
                          <p className="text-[11px] text-[#9aa0a6] line-clamp-2">
                            {pack.description}
                          </p>
                          <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-[#7dd3fc]">
                            <span>sunRot: {pack.sunPathRotation}°</span>
                            <span>tonemap: {pack.tonemapCurve.toUpperCase()}</span>
                            <span>clouds: {pack.cloudStyle}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-[#f5b82e] text-black mc-font text-[10px] flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Iris Shader Pack Settings & GLSL Inspector */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-3.5 bg-[#121418] border border-[#32363e] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#262930] pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#f5b82e]" />
                      <span className="mc-font text-xs text-[#f5b82e]">
                        SHADER PACK OPTIONS ({activePack.name})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#9aa0a6]">
                      shaders.properties uniforms
                    </span>
                  </div>

                  {/* Sliders for optical & physical uniforms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>sunPathRotation (太陽軌道角)</span>
                        <span className="text-[#f5b82e]">{activePack.sunPathRotation}°</span>
                      </div>
                      <input
                        type="range"
                        min={-60}
                        max={60}
                        step={1}
                        value={activePack.sunPathRotation}
                        onChange={(e) =>
                          onUpdateActiveShaderPack({
                            ...activePack,
                            sunPathRotation: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#f5b82e]"
                      />
                    </label>

                    <label className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>specularWetness (PBR鏡面・水溜り反射)</span>
                        <span className="text-[#f5b82e]">
                          {Math.round(activePack.specularWetness * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.2}
                        step={0.05}
                        value={activePack.specularWetness}
                        onChange={(e) =>
                          onUpdateActiveShaderPack({
                            ...activePack,
                            specularWetness: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#f5b82e]"
                      />
                    </label>

                    <label className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>emissiveBloom (SEUS/PBR GI発光強度)</span>
                        <span className="text-[#f5b82e]">
                          {Math.round(activePack.emissiveBloomStrength * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.6}
                        step={0.05}
                        value={activePack.emissiveBloomStrength}
                        onChange={(e) =>
                          onUpdateActiveShaderPack({
                            ...activePack,
                            emissiveBloomStrength: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#f5b82e]"
                      />
                    </label>

                    <label className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>wavingFoliageAmp (草木の風揺れ振幅)</span>
                        <span className="text-[#f5b82e]">
                          {activePack.wavingFoliageAmp.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2.2}
                        step={0.05}
                        value={activePack.wavingFoliageAmp}
                        onChange={(e) =>
                          onUpdateActiveShaderPack({
                            ...activePack,
                            wavingFoliageAmp: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#f5b82e]"
                      />
                    </label>

                    <label className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>exposure (露出・トーンマップ明るさ)</span>
                        <span className="text-[#f5b82e]">{activePack.exposure.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.6}
                        max={1.6}
                        step={0.02}
                        value={activePack.exposure}
                        onChange={(e) =>
                          onUpdateActiveShaderPack({
                            ...activePack,
                            exposure: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#f5b82e]"
                      />
                    </label>

                    <label className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>saturation / vibrance (彩度)</span>
                        <span className="text-[#f5b82e]">{activePack.saturation.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.7}
                        max={1.6}
                        step={0.02}
                        value={activePack.saturation}
                        onChange={(e) =>
                          onUpdateActiveShaderPack({
                            ...activePack,
                            saturation: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#f5b82e]"
                      />
                    </label>
                  </div>
                </div>

                {/* GLSL Source Code Inspector */}
                <div className="p-3.5 bg-[#121418] border border-[#32363e] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-[#7dd3fc]" />
                      <span className="mc-font text-xs text-[#7dd3fc]">
                        EXTRACTED GLSL &amp; SHADERS.PROPERTIES INSPECTOR
                      </span>
                    </div>
                    <select
                      aria-label="Select Shader Pack File"
                      value={currentFileKey}
                      onChange={(e) => setSelectedGlslFileKey(e.target.value)}
                      className="bg-[#1b1f27] border border-[#3c424f] text-xs font-mono px-2 py-1 text-[#f4f1ea]"
                    >
                      {rawFileKeys.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                  <pre className="p-2.5 bg-[#0b0d10] border border-[#252932] text-[11px] font-mono text-[#cbd5e1] max-h-44 overflow-auto whitespace-pre-wrap">
                    {activePack.rawFiles[currentFileKey] || '// Empty shader source'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
