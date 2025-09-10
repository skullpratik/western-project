// src/components/Experience/Experience.jsx
import * as THREE from "three";
import React, { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, Html } from "@react-three/drei";
import { modelsConfig } from "../../modelsConfig"; // fallback
import { useInteractions } from "./hooks/useInteractions";
import { logActivity } from "../../api/user";

export function Experience({ modelName, modelConfig, allModels, onTogglePart, onApiReady, applyRequest, userPermissions, user, onModelError }) {
  // Prefer provided modelConfig/allModels (supports dynamic custom models) and fallback to static modelsConfig
  const config = modelConfig || (allModels && allModels[modelName]) || modelsConfig[modelName];
  
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
  const [hoveredObject, setHoveredObject] = useState(null);
  const [lights, setLights] = useState([]);
  const allObjects = useRef({});
  const clickHelpers = useRef(new Map());

  // Load model(s) - hooks must be called unconditionally
  const baseScene = config.assets?.base ? useGLTF(config.assets.base)?.scene : null;
  const doorsScene = config.assets?.doors ? useGLTF(config.assets.doors)?.scene : null;
  const glassDoorsScene = config.assets?.glassDoors ? useGLTF(config.assets.glassDoors)?.scene : null;
  const drawersScene = config.assets?.drawers ? useGLTF(config.assets.drawers)?.scene : null;
  const { scene } = !config.assets ? useGLTF(config.path) : { scene: null };

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
  const initializeLights = useCallback(() => {
    if (!config.lights || !allObjects.current) return;
    const lightObjects = [];

    config.lights.forEach((lightConfig) => {
      const lightObject = allObjects.current[lightConfig.name];
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
      }
    });

    setLights(lightObjects);
  }, [config.lights]);

  const toggleLight = useCallback(async (lightName, turnOn) => {
    const lightConfig = config.lights?.find((l) => l.name === lightName);
    if (!lightConfig) {
      console.warn(`Light config not found for "${lightName}"`);
      return;
    }
    const lightObj = allObjects.current[lightName];
    if (!lightObj || !lightObj.isPointLight) return;
    lightObj.intensity = turnOn ? (lightConfig.intensity || 1.0) : 0;
    lightObj.visible = !!turnOn;
    setLights((prev) => prev.map((l) => (l.name === lightName ? { ...l, isOn: !!turnOn } : l)));

    // Log light action
    await logInteraction("LIGHT_TOGGLE", {
      lightName,
      state: turnOn ? "ON" : "OFF",
      intensity: lightObj.intensity,
      widgetType: "light"
    });
  }, [config.lights, logInteraction]);

  const toggleAllLights = useCallback(async (turnOn) => {
    lights.forEach((light) => {
      const lightObj = allObjects.current[light.name];
      if (lightObj && lightObj.isPointLight) {
        const configLight = config.lights?.find((l) => l.name === light.name) || {};
        lightObj.intensity = turnOn ? (configLight.intensity || 1.0) : 0;
        lightObj.visible = !!turnOn;
      }
    });
    setLights((prev) => prev.map((l) => ({ ...l, isOn: !!turnOn })));

    // Log all lights action
    await logInteraction("ALL_LIGHTS_TOGGLE", {
      state: turnOn ? "ON" : "OFF",
      widgetType: "light"
    });
  }, [lights, config.lights, logInteraction]);

  // -----------------------
  // Door presets, interactions
  // -----------------------
  const applyDoorSelection = useCallback(async (doorCount, position, doorType = "solid") => {
    if (!config?.presets?.doorSelections) return;
    const selection = config.presets.doorSelections?.[doorCount]?.[position];
    if (!selection) return;

    const visibleDoors = selection.doors || [];
    const visiblePanels = selection.panels || [];
    const hiddenParts = new Set(selection.hide || []);
    const showGlass = doorType === "glass";

    if (baseScene) baseScene.traverse((o) => o.isObject3D && (o.visible = true));
    if (doorsScene) {
      doorsScene.traverse((o) => o.isObject3D && (o.visible = false));
      doorsScene.visible = true;
    }
    if (glassDoorsScene) {
      glassDoorsScene.traverse((o) => o.isObject3D && (o.visible = false));
      glassDoorsScene.visible = true;
    }
    if (drawersScene) drawersScene.traverse((o) => o.isObject3D && (o.visible = true));

    visibleDoors.forEach((doorName) => {
      let targetName = doorName;
      if (showGlass && config.presets?.doorTypeMap?.toGlass?.[doorName]) {
        targetName = config.presets.doorTypeMap.toGlass[doorName];
      }
      const obj = allObjects.current[targetName];
      if (obj) obj.traverse((o) => (o.visible = true));
    });

    visiblePanels.forEach((panelName) => {
      const obj = allObjects.current[panelName];
      if (obj) obj.traverse((o) => (o.visible = true));
    });

    hiddenParts.forEach((name) => {
      const obj = allObjects.current[name];
      if (obj) obj.traverse((o) => (o.visible = false));
    });

    // ensure drawers initial positions if any
    if (config.interactionGroups) {
      config.interactionGroups.forEach((group) => {
        if (group.type === "drawers") {
          group.parts.forEach((drawer) => {
            const drawerObj = allObjects.current[drawer.name];
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
  }, [config, baseScene, doorsScene, glassDoorsScene, drawersScene, logInteraction]);

  const { togglePart, isInteractiveObject, getInteractionType } = useInteractions(
    allObjects, 
    config, 
    logInteraction
  );

  useEffect(() => {
    if (onTogglePart) {
      onTogglePart(() => togglePart);
    }
  }, [onTogglePart, togglePart]);

  // -----------------------
  // Click helpers & clickable surfaces
  // -----------------------
  useEffect(() => {
    if (!config.interactionGroups) return;

    // cleanup existing
    clickHelpers.current.forEach((helper) => {
      if (helper.parent) helper.parent.remove(helper);
    });
    clickHelpers.current.clear();

    const interactiveObjects = [];
    config.interactionGroups.forEach((group) => {
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
  }, [config, allObjects.current]);

  // -----------------------
  // Build object map + material logging
  // -----------------------
  useEffect(() => {
    allObjects.current = {};
    const roots = [baseScene, doorsScene, glassDoorsScene, drawersScene].filter(Boolean);
    if (roots.length === 0 && scene) roots.push(scene);
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

    // existing initialization: set base visible
    if (baseScene) baseScene.traverse((o) => (o.visible = true));

    // Debug: Log all object names in the scene
    console.log(`🔍 MODEL DEBUG for "${modelName}":`);
    console.log('📦 All objects found:', Object.keys(allObjects.current));
    
    // Debug: Check interaction groups vs actual objects
    if (Array.isArray(config.interactionGroups)) {
      console.log('⚙️ Interaction Groups:');
      config.interactionGroups.forEach((group, i) => {
        console.log(`  Group ${i}: ${group.type} - ${group.label}`);
        if (Array.isArray(group.parts)) {
          group.parts.forEach(part => {
            const exists = allObjects.current[part.name] ? '✅' : '❌';
            console.log(`    ${exists} ${part.name} (${part.rotationAxis || part.positionAxis || 'no axis'})`);
          });
        }
      });
    }

    // hiddenInitially
    if (Array.isArray(config.hiddenInitially)) {
      config.hiddenInitially.forEach((name) => {
        const obj = allObjects.current[name];
        if (obj) obj.visible = false;
      });
    }

    // init interactionGroups initialState
    if (Array.isArray(config.interactionGroups)) {
      config.interactionGroups.forEach((group) => {
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

    // camera
    if (config.camera) {
      console.log('🎥 Setting camera from config:', config.camera);
      const { position, target, fov } = config.camera;
      
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
      hasLights: config.lights && config.lights.length > 0,
      interactiveParts: config.interactionGroups?.reduce((count, group) => count + (group.parts?.length || 0), 0) || 0
    });
  }, [baseScene, doorsScene, glassDoorsScene, drawersScene, scene, modelName, config, camera, logInteraction]);

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
            tex.encoding = THREE.sRGBEncoding;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            resolve(tex);
          },
          undefined,
          (err) => reject(err)
        );
      });

    // Apply texture to a single object (clones materials to avoid global mutation)
    const applyTextureToObject = async (obj, texture, mappingConfig = {}) => {
      if (!obj) return;
      // apply mapping configs
      if (mappingConfig.flipY !== undefined) texture.flipY = mappingConfig.flipY;
      if (mappingConfig.offset) texture.offset.set(mappingConfig.offset.x || 0, mappingConfig.offset.y || 0);
      if (mappingConfig.center) texture.center.set(mappingConfig.center.x || 0.5, mappingConfig.center.y || 0.5);
      if (mappingConfig.rotation !== undefined) texture.rotation = mappingConfig.rotation;
      if (mappingConfig.repeat) texture.repeat.set(mappingConfig.repeat.x || 1, mappingConfig.repeat.y || 1);
      if (mappingConfig.wrapS && THREE[mappingConfig.wrapS]) texture.wrapS = THREE[mappingConfig.wrapS];
      if (mappingConfig.wrapT && THREE[mappingConfig.wrapT]) texture.wrapT = THREE[mappingConfig.wrapT];
      texture.needsUpdate = true;

      // traverse and replace/cloned materials
      if (obj.isMesh && obj.material) {
        const newMat = Array.isArray(obj.material) ? obj.material.map((m) => m.clone()) : obj.material.clone();
        if (Array.isArray(newMat)) {
          newMat.forEach((m) => {
            if (m && "map" in m) m.map = texture;
            m.needsUpdate = true;
          });
        } else {
          if ("map" in newMat) newMat.map = texture;
          newMat.needsUpdate = true;
        }
        obj.material = newMat;
      } else if (obj.children && obj.children.length > 0) {
        obj.traverse((child) => {
          if (child.isMesh && child.material) {
            const newMat = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
            if (Array.isArray(newMat)) {
              newMat.forEach((m) => {
                if (m && "map" in m) m.map = texture;
                m.needsUpdate = true;
              });
            } else {
              if ("map" in newMat) newMat.map = texture;
              newMat.needsUpdate = true;
            }
            child.material = newMat;
          }
        });
      }
    };

    // Main applyTexture function (supports File, dataURL string, or remote path)
    const applyTexture = async (partName, fileOrPath, mappingConfig = {}) => {
      try {
        const targetObj = allObjects.current[partName];

        // If provided a File -> convert to dataURL and load texture once
        let textureSrc = null;
        if (fileOrPath instanceof File) {
          textureSrc = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = (ev) => res(ev.target.result);
            reader.onerror = (err) => rej(err);
            reader.readAsDataURL(fileOrPath);
          });
        } else if (typeof fileOrPath === "string") {
          textureSrc = fileOrPath;
        } else {
          console.warn("applyTexture: invalid fileOrPath", fileOrPath);
          return;
        }

        // Load texture once
        const texture = await loadTextureOnce(textureSrc);

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
        await applyTextureToObject(targetObj, texture, mappingConfig);

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
      togglePart,
      getAllNodeNames: () => Object.keys(allObjects.current || {}),
      applyTexture,
      isInteractiveObject,
      getInteractionType,
      toggleLight,
      toggleAllLights,
      hasLights: !!(config.lights && config.lights.length > 0),
      lights: lights.reduce((acc, l) => ((acc[l.name] = l.isOn), acc), {}),
      logInteraction, // Expose logging function to other components
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
          if (texture instanceof File) {
            textureSrc = await new Promise((res, rej) => {
              const reader = new FileReader();
              reader.onload = (ev) => res(ev.target.result);
              reader.onerror = (err) => rej(err);
              reader.readAsDataURL(texture);
            });
          } else if (typeof texture === "string") {
            textureSrc = texture;
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
  // Pointer handler for interactive selection
  // -----------------------
  const handlePointerDown = (e) => {
    e.stopPropagation();
    const picked = e.object;
    if (!picked || !picked.visible) return;

    const hierarchyNames = [];
    let cur = picked;
    while (cur) {
      if (cur.name) hierarchyNames.push(cur.name);
      cur = cur.parent;
    }

    console.log('🖱️ CLICK DEBUG:');
    console.log('  Clicked object:', picked.name);
    console.log('  Hierarchy names:', hierarchyNames);

    const interactiveObject = hierarchyNames.find((n) => {
      const obj = allObjects.current[n];
      const isInteractive = obj && obj.visible && isInteractiveObject(n);
      console.log(`  Checking ${n}: exists=${!!obj}, visible=${obj?.visible}, interactive=${isInteractive}`);
      return isInteractive;
    });

    if (interactiveObject) {
      console.log(`✅ Found interactive object: ${interactiveObject}`);
      togglePart(interactiveObject, "auto");
      e.stopPropagation();
    } else {
      console.log('❌ No interactive object found in hierarchy');
    }
  };

  return (
    <Suspense fallback={null}>
      <Environment preset="warehouse" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

      <group onPointerDown={handlePointerDown}>
        {baseScene && <primitive object={baseScene} scale={2} />}
        {doorsScene && <primitive object={doorsScene} scale={2} />}
        {glassDoorsScene && <primitive object={glassDoorsScene} scale={2} />}
        {drawersScene && <primitive object={drawersScene} scale={2} />}
        {!config.assets && scene && <primitive object={scene} scale={2} />}
      </group>

      <OrbitControls 
        ref={orbitControlsRef}
        target={config.camera?.target || [0, 0, 0]}
        enabled={userPermissions?.canRotate || false}
        enablePan={userPermissions?.canPan || false}
        enableZoom={userPermissions?.canZoom || false}
      />
    </Suspense>
  );
}

export default Experience;