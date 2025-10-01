import React from 'react';
import '../Interface.css';
import { dlog } from '../../../utils/logger';

export const PresetWidget = ({ config, applyRequest, api, userPermissions }) => {
  const allPresets = Array.isArray(config.presets) ? config.presets : [];
  const presetAccess = userPermissions?.presetAccess;
  const presets = Array.isArray(allPresets)
    ? allPresets.filter(p => {
        if (!presetAccess || Object.keys(presetAccess).length === 0) return true; // no per-preset restrictions
        if (!p || !p.id) return false;
        return !!presetAccess[p.id];
      })
    : [];

  if (!presets.length) {
    return (
      <div className="widget-container">
        <div className="widget-title">🎛 Presets</div>
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No presets available for this model.</p>
      </div>
    );
  }

  const handleApplyPreset = async (preset) => {
    if (!preset || !Array.isArray(preset.actions)) return;
    try {
      for (const action of preset.actions) {
        const part = action.part;
        if (!part) continue;

        if (action.texture) {
          if (applyRequest?.current) {
            await applyRequest.current(part, action.texture, action.mapping || {}, action.persist || false);
          } else if (api?.applyTexture) {
            await api.applyTexture(part, action.texture, action.mapping || {}, action.persist || false);
          }
        } else if (action.tintColor || action.color) {
          const color = action.tintColor || action.color;
          if (applyRequest?.current) {
            await applyRequest.current(part, null, { tintColor: color });
          } else if (api?.applyTexture) {
            await api.applyTexture(part, null, { tintColor: color });
          }
        }
      }
  dlog(`✅ Preset applied: ${preset.id || preset.label}`);
    } catch (err) {
      console.error('❌ Preset apply failed:', err);
    }
  };

  return (
    <div className="widget-container">
      <div className="widget-title">🎛 {config?.presetsTitle || 'Presets'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button key={p.id || p.label} className="interface-button" onClick={() => handleApplyPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(PresetWidget);
