import React, { useState } from 'react';
import { BlockDefinition, DimensionId, GameMode } from '../engine/voxelEngine';
import {
  WeatherDisasterType,
  WEATHER2_DISASTERS,
  WEATHER2_DISASTER_LIST,
} from '../engine/weather2System';

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
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const activeBlock = getBlockDef(hotbarIds[selectedSlot]);
  const disasterMeta = WEATHER2_DISASTERS[weatherState];

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

      {/* Center Crosshair */}
      <div
        aria-hidden="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path
            d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      {/* Top Row: Left World & Weather2 Wind Telemetry · Center Jade HUD · Right Action Buttons */}
      <div className="w-full flex items-start justify-between gap-4">
        {/* Top-Left Compact World Coordinates, Wind Vector & 3D Cloud Density */}
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
            <span>Weather2: {disasterMeta.jpLabel}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              Wind {Math.round(windTelemetry.speed)}m/s ({windTelemetry.compassDeg}°)
            </span>
          </div>
          <div className="text-slate-300">
            <span>3D Cloud Density: {windTelemetry.cloudDensityPct}%</span>
            {tornadoDistance !== null && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="text-rose-300">Vortex {Math.round(tornadoDistance)}m</span>
              </>
            )}
          </div>
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

        {/* Top-Right Compact Square Utility Icon Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Inventory and JEI [E]"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenInventory();
            }}
            className="mc-btn px-3 py-2 text-xs font-pixel"
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
            className="mc-btn px-3 py-2 text-xs font-pixel"
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
            className={`mc-btn px-3 py-2 text-xs font-pixel ${axiomMode ? 'mc-btn-primary' : ''}`}
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
            className="mc-btn px-3 py-2 text-xs font-pixel"
          >
            Pause [P]
          </button>
        </div>
      </div>

      {/* Bottom Area: Toast Notification + Survival Bars + 9-Slot Hotbar + Collapsible Builder Dock */}
      <div className="w-full flex flex-col items-center gap-2">
        {lastToast && (
          <div className="mc-panel px-4 py-1.5 text-xs font-mono-tabular text-amber-300">
            {lastToast}
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
                    {def.tntRadius ? `${def.id.replace('megatnt:tnt_', '').toUpperCase()}` : ''}
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
                  onQuickDetonateMegaTnt('megatnt:tnt_10x');
                }}
                className="mc-btn px-2.5 py-1 text-xs font-pixel text-amber-300"
              >
                Detonate TNT x10
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onQuickDetonateMegaTnt('megatnt:tnt_50x');
                }}
                className="mc-btn px-2.5 py-1 text-xs font-pixel text-purple-200"
              >
                Detonate TNT x50
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
                  Weather2:
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
