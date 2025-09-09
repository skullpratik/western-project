import React from "react";
import "../Interface.css";

export function DoorControls({ parts, onToggle }) {
  if (!parts) return null;
  return (
    <div className="button-group">
      {Object.keys(parts).map((name) => (
        <button 
          key={name} 
          className="btn btn-secondary"
          onClick={() => onToggle(name, 'door')}
        >
          Toggle {name}
        </button>
      ))}
    </div>
  );
}
