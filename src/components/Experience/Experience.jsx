import * as THREE from "three";
import React, { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { modelsConfig } from "../../modelsConfig";
import { useInteractions } from "./hooks/useInteractions";

export function Experience({ modelName, onTogglePart, onApiReady, applyRequest }) {
  const config = modelsConfig[modelName];
  const { camera } = useThree();
  const [hoveredObject, setHoveredObject] = useState(null);
  const [lights, setLights] = useState([]);

  // Load model assets
  const baseScene = config.assets?.base ? useGLTF(config.assets.base)?.scene : null;
  const doorsScene = config.assets?.doors ? useGLTF(config.assets.doors)?.scene : null;
  const glassDoorsScene = config.assets?.glassDoors ? useGLTF(config.assets.glassDoors)?.scene : null;
  const drawersScene = config.assets?.drawers ? useGLTF(config.assets.drawers)?.scene : null;
  const { scene } = !config.assets ? useGLTF(config.path) : { scene: null };

  const allObjects = useRef({});
  const clickHelpers = useRef(new Map());

  // --- Light Functions ---
  const initializeLights = useCallback(() => {
    if (!config.lights || !allObjects.current) return;
    
    const lightObjects = [];
    
    config.lights.forEach(lightConfig => {
      const lightObject = allObjects.current[lightConfig.name];
      
      if (lightObject && lightObject.isPointLight) {
        const initialIntensity = lightObject.intensity || 1.0;
        const initialVisible = lightObject.visible !== undefined ? lightObject.visible : true;
        
        const shouldBeOn = lightConfig.defaultState === "on";
        const targetIntensity = shouldBeOn ? (lightConfig.intensity || initialIntensity) : 0;
        
        lightObject.intensity = targetIntensity;
        lightObject.visible = shouldBeOn;
        
        lightObjects.push({
          ...lightConfig,
          object: lightObject,
          initialIntensity,
          initialVisible,
          isOn: shouldBeOn
        });
      }
    });
    
    setLights(lightObjects);
  }, [config.lights, allObjects.current]);

  const toggleLight = useCallback((lightName, turnOn) => {
    console.log('🔦 toggleLight:', lightName, '->', turnOn ? 'ON' : 'OFF');
    
    const lightConfig = config.lights?.find(light => light.name === lightName);
    if (!lightConfig) {
      console.error(`❌ Light config not found for: ${lightName}`);
      return;
    }

    const targetIntensity = turnOn ? (lightConfig.intensity || 1.0) : 0;
    const lightObj = allObjects.current[lightName];
    
    if (lightObj && lightObj.isPointLight) {
      lightObj.intensity = targetIntensity;
      lightObj.visible = turnOn;
      console.log('✅ Light updated - intensity:', lightObj.intensity, 'visible:', lightObj.visible);
    }

    setLights(prev => prev.map(light => 
      light.name === lightName ? { ...light, isOn: turnOn } : light
    ));
  }, [config.lights]);

  const toggleAllLights = useCallback((turnOn) => {
    console.log('🔦 toggleAllLights:', turnOn ? 'ON' : 'OFF');
    
    lights.forEach(light => {
      const lightConfig = config.lights?.find(l => l.name === light.name);
      const targetIntensity = turnOn ? (lightConfig?.intensity || 1.0) : 0;
      const lightObj = allObjects.current[light.name];
      
      if (lightObj && lightObj.isPointLight) {
        lightObj.intensity = targetIntensity;
        lightObj.visible = turnOn;
      }
    });

    setLights(prev => prev.map(light => ({ ...light, isOn: turnOn })));
  }, [config.lights, lights]);

  // --- Door selection logic ---
  const applyDoorSelection = (doorCount, position, doorType = "solid") => {
    if (!config?.presets?.doorSelections) return;
    const selection = config.presets.doorSelections?.[doorCount]?.[position];
    if (!selection) return;

    const visibleDoors = selection.doors || [];
    const visiblePanels = selection.panels || [];
    const hiddenParts = new Set(selection.hide || []);
    const showGlass = doorType === "glass";

    if (baseScene) {
      baseScene.traverse((o) => {
        if (o.isObject3D) o.visible = true;
      });
    }

    if (doorsScene) {
      doorsScene.traverse((o) => (o.isObject3D ? (o.visible = false) : null));
      doorsScene.visible = true;
    }
    if (glassDoorsScene) {
      glassDoorsScene.traverse((o) => (o.isObject3D ? (o.visible = false) : null));
      glassDoorsScene.visible = true;
    }
    if (drawersScene) {
      drawersScene.traverse((o) => (o.isObject3D ? (o.visible = true) : null));
    }

    visibleDoors.forEach((doorName) => {
      let targetName = doorName;
      if (showGlass && config.presets?.doorTypeMap?.toGlass[doorName]) {
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
  };

  const { togglePart, isInteractiveObject, getInteractionType } = useInteractions(allObjects, config);

  useEffect(() => {
    if (onTogglePart) {
      onTogglePart(() => togglePart);
    }
  }, [onTogglePart, togglePart]);

  // Handle click on objects for hotspots
  const handleObjectClick = (objectName) => {
    if (isInteractiveObject(objectName)) {
      const interactionType = getInteractionType(objectName);
      togglePart(objectName, interactionType);
    }
  };

  // Add invisible clickable surfaces
  useEffect(() => {
    if (!config.interactionGroups) return;

    clickHelpers.current.forEach(helper => {
      if (helper.parent) helper.parent.remove(helper);
    });
    clickHelpers.current.clear();

    const interactiveObjects = [];
    config.interactionGroups.forEach(group => {
      if (Array.isArray(group.parts)) {
        group.parts.forEach(part => {
          const obj = allObjects.current[part.name];
          if (obj) {
            interactiveObjects.push({obj, partName: part.name});
          }
        });
      }
    });

    interactiveObjects.forEach(({obj, partName}) => {
      const bbox = new THREE.Box3();
      let hasGeometry = false;
      
      obj.traverse(child => {
        if (child.isMesh) {
          bbox.expandByObject(child);
          hasGeometry = true;
        }
      });

      if (!hasGeometry || bbox.isEmpty()) return;

      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      const geometry = new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1);
      const material = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0
      });

      const clickSurface = new THREE.Mesh(geometry, material);
      clickSurface.name = `${partName}_clickSurface`;
      clickSurface.position.copy(center);
      clickSurface.position.z += 0.01;
      clickSurface.visible = obj.visible;

      obj.add(clickSurface);
      clickHelpers.current.set(partName, clickSurface);
    });

    return () => {
      clickHelpers.current.forEach(helper => {
        if (helper.parent) helper.parent.remove(helper);
      });
      clickHelpers.current.clear();
    };
  }, [config, allObjects.current]);

  // Build object map + apply initial state
  useEffect(() => {
    allObjects.current = {};
    const roots = [baseScene, doorsScene, glassDoorsScene, drawersScene].filter(Boolean);
    if (roots.length === 0 && scene) roots.push(scene);
    if (roots.length === 0) return;

    roots.forEach((root) => {
      root.traverse((child) => {
        if (child.isObject3D && child.name) {
          allObjects.current[child.name] = child;
        }
      });
    });

    if (baseScene) baseScene.traverse((o) => (o.visible = true));

    if (Array.isArray(config.hiddenInitially)) {
      config.hiddenInitially.forEach((name) => {
        const obj = allObjects.current[name];
        if (obj) obj.visible = false;
      });
    }

    if (Array.isArray(config.interactionGroups)) {
      config.interactionGroups.forEach((group) => {
        if (!Array.isArray(group.parts)) return;
        group.parts.forEach((part) => {
          const obj = allObjects.current[part.name];
          if (!obj) return;

          if (part.initialState?.visible !== undefined) {
            obj.visible = part.initialState.visible;
          }
          if (part.initialState?.position) {
            const pos = part.initialState.position;
            if (pos.x !== undefined) obj.position.x = pos.x;
            if (pos.y !== undefined) obj.position.y = pos.y;
            if (pos.z !== undefined) obj.position.z = pos.z;
          }
          if (part.initialState?.rotation) {
            const rot = part.initialState.rotation;
            if (rot.x !== undefined) obj.rotation.x = rot.x;
            if (rot.y !== undefined) obj.rotation.y = rot.y;
            if (rot.z !== undefined) obj.rotation.z = rot.z;
          }
          if (part.initialState?.scale) {
            const scl = part.initialState.scale;
            if (scl.x !== undefined) obj.scale.x = scl.x;
            if (scl.y !== undefined) obj.scale.y = scl.y;
            if (scl.z !== undefined) obj.scale.z = scl.z;
          }
        });
      });
    }

    if (config.camera) {
      const { position, target, fov } = config.camera;
      if (position) camera.position.set(...position);
      if (fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (target) camera.lookAt(...target);
    }
  }, [baseScene, doorsScene, glassDoorsScene, drawersScene, scene, modelName, config, camera]);

  // Initialize lights after objects are loaded
  useEffect(() => {
    if (Object.keys(allObjects.current).length > 0) {
      initializeLights();
    }
  }, [allObjects.current, initializeLights]);

  // Expose API + wire applyRequest
  useEffect(() => {
    const applyTexture = (partName, fileOrPath, mappingConfig = {}) => {
      const obj = allObjects.current[partName];
      if (!obj) {
        console.error(`❌ Object "${partName}" not found`);
        return;
      }

      const loadAndApplyTexture = (textureUrl) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          textureUrl,
          (texture) => {
            texture.encoding = THREE.sRGBEncoding;
            
            if (mappingConfig.flipY !== undefined) texture.flipY = mappingConfig.flipY;
            if (mappingConfig.offset) {
              texture.offset.set(mappingConfig.offset.x || 0, mappingConfig.offset.y || 0);
            }
            if (mappingConfig.center) {
              texture.center.set(mappingConfig.center.x || 0.5, mappingConfig.center.y || 0.5);
            }
            if (mappingConfig.rotation !== undefined) texture.rotation = mappingConfig.rotation;
            if (mappingConfig.repeat) {
              texture.repeat.set(mappingConfig.repeat.x || 1, mappingConfig.repeat.y || 1);
            }
            if (mappingConfig.wrapS && THREE[mappingConfig.wrapS]) {
              texture.wrapS = THREE[mappingConfig.wrapS];
            }
            if (mappingConfig.wrapT && THREE[mappingConfig.wrapT]) {
              texture.wrapT = THREE[mappingConfig.wrapT];
            }

            texture.needsUpdate = true;

            if (obj.isMesh && obj.material) {
              const newMaterial = obj.material.clone();
              newMaterial.map = texture;
              newMaterial.needsUpdate = true;
              obj.material = newMaterial;
            } else if (obj.children && obj.children.length > 0) {
              obj.traverse((child) => {
                if (child.isMesh && child.material) {
                  const newMaterial = child.material.clone();
                  newMaterial.map = texture;
                  newMaterial.needsUpdate = true;
                  child.material = newMaterial;
                }
              });
            }
          },
          undefined,
          (err) => {
            console.error(`❌ Failed to load texture for "${partName}":`, err);
          }
        );
      };

      if (fileOrPath instanceof File) {
        const reader = new FileReader();
        reader.onload = (event) => {
          loadAndApplyTexture(event.target.result);
        };
        reader.onerror = (err) => {
          console.error(`❌ Failed to read file for "${partName}":`, err);
        };
        reader.readAsDataURL(fileOrPath);
      } else if (typeof fileOrPath === "string") {
        loadAndApplyTexture(fileOrPath);
      } else {
        console.error(`❌ Invalid texture source for "${partName}":`, fileOrPath);
      }
    };

    // ✅ CRITICAL FIX: Include toggleLight and toggleAllLights in the API
    const api = {
      applyDoorSelection,
      togglePart,
      getAllNodeNames: () => Object.keys(allObjects.current || {}),
      applyTexture,
      isInteractiveObject,
      getInteractionType,
      toggleLight, // ✅ This was missing!
      toggleAllLights, // ✅ This was missing!
      hasLights: config.lights && config.lights.length > 0,
      lights: lights.reduce((acc, light) => {
        acc[light.name] = light.isOn;
        return acc;
      }, {})
    };

    console.log('✅ API exposed with functions:', Object.keys(api));
    console.log('✅ toggleLight available:', !!api.toggleLight);
    console.log('✅ toggleAllLights available:', !!api.toggleAllLights);

    if (onApiReady) onApiReady(api);

    if (applyRequest) {
      applyRequest.current = (partName, fileOrPath, mappingConfig) => {
        applyTexture(partName, fileOrPath, mappingConfig);
      };
    }
  }, [onApiReady, togglePart, applyDoorSelection, applyRequest, isInteractiveObject, getInteractionType, toggleLight, toggleAllLights, config.lights, lights]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    const picked = e.object;
    if (!picked || !picked.visible) return;
    
    console.log("Clicked object:", picked.name, "Visible:", picked.visible);
    
    const hierarchyNames = [];
    let current = picked;
    while (current) {
      if (current.name && current.visible) {
        hierarchyNames.push(current.name);
      }
      current = current.parent;
    }
    
    console.log("Visible object hierarchy:", hierarchyNames);
    
    const interactiveObject = hierarchyNames.find(name => {
      const obj = allObjects.current[name];
      return obj && obj.visible && isInteractiveObject(name);
    });
    
    if (interactiveObject) {
      console.log("Interactive object found in hierarchy:", interactiveObject);
      togglePart(interactiveObject, "auto");
      e.stopPropagation();
      return;
    }
    
    console.log("No interactive object found in hierarchy");
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

      <OrbitControls target={config.camera?.target || [0, 0, 0]} />
    </Suspense>
  );
}