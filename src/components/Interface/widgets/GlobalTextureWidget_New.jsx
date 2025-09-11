import React, { useState } from "react";
import "../Interface.css";

export default function GlobalTextureWidget({ applyRequest, modelName, editableParts }) {
  const [userTextures, setUserTextures] = useState([]);
  const [selected, setSelected] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    const newTexture = {
      name: file.name.split('.')[0],
      url: localUrl
    };
    
    setUserTextures(prev => [...prev, newTexture]);
  };

  const handleApply = (texture) => {
    setSelected(texture.url);
    applyRequest.current?.({
      type: "global",
      modelName,
      texture: texture.url,
      exclude: editableParts
    });
  };

  return (
    <div className="widget-container">
      <div className="widget-title">🌍 Global Texture</div>

      <div style={{ marginBottom: '15px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>

      {userTextures.length > 0 && (
        <div className="texture-grid">
          {userTextures.map((tex, index) => (
            <button
              key={index}
              onClick={() => handleApply(tex)}
              className={`texture-option ${selected === tex.url ? 'selected' : ''}`}
            >
              <img src={tex.url} alt={tex.name} className="texture-preview" />
              <span className="texture-name">{tex.name}</span>
            </button>
          ))}
        </div>
      )}

      {userTextures.length === 0 && (
        <p>Upload an image to use as global texture</p>
      )}
    </div>
  );
}
