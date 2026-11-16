import React, { useState } from 'react';
import {
  BlockDefinition,
  CRAFTING_RECIPES_26_3,
  CraftingRecipe,
  filterCommandAutocomplete,
  RenderMode,
} from '../engine/voxelEngine';
import { EngineSettings } from './TitleScreen';
import { TEXTURE_RESOLUTIONS, TextureResolution } from '../engine/textures';

interface InventoryJeiModalProps {
  allBlocks: BlockDefinition[];
  hotbarIds: number[];
  selectedSlot: number;
  onAssignHotbarSlot: (slotIdx: number, blockNumId: number) => void;
  onClose: () => void;
}

export const InventoryJeiModal: React.FC<InventoryJeiModalProps> = ({
  allBlocks,
  hotbarIds,
  selectedSlot,
  onAssignHotbarSlot,
  onClose,
}) => {
  const [jeiSearch, setJeiSearch] = useState('');
  const [guiStation, setGuiStation] = useState<
    'inventory' | 'crafting_table' | 'furnace' | 'enchanting' | 'anvil' | 'brewing'
  >('inventory');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(
    CRAFTING_RECIPES_26_3[3]
  );

  const filteredItems = allBlocks.filter(
    (b) =>
      b.numericId !== 0 &&
      (b.name.toLowerCase().includes(jeiSearch.toLowerCase()) ||
        b.id.toLowerCase().includes(jeiSearch.toLowerCase()) ||
        b.modName.toLowerCase().includes(jeiSearch.toLowerCase()))
  );

  return (
    <div
      role="dialog"
      aria-label="Inventory, Crafting Stations and JEI Item Browser"
      className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="mc-panel w-full max-w-5xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[90vh] overflow-y-auto">
        {/* Left 7 Columns: Inventory, Armor, Station Switcher & Recipe Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-2">
            <h2 className="font-pixel text-sm sm:text-base text-amber-300 truncate">
              Survival Inventory &amp; 26.3 Crafting Stations
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="mc-btn px-3 py-1 text-xs font-pixel whitespace-nowrap shrink-0"
            >
              Close [Esc]
            </button>
          </div>

          {/* Station Tabs: 2x2 Inventory, 3x3 Crafting Table, Furnace, Enchanting, Anvil, Brewing */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'inventory' as const, label: '2x2 Inventory' },
              { id: 'crafting_table' as const, label: '3x3 Crafting' },
              { id: 'furnace' as const, label: 'Furnace' },
              { id: 'enchanting' as const, label: 'Enchanting' },
              { id: 'anvil' as const, label: 'Anvil' },
              { id: 'brewing' as const, label: 'Brewing Stand' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setGuiStation(st.id)}
                className={`mc-btn px-2.5 py-1 text-xs font-pixel ${
                  guiStation === st.id ? 'mc-btn-primary' : ''
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Crafting / Station Panel */}
          <div className="p-4 bg-slate-900/90 border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-pixel text-emerald-300">
                {selectedRecipe ? selectedRecipe.id : 'Select a recipe below'}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, idx) => {
                  const row = Math.floor(idx / 3);
                  const col = idx % 3;
                  const symbol = selectedRecipe?.pattern[row]?.[col] || ' ';
                  const ingId = symbol !== ' ' ? selectedRecipe?.key[symbol] : undefined;
                  const ingBlock = allBlocks.find((b) => b.id === ingId);
                  return (
                    <div
                      key={idx}
                      className="mc-slot w-11 h-11 flex items-center justify-center text-[10px] font-mono-tabular"
                      title={ingBlock?.name || 'Empty'}
                    >
                      {ingBlock && (
                        <div
                          className="w-6 h-6 border border-black"
                          style={{ backgroundColor: ingBlock.accentHex }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="font-pixel text-xl text-amber-300">→</div>

            {selectedRecipe && (
              <div className="flex flex-col items-center gap-2">
                {(() => {
                  const outBlock = allBlocks.find((b) => b.id === selectedRecipe.resultId);
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (outBlock) onAssignHotbarSlot(selectedSlot, outBlock.numericId);
                        }}
                        className="mc-slot-active w-14 h-14 flex items-center justify-center cursor-pointer"
                      >
                        <div
                          className="w-8 h-8 border border-black"
                          style={{ backgroundColor: outBlock?.accentHex || '#fff' }}
                        />
                      </button>
                      <span className="text-xs font-pixel text-white">
                        {outBlock?.name} x{selectedRecipe.resultCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (outBlock) onAssignHotbarSlot(selectedSlot, outBlock.numericId);
                        }}
                        className="mc-btn mc-btn-primary px-3 py-1 text-xs font-pixel"
                      >
                        Craft to Slot #{selectedSlot + 1}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Recipe List */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-1.5">
              26.3 Wilderness Bound &amp; Mega TNT Pack Recipes (Click to inspect)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CRAFTING_RECIPES_26_3.map((rec) => {
                const resBlock = allBlocks.find((b) => b.id === rec.resultId);
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedRecipe(rec)}
                    className={`p-2 text-left border text-xs cursor-pointer ${
                      selectedRecipe?.id === rec.id
                        ? 'bg-emerald-950/90 border-amber-400 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="font-pixel text-[11px] truncate text-amber-300">
                      {resBlock?.name || rec.resultId}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{rec.modName}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Hotbar Assignment Preview */}
          <div>
            <div className="text-xs text-slate-300 mb-1.5">
              Active Hotbar (Click a slot below, then click any item in JEI on the right to equip)
            </div>
            <div className="flex gap-1.5">
              {hotbarIds.map((id, idx) => {
                const def = allBlocks.find((b) => b.numericId === id);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAssignHotbarSlot(idx, id)}
                    className={`w-11 h-11 flex items-center justify-center ${
                      selectedSlot === idx ? 'mc-slot-active' : 'mc-slot'
                    }`}
                  >
                    {def && def.numericId !== 0 && (
                      <div
                        className="w-6 h-6 border border-black"
                        style={{ backgroundColor: def.accentHex }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: JEI (Just Enough Items) Searchable Grid */}
        <div className="lg:col-span-5 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-700 pt-4 lg:pt-0 lg:pl-4">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-sm text-amber-300">
              JEI · Just Enough Items ({filteredItems.length})
            </span>
            <span className="text-[11px] text-slate-400">Click item → Equip</span>
          </div>

          <input
            type="text"
            aria-label="Search JEI Items"
            value={jeiSearch}
            onChange={(e) => setJeiSearch(e.target.value)}
            placeholder="Search blocks, @megatnt, poplar, cushion..."
            className="mc-slot px-3 py-2 text-xs text-white focus:outline-none"
          />

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onAssignHotbarSlot(selectedSlot, item.numericId);
                  const matchingRec = CRAFTING_RECIPES_26_3.find((r) => r.resultId === item.id);
                  if (matchingRec) setSelectedRecipe(matchingRec);
                }}
                title={`${item.name} (${item.id})\nMod: ${item.modName}`}
                className="mc-slot p-2 flex flex-col items-center gap-1 hover:border-amber-400 cursor-pointer"
              >
                <div
                  className="w-7 h-7 border border-black flex items-center justify-center text-[9px] font-pixel text-white"
                  style={{ backgroundColor: item.accentHex }}
                >
                  {item.tntRadius ? `${item.tntRadius}R` : ''}
                </div>
                <span className="text-[10px] text-slate-200 truncate w-full text-center">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CommandConsoleModalProps {
  blockIds: string[];
  commandLog: string[];
  onExecuteCommand: (cmd: string) => void;
  onClose: () => void;
}

export const CommandConsoleModal: React.FC<CommandConsoleModalProps> = ({
  blockIds,
  commandLog,
  onExecuteCommand,
  onClose,
}) => {
  const [input, setInput] = useState('/give @s megatnt:tnt_100x 1');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const suggestions = filterCommandAutocomplete(input, blockIds);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      setInput(suggestions[highlightIdx % suggestions.length]);
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        onExecuteCommand(input.trim());
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Command Console and Autocomplete"
      className="fixed inset-0 z-30 bg-black/65 flex flex-col justify-end p-6"
    >
      <div className="mc-panel w-full max-w-3xl mx-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-xs text-amber-300">
            26.3 Command Console &amp; WorldEdit (`Tab` to Autocomplete)
          </span>
          <button type="button" onClick={onClose} className="mc-btn px-2.5 py-1 text-xs font-pixel">
            Close [Esc]
          </button>
        </div>

        {/* Command Output History */}
        <div className="bg-slate-950/90 border border-slate-800 p-2.5 max-h-36 overflow-y-auto text-xs font-mono-tabular text-slate-300 flex flex-col gap-1">
          {commandLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* Real-time Autocomplete Popup */}
        {suggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="Command Autocomplete Candidates"
            className="bg-slate-900 border border-amber-400/70 divide-y divide-slate-800 max-h-40 overflow-y-auto"
          >
            {suggestions.map((sug, idx) => (
              <button
                key={sug}
                type="button"
                onClick={() => setInput(sug)}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono-tabular cursor-pointer ${
                  idx === highlightIdx % suggestions.length
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Command Input"
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHighlightIdx(0);
            }}
            onKeyDown={handleKeyDown}
            className="mc-slot flex-1 px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (input.trim()) onExecuteCommand(input.trim());
            }}
            className="mc-btn mc-btn-primary px-5 py-2 text-xs font-pixel"
          >
            Execute
          </button>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  settings: EngineSettings;
  setSettings: React.Dispatch<React.SetStateAction<EngineSettings>>;
  loadedChunks: number;
  blocksModified: number;
  onResume: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  settings,
  setSettings,
  loadedChunks,
  blocksModified,
  onResume,
  onReturnToTitle,
}) => {
  return (
    <div
      role="dialog"
      aria-label="Game Paused Menu"
      className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="mc-panel w-full max-w-lg p-6 flex flex-col gap-4">
        <h2 className="font-pixel text-lg text-center text-amber-300">Game Menu (Paused)</h2>

        {/* 3 Tabular Stat Tiles required by Game Shell specification */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono-tabular text-xs">
          <div className="p-2.5 bg-slate-900 border border-slate-700">
            <div className="text-slate-400 text-[10px] uppercase">Loaded Chunks</div>
            <div className="text-base font-bold text-emerald-300">{loadedChunks}</div>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-700">
            <div className="text-slate-400 text-[10px] uppercase">Blocks Edited</div>
            <div className="text-base font-bold text-amber-300">{blocksModified}</div>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-700">
            <div className="text-slate-400 text-[10px] uppercase">Shader Mode</div>
            <div className="text-base font-bold text-cyan-300">
              {settings.renderMode.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Live Video & Mod Quick Toggles */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-slate-300">Rendering Mode</span>
            <select
              aria-label="Pause Menu Rendering Mode"
              value={settings.renderMode}
              onChange={(e) =>
                setSettings((s) => ({ ...s, renderMode: e.target.value as RenderMode }))
              }
              className="mc-slot px-2.5 py-1.5 text-white"
            >
              <option value="normal">Normal</option>
              <option value="pbr">PBR</option>
              <option value="raytracing">GLSL Full Ray Tracing</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-300">Texture Pack (4x–4096x)</span>
            <select
              aria-label="Pause Menu Texture Resolution"
              value={settings.textureResolution}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  textureResolution: Number(e.target.value) as TextureResolution,
                }))
              }
              className="mc-slot px-2.5 py-1.5 text-white font-mono-tabular"
            >
              {TEXTURE_RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}x{r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSettings((s) => ({ ...s, physicsMod: !s.physicsMod }))}
            className={`mc-btn py-2 px-3 font-pixel ${settings.physicsMod ? 'mc-btn-primary' : ''}`}
          >
            Physics Mod: {settings.physicsMod ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setSettings((s) => ({ ...s, weather2Tornado: !s.weather2Tornado }))}
            className={`mc-btn py-2 px-3 font-pixel ${
              settings.weather2Tornado ? 'mc-btn-primary' : ''
            }`}
          >
            Weather2 Tornado: {settings.weather2Tornado ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-700">
          <button
            type="button"
            onClick={onResume}
            className="mc-btn mc-btn-primary w-full py-2.5 font-pixel text-sm"
          >
            Back to Game (Resume)
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="mc-btn w-full py-2.5 font-pixel text-xs"
          >
            Save &amp; Quit to Title (Free All Chunk RAM)
          </button>
        </div>
      </div>
    </div>
  );
};
