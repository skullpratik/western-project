// src/components/Widgets/TextureWidget.jsx
import React, { useEffect, useState } from "react";

export function TextureWidget({ api, availableTextures = [] }) {
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedTexture, setSelectedTexture] = useState("");

  // Fetch all parts dynamically from the model
  useEffect(() => {
    if (api?.getAllNodeNames) {
      const nodeNames = api.getAllNodeNames();
      setParts(nodeNames);
      if (nodeNames.length > 0) setSelectedPart(nodeNames[0]);
    }
  }, [api]);

  const handleApplyTexture = () => {
    if (!selectedPart || !selectedTexture) return;
    if (api?.applyTexture) {
      api.applyTexture(selectedPart, selectedTexture);
    }
  };

  return (
    <div style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px", width: "250px" }}>
      <h3>Texture Selector</h3>

      <div style={{ marginBottom: "10px" }}>
        <label>Part: </label>
        <select
          value={selectedPart}
          onChange={(e) => setSelectedPart(e.target.value)}
          style={{ width: "100%" }}
        >
          {parts.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label>Texture: </label>
        <select
          value={selectedTexture}
          onChange={(e) => setSelectedTexture(e.target.value)}
          style={{ width: "100%" }}
        >
          {availableTextures.map((t) => (
            <option key={t.name} value={t.path}>{t.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleApplyTexture}
        style={{ width: "100%", padding: "8px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "4px" }}
      >
        Apply Texture
      </button>
    </div>
  );
}
