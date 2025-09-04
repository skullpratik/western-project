import React from "react";

export function DoorControls({ parts, onToggle }) {
  if (!parts) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Object.keys(parts).map((name) => (
        <button key={name} onClick={() => onToggle(name, 'door')}>
          Toggle {name}
        </button>
      ))}
    </div>
  );
}
