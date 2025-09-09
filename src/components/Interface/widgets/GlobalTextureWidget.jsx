import React, { useState } from "react";
import "../Interface.css";

export default function GlobalTextureWidget({ applyRequest, modelName, editableParts }) {
  // ✅ Predefined texture options (company-provided)
  const textures = [
    { name: "Default", url: "/textures/steel.jpg" },
    { name: "Steel", url: "/texture/steel.jpg" },
    { name: "Black Matte", url: "/textures/black-matte.jpg" },
    { name: "Wood Finish", url: "/textures/wood.jpg" },
  ];

  const [selected, setSelected] = useState(null);

  const handleApply = (textureUrl) => {
    setSelected(textureUrl);
    console.log("🌍 Applying global texture:", textureUrl, "on model:", modelName);

    applyRequest.current?.({
      type: "global",
      modelName,
      texture: textureUrl,
      exclude: editableParts, // ✅ don’t touch canopy / panels etc
    });
  };

  return (
    <div className="widget-container">
      <div className="widget-title">🌍 Global Texture</div>

      <div className="texture-grid">
        {textures.map((tex) => (
          <button
            key={tex.url}
            onClick={() => handleApply(tex.url)}
            className={`texture-option ${selected === tex.url ? 'selected' : ''}`}
          >
            <img
              src={tex.url}
              alt={tex.name}
              className="texture-preview"
            />
            <span className="texture-name">{tex.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
