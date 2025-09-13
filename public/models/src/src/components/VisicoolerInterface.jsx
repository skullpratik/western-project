import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Card,
  CardContent,
  Divider
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import PaletteIcon from "@mui/icons-material/Palette";
import ImageIcon from "@mui/icons-material/Image";

export const Interface = ({
  onLEDToggle,
  onCanopyColorChange,
  canopyColor,
  onBottomBorderColorChange,
  bottomBorderColor,
  onDoorColorChange,
  doorColor,
  onTopPanelColorChange,
  topPanelColor,
  onLouverColorChange,
  louverColor,
  onCanopyTextureUpload,
  onCanopyTextureReset,
  onSidePanel1TextureUpload,
  onSidePanel1TextureReset,
  onSidePanel2TextureUpload,
  onSidePanel2TextureReset,
  onLouverTextureUpload,     
  onLouverTextureReset,
  onColorShadingChange // Add this new prop
}) => {
  const [ledVisible, setLedVisible] = useState(false);
  const [louverMode, setLouverMode] = useState("color"); // "color" or "image"

  const [colorShading, setColorShading] = useState({
    canopy: 0,
    bottom: 0,
    door: 0,
    toppanel: 0,
    louver: 0
  });

  const [uploadingCanopy, setUploadingCanopy] = useState(false);
  const [canopyImage, setCanopyImage] = useState(null);

  const [uploadingSP1, setUploadingSP1] = useState(false);
  const [sidePanel1Image, setSidePanel1Image] = useState(null);

  const [uploadingSP2, setUploadingSP2] = useState(false);
  const [sidePanel2Image, setSidePanel2Image] = useState(null);

  const [uploadingLouver, setUploadingLouver] = useState(false);
  const [louverImage, setLouverImage] = useState(null);

  const canopyInputRef = useRef(null);
  const sp1InputRef = useRef(null);
  const sp2InputRef = useRef(null);
  const louverInputRef = useRef(null);

  const colorOptions = [
    { label: "No Color", value: null },
    { label: "Red", value: "#ff4c4c" },
    { label: "Blue", value: "#4c6eff" },
    { label: "Green", value: "#4cff88" },
    { label: "Orange", value: "#ffa500" },
    { label: "Black", value: "#333333" },
    { label: "White", value: "#ffffff" },
    { label: "Silver", value: "#c0c0c0" },
  ];

  const handleLED = (e) => {
    setLedVisible(e.target.checked);
    onLEDToggle?.(e.target.checked);
  };

  const handleColorChange = (type, value) => {
    switch (type) {
      case "canopy":
        onCanopyColorChange?.(value);
        break;
      case "bottom":
        onBottomBorderColorChange?.(value);
        break;
      case "door":
        onDoorColorChange?.(value);
        break;
      case "toppanel":
        onTopPanelColorChange?.(value);
        break;
      case "louver":
        onLouverColorChange?.(value);
        break;
      default:
        break;
    }
  };

   const handleShadingChange = (type, value) => {
    const newShading = { ...colorShading, [type]: value };
    setColorShading(newShading);
    onColorShadingChange?.(newShading);
  };

  const handleLouverModeChange = (event, newMode) => {
    if (newMode !== null) {
      setLouverMode(newMode);
      // Reset the other option when switching modes
      if (newMode === "color") {
        setLouverImage(null);
        if (louverInputRef.current) louverInputRef.current.value = "";
        onLouverTextureReset?.();
      } else {
        onLouverColorChange?.(null);
      }
    }
  };

  const readImage = (file, onDone, setUploading) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onDone(e.target.result);
      setUploading(false);
    };
    reader.onerror = () => {
      console.error("Error reading file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const renderColorSection = (title, selectedColor, type) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center' }}>
          <PaletteIcon sx={{ mr: 1, fontSize: 18 }} /> {title}
        </Typography>
        
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <Select
            value={selectedColor ?? ""}
            onChange={(e) => handleColorChange(type, e.target.value || null)}
            displayEmpty
            sx={{
              borderRadius: 1,
              backgroundColor: "#f7f9fc",
              fontSize: 14,
              "& .MuiSelect-select": { py: 1, px: 1.5 },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ddd" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#007bff" },
            }}
          >
            {colorOptions.map((c) => (
              <MenuItem key={c.label} value={c.value ?? ""}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      backgroundColor: c.value || "#ffffff",
                      border: c.value ? "1px solid #ccc" : "1px dashed #aaa",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Typography sx={{ fontSize: 13 }}>{c.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedColor && (
          <>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              Adjust Shading
            </Typography>
            <Slider
              value={colorShading[type]}
              onChange={(e, value) => handleShadingChange(type, value)}
              min={-100}
              max={100}
              sx={{ mb: 1 }}
              size="small"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Darker
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Lighter
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderUploadSection = (title, image, setImage, inputRef, uploading, setUploading, onUpload, onReset, accept = "image/*") => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center' }}>
          <ImageIcon sx={{ mr: 1, fontSize: 18 }} /> {title}
        </Typography>
        
        {image ? (
          <Box sx={{ position: "relative", mb: 1.5 }}>
            <Box
              component="img"
              src={image}
              sx={{ 
                width: "100%", 
                height: 120, 
                objectFit: "cover", 
                borderRadius: 1, 
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
              alt={title}
            />
            <IconButton
              size="small"
              onClick={() => {
                setImage(null);
                if (inputRef.current) inputRef.current.value = "";
                onReset?.();
              }}
              sx={{ 
                position: "absolute", 
                top: 6, 
                right: 6, 
                backgroundColor: "rgba(0,0,0,0.7)", 
                color: "white", 
                "&:hover": { backgroundColor: "rgba(0,0,0,0.9)" },
                width: 28,
                height: 28
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
            sx={{ 
              py: 1.5, 
              backgroundColor: "#f7f9fc", 
              border: "1px dashed #ccc", 
              "&:hover": { border: "1px dashed #007bff", backgroundColor: "#e3f2fd" },
              borderRadius: 1
            }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
        )}
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            readImage(file, (url) => {
              setImage(url);
              onUpload?.(url);
            }, setUploading);
            e.target.value = "";
          }}
          accept={accept}
          hidden
        />
        <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
          JPG, PNG, or GIF. Max 5MB.
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* LED Control */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <FormControlLabel
            control={
              <Switch
                checked={ledVisible}
                onChange={handleLED}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#007bff" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#007bff" },
                  "& .MuiSwitch-track": { borderRadius: 20 },
                }}
              />
            }
            label={<Typography sx={{ fontWeight: 600, fontSize: 14 }}>LED Lighting</Typography>}
          />
        </CardContent>
      </Card>

      {/* Canopy Upload */}
      {renderUploadSection(
        "Canopy Image", 
        canopyImage, 
        setCanopyImage, 
        canopyInputRef, 
        uploadingCanopy, 
        setUploadingCanopy, 
        onCanopyTextureUpload, 
        onCanopyTextureReset
      )}

      {/* Side Panel 1 Upload */}
      {renderUploadSection(
        "Side Panel 1", 
        sidePanel1Image, 
        setSidePanel1Image, 
        sp1InputRef, 
        uploadingSP1, 
        setUploadingSP1, 
        onSidePanel1TextureUpload, 
        onSidePanel1TextureReset
      )}

      {/* Side Panel 2 Upload */}
      {renderUploadSection(
        "Side Panel 2", 
        sidePanel2Image, 
        setSidePanel2Image, 
        sp2InputRef, 
        uploadingSP2, 
        setUploadingSP2, 
        onSidePanel2TextureUpload, 
        onSidePanel2TextureReset
      )}

      {/* Louver Customization */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Louver Customization
          </Typography>
          
          {/* Mode Selection */}
          <ToggleButtonGroup
            value={louverMode}
            exclusive
            onChange={handleLouverModeChange}
            aria-label="louver customization mode"
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="color" sx={{ py: 0.8, fontSize: 13 }}>
              Color
            </ToggleButton>
            <ToggleButton value="image" sx={{ py: 0.8, fontSize: 13 }}>
              Image
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Color or Image based on mode */}
          {louverMode === "color" ? (
            <>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <Select
                  value={louverColor ?? ""}
                  onChange={(e) => handleColorChange("louver", e.target.value || null)}
                  displayEmpty
                  sx={{
                    borderRadius: 1,
                    backgroundColor: "#f7f9fc",
                    fontSize: 14,
                    "& .MuiSelect-select": { py: 1, px: 1.5 },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ddd" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#007bff" },
                  }}
                >
                  {colorOptions.map((c) => (
                    <MenuItem key={c.label} value={c.value ?? ""}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: c.value || "#ffffff",
                            border: c.value ? "1px solid #ccc" : "1px dashed #aaa",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Typography sx={{ fontSize: 13 }}>{c.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {louverColor && (
                <>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                    Adjust Shading
                  </Typography>
                  <Slider
                    value={colorShading.louver}
                    onChange={(e, value) => handleShadingChange("louver", value)}
                    min={-100}
                    max={100}
                    sx={{ mb: 1 }}
                    size="small"
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Darker
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Lighter
                    </Typography>
                  </Box>
                </>
              )}
            </>
          ) : (
            <>
              {louverImage ? (
                <Box sx={{ position: "relative", mb: 1.5 }}>
                  <Box
                    component="img"
                    src={louverImage}
                    sx={{ 
                      width: "100%", 
                      height: 120, 
                      objectFit: "cover", 
                      borderRadius: 1, 
                      border: "1px solid #e0e0e0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                    alt="Louver texture"
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      setLouverImage(null);
                      if (louverInputRef.current) louverInputRef.current.value = "";
                      onLouverTextureReset?.();
                    }}
                    sx={{ 
                      position: "absolute", 
                      top: 6, 
                      right: 6, 
                      backgroundColor: "rgba(0,0,0,0.7)", 
                      color: "white", 
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.9)" },
                      width: 28,
                      height: 28
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={uploadingLouver ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                  sx={{ 
                    py: 1.5, 
                    backgroundColor: "#f7f9fc", 
                    border: "1px dashed #ccc", 
                    "&:hover": { border: "1px dashed #007bff", backgroundColor: "#e3f2fd" },
                    borderRadius: 1
                  }}
                  onClick={() => louverInputRef.current?.click()}
                  disabled={uploadingLouver}
                >
                  {uploadingLouver ? "Uploading..." : "Upload Louver Image"}
                </Button>
              )}
              <input
                type="file"
                ref={louverInputRef}
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  readImage(file, (url) => {
                    setLouverImage(url);
                    onLouverTextureUpload?.(url);
                  }, setUploadingLouver);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 1 }} />

      {/* Color Sections */}
      {renderColorSection("Canopy Border Color", canopyColor, "canopy")}
      {renderColorSection("Bottom Border Color", bottomBorderColor, "bottom")}
      {renderColorSection("Door Color", doorColor, "door")}
      {renderColorSection("Top Panel Color", topPanelColor, "toppanel")}
    </Box>
  );
};