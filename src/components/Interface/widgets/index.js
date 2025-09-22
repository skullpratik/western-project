import { DoorPresetWidget } from "./DoorPresetWidget";
import { ResetWidget } from "./ResetWidget";
import { TextureWidget } from "../TextureWidget";
import { DoorControls } from "../controls/DoorControls";
import { LightWidget } from "../LightWidget";
import { PresetWidget } from './PresetWidget';

function DoorToggles({ config, api }) {
  // Build a parts map similar to Interface so DoorControls can render
  const partsMap = { };
  (config.interactionGroups || []).forEach((g) => {
    if (!Array.isArray(g.parts)) return;
    if (String(g.type || '').toLowerCase().includes('door')) {
      g.parts.forEach((p) => {
        partsMap[p.name] = p;
      });
    }
  });
  if (Object.keys(partsMap).length === 0) return null;
  return <DoorControls parts={partsMap} onToggle={(name, type) => api?.togglePart?.(name, type)} />;
}

function DrawerToggles({ config, api }) {
  const drawers = (config.interactionGroups || []).find(g => String(g.type || '').toLowerCase().includes('drawer'))?.parts || [];
  if (!drawers.length) return null;
  return (
    <div style={{ background: '#fff', padding: 8, borderRadius: 6, marginBottom: 8 }}>
      <div style={{ marginBottom: 6 }}>Drawers</div>
      {drawers.map((d) => (
        <button key={d.name} onClick={() => api?.togglePart?.(d.name, 'drawer')}>Toggle {d.name}</button>
      ))}
    </div>
  );
}

// Registry mapping widget type keys (used in modelsConfig) to React components.
export const widgetRegistry = {
  doorPresets: DoorPresetWidget,
  doorPresetWidget: DoorPresetWidget,
  resetWidget: ResetWidget,
  doorToggles: DoorToggles,
  drawerToggles: DrawerToggles,
  texture: TextureWidget,
  lightWidget: LightWidget,
  presets: PresetWidget,
  presetWidget: PresetWidget,
};
// default export intentionally removed; import via named export `widgetRegistry` or via index.jsx re-export
