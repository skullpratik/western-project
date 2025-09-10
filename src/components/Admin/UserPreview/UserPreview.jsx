import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../../Experience/Experience.jsx";
import { Interface } from "../../Interface/Interface.jsx";
import { modelsConfig } from "../../../modelsConfig";
import { useAuth } from "../../../context/AuthContext";
import { ActivityLog } from "../../ActivityLog/ActivityLog";
import './UserPreview.css';

function UserPreview() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Simplified full permissions object
  const fullPermissions = {
    canRotate: true,
    canZoom: true,
    canPan: true,
    canChangeDoors: true,
    canChangeDrawers: true,
    canChangeReflection: true,
    canChangeTextures: true,
    canChangeModels: true,
    canChangeColors: true,
    canChangeLighting: true,
    canChangeEnvironment: true,
    canUseMeasurements: true,
    canExportData: true,
    canSaveConfig: true,
    canViewActivityLog: true,
    // Add widget-specific permissions that Interface might be looking for
    doorPresets: true,
    doorToggles: true,
    drawerToggles: true,
    textureWidget: true,
    globalTextureWidget: true,
    lightWidget: true,
    saveConfig: true
  };

  // Merge custom models for preview just like MainApp
  const [customModels, setCustomModels] = useState(() => {
    try { const s = localStorage.getItem('customModels'); return s ? JSON.parse(s) : {}; } catch(_) { return {}; }
  });
  useEffect(() => {
    const handler = () => {
      try { const s = localStorage.getItem('customModels'); setCustomModels(s ? JSON.parse(s) : {}); } catch(_) {}
    };
    window.addEventListener('customModelsUpdated', handler);
    return () => window.removeEventListener('customModelsUpdated', handler);
  }, []);
  const mergedModels = useMemo(() => ({ ...modelsConfig, ...customModels }), [customModels]);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved && (modelsConfig[saved] || customModels[saved]) ? saved : 'Undercounter';
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

  // Current model from merged set
  const currentModel = mergedModels[selectedModel] || mergedModels['Undercounter'];

  // Log activity function
  const logActivity = useCallback((action, details = {}) => {
    const activityEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      user: `${user?.name || 'Admin'} (Preview)`,
      action,
      details,
      model: selectedModel
    };

    // Get existing logs or initialize empty array
    const existingLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
    
    // Add new log at the beginning
    const updatedLogs = [activityEntry, ...existingLogs];
    
    // Keep only last 100 logs to prevent storage overflow
    const trimmedLogs = updatedLogs.slice(0, 100);
    
    // Save back to localStorage
    localStorage.setItem('activityLogs', JSON.stringify(trimmedLogs));
  }, [user, selectedModel]);

  // Handle model change
  const handleModelChange = useCallback((newModel) => {
    setSelectedModel(newModel);
    localStorage.setItem('selectedModel', newModel);
    logActivity('change_model', { newModel });
  }, [logActivity]);

  // Toggle part function
  const togglePart = useCallback((partName, isVisible) => {
    if (togglePartRef.current) {
      togglePartRef.current(partName, isVisible);
      logActivity("part_toggle", { partName, isVisible });
    }
  }, [logActivity]);

  return (
    <div className="user-preview">
      <div className="preview-header">
        <div className="preview-indicator">
          <span className="preview-badge">👁️ Admin Preview</span>
          <span className="preview-description">This is what users see with full permissions</span>
          <button 
            onClick={() => navigate('/admin/dashboard')} 
            style={{marginLeft: 'auto', padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer'}}
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
      
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
                userPermissions={fullPermissions}
                user={{...user, name: `${user?.name || 'Admin'} (Preview)`}}
              />
            </Canvas>
          </div>

          <Interface
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            onLogout={logout}
            userName={`${user?.name || 'Admin'} (Preview)`}
            togglePart={togglePart}
            api={api}
            applyRequest={applyRequest}
            userPermissions={fullPermissions}
            models={mergedModels}
          />
        </div>

        {showActivityLog && (
          <ActivityLog onClose={() => setShowActivityLog(false)} />
        )}
      </div>
    </div>
  );
}

export default UserPreview;
