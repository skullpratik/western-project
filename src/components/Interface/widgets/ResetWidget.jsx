import React from "react";
import "../Interface.css";

export function ResetWidget({ config, api }) {
  const handleReset = () => {
    if (api?.resetToInitialState) {
      api.resetToInitialState();
    }
  };

  return (
    <div className="widget-container">
      <div className="widget-title">🔄 Reset Model</div>

      <div className="preset-controls">
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          Reset the model to its initial state - all doors, drawers, and panels will return to their default positions and visibility.
        </p>

        <button
          className="interface-button btn-full-width"
          onClick={handleReset}
          style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
        >
          🔄 Reset to Initial State
        </button>
      </div>
    </div>
  );
}