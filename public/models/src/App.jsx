import React, { useRef, useState, useEffect } from "react";
import { Box, Paper, Typography, IconButton, Button } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

import { Interface as UnderCounterInterface } from "./components/UnderCounterInterface";
import { Interface as VisicoolerInterface } from "./components/VisicoolerInterface";
import { Interface as DeepFridgeInterface } from "./components/DeepFridgeInterface";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";

import { Experience as UnderCounterExperience } from "./components/UnderCounterExperience";
import { Experience as VisicoolerExperience } from "./components/VisicoolerExperience";
import { Experience as DeepFridgeExperience } from "./components/DeepFridgeExperience";
import { Loader } from "./components/Loader";

// ---------------- GL Provider ----------------
function GLProvider({ setGL }) {
  const { gl } = useThree();
  React.useEffect(() => setGL(gl), [gl, setGL]);
  return null;
}
function CameraShift({ sidebarOpen }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(4, sidebarOpen ? 2 : 4, 8);
    camera.updateProjectionMatrix();
  }, [sidebarOpen, camera]);
  return null;
}
function CameraAspectFix() {
  const { camera, gl } = useThree();
  React.useEffect(() => {
    const resizeCamera = () => {
      const canvas = gl.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };
    resizeCamera();
    window.addEventListener("resize", resizeCamera);
    return () => window.removeEventListener("resize", resizeCamera);
  }, [camera, gl]);
  return null;
}

// ---------------- Download Button ----------------
function DownloadButton({ gl }) {
  if (!gl) return null;
  const handleDownload = () => {
    const dataURL = gl.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "model-view.png";
    link.click();
  };
  return (
    <button
      onClick={handleDownload}
      style={{
        position: "fixed",
        bottom: 20,
        right: 1290,
        padding: "10px 15px",
        backgroundColor: "#007bff",
        border: "none",
        borderRadius: 8,
        color: "white",
        fontSize: 16,
        cursor: "pointer",
        zIndex: 10000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      &#8681; Download
    </button>
  );
}

// ---------------- Canvas Content ----------------
function CanvasContent({
  modelType,
  materialProps,
  lightSettings,
  underCounterRef,
  visiCoolerRef,
  deepFridgeRef,
  doorType,
  canopyColor,
  bottomBorderColor,
  doorColor,
  topPanelColor,
  louverColor,
  colorShading,
  canopyTextureUrl,
  sidePanel1TextureUrl,
  sidePanel2TextureUrl,
  louverTextureUrl,
  isReflective,
}) {
  const { scene } = useThree();

  // Clear scene when switching models
  useEffect(() => {
    // Clean up previous model's effects
    scene.background = null;
    
    // Force cleanup of any remaining meshes and materials
    const meshesToRemove = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        meshesToRemove.push(child);
      }
    });
    
    // Remove all meshes from previous model
    meshesToRemove.forEach((mesh) => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    
  }, [modelType, scene]);

  return (
    <>
      {modelType === "undercounter" && (
        <UnderCounterExperience
          key="undercounter"
          ref={underCounterRef}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          lightSettings={lightSettings}
          doorType={doorType}
          isReflective={isReflective}
        />
      )}
      {modelType === "visicooler" && (
        <VisicoolerExperience
          key="visicooler"
          ref={visiCoolerRef}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          lightSettings={lightSettings}
          canopyColor={canopyColor}
          bottomBorderColor={bottomBorderColor}
          doorColor={doorColor}
          topPanelColor={topPanelColor}
          ledVisible={lightSettings.ledVisible}
          louverColor={louverColor}
          colorShading={colorShading}
          canopyTextureUrl={canopyTextureUrl}
          sidePanel1TextureUrl={sidePanel1TextureUrl}
          sidePanel2TextureUrl={sidePanel2TextureUrl}
          louverTextureUrl={louverTextureUrl}
        />
      )}
      {modelType === "deepfridge" && (
        <DeepFridgeExperience
          key="deepfridge"
          ref={deepFridgeRef}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          lightSettings={lightSettings}
        />
      )}
    </>
  );
}

// ---------------- Header Dropdown ----------------
const models = [
  { value: "undercounter", name: "Undercounter", img: "/images/undercounter.png" },
  { value: "visicooler", name: "Visicooler", img: "/images/visicooler.png" },
  { value: "deepfridge", name: "Deep Fridge", img: "/images/deepfridger.png" },
];

function HeaderDropdown({ modelType, setModelType, panelWidth }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedModel = models.find((m) => m.value === modelType);

  const availableModels = models.filter((model) => model.value !== modelType);

  return (
    <Box
      sx={{ position: "relative", width: "100%" }}
      ref={dropdownRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "14px 14px",
          borderRadius: 2,
          background: "#ffffff",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          transition: "all 0.25s ease",
          "&:hover": { transform: "scale(1.02)", background: "#fafafa" },
          position: "relative", // Ensure relative positioning for absolute child
        }}
      >
        <Box
          component="img"
          src={selectedModel.img}
          alt={selectedModel.name}
          sx={{
            width: 55,
            height: 35,
            objectFit: "contain",
            borderRadius: 2,
            backgroundColor: "#f9f9f936",
          }}
        />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "1.2rem",
            color: "#222",
            letterSpacing: "0.5px",
          }}
        >
          {selectedModel.name}
        </Typography>
        {/* Static Logo Image */}
        <Box
          component="img"
          src="/texture/Western-Refrigeration-Logo.jpg"
          alt="Western Refrigeration Logo"
          sx={{
            position: "absolute",
            right: "1%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "150px",
            height: "50px",
            objectFit: "contain",
            overflowY: "hidden",
          }}
        />
      </Box>

      {open && (
        <Paper
          sx={{
            position: "absolute",
            top: "100%",
            left: -6,
            width: panelWidth - 70,
            maxHeight: "none",
            overflowY: "hidden",
            mt: 0.6,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            padding: 2,
            borderRadius: 3,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            backgroundColor: "#fff",
            animation: "fadeIn 0.25s ease-in-out",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(-10px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          {availableModels.map((model) => (
            <Box
              key={model.value}
              onClick={() => {
                setModelType(model.value);
                setOpen(false);
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "10px 14px",
                borderRadius: 2,
                cursor: "pointer",
                transition: "all 0.25s ease",
                "&:hover": {
                  backgroundColor: "#f0f4ff",
                  transform: "translateX(4px)",
                },
              }}
            >
              <Box
                component="img"
                src={model.img}
                alt={model.name}
                sx={{
                  width: 35,
                  height: 35,
                  objectFit: "contain",
                  borderRadius: 2,
                  backgroundColor: "#fafafa",
                }}
              />
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "#333",
                  letterSpacing: "0.3px",
                }}
              >
                {model.name}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

// ---------------- App Component ----------------
export default function App() {
  const underCounterRef = useRef();
  const visiCoolerRef = useRef();
  const deepFridgeRef = useRef();

  const [gl, setGL] = useState(null);
  const [modelType, setModelType] = useState("undercounter");
  const [materialProps, setMaterialProps] = useState({ metalness: 1, roughness: 0.4 });
  const [lightSettings, setLightSettings] = useState({
    directional: { color: "#ffffff", intensity: 1 },
    ambient: { color: "#ffffff", intensity: 1 },
    ledVisible: false,
  });
  const [doorType, setDoorType] = useState("solid");
  const [canopyColor, setCanopyColor] = useState(null);
  const [bottomBorderColor, setBottomBorderColor] = useState(null);
  const [doorColor, setDoorColor] = useState(null);
  const [topPanelColor, setTopPanelColor] = useState(null);
  const [louverColor, setLouverColor] = useState(null);
  const [colorShading, setColorShading] = useState({ canopy: 0, bottom: 0, door: 0, toppanel: 0, louver: 0 });
  const [canopyTextureUrl, setCanopyTextureUrl] = useState(null);
  const [sidePanel1TextureUrl, setSidePanel1TextureUrl] = useState(null);
  const [sidePanel2TextureUrl, setSidePanel2TextureUrl] = useState(null);
  const [louverTextureUrl, setLouverTextureUrl] = useState(null);
  const [open, setOpen] = useState(true);

  // --- New State for Reflection ---
  const [isReflective, setIsReflective] = useState(false);
  const handleToggleReflection = () => {
    if (underCounterRef.current && underCounterRef.current.toggleReflection) {
      underCounterRef.current.toggleReflection();
      setIsReflective(prev => !prev);
    }
  };

  const { progress } = useProgress();

  const handleDoorChange = (count, position) => {
    const ref =
      modelType === "undercounter"
        ? underCounterRef.current
        : modelType === "visicooler"
          ? visiCoolerRef.current
          : deepFridgeRef.current;
    if (ref?.setDoorSelection) ref.setDoorSelection(count, position);
  };

  const handleMaterialChange = (prop, value) =>
    setMaterialProps((prev) => ({ ...prev, [prop]: value }));
  const handleLEDToggle = (visible) => {
    setLightSettings((prev) => ({ ...prev, ledVisible: visible }));
    visiCoolerRef.current?.toggleLEDLight1001?.(visible);
  };

  const handleCanopyTextureUpload = (url) => {
    setCanopyTextureUrl(url);
    visiCoolerRef.current?.applyCanopyTexture(url);
  };
  const handleCanopyTextureReset = () => {
    setCanopyTextureUrl(null);
    visiCoolerRef.current?.resetCanopyTexture();
  };
  const handleSidePanel1TextureUpload = (url) => {
    setSidePanel1TextureUrl(url);
    visiCoolerRef.current?.applySidePanel1Texture(url);
  };
  const handleSidePanel1TextureReset = () => {
    setSidePanel1TextureUrl(null);
    visiCoolerRef.current?.resetSidePanel1Texture();
  };
  const handleSidePanel2TextureUpload = (url) => {
    setSidePanel2TextureUrl(url);
    visiCoolerRef.current?.applySidePanel2Texture(url);
  };
  const handleSidePanel2TextureReset = () => {
    setSidePanel2TextureUrl(null);
    visiCoolerRef.current?.resetSidePanel2Texture();
  };
  const handleLouverTextureUpload = (url) => {
    setLouverTextureUrl(url);
    visiCoolerRef.current?.applyLouverTexture(url);
  };
  const handleLouverTextureReset = () => {
    setLouverTextureUrl(null);
    visiCoolerRef.current?.resetLouverTexture();
  };

  const handleFrontTextureUpload = (url) => deepFridgeRef.current?.applyFrontTexture(url);
  const handleFrontTextureReset = () => deepFridgeRef.current?.resetFront();
  const handleLeftTextureUpload = (url) => deepFridgeRef.current?.applyLeftTexture(url);
  const handleLeftTextureReset = () => deepFridgeRef.current?.resetLeft();
  const handleRightTextureUpload = (url) => deepFridgeRef.current?.applyRightTexture(url);
  const handleRightTextureReset = () => deepFridgeRef.current?.resetRight();

  const panelWidth = open ? 500 : 0;

  const pepsiPreset = {
    canopyColor: "#000000",
    bottomBorderColor: "#000000",
    doorColor: "#000000",
    topPanelColor: "#000000",
    louverColor: "#000000",
    canopyTexture: "/texture/pepsicanopy.jpg",
    sidePanelTexture: "/texture/pepsisidepannel.jpg",
    louverTexture: "/images/pepsi-louver.png",
  };

  const cokePreset = {
    canopyColor: "#da291c",
    bottomBorderColor: "#da291c",
    doorColor: "#da291c",
    topPanelColor: "#da291c",
    louverColor: "#da291c",
    canopyTexture: "/texture/cococolacanopy.jpg",
    sidePanelTexture: "/texture/cocacolaside2.jpg",
    louverTexture: "/images/coke-louver.png",
  };

  const applyPreset = (preset) => {
    setCanopyColor(preset.canopyColor);
    setBottomBorderColor(preset.bottomBorderColor);
    setDoorColor(preset.doorColor);
    setTopPanelColor(preset.topPanelColor);
    setLouverColor(preset.louverColor);

    if (visiCoolerRef.current) {
      visiCoolerRef.current.applyCanopyTexture(preset.canopyTexture);
      visiCoolerRef.current.applySidePanel1Texture(preset.sidePanelTexture);
      visiCoolerRef.current.applySidePanel2Texture(preset.sidePanelTexture);
      visiCoolerRef.current.applyLouverTexture(preset.louverTexture);
    }

    setCanopyTextureUrl(preset.canopyTexture);
    setSidePanel1TextureUrl(preset.sidePanelTexture);
    setSidePanel2TextureUrl(preset.sidePanelTexture);
    setLouverTextureUrl(preset.louverTexture);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row-reverse", height: "100vh", width: "100vw" }}>
      {/* Interface Panel */}
      <Paper
        elevation={3}
        sx={{
          width: panelWidth,
          transition: "width 0.3s ease",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #ffffffff 0%, #e9edf3 100%)",
          borderLeft: open ? "1px solid rgba(0,0,0,0.08)" : "none",
          position: "relative",
        }}
      >
        {/* Toggle Button */}
        <IconButton
          onClick={() => setOpen(!open)}
          sx={{
            position: "absolute",
            left: -45,
            top: "50%",
            transform: "translateY(-50%)",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            "&:hover": { background: "#f0f0f0" },
            zIndex: 2000,
          }}
        >
          {open ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>

        {open && (
          <>
            {/* Header */}
            <Box
              sx={{
                px: 3,
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                borderBottom: "2px solid #f28315",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                borderRadius: "12px 12px 0 0",
              }}
            >
              <HeaderDropdown modelType={modelType} setModelType={setModelType} panelWidth={panelWidth} />
            </Box>

            {/* Interface Body */}
            <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
              {modelType === "undercounter" && (
                <>
                  <Button
                    variant="contained"
                    onClick={handleToggleReflection}
                    sx={{ my: 2 }}
                  >
                    {isReflective ? "Remove Reflection" : "Add Reflection"}
                  </Button>
                  <UnderCounterInterface
                    onDoorChange={handleDoorChange}
                    onMaterialChange={handleMaterialChange}
                    onDoorTypeChange={setDoorType}
                    doorType={doorType}
                  />
                </>
              )}
              {modelType === "visicooler" && (
                <>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, background: '#f7f9fc' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>
                      Apply Preset Look
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: '#02235e',
                          '&:hover': { backgroundColor: '#011a43' },
                          flex: 1,
                          fontSize: '0.75rem'
                        }}
                        onClick={() => applyPreset(pepsiPreset)}
                      >
                        Pepsi Look
                      </Button>
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: '#da291c',
                          '&:hover': { backgroundColor: '#b72216' },
                          flex: 1,
                          fontSize: '0.75rem'
                        }}
                        onClick={() => applyPreset(cokePreset)}
                      >
                        Coca-Cola Look
                      </Button>
                    </Box>
                  </Paper>
                  <VisicoolerInterface
                    onLEDToggle={handleLEDToggle}
                    onCanopyColorChange={setCanopyColor}
                    canopyColor={canopyColor}
                    onBottomBorderColorChange={setBottomBorderColor}
                    bottomBorderColor={bottomBorderColor}
                    onDoorColorChange={setDoorColor}
                    doorColor={doorColor}
                    onTopPanelColorChange={setTopPanelColor}
                    topPanelColor={topPanelColor}
                    onLouverColorChange={setLouverColor}
                    louverColor={louverColor}
                    onColorShadingChange={setColorShading}
                    canopyTextureUrl={canopyTextureUrl}
                    sidePanel1TextureUrl={sidePanel1TextureUrl}
                    sidePanel2TextureUrl={sidePanel2TextureUrl}
                    louverTextureUrl={louverTextureUrl}
                    onCanopyTextureUpload={handleCanopyTextureUpload}
                    onCanopyTextureReset={handleCanopyTextureReset}
                    onSidePanel1TextureUpload={handleSidePanel1TextureUpload}
                    onSidePanel1TextureReset={handleSidePanel1TextureReset}
                    onSidePanel2TextureUpload={handleSidePanel2TextureUpload}
                    onSidePanel2TextureReset={handleSidePanel2TextureReset}
                    onLouverTextureUpload={handleLouverTextureUpload}
                    onLouverTextureReset={handleLouverTextureReset}
                  />
                </>
              )}
              {modelType === "deepfridge" && (
                <DeepFridgeInterface
                  onMaterialChange={handleMaterialChange}
                  onFrontTextureUpload={handleFrontTextureUpload}
                  onFrontTextureReset={handleFrontTextureReset}
                  onLeftTextureUpload={handleLeftTextureUpload}
                  onLeftTextureReset={handleLeftTextureReset}
                  onRightTextureUpload={handleRightTextureUpload}
                  onRightTextureReset={handleRightTextureReset}
                />
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* Scene Panel */}
      <Box sx={{ flex: 1, position: "relative" }}>
        {progress < 100 && <Loader progress={progress} />}

        <Canvas
          shadows
          camera={{ position: [4, 4, 8], fov: 35 }}
          gl={{ preserveDrawingBuffer: true }}
          style={{ visibility: progress === 100 ? "visible" : "hidden" }}
        >
          <GLProvider setGL={setGL} />
          <CameraAspectFix />
          <CameraShift sidebarOpen={open} />
          <CanvasContent
            modelType={modelType}
            materialProps={materialProps}
            lightSettings={lightSettings}
            underCounterRef={underCounterRef}
            visiCoolerRef={visiCoolerRef}
            deepFridgeRef={deepFridgeRef}
            doorType={doorType}
            canopyColor={canopyColor}
            bottomBorderColor={bottomBorderColor}
            doorColor={doorColor}
            topPanelColor={topPanelColor}
            louverColor={louverColor}
            colorShading={colorShading}
            canopyTextureUrl={canopyTextureUrl}
            sidePanel1TextureUrl={sidePanel1TextureUrl}
            sidePanel2TextureUrl={sidePanel2TextureUrl}
            louverTextureUrl={louverTextureUrl}
            isReflective={isReflective}
          />
        </Canvas>
        <DownloadButton gl={gl} />
      </Box>
    </Box>
  );
}