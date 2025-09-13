import React, { useMemo, useState } from "react";
import "../Interface.css";

export function DoorPresetWidget({ config, api }) {
  const doorSelections = config?.presets?.doorSelections || {};

  // Derive available counts and positions from presets to reflect configurator
  const availableCounts = useMemo(
    () => Object.keys(doorSelections).map((k) => Number(k)).sort((a, b) => a - b),
    [doorSelections]
  );
  const [doorCount, setDoorCount] = useState(availableCounts[0] || "");
  const positionsForCount = useMemo(
    () => (doorCount ? Object.keys(doorSelections[String(doorCount)] || {}).map((k) => Number(k)).sort((a, b) => a - b) : []),
    [doorSelections, doorCount]
  );
  const [doorPosition, setDoorPosition] = useState(positionsForCount[0] || "");
  const [doorType, setDoorType] = useState("solid");

  // Keep selection valid when config changes
  React.useEffect(() => {
    if (!availableCounts.includes(doorCount)) {
      setDoorCount(availableCounts[0] || "");
    }
  }, [availableCounts]);
  React.useEffect(() => {
    if (!positionsForCount.includes(doorPosition)) {
      setDoorPosition(positionsForCount[0] || "");
    }
  }, [positionsForCount]);

  if (!Object.keys(doorSelections).length) return null;

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
            {availableCounts.map((c) => (
              <option key={c} value={c}>{c} {c === 1 ? 'Door' : 'Doors'}</option>
            ))}
          </select>
        </div>

        {positionsForCount.length > 0 && (
          <div className="form-group">
            <label className="form-label">Door Position</label>
            <select
              className="interface-select"
              value={doorPosition}
              onChange={(e) => setDoorPosition(Number(e.target.value))}
            >
              <option value="">Select Position</option>
              {positionsForCount.map((p) => (
                <option key={p} value={p}>Position {p}</option>
              ))}
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
            if (!doorCount || !doorPosition) return;
            api?.applyDoorSelection?.(doorCount, doorPosition, doorType);
          }}
          disabled={!doorCount || !doorPosition}
        >
          ✨ Apply Configuration
        </button>
      </div>
    </div>
  );
}
