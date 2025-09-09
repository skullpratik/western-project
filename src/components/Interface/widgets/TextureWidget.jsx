// src/components/widgets/TextureWidget.jsx
import React, { useState } from "react";
import "../Interface.css";

export const TextureWidget = ({ config, applyRequest }) => {
  const widget = config?.uiWidgets?.find((w) => w.type === "textureWidget");
  if (!widget || !widget.options) {
    return (
      <div className="widget-container">
        <div className="widget-title">🎨 Texture Widget</div>
        <p style={{ textAlign: "center", color: "#6c757d", fontStyle: "italic" }}>
          No texture options available for this model.
        </p>
      </div>
    );
  }

  const { parts = [], textures = [] } = widget.options;

  const [selectedPart, setSelectedPart] = useState(parts[0]?.name || "");
  const [selectedTexture, setSelectedTexture] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  // Handle texture upload
  const handleTextureUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setSelectedTexture(""); // reset predefined selection
    }
  };

  // Send request to Experience
  const handleApply = () => {
    if (!selectedPart) return alert("Select a part first!");

    const partConfig = parts.find((p) => p.name === selectedPart);
    if (!partConfig) return;

    // Get the texture source (either uploaded file or predefined texture path)
    let textureSource = null;
    if (uploadedFile) {
      textureSource = uploadedFile;
    } else if (selectedTexture) {
      textureSource = selectedTexture;
    } else {
      return alert("Select or upload a texture first!");
    }

    // Send the texture source and mapping config to Experience
    if (applyRequest?.current && typeof applyRequest.current === "function") {
      applyRequest.current(selectedPart, textureSource, partConfig.mapping);
      console.log(`✅ Texture request sent for ${selectedPart}`);
    } else {
      console.warn("⚠️ applyRequest ref not provided from App.jsx");
    }
  };

  return (
    <div className="widget-container">
      <div className="widget-title">{widget.title || "🎨 Texture Widget"}</div>

      {/* Part Selector */}
      <div className="form-group">
        <label className="form-label">Select Part</label>
        <select 
          className="interface-select"
          value={selectedPart}
          onChange={(e) => setSelectedPart(e.target.value)}
        >
          <option value="" disabled>Select Part</option>
          {parts.map((part) => (
            <option key={part.name} value={part.name}>
              {part.name}
            </option>
          ))}
        </select>
      </div>

      {/* Texture Selector */}
      <div className="form-group">
        <label className="form-label">Select Texture</label>
        <select 
          className="interface-select"
          value={selectedTexture}
          onChange={(e) => {
            setSelectedTexture(e.target.value);
            setUploadedFile(null);
          }}
        >
          <option value="" disabled>Select Texture</option>
          {textures.map((tex) => (
            <option key={tex.path} value={tex.path}>
              {tex.name}
            </option>
          ))}
        </select>
      </div>

      {/* Upload custom texture */}
      <div className="form-group">
        <label className="form-label">Upload Custom Texture</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleTextureUpload}
          className="form-file-input"
        />
      </div>

      {/* Apply button */}
      <button
        className="interface-button btn-full-width"
        onClick={handleApply}
      >
        Apply Texture
      </button>
    </div>
  );
};

export default TextureWidget;