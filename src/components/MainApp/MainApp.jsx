import React, { useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../Experience/Experience.jsx";
import { Interface } from "../Interface/Interface.jsx";
import { modelsConfig } from "../../modelsConfig";
import { useAuth } from "../../context/AuthContext";
import { ActivityLog } from "../ActivityLog/ActivityLog";
import './MainApp.css';

function MainApp() {
  const { user, logout } = useAuth();
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved && modelsConfig[saved] ? saved : "Undercounter";
  });
  const [api, setApi] = useState(null);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Ref for togglePart (passed to Experience)
  const togglePartRef = useRef();
  const applyRequest = useRef(null); // Ref for texture application (global or per-part)

  // Movement states
  const [movementMode, setMovementMode] = useState("rotate");
  const [enableMovement, setEnableMovement] = useState(false);

  // Model positioning states
  const [position, setPosition] = useState([0, 0, 0]);
  const [rotation, setRotation] = useState([0, 0, 0]);

  // Effects/Materials states
  const [reflectionActive, setReflectionActive] = useState(false);

  // Get current model configuration
  const currentModel = modelsConfig[selectedModel] || modelsConfig["Undercounter"];

  // User permissions
  const userPermissions = user?.permissions || {};

  // Update position when changing models
  useEffect(() => {
    if (currentModel?.modelPosition) {
      setPosition(currentModel.modelPosition);
    }
    if (currentModel?.modelRotation) {
      setRotation(currentModel.modelRotation);
    }
  }, [selectedModel, currentModel]);

  // Log activity function
  const logActivity = useCallback(async (action, details = {}) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

  await fetch(`/api/admin/activity/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          modelName: selectedModel,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }, [selectedModel]);

  // Model change handler
  const handleModelChange = useCallback((modelName) => {
    setSelectedModel(modelName);
    localStorage.setItem('selectedModel', modelName);
    logActivity("model_change", { from: selectedModel, to: modelName });
  }, [selectedModel, logActivity]);

  // Toggle part function
  const togglePart = useCallback((partName, isVisible) => {
    if (togglePartRef.current) {
      togglePartRef.current(partName, isVisible);
      logActivity("part_toggle", { partName, isVisible });
    }
  }, [logActivity]);

  return (
    <div className="main-app">
      <div className="app-header">
        <div className="header-left">
          <h1>3D Configurator</h1>
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            title="Select Model"
          >
            {Object.keys(modelsConfig).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.name}</span>
          {user?.role === 'admin' && (
            <button 
              className="admin-btn"
              onClick={() => window.location.href = '/admin/dashboard'}
            >
              Admin Panel
            </button>
          )}
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="app-content">
        <div className="canvas-container">
          <Canvas
            shadows
            camera={{
              position: [2, 2, 2],
              fov: 25,
            }}
          >
            <Experience
              modelName={selectedModel}
              onTogglePart={togglePart}
              onApiReady={setApi}
              applyRequest={applyRequest}
              userPermissions={userPermissions}
              user={user}
            />
          </Canvas>
        </div>

        <Interface
          selectedModel={selectedModel}
          togglePart={togglePart}
          api={api}
          applyRequest={applyRequest}
          userPermissions={userPermissions}
        />
      </div>

      {showActivityLog && (
        <ActivityLog onClose={() => setShowActivityLog(false)} />
      )}
    </div>
  );
}

export default MainApp;
