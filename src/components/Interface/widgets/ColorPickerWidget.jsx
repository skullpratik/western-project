import React, { useState } from 'react';
import '../Interface.css';

// Simple color picker widget
export default function ColorPickerWidget({ config, applyRequest }) {
  const widget = config?.uiWidgets?.find((w) => w.type && w.type.toLowerCase().includes('color')) || {};
  const options = widget.options || {};
  const parts = options.parts || [];

  const [selectedPart, setSelectedPart] = useState(parts[0]?.name || '');
  const [color, setColor] = useState('#ffffff');
  const [persist, setPersist] = useState(false);

  const handleApply = async () => {
    if (!selectedPart) return alert('Select a target part or material first');

    // Determine whether the target is a material or object
    // If the part entry has `type: 'material'` then we use the special syntax '__material:Name'
    const partCfg = parts.find(p => p.name === selectedPart) || {};
    let target = selectedPart;
    if (partCfg.type === 'material' && partCfg.materialName) {
      target = `__material:${partCfg.materialName}`;
    }

    if (!target || typeof target !== 'string') {
      console.error('ColorPickerWidget: resolved invalid target', { selectedPart, partCfg, target });
      return alert('Invalid color target selected');
    }

    console.log('🎨 ColorPickerWidget: applying color', { target, color, persist });

    if (!applyRequest?.current) {
      console.warn('⚠️ applyRequest not available on props');
      return;
    }

    try {
      const res = applyRequest.current(target, null, { tintColor: color, persist });
      if (res && typeof res.then === 'function') {
        await res;
      }
      console.log('✅ Color apply invoked');
    } catch (err) {
      console.error('❌ Color apply failed:', err);
    }
  };

  if (!parts.length) {
    return (
      <div className="widget-container">
        <div className="widget-title">🎨 Color Picker</div>
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No color targets configured for this model.</p>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div className="widget-title">🎨 Color Picker</div>

      <div className="form-group">
        <label className="form-label">Target</label>
        <select className="interface-select" value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)}>
          <option value="" disabled>Select target</option>
          {parts.map(p => (
            <option key={p.name} value={p.name}>{p.label || p.name}{p.type === 'material' ? ' (material)' : ''}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '100%', height: '40px', border: 'none' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <input id="persistColor" type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
        <label htmlFor="persistColor" style={{ fontSize: '13px' }}>Persist on Save / immediate persist</label>
      </div>

      <button className="interface-button btn-full-width" onClick={handleApply}>Apply Color</button>
    </div>
  );
}
