// src/components/Experience/Experience.jsx
import * as THREE from "three";
import React, { Suspense, useRef, useEffect, useState, useCallback } from "react";
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
  
  const { camera, gl } = useThree();
  const orbitControlsRef = useRef();
  const modelGroupRef = useRef();
  const [hoveredObject, setHoveredObject] = useState(null);
  const [lights, setLights] = useState([]);
  const [doorSelections, setDoorSelections] = useState({ count: 0, selection: 0 });
  const [appliedTextures, setAppliedTextures] = useState({});
  const [currentModelTransform, setCurrentModelTransform] = useState(null);
  const allObjects = useRef({});
  const clickHelpers = useRef(new Map());

  // Allow interactionGroups to be provided under metadata as well
  const interactionGroups = config.interactionGroups || config.metadata?.interactionGroups || [];

  // Load the main model (base model)
  console.log('Loading main model from:', config.path);
  console.log('Full config object:', JSON.stringify(config, null, 2));
  const { scene: mainScene } = useGLTF(config.path);
  console.log('Main scene loaded:', mainScene ? 'success' : 'failed');

  // Load ALL additional assets dynamically from config.assets (no manual config needed)
  const assetScenes = {};
  if (config.assets && typeof config.assets === 'object') {
    console.log('[ASSETS] Loading assets from config:', Object.keys(config.assets));
    Object.entries(config.assets).forEach(([assetKey, assetPath]) => {
      if (assetPath && typeof assetPath === 'string') {
        try {
          const { scene } = useGLTF(assetPath);
          assetScenes[assetKey] = scene;
          console.log(`[ASSET] ${assetKey} loaded from: ${assetPath}`);
          let meshCount = 0;
          scene.traverse(obj => { if (obj.isMesh) meshCount++; });
          console.log(`[ASSET] ${assetKey} mesh count: ${meshCount}`);
        } catch (error) {
          console.error(`[ASSET] Failed to load ${assetKey} from ${assetPath}:`, error);
        }
      }
    });
  } else {
    console.log('[ASSETS] No assets found in config');
  }

  // Combine main scene with ALL asset scenes for placement calculations
  const allScenes = { base: mainScene, ...assetScenes };

  // Add all asset scenes to the main group for rendering
  useEffect(() => {
    if (!modelGroupRef.current) return;
    // Remove previous children
    while (modelGroupRef.current.children.length > 0) {
      modelGroupRef.current.remove(modelGroupRef.current.children[0]);
    }
    // Add main scene
    if (mainScene) {
      modelGroupRef.current.add(mainScene);
      console.log('[SCENE] Main scene added to group');
    }
    // Add ALL asset scenes dynamically
    Object.entries(assetScenes).forEach(([assetKey, scene]) => {
      if (scene) {
        modelGroupRef.current.add(scene);
        console.log(`[SCENE] Asset scene '${assetKey}' added to group`);
      }
    });
  }, [mainScene, ...Object.values(assetScenes)]);

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
    // Use all asset scenes dynamically
    mainScene,
    ...Object.values(assetScenes),
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

    // Log light action
    await logInteraction("LIGHT_TOGGLE", {
      lightName,
      state: turnOn ? "ON" : "OFF",
      intensity: lightObj.intensity,
      widgetType: "light"
    });
  }, [config.lights, config.metadata?.lights, lights, resolveLightObject, logInteraction]);

  const toggleAllLights = useCallback(async (turnOn) => {
    const mergedLights = (config.lights && config.lights.length > 0) ? config.lights : (config.metadata?.lights || []);
    lights.forEach((light) => {
      const lightObj = light.object || resolveLightObject(light);
      if (lightObj && lightObj.isPointLight) {
        const configLight = mergedLights.find((l) => l.name === light.name || l.meshName === light.name) || {};
        lightObj.intensity = turnOn ? (configLight.intensity || light.initialIntensity || 1.0) : 0;
        lightObj.visible = !!turnOn;
      }
    });
    setLights((prev) => prev.map((l) => ({ ...l, isOn: !!turnOn })));

    // Log all lights action
    await logInteraction("ALL_LIGHTS_TOGGLE", {
      state: turnOn ? "ON" : "OFF",
      widgetType: "light"
    });
  }, [lights, config.lights, config.metadata?.lights, resolveLightObject, logInteraction]);

  // -----------------------
  // Door presets, interactions
  // -----------------------
  // Helpers to operate on whole logical objects (entire subtree)
  const setObjectVisibleRecursive = useCallback((obj, visible) => {
    if (!obj) return;
    obj.traverse((o) => {
      if (o.isObject3D) o.visible = visible;
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
    for (const [n, o] of entries) {
      const nl = String(n).toLowerCase();
      if (nl === key) return o;
      if (!best && (nl.startsWith(key) || nl.includes(key))) best = o;
    }
    return best;
  }, []);

  const togglePart = useCallback(async (partName, visibility = "toggle") => {
    console.log(`🎬 Toggling part: ${partName}, visibility: ${visibility}`);

    const obj = getObjectByLogicalName(partName);
    if (!obj) {
      console.warn(`togglePart: object "${partName}" not found`);
      return;
    }

    let newVisibility;
    if (visibility === "toggle") {
      newVisibility = !obj.visible;
    } else if (visibility === "auto") {
      // For doors/drawers, toggle based on current state
      newVisibility = !obj.visible;
    } else {
      newVisibility = visibility === "show" || visibility === true;
    }

    setObjectVisibleRecursive(obj, newVisibility);

    // Update click surface visibility if it exists
    const clickSurface = clickHelpers.current.get(partName);
    if (clickSurface) {
      clickSurface.visible = newVisibility;
    }

    // Log the interaction
    logInteraction("PART_TOGGLED", {
      partName,
      newVisibility,
      interactionType: "click"
    });

    console.log(`✅ Toggled ${partName} to ${newVisibility ? 'visible' : 'hidden'}`);
  }, [getObjectByLogicalName, setObjectVisibleRecursive, logInteraction]);

  const isInteractiveObject = useCallback((objectName) => {
    if (!objectName || !interactionGroups) return false;

    // Check if the object name exists in any interaction group
    for (const group of interactionGroups) {
      if (Array.isArray(group.parts)) {
        const found = group.parts.some(part => part.name === objectName);
        if (found) return true;
      }
    }
    return false;
  }, [interactionGroups]);

  const getInteractionType = useCallback((objectName) => {
    if (!objectName || !interactionGroups) return null;

    // Find which interaction group this object belongs to
    for (const group of interactionGroups) {
      if (Array.isArray(group.parts)) {
        const part = group.parts.find(part => part.name === objectName);
        if (part) {
          return {
            type: group.type,
            group: group.label || group.type,
            part: part
          };
        }
      }
    }
    return null;
  }, [interactionGroups]);

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
    let targetName = doorName;
    if (showGlass && doorTypeMap?.toGlass?.[doorName]) {
      targetName = doorTypeMap.toGlass[doorName];
    }
    const obj = getObjectByLogicalName(targetName);
    if (obj) setObjectVisibleRecursive(obj, true);
  });

    visiblePanels.forEach((panelName) => {
      const obj = getObjectByLogicalName(panelName);
      if (obj) setObjectVisibleRecursive(obj, true);
    });

    hiddenParts.forEach((name) => {
      const obj = getObjectByLogicalName(name);
      if (obj) setObjectVisibleRecursive(obj, false);
    });

    // ensure drawers initial positions if any
    if (interactionGroups) {
      interactionGroups.forEach((group) => {
        if (group.type === "drawers") {
          group.parts.forEach((drawer) => {
            const drawerObj = getObjectByLogicalName(drawer.name);
            if (!drawerObj) return;
            if (!hiddenParts.has(drawer.name)) {
              drawerObj.visible = true;
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
  // Click helpers & clickable surfaces
  // -----------------------
  useEffect(() => {
    if (!interactionGroups) return;

    // cleanup existing
    clickHelpers.current.forEach((helper) => {
      if (helper.parent) helper.parent.remove(helper);
    });
    clickHelpers.current.clear();

    const interactiveObjects = [];
    interactionGroups.forEach((group) => {
      if (Array.isArray(group.parts)) {
        group.parts.forEach((part) => {
          const obj = allObjects.current[part.name];
          if (obj) interactiveObjects.push({ obj, partName: part.name });
        });
      }
    });

    interactiveObjects.forEach(({ obj, partName }) => {
      const bbox = new THREE.Box3();
      let hasGeometry = false;
      obj.traverse((child) => {
        if (child.isMesh) {
          bbox.expandByObject(child);
          hasGeometry = true;
        }
      });
      if (!hasGeometry || bbox.isEmpty()) return;

      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());
      const geometry = new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05);
      const material = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
      const clickSurface = new THREE.Mesh(geometry, material);
      clickSurface.name = `${partName}_clickSurface`;
      clickSurface.position.copy(center);
      clickSurface.visible = obj.visible;
      obj.add(clickSurface);
      clickHelpers.current.set(partName, clickSurface);
    });

    return () => {
      clickHelpers.current.forEach((helper) => {
        if (helper.parent) helper.parent.remove(helper);
      });
      clickHelpers.current.clear();
    };
  }, [config, interactionGroups, allObjects.current]);

  // -----------------------
  // Build object map + material logging
  // -----------------------
  useEffect(() => {
    allObjects.current = {};
    // Use all scenes: main scene + ALL asset scenes dynamically
    const roots = [mainScene, ...Object.values(assetScenes)].filter(Boolean);
    if (roots.length === 0) return;

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
  }, [mainScene, ...Object.values(assetScenes), modelName, config, camera, interactionGroups, logInteraction]);

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
    const applyTexture = async (partName, fileOrPath, mappingConfig = {}) => {
      console.log(`🎨 applyTexture called with:`, { partName, fileOrPath, mappingConfig });
      
      try {
        const targetObj = allObjects.current[partName];
        console.log(`🔍 Target object "${partName}" found:`, !!targetObj);

        // If provided a File -> upload to server first, then use server path
        let textureSrc = null;
        let textureServerPath = null;
        
        if (fileOrPath instanceof File) {
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
              // Fallback to data URL
              textureSrc = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = (ev) => res(ev.target.result);
                reader.onerror = (err) => rej(err);
                reader.readAsDataURL(fileOrPath);
              });
            }
          } catch (uploadError) {
            console.warn(`⚠️ Upload error, using data URL as fallback:`, uploadError);
            // Fallback to data URL
            textureSrc = await new Promise((res, rej) => {
              const reader = new FileReader();
              reader.onload = (ev) => res(ev.target.result);
              reader.onerror = (err) => rej(err);
              reader.readAsDataURL(fileOrPath);
            });
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
          if (typeof partName === "string" && partName.startsWith("__material:")) {
            const materialName = partName.replace("__material:", "");
            let appliedCount = 0;
            Object.values(allObjects.current).forEach((obj) => {
              if (!obj) return;
              const checkAndApply = (mesh) => {
                if (!mesh.material) return false;
                if (Array.isArray(mesh.material)) {
                  const has = mesh.material.some((m) => (m?.name || "(unnamed)") === materialName);
                  if (has) {
                    applyTextureToObject(mesh, texture, mappingConfig);
                    return true;
                  }
                } else {
                  if ((mesh.material?.name || "(unnamed)") === materialName) {
                    applyTextureToObject(mesh, texture, mappingConfig);
                    return true;
                  }
                }
                return false;
              };

              if (obj.isMesh) {
                if (checkAndApply(obj)) appliedCount++;
              } else if (obj.children && obj.children.length) {
                obj.traverse((child) => {
                  if (child.isMesh && checkAndApply(child)) appliedCount++;
                });
              }
            });

            // Log material-based texture application
            logInteraction("TEXTURE_APPLIED_MATERIAL", {
              materialName,
              appliedCount,
              textureSource: fileOrPath instanceof File ? fileOrPath.name : fileOrPath,
              mappingConfig,
              widgetType: "texture"
            });

            console.log(`✅ Applied texture to ${appliedCount} mesh(es) using material "${materialName}"`);
            return;
          }

          console.warn(`applyTexture: object "${partName}" not found; no action taken`);
          return;
        }

        // Normal: apply to specific object
        console.log(`🔧 About to apply texture to object "${partName}"`);
        await applyTextureToObject(targetObj, texture, mappingConfig);
        console.log(`🔧 Texture applied to object "${partName}" completed`);

        // Track applied texture with model information
        setAppliedTextures(prev => ({
          ...prev,
          [partName]: {
            textureSource: textureServerPath || (fileOrPath instanceof File ? fileOrPath.name : fileOrPath),
            mappingConfig,
            modelName: modelName, // Track which model this texture belongs to
            timestamp: new Date().toISOString()
          }
        }));

        // Log texture application
        logInteraction("TEXTURE_APPLIED", {
          partName,
          textureSource: fileOrPath instanceof File ? fileOrPath.name : fileOrPath,
          mappingConfig,
          widgetType: "texture"
        });

        console.log(`✅ Applied texture to object "${partName}"`);
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
        // Global object form
        if (typeof partNameOrRequest === "object" && partNameOrRequest?.type === "global") {
          const { texture, materialName, exclude = [] } = partNameOrRequest;
          const widgetCfg = config.uiWidgets?.find((w) => w.type === "globalTextureWidget") || {};
          const defaultMaterialName = widgetCfg.options?.materialName || "Texture";
          const targetMaterialName = materialName || widgetCfg.options?.materialName || defaultMaterialName;

          let textureSrc = null;
          let textureServerPath = null;
          
          if (texture instanceof File) {
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
              
              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                textureServerPath = uploadResult.path;
                textureSrc = uploadResult.path;
                console.log(`✅ Global texture uploaded to server: ${textureServerPath}`);
              } else {
                console.warn(`⚠️ Global texture server upload failed, using data URL as fallback`);
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

          // Track global texture application
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

    console.log('🖱️ CLICK DEBUG (Dynamic):');
    console.log('  Clicked object:', picked.name);

    // Use dynamic detection to find the interactive object
    const interactiveObjectName = findInteractiveObjectName(picked.name);
    
    console.log('🔍 Dynamic interaction search result:', interactiveObjectName);

    if (interactiveObjectName) {
      console.log(`✅ Found interactive object: ${interactiveObjectName}`);
      console.log(`🎬 Calling togglePart for: ${interactiveObjectName}`);
      togglePart(interactiveObjectName, "auto");
      e.stopPropagation();
    } else {
      console.log('❌ No interactive object found in hierarchy');
      console.log('🔧 Clicked object hierarchy:');
      let current = picked;
      let level = 0;
      while (current && level < 10) { // Limit to prevent infinite loops
        console.log(`  Level ${level}: ${current.name || 'unnamed'}`);
        current = current.parent;
        level++;
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
            {console.log('Rendering main scene')}
            <primitive object={mainScene} />
          </>
        )}
        {/* Render ALL additional asset scenes dynamically */}
        {Object.entries(assetScenes).map(([assetKey, scene]) => (
          scene && (
            <React.Fragment key={assetKey}>
              {console.log(`Rendering ${assetKey} asset`)}
              <primitive object={scene} />
            </React.Fragment>
          )
        ))}
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