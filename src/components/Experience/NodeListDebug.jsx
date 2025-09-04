import React from "react";
import { Html } from "@react-three/drei";

// Simple development overlay that lists loaded scene node names
export function NodeListDebug({ allObjects }) {
  if (!allObjects || !allObjects.current) return null;
  const names = Object.keys(allObjects.current).slice(0, 200); // limit to 200

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, maxHeight: "50vh", overflow: "auto", background: "rgba(0,0,0,0.6)", color: "#fff", padding: 8, fontSize: 12, pointerEvents: 'auto' }}>
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>Loaded nodes ({names.length})</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {names.map((n) => (
            <li key={n} style={{ padding: "2px 0", whiteSpace: "nowrap" }}>{n}</li>
          ))}
        </ul>
      </div>
    </Html>
  );
}
