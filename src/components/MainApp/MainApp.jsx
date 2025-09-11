import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../Experience/Experience.jsx";
import { Interface } from "../Interface/Interface.jsx";
import { modelsConfig } from "../../modelsConfig";
import { useAuth } from "../../context/AuthContext";
import { ActivityLog } from "../ActivityLog/ActivityLog";
import './MainApp.css';

const API_BASE_URL = 'http://localhost:5000';

function MainApp() {
  const { user, logout } = useAuth();
  const [dbModels, setDbModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch models from database
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/models`);
        
        if (response.ok) {
          const models = await response.json();
          setDbModels(models);
        } else {
          console.error('Failed to fetch models:', response.statusText);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Listen for model updates from admin panel
  useEffect(() => {
    const handler = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/models`);
        if (response.ok) {
          const models = await response.json();
          setDbModels(models);
        }
      } catch (err) {
        console.error('Error refreshing models:', err);
      }
    };
    
    window.addEventListener('modelsUpdated', handler);
    return () => window.removeEventListener('modelsUpdated', handler);
  }, []);

  // Convert database models to the format expected by Experience component
  const dbModelsFormatted = useMemo(() => {
    const formatted = {};
    dbModels.forEach(model => {
      console.log('Processing model:', model.name, 'metadata:', model.metadata);
      console.log('↘ transform from API:', {
        placementMode: model.placementMode,
        modelPosition: model.modelPosition,
        modelRotation: model.modelRotation,
        modelScale: model.modelScale
      });
      formatted[model.name] = {
        path: model.file,
        displayName: model.displayName,
        type: model.type,
        interactionGroups: model.interactionGroups || [],
        metadata: model.metadata || {},
        // Extract uiWidgets from metadata to top level
        uiWidgets: model.metadata?.uiWidgets || [],
        // Extract other metadata properties that might be needed
        lights: model.metadata?.lights || [],
        hiddenInitially: model.metadata?.hiddenInitially || [],
        camera: model.metadata?.camera || { position: [0, 2, 5], target: [0, 1, 0], fov: 50 },
        // Extract model positioning from database model
  placementMode: model.placementMode || 'autofit',
  modelPosition: Array.isArray(model.modelPosition) ? model.modelPosition : undefined,
  modelRotation: Array.isArray(model.modelRotation) ? model.modelRotation : undefined,
  modelScale: typeof model.modelScale === 'number' ? model.modelScale : undefined
      };
  console.log('Formatted model:', formatted[model.name]);
    });
    console.log('DB MODELS FORMATTED:', formatted); // Debug log
    return formatted;
  }, [dbModels]);

  const mergedModels = useMemo(() => ({ ...modelsConfig, ...dbModelsFormatted }), [dbModelsFormatted]);

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedModel');
    // Check if saved model exists in static config first, then check if it will exist in merged models
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
  // Deprecated manual transform state removed

  // Effects/Materials states
  const [reflectionActive, setReflectionActive] = useState(false);

  // Get current model configuration from merged set
  const currentModel = mergedModels[selectedModel] || mergedModels["Undercounter"];

  // User permissions
  const userPermissions = user?.permissions || {};

  // Update position when changing models
  useEffect(() => {
    console.log('🔄 Current model changed:', currentModel);
  }, [selectedModel, currentModel]);

  // Model transform change handler
  const handleModelTransformChange = useCallback(() => {}, []);

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
  try { localStorage.setItem('selectedModel', modelName); } catch(_) {}
  logActivity("model_change", { from: selectedModel, to: modelName });
  }, [selectedModel, logActivity]);

  // Toggle part function
  const togglePart = useCallback((partName, isVisible) => {
    if (togglePartRef.current) {
      togglePartRef.current(partName, isVisible);
      logActivity("part_toggle", { partName, isVisible });
    }
  }, [logActivity]);

  if (loading) {
    return (
      <div className="main-app">
        <div className="app-content">
          <div className="loading-state">
            <h2>Loading models...</h2>
            <p>Fetching available 3D models from server</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-app">
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
              modelConfig={currentModel}
              allModels={mergedModels}
              onTogglePart={togglePart}
              onApiReady={setApi}
              applyRequest={applyRequest}
              userPermissions={userPermissions}
              user={user}
              onModelTransformChange={handleModelTransformChange}
            />
          </Canvas>
        </div>

        <Interface
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          onLogout={logout}
          userName={user?.name}
          togglePart={togglePart}
          api={api}
          applyRequest={applyRequest}
          userPermissions={userPermissions}
          models={mergedModels}
        />
      </div>

      {showActivityLog && (
        <ActivityLog onClose={() => setShowActivityLog(false)} />
      )}
    </div>
  );
}

export default MainApp;
