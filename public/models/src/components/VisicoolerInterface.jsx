import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
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
  Grid,
  Popover,
} from "@mui/material";
import { styled } from '@mui/material/styles';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import PaletteIcon from "@mui/icons-material/Palette";
import ImageIcon from "@mui/icons-material/Image";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import { SketchPicker } from 'react-color';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
  }
}));

const SmallButton = styled(Button)(({ theme }) => ({
  fontSize: '0.7rem',
  padding: '4px 8px',
  minWidth: 'auto'
}));

const SmallSlider = styled(Slider)(({ theme }) => ({
  padding: '8px 0',
  '& .MuiSlider-thumb': {
    width: 12,
    height: 12,
  }
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '8px',
  fontWeight: 600,
  color: theme.palette.primary.main,
  fontSize: '0.9rem'
}));

const ColorButton = styled(Button)(({ theme, backgroundcolor }) => ({
  backgroundColor: backgroundcolor || '#f0f0f0',
  color: backgroundcolor ? '#fff' : '#000',
  border: backgroundcolor ? 'none' : '1px dashed #ccc',
  width: '100%',
  height: '30px',
  minWidth: 'auto',
  fontSize: '0.75rem',
  '&:hover': {
    backgroundColor: backgroundcolor || '#e0e0e0',
  }
}));

export function Interface({
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
  onColorShadingChange,
  canopyTextureUrl,
  sidePanel1TextureUrl,
  sidePanel2TextureUrl,
  louverTextureUrl,
}) {
  const [ledVisible, setLedVisible] = useState(false);
  const [louverMode, setLouverMode] = useState("color");
  const [colorShading, setColorShading] = useState({
    canopy: 0, bottom: 0, door: 0, toppanel: 0, louver: 0
  });
  const [uploadingCanopy, setUploadingCanopy] = useState(false);
  const [canopyImage, setCanopyImage] = useState(canopyTextureUrl);
  const [uploadingSP1, setUploadingSP1] = useState(false);
  const [sidePanel1Image, setSidePanel1Image] = useState(sidePanel1TextureUrl);
  const [uploadingSP2, setUploadingSP2] = useState(false);
  const [sidePanel2Image, setSidePanel2Image] = useState(sidePanel2TextureUrl);
  const [uploadingLouver, setUploadingLouver] = useState(false);
  const [louverImage, setLouverImage] = useState(louverTextureUrl);
  const [colorPickerOpen, setColorPickerOpen] = useState({
    canopy: false, bottom: false, door: false, toppanel: false, louver: false
  });
  const [colorPickerAnchor, setColorPickerAnchor] = useState({
    canopy: null, bottom: null, door: null, toppanel: null, louver: null
  });

  const canopyInputRef = useRef(null);
  const sp1InputRef = useRef(null);
  const sp2InputRef = useRef(null);
  const louverInputRef = useRef(null);

  useEffect(() => { setCanopyImage(canopyTextureUrl); }, [canopyTextureUrl]);
  useEffect(() => { setSidePanel1Image(sidePanel1TextureUrl); }, [sidePanel1TextureUrl]);
  useEffect(() => { setSidePanel2Image(sidePanel2TextureUrl); }, [sidePanel2TextureUrl]);
  useEffect(() => { setLouverImage(louverTextureUrl); if (louverTextureUrl) { setLouverMode("image"); } }, [louverTextureUrl]);

  const handleARRedirect = () => {
    window.location.href = `AR.html?model=visicooler`;
  };

  const handleLED = (e) => {
    setLedVisible(e.target.checked);
    onLEDToggle?.(e.target.checked);
  };
  const handleColorChange = (type, value) => {
    switch (type) {
      case "canopy": onCanopyColorChange?.(value); break;
      case "bottom": onBottomBorderColorChange?.(value); break;
      case "door": onDoorColorChange?.(value); break;
      case "toppanel": onTopPanelColorChange?.(value); break;
      case "louver": onLouverColorChange?.(value); if (value) { setLouverImage(null); onLouverTextureReset?.(); } break;
      default: break;
    }
  };
  const handleShadingChange = (type, value) => {
    const newShading = { ...colorShading, [type]: Math.round(value) };
    setColorShading(newShading);
    onColorShadingChange?.(newShading);
  };
  const handleLouverModeChange = (event, newMode) => {
    if (newMode !== null) {
      setLouverMode(newMode);
      if (newMode === "color") {
        setLouverImage(null);
        onLouverTextureReset?.();
      } else {
        onLouverColorChange?.(null);
      }
    }
  };

  const handleColorPickerOpen = (type, event) => {
    setColorPickerOpen({ ...colorPickerOpen, [type]: true });
    setColorPickerAnchor({ ...colorPickerAnchor, [type]: event.currentTarget });
  };
  const handleColorPickerClose = (type) => {
    setColorPickerOpen({ ...colorPickerOpen, [type]: false });
    setColorPickerAnchor({ ...colorPickerAnchor, [type]: null });
  };
  const handleColorPickerChange = (type, color) => {
    handleColorChange(type, color.hex);
  };
  const handleNoColor = (type) => {
    handleColorChange(type, null);
    handleColorPickerClose(type);
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
    <StyledCard variant="outlined">
      <CardContent sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
          <PaletteIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} /> {title}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <ColorButton backgroundcolor={selectedColor || undefined} onClick={(e) => handleColorPickerOpen(type, e)}>
            {selectedColor ? 'Change Color' : 'Select Color'}
          </ColorButton>
          <Popover open={colorPickerOpen[type]} anchorEl={colorPickerAnchor[type]} onClose={() => handleColorPickerClose(type)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
            <Box sx={{ p: 1 }}>
              <SketchPicker color={selectedColor || '#fff'} onChange={(color) => handleColorPickerChange(type, color)} />
              <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => handleNoColor(type)}>No Color</Button>
            </Box>
          </Popover>
        </Box>
        {selectedColor && (
          <>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5, color: 'text.secondary', fontSize: '0.65rem' }}>Adjust Shading</Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, textAlign: 'center', fontWeight: 'bold' }}>{`Shading: ${colorShading[type]}%`}</Typography>
            <SmallSlider value={colorShading[type]} onChange={(e, value) => handleShadingChange(type, value)} min={-100} max={100} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>Darker</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>Lighter</Typography>
            </Box>
          </>
        )}
      </CardContent>
    </StyledCard>
  );

  const renderUploadSection = (title, image, setImage, inputRef, uploading, setUploading, onUpload, onReset, accept = "image/*", helpText) => (
    <StyledCard variant="outlined">
      <CardContent sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
          <ImageIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} /> {title}
        </Typography>
        {image ? (
          <Box sx={{ position: "relative", mb: 1, flexGrow: 1 }}>
            <Box component="img" src={image} sx={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: 0.5, border: "1px solid #e0e0e0" }} alt={title} />
            <IconButton size="small" onClick={() => { setImage(null); if (inputRef.current) inputRef.current.value = ""; onReset?.(); }} sx={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", color: "white", "&:hover": { backgroundColor: "rgba(0,0,0,0.9)" }, width: 20, height: 20 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <SmallButton variant="outlined" component="label" fullWidth startIcon={uploading ? <CircularProgress size={12} /> : <CloudUploadIcon sx={{ fontSize: '0.9rem' }} />} sx={{ backgroundColor: "#f7f9fc", border: "1px dashed #ccc", "&:hover": { border: "1px dashed #007bff", backgroundColor: "#e3f2fd" }, borderRadius: 0.5, py: 1 }} onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </SmallButton>
          </Box>
        )}
        <input type="file" ref={inputRef} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; readImage(file, (url) => { setImage(url); onUpload?.(url); }, setUploading); e.target.value = ""; }} accept={accept} hidden />
        <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary", fontSize: '0.6rem' }}>{helpText}</Typography>
      </CardContent>
    </StyledCard>
  );

  return (
    <Box sx={{ p: 1.5, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Visicooler Customization
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel control={<Switch size="small" checked={ledVisible} onChange={handleLED} />} label={<Typography sx={{ fontSize: '0.8rem' }}>LED</Typography>} />
          <Button variant="contained" size="small" startIcon={<ViewInArIcon />} onClick={handleARRedirect} sx={{ ml: 1, fontSize: '0.75rem', py: 0.5 }}>
            View in AR
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1' }, '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: '#a1a1a1' } }}>
        <Box sx={{ mb: 2 }}>
          <SectionHeader><ImageIcon sx={{ mr: 1, fontSize: '1rem' }} /> Image Customization</SectionHeader>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Box sx={{ flex: 1 }}>{renderUploadSection("Canopy", canopyImage, setCanopyImage, canopyInputRef, uploadingCanopy, setUploadingCanopy, onCanopyTextureUpload, onCanopyTextureReset, "image/*", "JPG, PNG. Max-5MB. Dimensions--1000x500")}</Box>
            <Box sx={{ flex: 1 }}>{renderUploadSection("Side Panel 1", sidePanel1Image, setSidePanel1Image, sp1InputRef, uploadingSP1, setUploadingSP1, onSidePanel1TextureUpload, onSidePanel1TextureReset, "image/*", "JPG, PNG. Max-5MB. Dimensions--340x1144")}</Box>
            <Box sx={{ flex: 1 }}>{renderUploadSection("Side Panel 2", sidePanel2Image, setSidePanel2Image, sp2InputRef, uploadingSP2, setUploadingSP2, onSidePanel2TextureUpload, onSidePanel2TextureReset, "image/*", "JPG, PNG. Max-5MB. Dimensions--340x1144")}</Box>
          </Box>
          <Box sx={{ mt: 1 }}>
            <StyledCard variant="outlined">
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}><ImageIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} /> Louver Customization</Typography>
                <ToggleButtonGroup value={louverMode} exclusive onChange={handleLouverModeChange} aria-label="louver customization mode" fullWidth size="small" sx={{ mb: 1.5 }}>
                  <ToggleButton value="color" sx={{ py: 0.25, fontSize: '0.7rem' }}>Color</ToggleButton>
                  <ToggleButton value="image" sx={{ py: 0.25, fontSize: '0.7rem' }}>Image</ToggleButton>
                </ToggleButtonGroup>
                {louverMode === "color" ? (
                  <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: louverColor ? 1 : 0 }}>
                      <ColorButton backgroundcolor={louverColor || undefined} onClick={(e) => handleColorPickerOpen("louver", e)}>{louverColor ? 'Change Color' : 'Select Color'}</ColorButton>
                      <Popover open={colorPickerOpen.louver} anchorEl={colorPickerAnchor.louver} onClose={() => handleColorPickerClose("louver")} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
                        <Box sx={{ p: 1 }}>
                          <SketchPicker color={louverColor || '#fff'} onChange={(color) => handleColorPickerChange("louver", color)} />
                          <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => handleNoColor("louver")}>No Color</Button>
                        </Box>
                      </Popover>
                    </Box>
                    {louverColor && (<><Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5, color: 'text.secondary', fontSize: '0.65rem' }}>Adjust Shading</Typography><Typography variant="caption" sx={{ display: 'block', mb: 0.5, textAlign: 'center', fontWeight: 'bold' }}>{`Shading: ${colorShading.louver}%`}</Typography><SmallSlider value={colorShading.louver} onChange={(e, value) => handleShadingChange("louver", value)} min={-100} max={100} /><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>Darker</Typography><Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>Lighter</Typography></Box></>)}
                  </>
                ) : (
                  <>
                    {louverImage ? (<Box sx={{ position: "relative", mb: 1 }}><Box component="img" src={louverImage} sx={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: 0.5, border: "1px solid #e0e0e0" }} alt="Louver texture" /><IconButton size="small" onClick={() => { setLouverImage(null); if (louverInputRef.current) louverInputRef.current.value = ""; onLouverTextureReset?.(); }} sx={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", color: "white", "&:hover": { backgroundColor: "rgba(0,0,0,0.9)" }, width: 20, height: 20 }}><CloseIcon fontSize="small" /></IconButton></Box>) : (<SmallButton variant="outlined" component="label" fullWidth startIcon={uploadingLouver ? <CircularProgress size={12} /> : <CloudUploadIcon sx={{ fontSize: '0.9rem' }} />} sx={{ backgroundColor: "#f7f9fc", border: "1px dashed #ccc", "&:hover": { border: "1px dashed #007bff", backgroundColor: "#e3f2fd" }, borderRadius: 0.5, py: 1, mb: 0.5 }} onClick={() => louverInputRef.current?.click()} disabled={uploadingLouver}>{uploadingLouver ? "Uploading..." : "Upload Image"}</SmallButton>)}
                    <input type="file" ref={louverInputRef} accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; readImage(file, (url) => { setLouverImage(url); onLouverTextureUpload?.(url); }, setUploadingLouver); e.target.value = ""; }} />
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: '0.6rem' }}>JPG, PNG. Max 5MB.</Typography>
                  </>
                )}
              </CardContent>
            </StyledCard>
          </Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <SectionHeader><PaletteIcon sx={{ mr: 1, fontSize: '1rem' }} /> Color Customization</SectionHeader>
          <Grid container spacing={1}>
            <Grid item xs={6}>{renderColorSection("Canopy Border", canopyColor, "canopy")}</Grid>
            <Grid item xs={6}>{renderColorSection("Bottom Border", bottomBorderColor, "bottom")}</Grid>
            <Grid item xs={6}>{renderColorSection("Door", doorColor, "door")}</Grid>
            <Grid item xs={6}>{renderColorSection("Top Panel", topPanelColor, "toppanel")}</Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}