// src/components/widgets/LightWidget.jsx
import React from 'react';
import "../Interface.css";
import { dlog } from '../../../utils/logger';

export const LightWidget = ({ config, api }) => {
  // Check both config.lights and config.metadata.lights - prioritize non-empty arrays
  const lights = (config.lights && config.lights.length > 0) ? config.lights : (config.metadata?.lights || []);
  const [lightsState, setLightsState] = React.useState({});

  // Enhanced debug logging
  React.useEffect(() => {
    dlog('💡 LightWidget Enhanced Debug:');
    dlog('  - FULL config object:', config);
    dlog('  - config.lights:', config.lights);
    dlog('  - config.metadata.lights:', config.metadata?.lights);
    dlog('  - MERGED lights result:', lights);
    dlog('  - lights.length:', lights.length);
    dlog('  - lights array type:', Array.isArray(lights));
    
    if (lights.length > 0) {
      dlog('  - ✅ LIGHTS FOUND!');
      lights.forEach((light, i) => {
        dlog(`  - Light ${i}:`, light);
      });
    } else {
      dlog('  - ❌ NO LIGHTS FOUND anywhere');
    }
  }, [JSON.stringify(config)]); // Watch entire config object changes

  // Initialize lights state - use JSON string to avoid infinite loops
  React.useEffect(() => {
    const initialState = {};
    lights.forEach(light => {
      initialState[light.name] = light.defaultState === "on";
    });
    setLightsState(initialState);
  }, [JSON.stringify(lights)]); // Use JSON.stringify to avoid infinite loops on array changes

  if (!lights || lights.length === 0) {
    return (
      <div className="widget-container">
        <div className="widget-title">💡 Lights Control</div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>⚠️ No lights configured for this model</p>
          <p style={{ fontSize: '12px' }}>
            Lights need to be configured in the model's database entry
          </p>
        </div>
      </div>
    );
  }

  const toggleLight = (lightName, newState) => {
    setLightsState(prev => ({
      ...prev,
      [lightName]: newState
    }));
    
    // Call the API to actually toggle the light
    if (api && api.toggleLight) {
      api.toggleLight(lightName, newState);
    }
  };

  const toggleAllLights = () => {
    const allOn = Object.values(lightsState).every(state => state);
    const newState = !allOn;
    
    const newLightsState = {};
    lights.forEach(light => {
      newLightsState[light.name] = newState;
    });
    
    setLightsState(newLightsState);
    
    // Toggle all lights
    if (api && api.toggleAllLights) {
      api.toggleAllLights(newState);
    }
  };

  const allOn = Object.values(lightsState).every(state => state);
  const anyOn = Object.values(lightsState).some(state => state);

  return (
    <div className="widget-container">
      <div className="widget-title">
        💡 Lights Control
      </div>
      
      {/* Master toggle */}
      <div style={{ marginBottom: '20px' }}>
        <button
          className={`interface-button ${anyOn ? 'btn-warning' : 'secondary'} btn-full-width`}
          onClick={toggleAllLights}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <span>{anyOn ? '💡' : '🔆'}</span>
          {allOn ? 'All Lights ON' : anyOn ? 'Some Lights ON' : 'All Lights OFF'}
        </button>
      </div>

      {/* Individual light controls */}
      {lights.map(light => (
        <div key={light.name} className="form-group">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: lightsState[light.name] ? 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: `2px solid ${lightsState[light.name] ? '#ffeaa7' : '#e2e8f0'}`,
            borderRadius: '16px',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{lightsState[light.name] ? '💡' : '🔘'}</span>
              <span className="form-label" style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{light.name}</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={lightsState[light.name] || false}
                onChange={(e) => toggleLight(light.name, e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(LightWidget);