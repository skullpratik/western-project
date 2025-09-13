import React, { useRef, useState, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { Interface as UnderCounterInterface } from "./components/UnderCounterInterface";
import { Interface as VisicoolerInterface } from "./components/VisicoolerInterface";
import { Interface as DeepFridgeInterface } from "./components/DeepFridgeInterface";
import { Canvas, useThree } from "@react-three/fiber";
import { Experience as UnderCounterExperience } from "./components/UnderCounterExperience";
import { Experience as VisicoolerExperience } from "./components/VisicoolerExperience";
import { Experience as DeepFridgeExperience } from "./components/DeepFridgeExperience";
import { Loader } from "./components/Loader";

// GL provider
function GLProvider({ setGL }) {
  const { gl } = useThree();
  React.useEffect(() => setGL(gl), [gl, setGL]);
  return null;
}

// Download screenshot button
function DownloadButton({ gl, disabled }) {
  if (!gl) return null;
  const handleDownload = () => {
    if (!gl) return;
    setTimeout(() => {
      const dataURL = gl.domElement.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "model-view.png";
      link.click();
    }, 100);
  };
  return (
    <button
      onClick={handleDownload}
      disabled={disabled}
      style={{
        position: "fixed",
        bottom: 20,
        left: "90%",
        transform: "translateX(-50%)",
        padding: "10px 15px",
        backgroundColor: disabled ? "#aaa" : "#007bff",
        border: "none",
        borderRadius: 8,
        color: "white",
        fontSize: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        zIndex: 10000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      &#8681; Download
    </button>
  );
}

// Canvas content
function CanvasContent({
  modelType,
  materialProps,
  lightSettings,
  underCounterRef,
  visiCoolerRef,
  deepFridgeRef,
  handleLEDToggle,
  doorType,
  canopyColor,
  bottomBorderColor,
  doorColor,
  topPanelColor,
  ledEnabled,
  louverColor,
  onAssetLoaded,
  colorShading
}) {
  switch (modelType) {
    case "undercounter":
      return (
        <UnderCounterExperience
          ref={underCounterRef}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          lightSettings={lightSettings}
          doorType={doorType}
          onAssetLoaded={onAssetLoaded}
        />
      );
    case "visicooler":
      return (
        <VisicoolerExperience
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
          onAssetLoaded={onAssetLoaded}
          colorShading={colorShading}
        />
      );
    case "deepfridge":
      return (
        <DeepFridgeExperience
          ref={deepFridgeRef}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          lightSettings={lightSettings}
          ledEnabled={ledEnabled}
          onAssetLoaded={onAssetLoaded}
        />
      );
    default:
      return null;
  }
}

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
  const [ledEnabled, setLedEnabled] = useState(true);

 const [canopyColor, setCanopyColor] = useState(null);
  const [bottomBorderColor, setBottomBorderColor] = useState(null);
  const [doorColor, setDoorColor] = useState(null);
  const [topPanelColor, setTopPanelColor] = useState(null);
  const [louverColor, setLouverColor] = useState(null);
  const [colorShading, setColorShading] = useState({
    canopy: 0,
    bottom: 0,
    door: 0,
    toppanel: 0,
    louver: 0
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedAssets, setLoadedAssets] = useState(0);
  const totalAssets = 2; // Model + environment

  const handleAssetLoaded = () => {
    setLoadedAssets((prev) => {
      const newValue = prev + 1;
      const progress = Math.min(100, Math.round((newValue / totalAssets) * 100));
      setLoadingProgress(progress);
      if (newValue === totalAssets) {
        setTimeout(() => setIsLoading(false), 300);
      }
      return newValue;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && loadingProgress < 100) {
        setLoadingProgress((prev) => {
          const newProgress = Math.min(100, prev + 10);
          if (newProgress === 100) {
            setIsLoading(false);
          }
          return newProgress;
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isLoading, loadingProgress]);

  const handleDoorChange = (count, position) => {
    const ref =
      modelType === "undercounter"
        ? underCounterRef.current
        : modelType === "visicooler"
        ? visiCoolerRef.current
        : deepFridgeRef.current;
    if (ref?.setDoorSelection) ref.setDoorSelection(count, position);
  };

  const handleMaterialChange = (prop, value) => {
    setMaterialProps((prev) => ({ ...prev, [prop]: value }));
  };

  const handleLEDToggle = (visible) => {
    setLightSettings((prev) => ({ ...prev, ledVisible: visible }));
    if (visiCoolerRef.current?.toggleLEDLight1001) {
      visiCoolerRef.current.toggleLEDLight1001(visible);
    }
  };

  if (isLoading) {
    return <Loader progress={loadingProgress} />;
  }

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw", opacity: loadingProgress === 100 ? 1 : 0, transition: "opacity 0.5s ease-in-out" }}>
      <Paper
        elevation={3}
        sx={{
          width: 380,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #f7f9fc 0%, #e9edf3 100%)",
          borderRight: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #f28315",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#f28315", userSelect: "none", letterSpacing: 1 }}>
            Cabinet Configurator
          </Typography>

          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            style={{
              padding: "10px 20px",
              borderRadius: "30px",
              border: "2px solid #565350ff",
              backgroundColor: "#fff",
              color: "#e08f4cff",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 8px rgba(242, 131, 21, 0.25)",
              minWidth: "160px",
            }}
          >
            <option value="undercounter">Undercounter</option>
            <option value="visicooler">Visicooler</option>
            <option value="deepfridge">Deep Fridge</option>
          </select>
        </Box>

        <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
          {modelType === "undercounter" && (
            <UnderCounterInterface
              onDoorChange={handleDoorChange}
              onMaterialChange={handleMaterialChange}
              onLightChange={() => {}}
              onDoorTypeChange={setDoorType}
              doorType={doorType}
            />
          )}
          {modelType === "visicooler" && (
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

              onCanopyTextureUpload={(imageUrl) => {
                if (visiCoolerRef.current?.applyCanopyTexture) {
                  visiCoolerRef.current.applyCanopyTexture(imageUrl);
                }
              }}
              onCanopyTextureReset={() => {
                if (visiCoolerRef.current?.resetCanopy) {
                  visiCoolerRef.current.resetCanopy();
                }
              }}

              onSidePanel1TextureUpload={(imageUrl) => {
                if (visiCoolerRef.current?.applySidePanel1Texture) {
                  visiCoolerRef.current.applySidePanel1Texture(imageUrl);
                }
              }}
              onSidePanel1TextureReset={() => {
                if (visiCoolerRef.current?.resetSidePanel1) {
                  visiCoolerRef.current.resetSidePanel1();
                }
              }}

              onSidePanel2TextureUpload={(imageUrl) => {
                if (visiCoolerRef.current?.applySidePanel2Texture) {
                  visiCoolerRef.current.applySidePanel2Texture(imageUrl);
                }
              }}
              onSidePanel2TextureReset={() => {
                if (visiCoolerRef.current?.resetSidePanel2) {
                  visiCoolerRef.current.resetSidePanel2();
                }
              }}
              onLouverTextureUpload={(url) => {
                if (visiCoolerRef.current?.applyLouverTexture) visiCoolerRef.current.applyLouverTexture(url);
              }}
              onLouverTextureReset={() => {
                if (visiCoolerRef.current?.resetLouver) visiCoolerRef.current.resetLouver();
              }}
            />
          )}

          {modelType === "deepfridge" && (
            <DeepFridgeInterface
              onDoorChange={handleDoorChange}
              onMaterialChange={handleMaterialChange}
              onLightChange={() => {}}
              onLEDToggle={setLedEnabled}
            />
          )}
        </Box>
      </Paper>

      <Box sx={{ flex: 1, position: "relative" }}>
        <Canvas shadows camera={{ position: [4, 4, 8], fov: 35 }} gl={{ preserveDrawingBuffer: true }}>
          <GLProvider setGL={setGL} />
          <CanvasContent
            modelType={modelType}
            materialProps={materialProps}
            lightSettings={lightSettings}
            underCounterRef={underCounterRef}
            visiCoolerRef={visiCoolerRef}
            deepFridgeRef={deepFridgeRef}
            handleLEDToggle={handleLEDToggle}
            doorType={doorType}
            canopyColor={canopyColor}
            bottomBorderColor={bottomBorderColor}
            doorColor={doorColor}
            topPanelColor={topPanelColor}
            louverColor={louverColor}
            colorShading={colorShading}
            ledEnabled={ledEnabled}
            onAssetLoaded={handleAssetLoaded}
            
            
          />
        </Canvas>
        <DownloadButton gl={gl} disabled={isLoading} />
      </Box>
    </Box>
  );
}