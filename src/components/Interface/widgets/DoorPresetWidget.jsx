import React, { useState } from "react";

export function DoorPresetWidget({ config, api }) {
  const presets = config?.presets;
  const [doorCount, setDoorCount] = useState("");
  const [doorPosition, setDoorPosition] = useState("");
  const [doorType, setDoorType] = useState("solid");

  if (!presets) return null;

  return (
    <div style={{ background: "#fff", padding: 8, borderRadius: 6, marginBottom: 8 }}>
      <div style={{ marginBottom: 6 }}>{"Door Presets"}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={doorCount} onChange={(e) => setDoorCount(Number(e.target.value))}>
          <option value="">Count</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>

        {(doorCount === 1 || doorCount === 2) && (
          <select value={doorPosition} onChange={(e) => setDoorPosition(Number(e.target.value))}>
            <option value="">Position</option>
            {doorCount === 1 && (
              <>
                <option value={1}>Left</option>
                <option value={2}>Center</option>
                <option value={3}>Right</option>
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
        )}

        <select value={doorType} onChange={(e) => setDoorType(e.target.value)}>
          <option value="solid">Solid</option>
          <option value="glass">Glass</option>
        </select>

        <button onClick={() => {
          const pos = doorCount === 3 ? 1 : doorPosition;
          if (!doorCount || !pos) return;
          api?.applyDoorSelection?.(doorCount, pos, doorType);
        }}>Apply</button>
      </div>
    </div>
  );
}
