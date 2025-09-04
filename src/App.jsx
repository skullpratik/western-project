// src/App.jsx
import React, { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience/Experience.jsx";
import { Interface } from "./components/Interface/Interface.jsx";
import { modelsConfig } from "./modelsConfig";

function App() {
  const [selectedModel, setSelectedModel] = useState("Undercounter");
  const togglePartRef = useRef();
  const [api, setApi] = useState(null);

  const handleSetTogglePart = (togglePartFunction) => {
    togglePartRef.current = togglePartFunction;
  };

  const handleToggleClick = (name, type) => {
    if (togglePartRef.current) {
      togglePartRef.current()(name, type);
    }
  };

  const handleApiReady = (apiObj) => {
    setApi(apiObj);
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Left Panel - Interface */}
      <div
        style={{
          width: "30%",
          background: "#f8f8f8",
          borderRight: "1px solid #ddd",
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0" }}>Configurator</h2>

        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {Object.keys(modelsConfig).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>

        <Interface
          selectedModel={selectedModel}
          togglePart={handleToggleClick}
          applyDoorSelection={(...args) => api?.applyDoorSelection?.(...args)}
          api={api}
        />
      </div>

      {/* Right Panel - 3D Scene */}
      <div style={{ flex: 1 }}>
        <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
          <Experience
            modelName={selectedModel}
            onTogglePart={handleSetTogglePart}
            onApiReady={handleApiReady}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
