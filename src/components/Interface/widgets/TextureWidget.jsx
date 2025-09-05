// src/components/widgets/TextureWidget.jsx
import React, { useState } from "react";
import { Button, MenuItem, Select, Typography } from "@mui/material";

export const TextureWidget = ({ config, applyRequest }) => {
  const widget = config?.uiWidgets?.find((w) => w.type === "textureWidget");
  if (!widget || !widget.options) {
    return <Typography>No texture options available for this model.</Typography>;
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
    <div style={{ padding: "10px" }}>
      <Typography variant="h6">{widget.title || "Texture Widget"}</Typography>

      {/* Part Selector */}
      <Select
        value={selectedPart}
        onChange={(e) => setSelectedPart(e.target.value)}
        displayEmpty
        fullWidth
        style={{ marginBottom: "10px" }}
      >
        <MenuItem disabled value="">
          Select Part
        </MenuItem>
        {parts.map((part) => (
          <MenuItem key={part.name} value={part.name}>
            {part.name}
          </MenuItem>
        ))}
      </Select>

      {/* Texture Selector */}
      <Select
        value={selectedTexture}
        onChange={(e) => {
          setSelectedTexture(e.target.value);
          setUploadedFile(null);
        }}
        displayEmpty
        fullWidth
        style={{ marginBottom: "10px" }}
      >
        <MenuItem disabled value="">
          Select Texture
        </MenuItem>
        {textures.map((tex) => (
          <MenuItem key={tex.path} value={tex.path}>
            {tex.name}
          </MenuItem>
        ))}
      </Select>

      {/* Upload custom texture */}
      <input
        type="file"
        accept="image/*"
        onChange={handleTextureUpload}
        style={{ marginBottom: "10px" }}
      />

      {/* Apply button */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleApply}
        fullWidth
      >
        Apply Texture
      </Button>
    </div>
  );
};

export default TextureWidget;