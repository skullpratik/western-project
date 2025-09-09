import React, { useState } from "react";
import "../Interface.css";

export function DoorPresetWidget({ config, api }) {
  const presets = config?.presets;
  const [doorCount, setDoorCount] = useState("");
  const [doorPosition, setDoorPosition] = useState("");
  const [doorType, setDoorType] = useState("solid");

  if (!presets) return null;

  return (
    <div className="widget-container">
      <div className="widget-title">🚪 Door Configuration</div>
      
      <div className="preset-controls">
        <div className="form-group">
          <label className="form-label">Number of Doors</label>
          <select 
            className="interface-select"
            value={doorCount} 
            onChange={(e) => setDoorCount(Number(e.target.value))}
          >
            <option value="">Select Count</option>
            <option value={1}>1 Door</option>
            <option value={2}>2 Doors</option>
            <option value={3}>3 Doors</option>
          </select>
        </div>

        {(doorCount === 1 || doorCount === 2) && (
          <div className="form-group">
            <label className="form-label">Door Position</label>
            <select 
              className="interface-select"
              value={doorPosition} 
              onChange={(e) => setDoorPosition(Number(e.target.value))}
            >
              <option value="">Select Position</option>
              {doorCount === 1 && (
                <>
                  <option value={1}>Left Side</option>
                  <option value={2}>Center</option>
                  <option value={3}>Right Side</option>
                </>
              )}
              {doorCount === 2 && (
                <>
                  <option value={1}>Left + Center</option>
                  <option value={2}>Left + Right</option>
                  <option value={3}>Center + Right</option>
                </>
              )}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Door Type</label>
          <select 
            className="interface-select"
            value={doorType} 
            onChange={(e) => setDoorType(e.target.value)}
          >
            <option value="solid">🚪 Solid Door</option>
            <option value="glass">🪟 Glass Door</option>
          </select>
        </div>

        <button 
          className="interface-button btn-full-width"
          onClick={() => {
            const pos = doorCount === 3 ? 1 : doorPosition;
            if (!doorCount || !pos) return;
            api?.applyDoorSelection?.(doorCount, pos, doorType);
          }}
          disabled={!doorCount || (doorCount !== 3 && !doorPosition)}
        >
          ✨ Apply Configuration
        </button>
      </div>
    </div>
  );
}
