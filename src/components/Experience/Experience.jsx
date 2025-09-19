// src/components/Experience/Experience.jsx
import * as THREE from "three";
import React, { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { useFrame } from '@react-three/fiber';
import { useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, Html } from "@react-three/drei";
// import { modelsConfig } from "../../modelsConfig"; // Removed - using dynamic configs only
import { useInteractions } from "./hooks/useInteractions";
import { logActivity } from "../../api/user";
import { 
  autoFitModel, 
  applyModelTransform, 
  calculateOptimalCameraPosition,
  getModelCenter,
  getModelSize 
} from "../../utils/modelPositioning";

export function Experience({ 
  modelName, 
  modelConfig, 
  allModels, 
  onTogglePart, 
  onApiReady, 
  applyRequest, 
  userPermissions, 
  user, 
  onModelError,
  onModelTransformChange
}) {
  // Use provided modelConfig or fallback to allModels
  const config = modelConfig || (allModels && allModels[modelName]);

  // Debug logging: set `debugLogs: true` in model config to enable
  const debug = !!config?.debugLogs;
  const loggedKeysRef = useRef({});
  const logOnce = (key, ...args) => {
    if (!debug) return;
    if (loggedKeysRef.current[key]) return;
    loggedKeysRef.current[key] = true;
    console.log(...args);
  };
  
  // Guard against undefined config
  if (!config) {
    console.error(`Model configuration not found for: ${modelName}`);
    return <mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="red" /></mesh>;
  }

  // Guard against invalid model paths
  if (config.path && config.path.includes('blob:')) {
    console.warn(`Skipping blob URL model: ${modelName}`);
    return <mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="yellow" /></mesh>;
  }
  
  const { camera, gl, scene: r3fScene } = useThree();
  const orbitControlsRef = useRef();
  const modelGroupRef = useRef();
  const [hoveredObject, setHoveredObject] = useState(null);
  const [lights, setLights] = useState([]);
  const [doorSelections, setDoorSelections] = useState({ count: 0, selection: 0 });
  const [appliedTextures, setAppliedTextures] = useState({});
  const [currentModelTransform, setCurrentModelTransform] = useState(null);
  const allObjects = useRef({});
  const clickHelpers = useRef(new Map());
  const originalMaterials = useRef(new Map()); // Store original materials for glow restoration

  // Allow interactionGroups to be provided under metadata as well
  const interactionGroups = config.interactionGroups || config.metadata?.interactionGroups || [];

  // Hook that provides door/drawer animation helpers (GSAP-based)
  const {
    togglePart: interactionsTogglePart,
    toggleDoor,
    toggleDrawer,
    isInteractiveObject: interactionsIsInteractiveObject,
    findInteractiveObjectName,
    getInteractionType: interactionsGetInteractionType
  } = useInteractions(allObjects, config);

  // Load the main model (base model)
  logOnce('load_model', 'Loading main model from:', config.path);
  logOnce('config_snapshot', 'Full config object:', JSON.stringify(config, null, 2));
  const { scene: mainScene } = useGLTF(config.path);
  logOnce('main_scene_loaded', 'Main scene loaded:', mainScene ? 'success' : 'failed');

  // Load ALL additional assets dynamically from config.assets (no manual config needed)
  const assetScenes = {};
  if (config.assets && typeof config.assets === 'object') {
    logOnce('assets_list', '[ASSETS] Loading assets from config:', Object.keys(config.assets));
    Object.entries(config.assets).forEach(([assetKey, assetPath]) => {
      if (assetPath && typeof assetPath === 'string') {
        try {
          const { scene } = useGLTF(assetPath);
          assetScenes[assetKey] = scene;
          logOnce(`asset_loaded_${assetKey}`, `[ASSET] ${assetKey} loaded from: ${assetPath}`);
          let meshCount = 0;
          scene.traverse(obj => { if (obj.isMesh) meshCount++; });
          logOnce(`asset_meshcount_${assetKey}`, `[ASSET] ${assetKey} mesh count: ${meshCount}`);
        } catch (error) {
          if (debug) console.error(`[ASSET] Failed to load ${assetKey} from ${assetPath}:`, error);
        }
      }
    });
  } else {
    logOnce('assets_none', '[ASSETS] No assets found in config');
  }

  // Combine main scene with ALL asset scenes for placement calculations
  const allScenes = { base: mainScene, ...assetScenes };
  // Stable key for assetScenes to use in hook dependency arrays (avoids changing-length deps)
  const assetSceneKeys = Object.keys(assetScenes).sort().join("|");

  // Add all asset scenes to the main group for rendering
  useEffect(() => {
    if (!modelGroupRef.current) return;
    // Defensive removal: iterate copy of children to avoid mutated array issues
    try {
      const childrenCopy = Array.from(modelGroupRef.current.children || []);
      childrenCopy.forEach((child) => {
        if (!child) return; // skip falsy entries
        try {
          if (modelGroupRef.current && typeof modelGroupRef.current.remove === 'function') {
            modelGroupRef.current.remove(child);
          } else {
            // Fallback: manually splice out if remove is not available
            const idx = modelGroupRef.current.children.indexOf(child);
            if (idx >= 0) modelGroupRef.current.children.splice(idx, 1);
          }
        } catch (err) {
          console.warn('[SCENE] Error removing child, attempting safe shift:', err);
          // Remove leading falsy entries if necessary
          try { modelGroupRef.current.children.shift(); } catch (e) { /* ignore */ }
        }
      });
    } catch (outerErr) {
      console.warn('[SCENE] Unexpected error while clearing children:', outerErr);
      // Best-effort fallback: set children to empty array reference
      try { modelGroupRef.current.children = []; } catch (e) { /* ignore */ }
    }

  // Add main scene (guarded)
    if (mainScene && modelGroupRef.current) {
      try {
        if (typeof modelGroupRef.current.add === 'function') {
          modelGroupRef.current.add(mainScene);
        } else if (Array.isArray(modelGroupRef.current.children)) {
          modelGroupRef.current.children.push(mainScene);
        }
        console.log('[SCENE] Main scene added to group');
      } catch (err) {
        console.warn('[SCENE] Failed to add mainScene to group:', err);
      }
    }

    // Add ALL asset scenes dynamically (guard each)
    Object.entries(assetScenes).forEach(([assetKey, scene]) => {
      if (!scene || !modelGroupRef.current) return;
      try {
        if (typeof modelGroupRef.current.add === 'function') {
          modelGroupRef.current.add(scene);
        } else if (Array.isArray(modelGroupRef.current.children)) {
          modelGroupRef.current.children.push(scene);
        }
        console.log(`[SCENE] Asset scene '${assetKey}' added to group`);
      } catch (err) {
        console.warn(`[SCENE] Failed to add asset scene '${assetKey}':`, err);
      }
    });
    // Sanitize the group after modifications to avoid leaving falsy children
    try { sanitizeSceneGraph(modelGroupRef.current); } catch (e) { /* ignore */ }
    // Sanitize the top-level R3F scene as well to catch undefined entries anywhere
    try { if (r3fScene) sanitizeSceneGraph(r3fScene); } catch (e) { /* ignore */ }
  }, [mainScene, assetSceneKeys]);

  // Placement handling (admin transform preferred; else autofit/focused)
  useEffect(() => {
    if (!modelGroupRef.current) return;
    // Wait until main scene is loaded
    if (!mainScene) return;

    const placementMode = config.placementMode || 'autofit';
    const group = modelGroupRef.current;    // Reset any manual transforms first
    group.position.set(0,0,0);
    group.rotation.set(0,0,0);
    group.scale.set(1,1,1);

    // If admin set explicit transform use it
    const hasAdminPos = Array.isArray(config.modelPosition) && config.modelPosition.length === 3;
    const hasAdminRot = Array.isArray(config.modelRotation) && config.modelRotation.length === 3;
    const hasAdminScale = typeof config.modelScale === 'number' && config.modelScale > 0;
    console.log('🧩 Admin transform presence:', { hasAdminPos, hasAdminRot, hasAdminScale, placementMode });
    if (hasAdminPos || hasAdminRot || hasAdminScale) {
      const transform = {
        position: hasAdminPos ? config.modelPosition : [0,0,0],
        rotation: hasAdminRot ? config.modelRotation : [0,0,0],
        scale: hasAdminScale ? config.modelScale : 1
      };
      console.log('🛠️ Applying admin transform', transform);
      applyModelTransform(group, transform);
      // Optionally adjust camera to frame model
      autoFitModel(group, camera, orbitControlsRef.current, { centerModel: false, adjustCamera: true });
    } else {
      // Else use placement mode
      if (placementMode === 'autofit') {
        console.log('🧭 Applying auto-fit placement');
        autoFitModel(group, camera, orbitControlsRef.current, { centerModel: true, adjustCamera: true });
      } else {
        console.log('🎯 Applying focused camera placement');
        autoFitModel(group, camera, orbitControlsRef.current, { centerModel: false, adjustCamera: true });
      }
    }

    const applied = {
      position: group.position.toArray(),
      rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
      scale: group.scale.x // uniform
    };
  console.log('📐 Final applied group transform:', applied);
  setCurrentModelTransform(applied);
    if (onModelTransformChange) onModelTransformChange(applied);
  }, [
    config?.placementMode,
    config?.modelPosition,
    config?.modelRotation,
    config?.modelScale,
    // Use all asset scenes dynamically (stable key)
    mainScene,
    assetSceneKeys,
    camera
  ]);

  // Clear applied textures when model changes
  useEffect(() => {
    console.log(`📋 Model changed to: ${modelName}, clearing applied textures`);
    setAppliedTextures({});
  }, [modelName]);

  // (Initial transform handled by placement effect above)

  // Error boundary effect to detect failed model loads
  useEffect(() => {
    const errorHandler = (event) => {
      if (event.target.src && event.target.src.includes('/models/')) {
        console.error(`Model loading failed: ${modelName}`, event.target.src);
        if (onModelError && modelName !== 'Undercounter') {
          onModelError(modelName);
        }
      }
    };

    window.addEventListener('error', errorHandler, true);
    return () => window.removeEventListener('error', errorHandler, true);
  }, [modelName, onModelError]);

  // Activity logging function
  const logInteraction = useCallback(async (action, details = {}) => {
    try {
      if (user && user.id) {
        await logActivity({
          action,
          modelName: config?.name || modelName,
          partName: details.partName,
          widgetType: details.widgetType,
          details,
          visibility: user.role === "admin" ? "admin" : "user"
        });
      }
    } catch (error) {
      console.error("Failed to log interaction:", error);
    }
  }, [user, modelName, config]);

  // -----------------------
  // Light helpers
  // -----------------------
  // Try to resolve a light object from the scene using multiple strategies
  const resolveLightObject = useCallback((lightConfig) => {
    if (!lightConfig) return null;
    const byName = allObjects.current[lightConfig.name];
    if (byName && byName.isPointLight) return byName;

    // Fallback: try meshName if provided in config
    if (lightConfig.meshName) {
      const byMesh = allObjects.current[lightConfig.meshName];
      if (byMesh && byMesh.isPointLight) return byMesh;
    }

    // Last resort: fuzzy search for a PointLight whose name includes provided identifiers
    const needleNames = [lightConfig.name, lightConfig.meshName].filter(Boolean).map((s) => String(s).toLowerCase());
    const entries = Object.entries(allObjects.current || {});
    for (const [key, obj] of entries) {
      if (obj && obj.isPointLight) {
        const keyL = String(key).toLowerCase();
        if (needleNames.some((n) => keyL.includes(n))) {
          return obj;
        }
      }
    }

    return null;
  }, []);

  const initializeLights = useCallback(() => {
    // Check both config.lights and config.metadata.lights for light configuration
    const allLights = (config.lights && config.lights.length > 0) ? config.lights : (config.metadata?.lights || []);
    if (!allLights.length || !allObjects.current) return;
    const lightObjects = [];

    allLights.forEach((lightConfig) => {
      const lightObject = resolveLightObject(lightConfig);
      if (lightObject && lightObject.isPointLight) {
        const initialIntensity = lightObject.intensity || 1.0;
        const shouldBeOn = lightConfig.defaultState === "on";
        const targetIntensity = shouldBeOn ? (lightConfig.intensity || initialIntensity) : 0;

        lightObject.intensity = targetIntensity;
        lightObject.visible = shouldBeOn;

        lightObjects.push({
          ...lightConfig,
          object: lightObject,
          initialIntensity,
          isOn: shouldBeOn,
        });
      } else {
        console.warn(`⚠️ Light object not found or not a PointLight for config entry:`, lightConfig);
      }
    });

    setLights(lightObjects);
  }, [config.lights, config.metadata?.lights, resolveLightObject]);

  // -----------------------
  // Glow Effects for Meshes
  // -----------------------
  const applyGlowToMeshes = useCallback((meshNames, glowIntensity = 0.5, glowColor = "#ffffff") => {
    if (!meshNames || !Array.isArray(meshNames)) return;

    meshNames.forEach((meshName) => {
      const meshObj = getObjectByLogicalName(meshName);
      if (!meshObj) {
        console.warn(`Glow mesh "${meshName}" not found`);
        return;
      }

      meshObj.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((material, index) => {
            if (!material) return;

            // Store original material properties if not already stored
            const materialKey = `${meshName}_${index}`;
            if (!originalMaterials.current.has(materialKey)) {
              originalMaterials.current.set(materialKey, {
                emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0x000000),
                emissiveIntensity: material.emissiveIntensity || 0,
                emissiveMap: material.emissiveMap ? material.emissiveMap.clone() : null
              });
            }

            // Apply glow effect
            if (!material.emissive) {
              material.emissive = new THREE.Color(glowColor);
            } else {
              material.emissive.copy(new THREE.Color(glowColor));
            }

            material.emissiveIntensity = glowIntensity;
            material.needsUpdate = true;
          });
        }
      });

      console.log(`✨ Applied glow to mesh: ${meshName}`);
    });
  }, []);

  const removeGlowFromMeshes = useCallback((meshNames) => {
    if (!meshNames || !Array.isArray(meshNames)) return;

    meshNames.forEach((meshName) => {
      const meshObj = getObjectByLogicalName(meshName);
      if (!meshObj) return;

      meshObj.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((material, index) => {
            // Restore original material properties
            const materialKey = `${meshName}_${index}`;
            const originalProps = originalMaterials.current.get(materialKey);

            if (originalProps) {
              if (material.emissive) {
                material.emissive.copy(originalProps.emissive);
              }
              material.emissiveIntensity = originalProps.emissiveIntensity;
              material.emissiveMap = originalProps.emissiveMap;
              material.needsUpdate = true;
            }
          });
        }
      });

      console.log(`💫 Removed glow from mesh: ${meshName}`);
    });
  }, []);

  const toggleLight = useCallback(async (lightName, turnOn) => {
    // Check both config.lights and config.metadata.lights for light configuration
    const mergedLights = (config.lights && config.lights.length > 0) ? config.lights : (config.metadata?.lights || []);
    const lightConfig = mergedLights.find((l) => l.name === lightName) || mergedLights.find((l) => l.meshName === lightName);
    if (!lightConfig) {
      console.warn(`Light config not found for "${lightName}" in config.lights or config.metadata.lights`);
      return;
    }

    // Prefer object from state if available
    const stateEntry = lights.find((l) => l.name === lightName) || lights.find((l) => l.meshName === lightName);
    const lightObj = stateEntry?.object || resolveLightObject(lightConfig);
    if (!lightObj || !lightObj.isPointLight) {
      console.warn(`⚠️ Could not resolve light object for "${lightName}"`);
      return;
    }

    lightObj.intensity = turnOn ? (lightConfig.intensity || stateEntry?.initialIntensity || 1.0) : 0;
    lightObj.visible = !!turnOn;
    setLights((prev) => prev.map((l) => (l.name === (stateEntry?.name || lightName) ? { ...l, isOn: !!turnOn } : l)));

    // Handle glow effects for specified meshes
    if (lightConfig.glowMeshes && lightConfig.glowMeshes.length > 0) {
      if (turnOn) {
        applyGlowToMeshes(
          lightConfig.glowMeshes,
          lightConfig.glowIntensity || 0.5,
          lightConfig.glowColor || "#ffffff"
        );
      } else {
        removeGlowFromMeshes(lightConfig.glowMeshes);
      }
    }

    // Log light action
    await logInteraction("LIGHT_TOGGLE", {
      lightName,
      state: turnOn ? "ON" : "OFF",
      intensity: lightObj.intensity,
      glowMeshes: lightConfig.glowMeshes,
      widgetType: "light"
    });
  }, [config.lights, config.metadata?.lights, lights, resolveLightObject, logInteraction, applyGlowToMeshes, removeGlowFromMeshes]);

  const toggleAllLights = useCallback(async (turnOn) => {
    const mergedLights = (config.lights && config.lights.length > 0) ? config.lights : (config.metadata?.lights || []);
    lights.forEach((light) => {
      const lightObj = light.object || resolveLightObject(light);
      if (lightObj && lightObj.isPointLight) {
        const configLight = mergedLights.find((l) => l.name === light.name || l.meshName === light.name) || {};
        lightObj.intensity = turnOn ? (configLight.intensity || light.initialIntensity || 1.0) : 0;
        lightObj.visible = !!turnOn;

        // Handle glow effects for this light
        if (configLight.glowMeshes && configLight.glowMeshes.length > 0) {
          if (turnOn) {
            applyGlowToMeshes(
              configLight.glowMeshes,
              configLight.glowIntensity || 0.5,
              configLight.glowColor || "#ffffff"
            );
          } else {
            removeGlowFromMeshes(configLight.glowMeshes);
          }
        }
      }
    });
    setLights((prev) => prev.map((l) => ({ ...l, isOn: !!turnOn })));

    // Log all lights action
    await logInteraction("ALL_LIGHTS_TOGGLE", {
      state: turnOn ? "ON" : "OFF",
      widgetType: "light"
    });
  }, [lights, config.lights, config.metadata?.lights, resolveLightObject, logInteraction, applyGlowToMeshes, removeGlowFromMeshes]);

  // -----------------------
  // Glow Effects for Meshes
  // -----------------------
  // Door presets, interactions
  // -----------------------
  // Helpers to operate on whole logical objects (entire subtree)
  const setObjectVisibleRecursive = useCallback((obj, visible) => {
    if (!obj) return;
    obj.traverse((o) => {
      if (o.isObject3D) {
        o.visible = visible;
        // When hiding, also disable raycasting to avoid hidden parts intercepting clicks.
        // Save original raycast so we can restore it when showing again.
        try {
          if (!visible) {
            if (!o.userData) o.userData = {};
            if (!o.userData._origRaycast && typeof o.raycast === 'function') {
              o.userData._origRaycast = o.raycast;
              o.raycast = () => [];
            }
          } else {
            if (o.userData && o.userData._origRaycast) {
              o.raycast = o.userData._origRaycast;
              delete o.userData._origRaycast;
            }
          }
        } catch (err) {
          // Non-critical: if an object doesn't support raycast mutation, ignore.
          if (debug) console.warn('Could not toggle raycast on object', o.name, err);
        }
      }
    });
  }, []);

  const getObjectByLogicalName = useCallback((name) => {
    if (!name) return null;
    const obj = allObjects.current[name];
    if (obj) return obj;
    // Fallback: try a startsWith/contains fuzzy match on keys
    const key = String(name).toLowerCase();
    const entries = Object.entries(allObjects.current || {});
    let best = null;
    let bestName = null;
    for (const [n, o] of entries) {
      const nl = String(n).toLowerCase();
      if (nl === key) return o;
      if (!best && (nl.startsWith(key) || nl.includes(key))) {
        best = o;
        bestName = n;
      }
    }
    // Debug fuzzy matching
    if (best) {
      console.log(`🔍 Fuzzy match: "${name}" -> "${bestName}"`);
    } else {
      console.log(`🔍 No fuzzy match found for: "${name}"`);
    }
    return best;
  }, []);

  // Simple sanitization: remove invalid scene children only when needed
  const sanitizeSceneGraph = useCallback((root) => {
    if (!root || !root.children) return;
    try {
      const filtered = root.children.filter((c) => c && typeof c === 'object' && typeof c.visible !== 'undefined');
      if (filtered.length !== root.children.length) {
        root.children = filtered;
      }
    } catch (err) {
      // Silent fail
    }
  }, []);

  // Removed per-frame sanitization to improve performance

  // Use the toggle from the interactions hook which performs animated transitions
  const togglePart = interactionsTogglePart;

  const isInteractiveObject = interactionsIsInteractiveObject;

  const getInteractionType = interactionsGetInteractionType;

  const applyDoorSelection = useCallback(async (doorCount, position, doorType = "solid") => {
    if (!config?.presets?.doorSelections) return;
    const selection = config.presets.doorSelections?.[doorCount]?.[position];
    if (!selection) return;

    // Update door selections state
    setDoorSelections({ count: doorCount, selection: position, doorType });

  const visibleDoors = selection.doors || [];
  const visiblePanels = selection.panels || [];
    const hiddenParts = new Set(selection.hide || []);
  const showGlass = doorType === "glass";

  // Support doorTypeMap defined either at top-level or under presets
  const doorTypeMap = config.doorTypeMap || config.presets?.doorTypeMap || {};

  // Apply visibility based on dynamic asset scenes
  if (mainScene) mainScene.traverse((o) => o.isObject3D && (o.visible = true));
  
  // Apply visibility to all asset scenes dynamically
  Object.entries(assetScenes).forEach(([assetKey, scene]) => {
    if (scene) {
      if (assetKey === 'doors') {
        scene.traverse((o) => o.isObject3D && (o.visible = false));
        scene.visible = true;
      } else if (assetKey === 'glassDoors') {
        scene.traverse((o) => o.isObject3D && (o.visible = false));
        scene.visible = true;
      } else if (assetKey === 'drawers') {
        scene.traverse((o) => o.isObject3D && (o.visible = true));
      } else {
        // For other assets, make them visible by default
        scene.traverse((o) => o.isObject3D && (o.visible = true));
      }
    }
  });

  visibleDoors.forEach((doorName) => {
    // Always hide both solid and glass versions first (prevents overlap)
    setObjectVisibleRecursive(getObjectByLogicalName(doorName), false);
    if (doorTypeMap?.toGlass?.[doorName]) {
      setObjectVisibleRecursive(getObjectByLogicalName(doorTypeMap.toGlass[doorName]), false);
    }
    // Show only the selected type
    let targetName = doorName;
    if (showGlass && doorTypeMap?.toGlass?.[doorName]) {
      targetName = doorTypeMap.toGlass[doorName];
    }
    setObjectVisibleRecursive(getObjectByLogicalName(targetName), true);
  });

    visiblePanels.forEach((panelName) => {
      const obj = getObjectByLogicalName(panelName);
      if (obj) setObjectVisibleRecursive(obj, true);
    });


    hiddenParts.forEach((name) => {
      const obj = getObjectByLogicalName(name);
      if (obj) setObjectVisibleRecursive(obj, false);
    });

    // After hiding, show all drawers not in hiddenParts (universal/config-driven)
    if (interactionGroups) {
      interactionGroups.forEach((group) => {
        if (group.type === "drawers") {
          group.parts.forEach((drawer) => {
            if (!hiddenParts.has(drawer.name)) {
              const drawerObj = getObjectByLogicalName(drawer.name);
              if (drawerObj) setObjectVisibleRecursive(drawerObj, true);
            }
          });
        }
      });
    }

    // ensure drawers initial positions if any
    if (interactionGroups) {
      interactionGroups.forEach((group) => {
        if (group.type === "drawers") {
          group.parts.forEach((drawer) => {
            const drawerObj = getObjectByLogicalName(drawer.name);
            if (!drawerObj) return;
            if (!hiddenParts.has(drawer.name)) {
              if (drawer.closedPosition !== undefined) {
                const axis = drawer.positionAxis || "z";
                drawerObj.position[axis] = drawer.closedPosition;
              }
            }
          });
        }
      });
    }

    // Log door preset selection
    await logInteraction("DOOR_PRESET_APPLIED", {
      doorCount,
      position,
      doorType,
      visibleDoors,
      hiddenParts: Array.from(hiddenParts),
      widgetType: "doorPreset"
    });
  }, [config, logInteraction]);

  // Reset function for Undercounter model
  const resetToInitialState = useCallback(async () => {
    if (!config) return;

    console.log('🔄 Resetting to initial state...');

    // Reset all scenes to initial visibility
    if (mainScene) mainScene.traverse((o) => o.isObject3D && (o.visible = true));
    Object.entries(assetScenes).forEach(([assetKey, scene]) => {
      if (scene) {
        scene.traverse((o) => o.isObject3D && (o.visible = true));
      }
    });

    // Apply hiddenInitially
    if (Array.isArray(config.hiddenInitially)) {
      config.hiddenInitially.forEach((name) => {
        const obj = getObjectByLogicalName(name);
        if (obj) setObjectVisibleRecursive(obj, false);
      });
    }

    // Reset interaction groups to initial state
    if (Array.isArray(interactionGroups)) {
      interactionGroups.forEach((group) => {
        if (!Array.isArray(group.parts)) return;
        group.parts.forEach((part) => {
          const obj = allObjects.current[part.name];
          if (!obj) return;

          // Reset visibility
          if (part.initialState?.visible !== undefined) {
            obj.visible = part.initialState.visible;
          }

          // Reset position
          if (part.initialState?.position) {
            const p = part.initialState.position;
            if (p.x !== undefined) obj.position.x = p.x;
            if (p.y !== undefined) obj.position.y = p.y;
            if (p.z !== undefined) obj.position.z = p.z;
          }

          // Reset rotation
          if (part.initialState?.rotation) {
            const r = part.initialState.rotation;
            if (r.x !== undefined) obj.rotation.x = r.x;
            if (r.y !== undefined) obj.rotation.y = r.y;
            if (r.z !== undefined) obj.rotation.z = r.z;
          }

          // Reset scale
          if (part.initialState?.scale) {
            const s = part.initialState.scale;
            if (s.x !== undefined) obj.scale.x = s.x;
            if (s.y !== undefined) obj.scale.y = s.y;
            if (s.z !== undefined) obj.scale.z = s.z;
          }
        });
      });
    }

    // Reset door selections state
    setDoorSelections({ count: 0, selection: 0 });

    // Reset applied textures
    setAppliedTextures({});

    // Log reset action
    await logInteraction("MODEL_RESET", {
      widgetType: "reset",
      modelName: config.name || modelName
    });

    console.log('✅ Model reset to initial state');
  }, [config, logInteraction]);

  useEffect(() => {
    if (onTogglePart) {
      onTogglePart(() => togglePart);
    }
  }, [onTogglePart, togglePart]);

  // -----------------------
  // Click helpers are created below inside the object-map effect so they are built
  // after `allObjects.current` is populated. This avoids race conditions where
  // helpers were created before objects existed and required many clicks.
  // -----------------------

  // -----------------------
  // Build object map + material logging
  // -----------------------
  useEffect(() => {
    allObjects.current = {};
    // Use all scenes: main scene + ALL asset scenes dynamically
    const roots = [mainScene, ...Object.values(assetScenes)].filter(Boolean);
    if (roots.length === 0) return;

    // collect materials for debugging
    const materials = new Set();
    roots.forEach((root) => {
      root.traverse((child) => {
        if (child.isObject3D && child.name) {
          allObjects.current[child.name] = child;
        }
        // collect material names
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => materials.add(m?.name || "(unnamed)"));
          } else {
            materials.add(child.material.name || "(unnamed)");
          }
        }
      });
    });

    // existing initialization: set all scenes visible by default
    if (mainScene) {
      mainScene.visible = true;
      mainScene.traverse((o) => (o.visible = true));
    }

    // Set ALL asset scenes visible by default
    Object.entries(assetScenes).forEach(([assetKey, scene]) => {
      if (scene) {
        scene.visible = true;
        scene.traverse((o) => (o.visible = true));
        console.log(`[VISIBILITY] Asset scene '${assetKey}' set to visible`);
      }
    });

    // Debug: Log all object names in the scene
    console.log(`🔍 MODEL DEBUG for "${modelName}":`);
    console.log('📦 All objects found:', Object.keys(allObjects.current));
    
    // Debug: Check interaction groups vs actual objects
    if (Array.isArray(interactionGroups)) {
      console.log('⚙️ Interaction Groups:');
      interactionGroups.forEach((group, i) => {
        console.log(`  Group ${i}: ${group.type} - ${group.label}`);
        if (Array.isArray(group.parts)) {
          group.parts.forEach(part => {
            const exists = allObjects.current[part.name] ? '✅' : '❌';
            console.log(`    ${exists} ${part.name} (${part.rotationAxis || part.positionAxis || 'no axis'})`);
          });
        }
      });
    }

    // hiddenInitially (operate on whole objects)
    if (Array.isArray(config.hiddenInitially)) {
      config.hiddenInitially.forEach((name) => {
        const obj = getObjectByLogicalName(name);
        if (obj) setObjectVisibleRecursive(obj, false);
      });
    }

    // init interactionGroups initialState
    if (Array.isArray(interactionGroups)) {
      interactionGroups.forEach((group) => {
        if (!Array.isArray(group.parts)) return;
        group.parts.forEach((part) => {
          const obj = allObjects.current[part.name];
          if (!obj) return;
          if (part.initialState?.visible !== undefined) obj.visible = part.initialState.visible;
          if (part.initialState?.position) {
            const p = part.initialState.position;
            if (p.x !== undefined) obj.position.x = p.x;
            if (p.y !== undefined) obj.position.y = p.y;
            if (p.z !== undefined) obj.position.z = p.z;
          }
          if (part.initialState?.rotation) {
            const r = part.initialState.rotation;
            if (r.x !== undefined) obj.rotation.x = r.x;
            if (r.y !== undefined) obj.rotation.y = r.y;
            if (r.z !== undefined) obj.rotation.z = r.z;
          }
          if (part.initialState?.scale) {
            const s = part.initialState.scale;
            if (s.x !== undefined) obj.scale.x = s.x;
            if (s.y !== undefined) obj.scale.y = s.y;
            if (s.z !== undefined) obj.scale.z = s.z;
          }
        });
      });
    }

    // camera (support camera in either config.camera or config.metadata.camera)
    const cameraCfg = config.camera || config.metadata?.camera;
    if (cameraCfg) {
      console.log('🎥 Setting camera from config:', cameraCfg);
      const { position, target, fov } = cameraCfg;
      
      if (position) {
        console.log('📍 Setting camera position to:', position);
        camera.position.set(...position);
      }
      
      if (fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      
      // Force OrbitControls to update after camera changes
      setTimeout(() => {
        if (orbitControlsRef.current) {
          console.log('🔄 Updating OrbitControls');
          // Set the target if specified
          if (target) {
            orbitControlsRef.current.target.set(...target);
          }
          orbitControlsRef.current.update();
        }
      }, 100);
    } else {
      console.log('❌ No camera config found in:', config);
    }

    // Log model load
    logInteraction("MODEL_LOADED", {
      modelName: config.name || modelName,
      hasLights: (config.lights && config.lights.length > 0) || (config.metadata?.lights && config.metadata.lights.length > 0),
      interactiveParts: interactionGroups?.reduce((count, group) => count + (group.parts?.length || 0), 0) || 0
    });
  }, [mainScene, assetSceneKeys, modelName, config, camera, interactionGroups, logInteraction]);

  // init lights when objects ready
  useEffect(() => {
    if (Object.keys(allObjects.current).length > 0) initializeLights();
  }, [allObjects.current, initializeLights]);

  // -----------------------
  // applyTexture & API exposure
  // -----------------------
  useEffect(() => {
    // Helper: load a texture (from URL or dataURL) only once and return Promise
    const loadTextureOnce = (src) =>
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          src,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            resolve(tex);
          },
          undefined,
          (err) => reject(err)
        );
      });

    // Apply texture to a single object (clones materials to avoid global mutation)
    const applyTextureToObject = async (obj, texture, mappingConfig = {}) => {
      console.log(`🔧 applyTextureToObject called with:`, { obj: !!obj, texture: !!texture, mappingConfig });
      
      if (!obj) {
        console.warn(`🔧 applyTextureToObject: No object provided`);
        return;
      }
      
      if (!texture) {
        console.warn(`🔧 applyTextureToObject: No texture provided`);
        return;
      }
      
      // apply mapping configs
      if (mappingConfig.flipY !== undefined) texture.flipY = mappingConfig.flipY;
      if (mappingConfig.offset) texture.offset.set(mappingConfig.offset.x || 0, mappingConfig.offset.y || 0);
      if (mappingConfig.center) texture.center.set(mappingConfig.center.x || 0.5, mappingConfig.center.y || 0.5);
      if (mappingConfig.rotation !== undefined) texture.rotation = mappingConfig.rotation;
      if (mappingConfig.repeat) texture.repeat.set(mappingConfig.repeat.x || 1, mappingConfig.repeat.y || 1);
      if (mappingConfig.wrapS && THREE[mappingConfig.wrapS]) texture.wrapS = THREE[mappingConfig.wrapS];
      if (mappingConfig.wrapT && THREE[mappingConfig.wrapT]) texture.wrapT = THREE[mappingConfig.wrapT];
      texture.needsUpdate = true;

      let materialsModified = 0;

      // traverse and replace/cloned materials
      if (obj.isMesh && obj.material) {
        console.log(`🔧 Applying texture to mesh with material:`, obj.material);
        const newMat = Array.isArray(obj.material) ? obj.material.map((m) => m.clone()) : obj.material.clone();
        if (Array.isArray(newMat)) {
          newMat.forEach((m) => {
            if (m && "map" in m) {
              m.map = texture;
              m.needsUpdate = true;
              materialsModified++;
            }
          });
        } else {
          if ("map" in newMat) {
            newMat.map = texture;
            newMat.needsUpdate = true;
            materialsModified++;
          }
        }
        obj.material = newMat;
      } else if (obj.children && obj.children.length > 0) {
        console.log(`🔧 Applying texture to object with ${obj.children.length} children`);
        obj.traverse((child) => {
          if (child.isMesh && child.material) {
            const newMat = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
            if (Array.isArray(newMat)) {
              newMat.forEach((m) => {
                if (m && "map" in m) {
                  m.map = texture;
                  m.needsUpdate = true;
                  materialsModified++;
                }
              });
            } else {
              if ("map" in newMat) {
                newMat.map = texture;
                newMat.needsUpdate = true;
                materialsModified++;
              }
            }
            child.material = newMat;
          }
        });
      }
      
      console.log(`🔧 applyTextureToObject completed: ${materialsModified} materials modified`);
    };



    // Main applyTexture function (supports File, dataURL string, or remote path)
    // mappingConfig may include a `persist` boolean to indicate whether the applied texture
    // should be saved into the model's appliedTextures state (persist=true by default).
    const applyTexture = async (partName, fileOrPath, mappingConfig = {}, persist = mappingConfig.persist !== undefined ? mappingConfig.persist : false) => {
      try {
        // Debug: Log what we're searching for and available objects
        console.log(`🔍 Searching for object: "${partName}"`);
        console.log('📦 Available objects:', Object.keys(allObjects.current || {}));

        // Use logical name resolver which performs fuzzy matching against allObjects
        const targetObj = getObjectByLogicalName(partName);

        // Show the result of the search
        if (targetObj) {
          console.log(`✅ Found object: "${targetObj.name}" for search "${partName}"`);
        } else {
          console.log(`❌ Object "${partName}" not found. Available objects:`, Object.keys(allObjects.current || {}));
        }

        // Handle color-only applies (no fileOrPath but mappingConfig.tintColor / color)
        const tintColor = mappingConfig.tintColor || mappingConfig.color || null;
        if ((fileOrPath === null || fileOrPath === undefined) && tintColor) {

          // If targeting material name (special __material: prefix), apply to materials
          if (typeof partName === 'string' && partName.startsWith('__material:')) {
            const materialName = partName.replace('__material:', '').toLowerCase();
            let appliedCount = 0;

            Object.values(allObjects.current).forEach((obj) => {
              if (obj && obj.isMesh && obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((mat) => {
                  if (mat && mat.name && mat.name.toLowerCase() === materialName && mat.color) {
                    mat.color.set(tintColor);
                    mat.needsUpdate = true;
                    appliedCount++;
                  }
                });
              }
            });

            console.log(`Applied color to ${appliedCount} material(s)`);
            return;
          }

          // Otherwise, apply color to the specific object (and its children)
          const targetObjForColor = getObjectByLogicalName(partName);
          if (!targetObjForColor) {
            console.warn(`applyTexture (color): target object '${partName}' not found`);
            return;
          }

          let modified = 0;
          targetObjForColor.traverse((child) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat) => {
                if (mat && mat.color) {
                  mat.color.set(tintColor);
                  mat.needsUpdate = true;
                  modified++;
                }
              });
            }
          });

          console.log(`Applied color to ${modified} material(s) for object '${partName}'`);
          return;
        }

        // Handle texture application
        let textureSrc = null;
        let textureServerPath = null;
        
        if (fileOrPath instanceof File) {
          // For preview-only applies we avoid uploading files to the server.
          if (persist === false) {
            console.log(`� Preview apply: reading file as data URL (no upload): ${fileOrPath.name}`);
            textureSrc = await new Promise((res, rej) => {
              const reader = new FileReader();
              reader.onload = (ev) => res(ev.target.result);
              reader.onerror = (err) => rej(err);
              reader.readAsDataURL(fileOrPath);
            });
            textureServerPath = null;
          } else {
            console.log(`📤 Uploading file to server: ${fileOrPath.name}`);
            // Upload file to server
            const formData = new FormData();
            formData.append('texture', fileOrPath);
            try {
              const uploadResponse = await fetch('http://localhost:5000/api/upload-texture', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
              });
              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                textureServerPath = uploadResult.path;
                textureSrc = uploadResult.path;
                console.log(`✅ File uploaded to server: ${textureServerPath}`);
              } else {
                console.warn(`⚠️ Server upload failed, using data URL as fallback`);
                textureSrc = await new Promise((res, rej) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => res(ev.target.result);
                  reader.onerror = (err) => rej(err);
                  reader.readAsDataURL(fileOrPath);
                });
              }
            } catch (uploadError) {
              console.warn(`⚠️ Upload error, using data URL as fallback:`, uploadError);
              textureSrc = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = (ev) => res(ev.target.result);
                reader.onerror = (err) => rej(err);
                reader.readAsDataURL(fileOrPath);
              });
            }
          }
        } else if (typeof fileOrPath === "string") {
          textureSrc = fileOrPath;
          textureServerPath = fileOrPath;
        } else {
          console.warn("applyTexture: invalid fileOrPath", fileOrPath);
          return;
        }

        console.log(`🔍 Texture source resolved to:`, textureSrc);

        // Load texture once
        const texture = await loadTextureOnce(textureSrc);
        console.log(`🔍 Texture loaded successfully:`, !!texture);

        if (!targetObj) {
          if (typeof partName === 'string' && partName.startsWith('__material:')) {
            const materialNameRaw = partName.replace('__material:', '');
            const materialName = String(materialNameRaw || '').toLowerCase();
            let appliedCount = 0;
            Object.values(allObjects.current).forEach((obj) => {
              if (!obj) return;
              const checkAndApply = (mesh) => {
                if (!mesh || !mesh.material) return false;
                if (Array.isArray(mesh.material)) {
                  const has = mesh.material.some((m) => String(m?.name || '(unnamed)').toLowerCase() === materialName);
                  if (has) {
                    applyTextureToObject(mesh, texture, mappingConfig);
                    return true;
                  }
                } else {
                  if (String(mesh.material?.name || '(unnamed)').toLowerCase() === materialName) {
                    applyTextureToObject(mesh, texture, mappingConfig);
                    return true;
                  }
                }
                return false;
              };

              if (obj.isMesh) {
                if (checkAndApply(obj)) appliedCount++;
              } else if (obj.children && obj.children.length) {
                try {
                  obj.traverse((child) => {
                    if (child && child.isMesh && checkAndApply(child)) appliedCount++;
                  });
                } catch (e) {
                  console.warn('Skipping traversal for object during material match:', obj.name, e);
                }
              }
            });

            // If nothing matched, show warning
            if (appliedCount === 0) {
              console.warn(`No material found matching '${materialNameRaw}'`);
            }
            // Log material-based texture application
            logInteraction('TEXTURE_APPLIED_MATERIAL', {
              materialName,
              appliedCount,
              textureSource: fileOrPath instanceof File ? fileOrPath.name : fileOrPath,
              mappingConfig,
              widgetType: 'texture'
            });

            console.log(`✅ Applied texture to ${appliedCount} mesh(es) using material "${materialName}"`);

            // Sanitize after material operations to clean up any invalid objects
            try { sanitizeSceneGraph(modelGroupRef.current); } catch (e) { /* ignore */ }

            return;
          }

          console.warn(`applyTexture: object "${partName}" not found; no action taken`);
          return;
        }

        // Normal: apply to specific object
        console.log(`🔧 About to apply texture to object "${partName}"`);
        await applyTextureToObject(targetObj, texture, mappingConfig);
        console.log(`🔧 Texture applied to object "${partName}" completed`);

        // Preview-only apply: do not persist into appliedTextures state here.
        // Persistence must be performed explicitly via Save Configuration.
        if (persist !== false) {
          // If someone explicitly requested persistence, log a notice and persist
          console.log(`⚠️ applyTexture: persistence requested for "${partName}" — persisting into appliedTextures`);
          setAppliedTextures(prev => ({
            ...prev,
            [partName]: {
              textureSource: textureServerPath || (fileOrPath instanceof File ? fileOrPath.name : fileOrPath),
              mappingConfig,
              modelName: modelName,
              timestamp: new Date().toISOString()
            }
          }));
        } else {
          console.log(`💡 applyTexture: preview-only apply for "${partName}" (not persisted). Use Save Config to persist.`);
        }

        // Log texture application
        logInteraction("TEXTURE_APPLIED", {
          partName,
          textureSource: fileOrPath instanceof File ? fileOrPath.name : fileOrPath,
          mappingConfig,
          widgetType: "texture"
        });

        console.log(`✅ Applied texture to object "${partName}"`);

        // Sanitize after texture operations to clean up any invalid objects
        try { sanitizeSceneGraph(modelGroupRef.current); } catch (e) { /* ignore */ }

      } catch (err) {
        console.error("❌ Error in applyTexture:", err);
        logInteraction("TEXTURE_ERROR", {
          partName,
          error: err.message,
          widgetType: "texture"
        });
      }
    };

    // Expose API (include lights toggles & helper functions)
    const api = {
      applyDoorSelection,
      resetToInitialState,
      togglePart,
      getAllNodeNames: () => Object.keys(allObjects.current || {}),
      applyTexture,
      isInteractiveObject,
      getInteractionType,
      toggleLight,
      toggleAllLights,
      applyGlowToMeshes,
      removeGlowFromMeshes,
  hasLights: !!((config.lights && config.lights.length > 0) || (config.metadata?.lights && config.metadata.lights.length > 0)),
      lights: lights.reduce((acc, l) => ((acc[l.name] = l.isOn), acc), {}),
      logInteraction, // Expose logging function to other components
      
      // Model positioning functions
      autoFitModel: (options = {}) => {
        if (modelGroupRef.current) {
          console.log('🎯 Auto-fitting model...');
          const result = autoFitModel(modelGroupRef.current, camera, orbitControlsRef.current, {
            centerModel: true,
            centerY: false,
            updateCamera: true,
            fov: camera.fov || 50,
            margin: 1.5,
            ...options
          });
          
          // Update current transform state
          const newTransform = {
            position: modelGroupRef.current.position.toArray(),
            rotation: modelGroupRef.current.rotation.toArray(),
            scale: modelGroupRef.current.scale.x // Assuming uniform scale
          };
          setCurrentModelTransform(newTransform);
          
          console.log('✅ Model auto-fitted:', result);
          return result;
        }
        return null;
      },
      
      updateModelTransform: (transform) => {
        console.log('🎯 Updating model transform:', transform);
        if (modelGroupRef.current) {
          applyModelTransform(modelGroupRef.current, transform);
          setCurrentModelTransform(transform);
          
          if (onModelTransformChange) {
            onModelTransformChange(transform);
          }
        }
      },
      
      updateCameraForModel: () => {
        if (modelGroupRef.current && camera && orbitControlsRef.current) {
          console.log('📷 Updating camera for current model position...');
          const cameraConfig = calculateOptimalCameraPosition(
            modelGroupRef.current, 
            camera.fov || 50, 
            1.5
          );
          
          // Apply camera position
          camera.position.fromArray(cameraConfig.position);
          orbitControlsRef.current.target.fromArray(cameraConfig.target);
          orbitControlsRef.current.update();
          
          console.log('📷 Camera updated:', {
            position: cameraConfig.position,
            target: cameraConfig.target
          });
          
          return cameraConfig;
        }
        return null;
      },
      
      getModelInfo: () => {
        if (modelGroupRef.current) {
          return {
            center: getModelCenter(modelGroupRef.current),
            size: getModelSize(modelGroupRef.current),
            transform: currentModelTransform
          };
        }
        return null;
      },
      // Capture current textures from scene materials into a textureSettings-like object
      captureCurrentTextures: () => {
        const textures = {};
        try {
          Object.entries(allObjects.current || {}).forEach(([name, obj]) => {
            if (!obj) return;
            // find first mesh descendant with a texture map
            let found = null;
            if (obj.isMesh && obj.material) found = obj;
            if (!found && obj.children && obj.children.length) {
              obj.traverse((child) => {
                if (!found && child.isMesh && child.material) found = child;
              });
            }
            if (found) {
              const mats = Array.isArray(found.material) ? found.material : [found.material];
              const matWithMap = mats.find(m => m && m.map && m.map.image);
              if (matWithMap) {
                const img = matWithMap.map.image;
                const src = img?.currentSrc || img?.src || (matWithMap.map?.image && matWithMap.map.image.toString && matWithMap.map.image.toString()) || null;
                textures[name] = {
                  textureSource: src || '(in-memory)',
                  mappingConfig: {},
                  modelName: modelName,
                  timestamp: new Date().toISOString()
                };
              }
            }
          });
        } catch (err) {
          console.warn('captureCurrentTextures failed:', err);
        }
        return textures;
      },
      // Persist captured textures into appliedTextures state (used after a save)
      persistCapturedTextures: (textures) => {
        if (!textures || typeof textures !== 'object') return;
        setAppliedTextures(prev => ({
          ...prev,
          ...textures
        }));
      },
      
      resetModelPosition: () => {
        const defaultTransform = {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 2
        };
        
        if (modelGroupRef.current) {
          applyModelTransform(modelGroupRef.current, defaultTransform);
          setCurrentModelTransform(defaultTransform);
          
          if (onModelTransformChange) {
            onModelTransformChange(defaultTransform);
          }
        }
      },
      
      // Configuration state management
      getCurrentState: () => {
        // Filter textures to only include those for the current model
        const currentModelTextures = Object.fromEntries(
          Object.entries(appliedTextures).filter(([key, textureInfo]) => 
            textureInfo.modelName === modelName
          )
        );
        
        return {
          doorConfiguration: doorSelections,
          textureSettings: currentModelTextures,
          modelTransform: currentModelTransform,
          cameraPosition: {
            position: camera?.position?.toArray() || [0, 2, 5],
            target: orbitControlsRef.current?.target?.toArray() || [0, 1, 0],
            zoom: camera?.zoom || 1
          },
          visibilityStates: Object.fromEntries(
            Object.entries(allObjects.current || {}).map(([name, obj]) => [
              name, 
              obj?.visible !== false
            ])
          ),
          lightStates: lights.reduce((acc, l) => ((acc[l.name] = l.isOn), acc), {}),
          modelName: modelName,
          timestamp: new Date().toISOString()
        };
      },
      
      loadState: async (savedState) => {
        try {
          console.log('🔄 Loading saved configuration:', savedState);
          
          // Restore door configuration
          if (savedState.doorConfiguration) {
            setDoorSelections(savedState.doorConfiguration);
            // Apply the door selection to update visibility
            if (savedState.doorConfiguration.count && savedState.doorConfiguration.selection) {
              applyDoorSelection(savedState.doorConfiguration.count, savedState.doorConfiguration.selection);
            }
          }
          
          // Restore visibility states
          if (savedState.visibilityStates) {
            Object.entries(savedState.visibilityStates).forEach(([name, visible]) => {
              const obj = allObjects.current[name];
              if (obj) {
                obj.visible = visible;
              }
            });
          }
          
          // Restore light states
          if (savedState.lightStates) {
            Object.entries(savedState.lightStates).forEach(([lightName, isOn]) => {
              const light = lights.find(l => l.name === lightName);
              if (light && light.isOn !== isOn) {
                toggleLight(lightName);
              }
            });
          }
          
          // Restore texture settings
          if (savedState.textureSettings) {
            // Clear current applied textures first
            setAppliedTextures({});
            
            // Check if there were any textures in the saved configuration
            const textureEntries = Object.entries(savedState.textureSettings);
            if (textureEntries.length > 0) {
              // Show notification about textures that need to be reapplied
              const textureNames = textureEntries.map(([key, textureInfo]) => textureInfo.textureSource);
              const uniqueTextures = [...new Set(textureNames)];
              
              console.log(`🔄 Configuration loaded! Note: ${uniqueTextures.length} texture(s) were applied in the original configuration:`, uniqueTextures);
              
              // Create a notification for the user
              if (window.confirm(`Configuration loaded successfully!\n\nThis configuration had ${textureEntries.length} texture(s) applied. The system will now attempt to restore them automatically.\n\nClick OK to continue.`)) {
                // User acknowledged - now attempt to restore textures
                console.log(`🔄 Restoring ${textureEntries.length} texture(s) from saved configuration...`);
                
                let restoredCount = 0;
                let failedCount = 0;
                
              // Try to restore each texture
              for (const [key, textureInfo] of textureEntries) {
                try {
                  // Check if we have a saved texture path (new format)
                  let texturePath = textureInfo.savedTexturePath || textureInfo.textureSource;
                  
                  // If no saved path and textureSource doesn't start with http/data, make it relative
                  if (!textureInfo.savedTexturePath && texturePath && !texturePath.startsWith('http') && !texturePath.startsWith('data:')) {
                    // Ensure it starts with / for proper path resolution
                    if (!texturePath.startsWith('/')) {
                      texturePath = '/' + texturePath;
                    }
                  }
                  
                  console.log(`🔍 Attempting to restore texture for "${key}":`, {
                    originalPath: textureInfo.textureSource,
                    savedPath: textureInfo.savedTexturePath,
                    finalPath: texturePath,
                    textureInfo,
                    objectExists: !!allObjects.current[key]
                  });
                  
                  if (texturePath) {
                    if (textureInfo.type === 'global') {
                      // Apply global texture using the proper API
                      if (applyRequest?.current) {
                        await applyRequest.current({
                          type: "global",
                          texture: texturePath,
                          materialName: textureInfo.materialName,
                          exclude: textureInfo.excludedParts || []
                        });
                        console.log(`✅ Restored global texture for material "${textureInfo.materialName}"`);
                      } else {
                        console.warn(`⚠️ applyRequest.current not available for global texture restoration`);
                        failedCount++;
                        continue;
                      }
                    } else {
                      // Check if the target object exists
                      const targetObj = allObjects.current[key];
                      if (!targetObj) {
                        console.warn(`⚠️ Target object "${key}" not found in allObjects`);
                        failedCount++;
                        continue;
                      }
                      
                      // Apply individual part texture
                      console.log(`🎨 Applying texture "${texturePath}" to part "${key}"`);
                      await applyTexture(key, texturePath, textureInfo.mappingConfig || {});
                      console.log(`✅ Restored texture for part "${key}"`);
                    }
                    restoredCount++;
                  } else {
                    console.warn(`⚠️ No texture path found for ${key}`);
                    failedCount++;
                  }
                } catch (error) {
                  console.error(`❌ Failed to restore texture for ${key}:`, error);
                  failedCount++;
                }
              }                // Update applied textures state
                setAppliedTextures(savedState.textureSettings);
                
                // Show restoration summary
                setTimeout(() => {
                  const message = failedCount === 0 
                    ? `✅ Successfully restored all ${restoredCount} texture(s)!`
                    : `⚠️ Restored ${restoredCount} texture(s), ${failedCount} failed.\n\nFailed textures may need to be reapplied manually.`;
                  
                  alert(message);
                }, 500);
              }
              
              // Log the texture information for debugging
              textureEntries.forEach(([key, textureInfo]) => {
                if (textureInfo.type === 'global') {
                  console.log(`� Global texture "${textureInfo.textureSource}" was applied to material "${textureInfo.materialName}"`);
                } else {
                  console.log(`� Texture "${textureInfo.textureSource}" was applied to part "${key}"`);
                }
              });
            }
          }
          
          // Restore model transform
          if (savedState.modelTransform) {
            const transform = savedState.modelTransform;
            if (modelGroupRef.current) {
              applyModelTransform(modelGroupRef.current, transform);
              setCurrentModelTransform(transform);
              
              if (onModelTransformChange) {
                onModelTransformChange(transform);
              }
            }
            console.log('🎯 Model transform restored:', transform);
          }
          
          // Restore camera position
          if (savedState.cameraPosition && camera && orbitControlsRef.current) {
            const { position, target, zoom } = savedState.cameraPosition;
            if (position) {
              camera.position.fromArray(position);
            }
            if (target) {
              orbitControlsRef.current.target.fromArray(target);
            }
            if (zoom !== undefined) {
              camera.zoom = zoom;
              camera.updateProjectionMatrix();
            }
            orbitControlsRef.current.update();
          }
          
          console.log('✅ Configuration loaded successfully');
        } catch (error) {
          console.error('❌ Error loading configuration:', error);
          throw error;
        }
      }
    };

    if (onApiReady) onApiReady(api);

    // Wire the applyRequest ref so UI can call:
    if (applyRequest) {
      applyRequest.current = async (partNameOrRequest, fileOrPath, mappingConfig = {}) => {
        console.log('🔔 Experience.applyRequest called', { partNameOrRequestType: typeof partNameOrRequest, fileOrPathType: (fileOrPath instanceof File) ? 'File' : typeof fileOrPath });
        // Global object form
        if (typeof partNameOrRequest === "object" && partNameOrRequest?.type === "global") {
          // Default to preview-only (persist=false) unless explicitly requested
          const { texture, materialName, exclude = [], persist = false } = partNameOrRequest;
          const widgetCfg = config.uiWidgets?.find((w) => w.type === "globalTextureWidget") || {};
          const defaultMaterialName = widgetCfg.options?.materialName || "Texture";
          const targetMaterialName = materialName || widgetCfg.options?.materialName || defaultMaterialName;

          let textureSrc = null;
          let textureServerPath = null;
          
          if (texture instanceof File) {
            if (persist === false) {
              console.log('📄 Preview apply for global texture: reading file as data URL (no upload)');
              textureSrc = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = (ev) => res(ev.target.result);
                reader.onerror = (err) => rej(err);
                reader.readAsDataURL(texture);
              });
              textureServerPath = null;
            } else {
              console.log(`📤 Uploading global texture file to server: ${texture.name}`);

              // Upload file to server first
              const formData = new FormData();
              formData.append('texture', texture);

              try {
                const uploadResponse = await fetch('http://localhost:5000/api/upload-texture', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: formData
                });

                console.log('📡 upload-texture response status:', uploadResponse.status);

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                  textureServerPath = uploadResult.path;
                  textureSrc = uploadResult.path;
                  console.log(`✅ Global texture uploaded to server: ${textureServerPath}`);
                } else {
                  console.warn(`⚠️ Server upload failed, using data URL as fallback - status: ${uploadResponse.status}`);
                  // Fallback to data URL
                  textureSrc = await new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => res(ev.target.result);
                    reader.onerror = (err) => rej(err);
                    reader.readAsDataURL(texture);
                  });
                }
              } catch (uploadError) {
                console.warn(`⚠️ Global texture upload error, using data URL as fallback:`, uploadError);
                // Fallback to data URL
                textureSrc = await new Promise((res, rej) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => res(ev.target.result);
                  reader.onerror = (err) => rej(err);
                  reader.readAsDataURL(texture);
                });
              }
            }
          } else if (typeof texture === "string") {
            textureSrc = texture;
            textureServerPath = texture;
          } else {
            console.warn("global apply: invalid texture source", texture);
            return;
          }

          const tex = await loadTextureOnce(textureSrc);
          let applied = 0;

          Object.entries(allObjects.current).forEach(([name, obj]) => {
            if (exclude && exclude.includes(name)) return;
            const tryApplyOnMesh = (mesh) => {
              if (!mesh.material) return false;
              if (Array.isArray(mesh.material)) {
                const found = mesh.material.some((m) => (m?.name || "(unnamed)") === targetMaterialName);
                if (found) {
                  applyTextureToObject(mesh, tex, mappingConfig);
                  return true;
                }
              } else {
                if ((mesh.material?.name || "(unnamed)") === targetMaterialName) {
                  applyTextureToObject(mesh, tex, mappingConfig);
                  return true;
                }
              }
              return false;
            };

            if (obj.isMesh) {
              if (tryApplyOnMesh(obj)) applied++;
            } else if (obj.children && obj.children.length) {
              let appliedHere = false;
              obj.traverse((child) => {
                if (!appliedHere && child.isMesh) {
                  if (tryApplyOnMesh(child)) {
                    applied++;
                    appliedHere = true;
                  }
                }
              });
            }
          });

          // Track global texture application only if persist !== false
          if (persist !== false) {
            setAppliedTextures(prev => ({
              ...prev,
              [`__global_${targetMaterialName}`]: {
                textureSource: textureServerPath || (texture instanceof File ? texture.name : texture),
                materialName: targetMaterialName,
                excludedParts: exclude,
                appliedCount: applied,
                type: 'global',
                modelName: modelName, // Track which model this global texture belongs to
                timestamp: new Date().toISOString()
              }
            }));
          } else {
            console.log(`💡 Global apply: preview-only for material "${targetMaterialName}" (not persisted)`);
          }

          // Log global texture application
          logInteraction("GLOBAL_TEXTURE_APPLIED", {
            materialName: targetMaterialName,
            appliedCount: applied,
            excludedParts: exclude,
            textureSource: texture instanceof File ? texture.name : texture,
            mappingConfig,
            widgetType: "globalTexture"
          });

          console.log(`🌍 Global texture applied to ${applied} object(s) (material: "${targetMaterialName}")`);
          return;
        }

        // Single-part form
        return applyTexture(partNameOrRequest, fileOrPath, mappingConfig);
      };
    }
  }, [
    onApiReady,
    togglePart,
    applyDoorSelection,
    resetToInitialState,
    applyRequest,
    isInteractiveObject,
    getInteractionType,
    toggleLight,
    toggleAllLights,
    config.lights,
    lights,
    config,
    logInteraction
  ]);

  // -----------------------
  // Pointer handler for interactive selection - DYNAMIC VERSION
  // -----------------------
  const handlePointerDown = (e) => {
    e.stopPropagation();
    const picked = e.object;
    if (!picked || !picked.visible) return;

    if (debug) {
      console.log('🖱️ CLICK DEBUG (Dynamic):');
      console.log('  Clicked object:', picked.name);
    }

  // Use dynamic detection to find the interactive object (pass the actual object so any child mesh maps to the parent)
  const interactiveObjectName = findInteractiveObjectName(picked);
    
  if (debug) console.log('🔍 Dynamic interaction search result:', interactiveObjectName);

    if (interactiveObjectName) {
      // Diagnostic: log interaction type
      if (debug) {
        try {
          const itype = getInteractionType ? getInteractionType(interactiveObjectName) : null;
          console.log('🔎 Interaction type detected for', interactiveObjectName, ':', itype);
        } catch (err) {
          console.warn('⚠️ getInteractionType failed:', err);
        }
        console.log(`✅ Found interactive object: ${interactiveObjectName}`);
        console.log(`🎬 Calling togglePart for: ${interactiveObjectName}`);
      }
      // Call the generic togglePart (from hook) if available - this should animate via GSAP
      if (typeof togglePart === 'function') {
        try {
          togglePart(interactiveObjectName, "auto");
        } catch (err) {
          console.error('❌ togglePart threw error:', err);
        }
      } else {
        // Fallback: call specific toggles directly
        const t = getInteractionType ? getInteractionType(interactiveObjectName) : null;
        if (t === 'door' && typeof toggleDoor === 'function') {
          toggleDoor(interactiveObjectName);
        } else if (t === 'drawer' && typeof toggleDrawer === 'function') {
          toggleDrawer(interactiveObjectName);
        } else {
          console.warn('⚠️ No toggle function available for', interactiveObjectName);
        }
      }
      e.stopPropagation();
    } else {
      // If the quick parent-hierarchy lookup failed, run a fallback broad raycast
      // across all discovered objects. This helps when the clicked mesh isn't
      // directly registered or when helper meshes aren't present.
      if (debug) console.log('❌ No interactive object found via hierarchy. Attempting fallback raycast.');

      try {
        if (e.ray && Object.keys(allObjects.current || {}).length > 0) {
          const raycaster = new THREE.Raycaster();
          raycaster.set(e.ray.origin, e.ray.direction);
          const candidates = Object.values(allObjects.current).filter(Boolean);
          const intersects = raycaster.intersectObjects(candidates, true);
          if (intersects && intersects.length > 0) {
            const hit = intersects[0].object;
            if (debug) console.log('🔍 Fallback intersect hit object:', hit.name || '(unnamed)');
            const mapped = findInteractiveObjectName(hit);
            if (mapped) {
              if (debug) console.log('✅ Fallback mapped to interactive object:', mapped);
              if (typeof togglePart === 'function') {
                togglePart(mapped, 'auto');
              } else {
                const t = getInteractionType ? getInteractionType(mapped) : null;
                if (t === 'door' && typeof toggleDoor === 'function') toggleDoor(mapped);
                else if (t === 'drawer' && typeof toggleDrawer === 'function') toggleDrawer(mapped);
                else console.warn('⚠️ No toggle function available for', mapped);
              }
              e.stopPropagation();
              return;
            } else {
              if (debug) console.log('❌ Fallback intersect did not map to an interactive part');
            }
          } else {
            if (debug) console.log('❌ Fallback raycast found no intersections');
          }
        } else {
          if (debug) console.log('⚠️ No event.ray available or no objects to test for fallback');
        }
      } catch (err) {
        console.error('❌ Fallback raycast failed:', err);
      }

      // Diagnostic: print clicked hierarchy if we still have no match
      if (debug) {
        console.log('🔧 Clicked object hierarchy:');
        let current = picked;
        let level = 0;
        while (current && level < 10) { // Limit to prevent infinite loops
          console.log(`  Level ${level}: ${current.name || 'unnamed'}`);
          current = current.parent;
          level++;
        }
      }
    }
  };

  return (
    <Suspense fallback={null}>
      <Environment preset="warehouse" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

      <group ref={modelGroupRef} onPointerDown={handlePointerDown}>
        {/* Render main model scene */}
        {mainScene && (
          <>
            {logOnce('render_main_scene', 'Rendering main scene')}
            <primitive object={mainScene} />
          </>
        )}
        {/* Render ALL additional asset scenes dynamically */}
        {Object.entries(assetScenes).map(([assetKey, scene]) => {
          if (!scene) return null;
          try {
            console.log(`Rendering ${assetKey} asset`);
            return (
              <React.Fragment key={assetKey}>
                <primitive object={scene} />
              </React.Fragment>
            );
          } catch (err) {
            console.warn(`Skipping invalid asset scene '${assetKey}':`, err);
            return null;
          }
        })}
      </group>

      <OrbitControls 
        ref={orbitControlsRef}
        target={config.camera?.target || config.metadata?.camera?.target || [0, 0, 0]}
        enabled={userPermissions?.canRotate || false}
        enablePan={userPermissions?.canPan || false}
        enableZoom={userPermissions?.canZoom || false}
      />
    </Suspense>
  );
}

export default Experience;