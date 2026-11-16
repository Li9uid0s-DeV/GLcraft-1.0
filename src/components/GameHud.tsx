import React, { useState } from 'react';
import { BlockDefinition, DimensionId, GameMode } from '../engine/voxelEngine';
import {
  WeatherDisasterType,
  WEATHER2_DISASTERS,
  WEATHER2_DISASTER_LIST,
  PmStormCell,
} from '../engine/weather2System';
import { getTaczGunByNumericId } from '../engine/taczGunEngine';

export interface JadeTargetInfo {
  block: BlockDefinition;
  x: number;
  y: number;
  z: number;
  miningProgress: number; // 0..100
  entityName?: string;
  entityHp?: number;
  entityMaxHp?: number;
}

interface GameHudProps {
  jadeTarget: JadeTargetInfo | null;
  hotbarIds: number[];
  selectedSlot: number;
  onSelectSlot: (slotIdx: number) => void;
  getBlockDef: (numId: number) => BlockDefinition | undefined;
  playerPos: [number, number, number];
  biomeName: string;
  dimension: DimensionId;
  gameMode: GameMode;
  health: number;
  maxHealth: number;
  armor: number;
  hunger: number;
  xpLevel: number;
  weatherState: WeatherDisasterType;
  onSelectWeatherDisaster: (disaster: WeatherDisasterType) => void;
  windTelemetry: { speed: number; compassDeg: number; cloudDensityPct: number };
  tornadoDistance: number | null;
  axiomMode: boolean;
  axiomSymmetry: 'off' | 'x' | 'z';
  onToggleAxiom: () => void;
  onToggleSymmetry: () => void;
  onOpenInventory: () => void;
  onOpenCommand: () => void;
  onOpenPause: () => void;
  onQuickDetonateMegaTnt: (tierId: string) => void;
  onSwitchDimension: (dim: DimensionId) => void;
  worldEditPos1: [number, number, number] | null;
  worldEditPos2: [number, number, number] | null;
  oneBlockPhaseName: string | null;
  multiplayerStatus: string;
  underwater: boolean;
  blastFlashIntensity: number;
  enhancedVisuals: boolean;
  lastToast: string | null;
  activeShaderPackName?: string;
  onOpenShadersAndMods?: () => void;
  onOpenSodiumSettings?: () => void;
  // TaCZ Firearms & Do a Barrel Roll Flight HUD props
  taczAmmo?: number;
  taczMaxAmmo?: number;
  taczReloading?: boolean;
  taczAdsActive?: boolean;
  onTaczFire?: () => void;
  onTaczReload?: () => void;
  barrelRollEnabled?: boolean;
  barrelRollAngleDeg?: number;
  pitchAngleDeg?: number;
  onToggleBarrelRollFlight?: () => void;
  onTrigger360BarrelRoll?: () => void;
  onReplayChunkFadeIn?: () => void;
  // §2-§7: 3rd-Person Camera [F5], Day/Night [N], Hostile Mobs, PMWeather Radar & Distant Horizons 3.3.4 LOD
  thirdPersonView?: boolean;
  onToggleThirdPersonView?: () => void;
  isDaytime?: boolean;
  onToggleDayNight?: () => void;
  activeMobCount?: number;
  onSpawnHostileWave?: () => void;
  pmStormCells?: PmStormCell[];
  tornadoEfLabel?: string | null;
  distantHorizonsEnabled?: boolean;
  distantHorizonsLodChunks?: number;
}

export const GameHud: React.FC<GameHudProps> = ({
  jadeTarget,
  hotbarIds,
  selectedSlot,
  onSelectSlot,
  getBlockDef,
  playerPos,
  biomeName,
  dimension,
  gameMode,
  health,
  maxHealth,
  hunger,
  xpLevel,
  weatherState,
  onSelectWeatherDisaster,
  windTelemetry,
  tornadoDistance,
  axiomMode,
  axiomSymmetry,
  onToggleAxiom,
  onToggleSymmetry,
  onOpenInventory,
  onOpenCommand,
  onOpenPause,
  onQuickDetonateMegaTnt,
  onSwitchDimension,
  worldEditPos1,
  worldEditPos2,
  oneBlockPhaseName,
  multiplayerStatus,
  underwater,
  blastFlashIntensity,
  enhancedVisuals,
  lastToast,
  activeShaderPackName,
  onOpenShadersAndMods,
  onOpenSodiumSettings,
  taczAmmo = 30,
  taczMaxAmmo = 30,
  taczReloading = false,
  taczAdsActive = false,
  onTaczFire,
  onTaczReload,
  barrelRollEnabled = false,
  barrelRollAngleDeg = 0,
  pitchAngleDeg = 0,
  onToggleBarrelRollFlight,
  onTrigger360BarrelRoll,
  onReplayChunkFadeIn,
  thirdPersonView = false,
  onToggleThirdPersonView,
  isDaytime = true,
  onToggleDayNight,
  activeMobCount = 0,
  onSpawnHostileWave,
  pmStormCells = [],
  tornadoEfLabel = null,
  distantHorizonsEnabled = true,
  distantHorizonsLodChunks = 0,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const activeBlock = getBlockDef(hotbarIds[selectedSlot]);
  const activeTaczGun = activeBlock ? getTaczGunByNumericId(activeBlock.numericId) : undefined;
  const disasterMeta = WEATHER2_DISASTERS[weatherState];
  const primaryCell = pmStormCells[0];

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4">
      {/* Enhanced Visuals Overlays (Underwater tint, Sandstorm haze, Low-HP vignette, TNT Blast Flash) */}
      {enhancedVisuals && underwater && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16,85,165,0.22) 40%, rgba(8,42,96,0.58) 100%)',
          }}
        />
      )}
      {enhancedVisuals && weatherState === 'sandstorm' && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(194,132,58,0.18) 30%, rgba(145,88,28,0.48) 100%)',
          }}
        />
      )}
      {enhancedVisuals && health <= 6 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px 28px rgba(185, 16, 16, 0.55)',
          }}
        />
      )}
      {enhancedVisuals && blastFlashIntensity > 0.02 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundColor: `rgba(255, 242, 210, ${Math.min(0.75, blastFlashIntensity)})`,
          }}
        />
      )}

      {/* Center Crosshair / TaCZ Holographic & Sniper Scope ADS Reticle / Do a Barrel Roll Horizon */}
      <div
        aria-hidden="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
      >
        {activeTaczGun && taczAdsActive ? (
          activeTaczGun.defaultOptic === 'sniper_8x' ? (
            /* 8x Mil-Dot Sniper Scope Overlay */
            <div className="relative w-72 h-72 rounded-full border-4 border-black/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.68)] flex items-center justify-center">
              <div className="absolute inset-x-0 h-[1.5px] bg-emerald-400/80" />
              <div className="absolute inset-y-0 w-[1.5px] bg-emerald-400/80" />
              <div className="w-3 h-3 rounded-full border border-red-500 bg-red-500/40" />
            </div>
          ) : (
            /* EOTech Holographic Red Circle-Dot Sight Overlay */
            <div className="relative w-28 h-24 rounded-lg border-2 border-slate-700/80 bg-cyan-950/15 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-rose-500/90 flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              </div>
            </div>
          )
        ) : (
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path
              d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"
              fill={activeTaczGun ? '#f59e0b' : '#ffffff'}
              stroke="#111111"
              strokeWidth="1.2"
            />
          </svg>
        )}

        {/* Do a Barrel Roll Artificial Horizon Ladder when Flight Roll is Active */}
        {barrelRollEnabled && (
          <div
            className="absolute w-44 h-44 pointer-events-none flex items-center justify-center"
            style={{ transform: `rotate(${-barrelRollAngleDeg}deg)` }}
          >
            <div className="w-32 h-[2px] bg-sky-400/70 flex justify-between">
              <span className="w-3 h-2 border-t-2 border-l-2 border-sky-300" />
              <span className="w-3 h-2 border-t-2 border-r-2 border-sky-300" />
            </div>
          </div>
        )}
      </div>

      {/* Top Row: Left World & Sodium/Weather Telemetry · Center Jade HUD · Right Action Buttons */}
      <div className="w-full flex items-start justify-between gap-4">
        {/* Top-Left Compact World Coordinates, Sodium Stack, Weather & Shader Status */}
        <div className="mc-panel px-3 py-2 text-xs font-mono-tabular flex flex-col gap-0.5 pointer-events-auto">
          <div className="text-amber-300 font-pixel">
            XYZ: {Math.round(playerPos[0])} / {Math.round(playerPos[1])} / {Math.round(playerPos[2])}
          </div>
          <div className="text-slate-300">
            <span>{biomeName}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="text-emerald-300">{dimension.replace('minecraft:', '')}</span>
          </div>
          <div className="text-cyan-300">
            <span>Weather: {disasterMeta.jpLabel}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              Wind {Math.round(windTelemetry.speed)}m/s ({windTelemetry.compassDeg}°)
            </span>
          </div>
          <div className="text-emerald-300 text-[11px]">
            Sodium + Distant Horizons 3.3.4 ({distantHorizonsEnabled ? `${distantHorizonsLodChunks} LODs` : 'OFF'})
          </div>
          <div className="text-slate-300 text-[11px]">
            Time: {isDaytime ? 'Daylight (Zombie/Skeleton Burn)' : 'Night'} · Mobs: {activeMobCount}/24
          </div>
          {tornadoEfLabel && (
            <div className="text-rose-300 font-pixel text-[11px] bg-rose-950/70 px-1.5 py-0.5 border border-rose-500/60">
              {tornadoEfLabel}
            </div>
          )}
          {primaryCell && (
            <div className="text-amber-200 text-[11px] flex items-center gap-2">
              <span>
                WSR-88D: {primaryCell.dbzReflectivity} dBZ · CAPE {primaryCell.capeJkg} J/kg
              </span>
              {/* Compact WSR-88D Storm Cell Minimap Indicator (Green -> Yellow -> Red) */}
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-white/70"
                style={{
                  backgroundColor:
                    primaryCell.dbzReflectivity >= 60
                      ? '#ef4444'
                      : primaryCell.dbzReflectivity >= 42
                      ? '#eab308'
                      : '#22c55e',
                }}
                title={`Storm Cell Stage: ${primaryCell.stage}`}
              />
            </div>
          )}
          {barrelRollEnabled && (
            <div className="text-sky-300 font-pixel text-[11px]">
              Do a Barrel Roll: BANK {barrelRollAngleDeg >= 0 ? `+${barrelRollAngleDeg}` : barrelRollAngleDeg}° · PITCH {pitchAngleDeg}°
            </div>
          )}
          {activeShaderPackName && (
            <div className="text-amber-200 truncate max-w-[260px]">
              Shader: {activeShaderPackName}
            </div>
          )}
          {tornadoDistance !== null && (
            <div className="text-rose-300">Vortex Distance: {Math.round(tornadoDistance)}m</div>
          )}
          {oneBlockPhaseName && <div className="text-amber-200">{oneBlockPhaseName}</div>}
          {multiplayerStatus !== 'offline' && (
            <div className="text-emerald-400">Net: {multiplayerStatus}</div>
          )}
        </div>

        {/* Top-Center: Jade (Look-At Block / Entity Inspector HUD) */}
        {jadeTarget ? (
          <div
            aria-label="Jade Target Inspector"
            className="mc-panel px-4 py-2 min-w-[250px] max-w-sm flex items-center gap-3 pointer-events-auto"
          >
            <div
              className="w-9 h-9 shrink-0 border-2 border-black/80 shadow-inner"
              style={{ backgroundColor: jadeTarget.block.accentHex }}
            />
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-pixel text-white truncate">
                {jadeTarget.entityName ? jadeTarget.entityName : jadeTarget.block.name}
              </div>
              <div className="text-slate-300 font-mono-tabular truncate">
                {jadeTarget.entityName ? (
                  <span className="text-rose-400">
                    HP: {jadeTarget.entityHp}/{jadeTarget.entityMaxHp}
                  </span>
                ) : (
                  <>
                    <span>Tool: {jadeTarget.block.properTool}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>
                      [{jadeTarget.x}, {jadeTarget.y}, {jadeTarget.z}]
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-sky-300 italic truncate">
                {jadeTarget.block.modName}
                {jadeTarget.miningProgress > 0
                  ? ` · Mining ${Math.round(jadeTarget.miningProgress)}%`
                  : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className="mc-panel px-3 py-1.5 text-xs text-slate-400 font-mono-tabular">
            Jade HUD · Aim at any block within 7m
          </div>
        )}

        {/* Top-Right Compact Utility Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
          {onOpenSodiumSettings && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Open Sodium Video and Optimization Settings [O]"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenSodiumSettings();
              }}
              className="mc-btn px-2.5 py-2 text-xs font-pixel text-emerald-300"
            >
              Sodium [O]
            </button>
          )}
          {onOpenShadersAndMods && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Open Java Shaders and Mods Manager [K]"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenShadersAndMods();
              }}
              className="mc-btn px-2.5 py-2 text-xs font-pixel text-amber-300"
            >
              Shaders &amp; Mods [K]
            </button>
          )}
          {onToggleBarrelRollFlight && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle Do a Barrel Roll Flight [G]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleBarrelRollFlight();
              }}
              className={`mc-btn px-2.5 py-2 text-xs font-pixel ${
                barrelRollEnabled ? 'mc-btn-primary text-sky-200' : 'text-sky-300'
              }`}
            >
              Barrel Roll [G]
            </button>
          )}
          {onToggleThirdPersonView && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle 1st / 3rd Person Camera View [F5]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleThirdPersonView();
              }}
              className={`mc-btn px-2.5 py-2 text-xs font-pixel ${
                thirdPersonView ? 'mc-btn-primary text-amber-200' : 'text-slate-200'
              }`}
            >
              {thirdPersonView ? '3rd Person [F5]' : '1st Person [F5]'}
            </button>
          )}
          {onToggleDayNight && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle Day or Night [N]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleDayNight();
              }}
              className="mc-btn px-2.5 py-2 text-xs font-pixel text-yellow-200"
            >
              {isDaytime ? 'Sun: Day [N]' : 'Moon: Night [N]'}
            </button>
          )}
          {onSpawnHostileWave && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Spawn Hostile Mob Squad [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                onSpawnHostileWave();
              }}
              className="mc-btn px-2.5 py-2 text-xs font-pixel text-rose-300"
            >
              Spawn Mobs [M]
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Inventory and JEI [E]"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenInventory();
            }}
            className="mc-btn px-2.5 py-2 text-xs font-pixel"
          >
            Inv &amp; JEI [E]
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Command Console [/]"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenCommand();
            }}
            className="mc-btn px-2.5 py-2 text-xs font-pixel"
          >
            Cmd [/]
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle Axiom Build Mode [R]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAxiom();
            }}
            className={`mc-btn px-2.5 py-2 text-xs font-pixel ${axiomMode ? 'mc-btn-primary' : ''}`}
          >
            Axiom [R]
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenPause();
            }}
            className="mc-btn px-2.5 py-2 text-xs font-pixel"
          >
            Pause [P]
          </button>
        </div>
      </div>

      {/* Bottom Area: Toast + TaCZ Firearm HUD / Barrel Roll Controls + Survival Bars + 9-Slot Hotbar + Dock */}
      <div className="w-full flex flex-col items-center gap-2">
        {lastToast && (
          <div className="mc-panel px-4 py-1.5 text-xs font-mono-tabular text-amber-300">
            {lastToast}
          </div>
        )}

        {/* TaCZ Active Firearm Tactical Ballistics Bar */}
        {activeTaczGun && (
          <div
            aria-label="TaCZ Tactical Firearm HUD"
            className="mc-panel px-4 py-1.5 flex items-center gap-4 text-xs pointer-events-auto border border-amber-400/70"
          >
            <span className="font-pixel text-amber-300">{activeTaczGun.name}</span>
            <span className="font-mono-tabular text-emerald-300 font-bold">
              {taczReloading ? 'RELOADING...' : `AMMO: ${taczAmmo} / ${taczMaxAmmo}`}
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              {activeTaczGun.caliber} · {activeTaczGun.fireMode}
            </span>
            {onTaczFire && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTaczFire();
                }}
                className="mc-btn px-2.5 py-0.5 text-[11px] font-pixel text-amber-300"
              >
                FIRE [L-Click]
              </button>
            )}
            {onTaczReload && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTaczReload();
                }}
                className="mc-btn px-2.5 py-0.5 text-[11px] font-pixel text-cyan-300"
              >
                Reload [T]
              </button>
            )}
          </div>
        )}

        {/* Do a Barrel Roll Quick Maneuver Bar when Flight is Enabled */}
        {barrelRollEnabled && onTrigger360BarrelRoll && (
          <div className="mc-panel px-3 py-1 flex items-center gap-3 text-xs pointer-events-auto border border-sky-400/70">
            <span className="font-pixel text-sky-300">
              Do a Barrel Roll Flight Active (Roll: {barrelRollAngleDeg}°)
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTrigger360BarrelRoll();
              }}
              className="mc-btn px-2.5 py-0.5 text-[11px] font-pixel text-sky-200"
            >
              360° Barrel Roll! [Z / X]
            </button>
          </div>
        )}

        {/* Active Item Name & Role Clue */}
        {activeBlock && (
          <div className="text-xs font-pixel text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
            {activeBlock.name}{' '}
            <span className="text-amber-300 font-sans font-normal">
              · {activeBlock.modName}
              {activeBlock.tntRadius ? ` (Blast R=${activeBlock.tntRadius})` : ''}
            </span>
          </div>
        )}

        {/* Survival Vitality Hearts, Armor & Hunger Pips */}
        {gameMode === 'survival' && (
          <div className="flex items-center justify-between w-full max-w-[420px] px-1">
            {/* 10 Discrete SVG Hearts */}
            <div className="flex items-center gap-0.5" aria-label={`Health ${health} of ${maxHealth}`}>
              {Array.from({ length: 10 }).map((_, i) => {
                const heartHp = health - i * 2;
                const fill = heartHp >= 2 ? '#ef4444' : heartHp === 1 ? '#f97316' : '#27272a';
                return (
                  <svg key={i} viewBox="0 0 16 16" className="w-4 h-4">
                    <path
                      d="M8 14s-6-3.8-6-8.2C2 3.4 3.8 2 5.6 2c1.2 0 2 .6 2.4 1.4C8.4 2.6 9.2 2 10.4 2 12.2 2 14 3.4 14 5.8 14 10.2 8 14 8 14z"
                      fill={fill}
                      stroke="#09090b"
                      strokeWidth="1.4"
                    />
                  </svg>
                );
              })}
            </div>

            <div className="text-xs font-pixel text-lime-400">LVL {xpLevel}</div>

            {/* 10 Hunger Drumsticks */}
            <div className="flex items-center gap-0.5" aria-label={`Hunger ${hunger} of 20`}>
              {Array.from({ length: 10 }).map((_, i) => {
                const full = hunger >= (i + 1) * 2;
                return (
                  <svg key={i} viewBox="0 0 16 16" className="w-4 h-4">
                    <circle
                      cx="8"
                      cy="8"
                      r="5"
                      fill={full ? '#d97706' : '#27272a'}
                      stroke="#09090b"
                      strokeWidth="1.4"
                    />
                  </svg>
                );
              })}
            </div>
          </div>
        )}

        {/* 9-Slot Hotbar */}
        <div
          role="toolbar"
          aria-label="Hotbar Slots"
          className="mc-panel p-1.5 flex items-center gap-1.5 pointer-events-auto"
        >
          {hotbarIds.map((id, idx) => {
            const def = getBlockDef(id);
            const active = selectedSlot === idx;
            const gunSpec = def ? getTaczGunByNumericId(def.numericId) : undefined;
            return (
              <button
                key={idx}
                type="button"
                tabIndex={-1}
                aria-label={`Hotbar Slot ${idx + 1}: ${def?.name || 'Empty'}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectSlot(idx);
                }}
                className={`w-12 h-12 relative flex flex-col items-center justify-center cursor-pointer ${
                  active ? 'mc-slot-active' : 'mc-slot'
                }`}
              >
                <span className="absolute top-0.5 left-1 text-[10px] font-mono-tabular text-slate-300">
                  {idx + 1}
                </span>
                {def && def.numericId !== 0 && (
                  <div
                    className="w-6 h-6 border border-black/80 shadow-sm flex items-center justify-center text-[9px] font-pixel text-white"
                    style={{ backgroundColor: def.accentHex }}
                  >
                    {gunSpec
                      ? 'GUN'
                      : def.id === 'do_a_barrel_roll:flight_thruster'
                      ? 'FLY'
                      : def.tntRadius
                      ? `${def.id.replace('megatnt:tnt_', '').toUpperCase()}`
                      : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Unified Collapsible Bottom Builder / Mod Action Dock */}
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setDockCollapsed((c) => !c);
            }}
            className="mc-btn px-3 py-0.5 text-[11px] font-pixel mb-1"
          >
            {dockCollapsed ? '▴ Show Mod & Dimension Dock' : '▾ Hide Mod & Dimension Dock'}
          </button>

          {!dockCollapsed && (
            <div className="mc-panel px-3 py-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              {onReplayChunkFadeIn && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onReplayChunkFadeIn();
                  }}
                  className="mc-btn px-2.5 py-1 text-xs font-pixel text-emerald-300"
                >
                  Chunk Fade-In
                </button>
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onQuickDetonateMegaTnt('megatnt:tnt_5x');
                }}
                className="mc-btn px-2.5 py-1 text-xs font-pixel text-amber-200"
              >
                Detonate TNT x5
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onQuickDetonateMegaTnt('megatnt:tnt_100x');
                }}
                className="mc-btn px-2.5 py-1 text-xs font-pixel text-cyan-200"
              >
                Detonate TNT x100
              </button>

              <span className="text-slate-500" aria-hidden="true">|</span>

              <label className="flex items-center gap-1.5">
                <span className="font-pixel text-[11px] text-cyan-300 whitespace-nowrap">
                  Weather:
                </span>
                <select
                  aria-label="Select Weather2 Disaster"
                  value={weatherState}
                  onChange={(e) => {
                    onSelectWeatherDisaster(e.target.value as WeatherDisasterType);
                    e.currentTarget.blur();
                  }}
                  className="mc-slot px-2 py-1 text-xs text-white font-pixel focus:outline-none"
                >
                  {WEATHER2_DISASTER_LIST.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.jpLabel} ({d.label})
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleSymmetry();
                }}
                className="mc-btn px-2.5 py-1 text-xs font-pixel whitespace-nowrap shrink-0"
              >
                Axiom Mirror: {axiomSymmetry.toUpperCase()}
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const nextDim: DimensionId =
                    dimension === 'minecraft:overworld'
                      ? 'minecraft:the_nether'
                      : dimension === 'minecraft:the_nether'
                      ? 'minecraft:the_end'
                      : 'minecraft:overworld';
                  onSwitchDimension(nextDim);
                }}
                className="mc-btn px-2.5 py-1 text-xs font-pixel text-emerald-200 whitespace-nowrap shrink-0"
              >
                Portal: {dimension.replace('minecraft:', '')}
              </button>

              {(worldEditPos1 || worldEditPos2) && (
                <span className="font-mono-tabular text-[11px] text-amber-300">
                  WE Pos1:{worldEditPos1 ? `[${worldEditPos1.join(',')}]` : '-'} Pos2:
                  {worldEditPos2 ? `[${worldEditPos2.join(',')}]` : '-'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
