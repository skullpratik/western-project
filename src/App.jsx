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

  // 🔗 Shared ref for texture application
  const applyRequest = useRef(null);

  const handleSetTogglePart = (togglePartFunction) => {
    togglePartRef.current = togglePartFunction;
  };

  const handleToggleClick = (name, type) => {
    if (togglePartRef.current) togglePartRef.current()(name, type);
  };

  const handleApiReady = (apiObj) => {
    setApi(apiObj);
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div style={{ width: "30%", padding: 16, background: "#f8f8f8", overflowY: "auto" }}>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {Object.keys(modelsConfig).map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>

        <Interface
          selectedModel={selectedModel}
          togglePart={handleToggleClick}
          applyDoorSelection={(...args) => api?.applyDoorSelection?.(...args)}
          api={api}
          applyRequest={applyRequest} // ✅ Make sure this is passed!
        />
      </div>

      <div style={{ flex: 1 }}>
        <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
          <Experience
            modelName={selectedModel}
            onTogglePart={handleSetTogglePart}
            onApiReady={handleApiReady}
            applyRequest={applyRequest} // ✅ Make sure this is passed!
          />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
