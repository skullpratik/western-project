import React, { useState } from "react";

export default function GlobalTextureWidget({ applyRequest, modelName, editableParts }) {
  const [textureFile, setTextureFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTextureFile(file);
      setPreview(URL.createObjectURL(file)); // show preview
    }
  };

  const handleApply = () => {
    if (!textureFile) return;

    console.log("🌍 Global texture request sent for", modelName);

    applyRequest.current?.({
      type: "global",
      modelName,
      texture: textureFile,
      exclude: editableParts, // parts that already have separate widgets
    });
  };

  return (
    <div style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>🌍 Global Texture</h3>

      {/* Upload field */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ marginBottom: "0.5rem" }}
      />

      {/* Show preview if file selected */}
      {preview && (
        <div style={{ marginBottom: "0.5rem" }}>
          <img
            src={preview}
            alt="Preview"
            style={{ width: "100%", maxHeight: "120px", objectFit: "contain", border: "1px solid #ddd" }}
          />
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={handleApply}
        style={{
          padding: "6px 12px",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Apply to Model
      </button>
    </div>
  );
}
