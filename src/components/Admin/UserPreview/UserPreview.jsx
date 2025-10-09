import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../../Experience/Experience.jsx";
import { Interface } from "../../Interface/Interface.jsx";
// import { modelsConfig } from "../../../modelsConfig"; // Removed - using dynamic configs only
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

  // Load database models just like MainApp
  const [dbModels, setDbModels] = useState([]);
  
  useEffect(() => {
    const fetchDbModels = async () => {
      try {
        const response = await fetch(`http://192.168.1.7:5000/api/models`);
        if (response.ok) {
          const models = await response.json();
          setDbModels(models);
        }
      } catch (err) {
        console.error('Error fetching database models:', err);
      }
    };
    fetchDbModels();
  }, []);

  // Listen for model updates from admin panel (like MainApp)
  useEffect(() => {
    const handler = async () => {
      try {
        const response = await fetch(`http://192.168.1.7:5000/api/models`);
        if (response.ok) {
          const models = await response.json();
          setDbModels(models);
        }
      } catch (err) {
        console.error('Error refreshing models in UserPreview:', err);
      }
    };
    
    window.addEventListener('modelsUpdated', handler);
    return () => window.removeEventListener('modelsUpdated', handler);
  }, []);

  // Convert database models to the format expected by Experience component
  const dbModelsFormatted = useMemo(() => {
    const formatted = {};
    dbModels.forEach(model => {
      // Normalize file path like MainApp does so Experience receives an absolute URL
      let normalizedPath = undefined;
      if (typeof model.file === 'string' && model.file.length) {
        if (model.file.startsWith('http://') || model.file.startsWith('https://')) {
          normalizedPath = model.file;
        } else if (model.file.startsWith('/models/')) {
          normalizedPath = `${API_BASE_URL}${model.file}`;
        } else {
          normalizedPath = `${API_BASE_URL}/models/${model.file}`;
        }
      }

      console.log('🔧 Processing model (UserPreview):', model.name, 'metadata:', model.metadata);
      formatted[model.name] = {
        path: normalizedPath,
        displayName: model.displayName,
        type: model.type,
        interactionGroups: model.interactionGroups || [],
        metadata: model.metadata || {},
        uiWidgets: model.uiWidgets || model.metadata?.uiWidgets || [],
        lights: model.lights || [],
        hiddenInitially: model.hiddenInitially || [],
        camera: model.metadata?.camera || { position: [0, 2, 5], target: [0, 1, 0], fov: 50 },
        placementMode: model.placementMode || 'autofit',
        modelPosition: Array.isArray(model.modelPosition) ? model.modelPosition : undefined,
        modelRotation: Array.isArray(model.modelRotation) ? model.modelRotation : undefined,
        modelScale: typeof model.modelScale === 'number' ? model.modelScale : undefined,
        ...(model.assets && { assets: model.assets }),
        // Keep configUrl forwarded so external configs can be fetched
        __configUrl: model.configUrl || model.configURL || model.config || null
      };
      console.log('Formatted model (UserPreview):', formatted[model.name]);
    });
    return formatted;
  }, [dbModels]);

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
  // --- External config fetch/merge logic (copied from MainApp) ---
  const API_BASE_URL = 'http://192.168.1.7:5000';
  const normalizeModelUrls = useCallback((cfg) => {
    if (!cfg || typeof cfg !== 'object') return cfg;
    const out = { ...cfg };
    const fix = (val) => {
      if (!val || typeof val !== 'string') return val;
      if (val.startsWith('http://') || val.startsWith('https://')) return val;
      if (val.startsWith('/models/')) return `${API_BASE_URL}${val}`;
      if (val.startsWith('models/')) return `${API_BASE_URL}/${val}`;
      return val;
    };
    if (out.path) out.path = fix(out.path);
    if (out.assets && typeof out.assets === 'object') {
      out.assets = { ...out.assets };
      Object.keys(out.assets).forEach((k) => {
        out.assets[k] = fix(out.assets[k]);
      });
    }
    return out;
  }, []);

  // Helper to unwrap external configs that might be nested
  const unwrapExternalConfig = useCallback((name, json) => {
    if (!json || typeof json !== 'object') return json;
    const looksDirect = json.camera || json.uiWidgets || json.assets || json.path || json.interactionGroups || json.presets || json.metadata;
    if (looksDirect) return json;
    if (json[name] && typeof json[name] === 'object') return json[name];
    const key = Object.keys(json).find((k) => k.toLowerCase() === String(name).toLowerCase());
    if (key && typeof json[key] === 'object') return json[key];
    if (json.config && typeof json.config === 'object') return json.config;
    if (json.data && typeof json.data === 'object') return json.data;
    if (json.models && json.models[name] && typeof json.models[name] === 'object') return json.models[name];
    return json;
  }, []);

  // Fetch and merge external config JSONs for each model
  const [externalConfigs, setExternalConfigs] = useState({});
  useEffect(() => {
    let aborted = false;
    const loadConfigs = async () => {
      const entries = Object.entries(dbModelsFormatted);
      await Promise.all(entries.map(async ([name, base]) => {
        let url = base.configUrl || base.__configUrl;
        // If no explicit URL, try a few likely filenames in /configs
        const tryCandidates = async () => {
          const candidates = [];
          const safe = (s) => String(s || '').trim();
          const hyphen = safe(name).replace(/\s+/g, '-');
          candidates.push(`/configs/${safe(name)}.json`);
          if (hyphen !== safe(name)) candidates.push(`/configs/${hyphen}.json`);
          candidates.push(`/configs/${safe(name).toLowerCase()}.json`);
          candidates.push(`/configs/config-${safe(name)}.json`);
          for (let c of candidates) {
            try {
              const full = c.startsWith('http') ? c : `${API_BASE_URL}${c.startsWith('/') ? '' : '/'}${c}`;
              const res = await fetch(full);
              if (!res.ok) continue;
              const json = await res.json();
              const unwrapped = unwrapExternalConfig(name, json);
              const normalized = normalizeModelUrls(unwrapped);
              if (!aborted) {
                setExternalConfigs(prev => ({ ...prev, [name]: normalized }));
              }
              return true;
            } catch (err) {
              // ignore and try next candidate
            }
          }
          return false;
        };

        if (!url) {
          try {
            const found = await tryCandidates();
            if (found) return;
          } catch (err) {
            // continue to explicit URL attempt if candidate search failed
          }
        }

        if (!url) return;

        try {
          const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
          const res = await fetch(fullUrl);
          if (!res.ok) throw new Error(`Fetch ${fullUrl} failed ${res.status}`);
          const json = await res.json();
          const unwrapped = unwrapExternalConfig(name, json);
          const normalized = normalizeModelUrls(unwrapped);
          if (!aborted) {
            setExternalConfigs(prev => ({ ...prev, [name]: normalized }));
          }
        } catch (e) {
          console.warn('[ConfigFetchError]', name, e);
        }
      }));
    };
    loadConfigs();
    return () => { aborted = true; };
  }, [dbModelsFormatted, normalizeModelUrls, unwrapExternalConfig]);

  // Merge database models with external JSON configs
  const mergedModels = useMemo(() => {
    const merged = {};
    Object.entries(dbModelsFormatted).forEach(([name, base]) => {
      const ext = externalConfigs[name];
      if (ext) {
        // Ensure combined config is normalized and has a valid path
        const combined = normalizeModelUrls({ ...ext });
        const hasAssetsBase = !!(combined.assets && combined.assets.base);
        if (!hasAssetsBase && !combined.path && base.path) {
          combined.path = base.path;
        }
        merged[name] = normalizeModelUrls(combined);
      } else {
        merged[name] = normalizeModelUrls({ ...base });
      }
    });
    return merged;
  }, [dbModelsFormatted, externalConfigs, normalizeModelUrls]);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved && (dbModelsFormatted[saved] || customModels[saved]) ? saved : 'Undercounter';
  });

  // After DB models load, ensure we have a valid selection; prefer a DB model (often the one just created)
  useEffect(() => {
    const allKeys = Object.keys(mergedModels);
    if (!allKeys.length) return;

    if (!mergedModels[selectedModel]) {
      // Prefer first DB model if available
      const dbKeys = Object.keys(dbModelsFormatted);
      const next = dbKeys[0] || allKeys[0];
      setSelectedModel(next);
      try { localStorage.setItem('selectedModel', next); } catch(_) {}
      console.log('🔁 Auto-selected model in UserPreview:', next);
    }
  }, [mergedModels, dbModelsFormatted, selectedModel]);
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
