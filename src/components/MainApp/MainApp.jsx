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
  // Helper to normalize asset/model URLs in configs to absolute API URLs
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

  // Helper to unwrap external configs that might be nested (e.g., { Visicooler: { ... } } or { model:"Visicooler", config:{...} })
  const unwrapExternalConfig = useCallback((name, json) => {
    if (!json || typeof json !== 'object') return json;
    // Direct shape already?
    const looksDirect = json.camera || json.uiWidgets || json.assets || json.path || json.interactionGroups || json.presets || json.metadata;
    if (looksDirect) return json;

    // Try exact key match
    if (json[name] && typeof json[name] === 'object') return json[name];

    // Try case-insensitive key match
    const key = Object.keys(json).find((k) => k.toLowerCase() === String(name).toLowerCase());
    if (key && typeof json[key] === 'object') return json[key];

    // Common wrappers
    if (json.config && typeof json.config === 'object') return json.config;
    if (json.data && typeof json.data === 'object') return json.data;
    if (json.models && json.models[name] && typeof json.models[name] === 'object') return json.models[name];

    return json; // fallback as-is
  }, []);

  const dbModelsFormatted = useMemo(() => {
    const formatted = {};
    dbModels.forEach(model => {
      // New approach: developer-provided config JSON drives metadata; admin only attaches file and configUrl
      const configUrl = model.configUrl;
      // Normalize file path:
      // - If backend already sends absolute URL (http/https), use it as-is
      // - If it starts with '/models/', prefix server base URL
      // - Otherwise treat as a filename and build a full URL
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
      const baseModelFields = {
        path: normalizedPath,
        displayName: model.displayName,
        type: model.type,
      };
      formatted[model.name] = { ...baseModelFields, __configUrl: configUrl };
    });
    console.log('DB MODELS FORMATTED (basic):', formatted); // Debug log
    return formatted;
  }, [dbModels]);

  // Load external config JSONs on demand and merge with base fields
  const [externalConfigs, setExternalConfigs] = useState({}); // { [modelName]: configJson }

  useEffect(() => {
    let aborted = false;
    const loadConfigs = async () => {
      const entries = Object.entries(dbModelsFormatted);
      await Promise.all(entries.map(async ([name, base]) => {
        const url = base.__configUrl;
        if (!url) return; // no external config attached
        try {
          const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
          console.log(`[ConfigFetch] ${name} → ${fullUrl}`);
          const res = await fetch(fullUrl);
          if (!res.ok) throw new Error(`Fetch ${fullUrl} failed ${res.status}`);
          const json = await res.json();
          const unwrapped = unwrapExternalConfig(name, json);
          const normalized = normalizeModelUrls(unwrapped);
          console.log(`[ConfigFetchSuccess] ${name} (unwrapped/normalized)`, normalized);
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
  }, [dbModelsFormatted, unwrapExternalConfig, normalizeModelUrls]);

  const mergedModels = useMemo(() => {
    // Merge static developer config (fallback), db basic, and external JSON if present
    const merged = { ...modelsConfig };
    Object.entries(dbModelsFormatted).forEach(([name, base]) => {
      const ext = externalConfigs[name];
      if (ext) {
        // Prefer external config, but if it doesn't include a model path or assets.base,
        // auto-fill the path from the admin-uploaded file for convenience.
        const combined = { ...ext };
        const hasAssetsBase = !!(combined.assets && combined.assets.base);
        if (!hasAssetsBase && !combined.path && base.path) {
          combined.path = base.path;
        }
        merged[name] = combined;
        console.log('[MergedModel] Using external config for', name, combined);
      } else {
        // No external config: fall back to static if exists, else use base path only
        merged[name] = modelsConfig[name] ? normalizeModelUrls({ ...modelsConfig[name] }) : normalizeModelUrls({ path: base.path });
        console.log('[MergedModel] No external config for', name, merged[name]);
      }
    });
    return merged;
  }, [dbModelsFormatted, externalConfigs, normalizeModelUrls]);

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedModel');
    // Start with saved if it exists in static config; we'll revalidate against DB after load
    return saved && modelsConfig[saved] ? saved : "Undercounter";
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
      console.log('🔁 Auto-selected model:', next);
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

  await fetch(`${API_BASE_URL}/api/activity/log`, {
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
