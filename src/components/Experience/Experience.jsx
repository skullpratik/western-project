
// src/components/Experience/Experience.jsx
import React, { Suspense, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { modelsConfig } from "../../modelsConfig";
import { useInteractions } from "./hooks/useInteractions";

export function Experience({ modelName, onTogglePart, onApiReady }) {
  const config = modelsConfig[modelName];
  const { camera } = useThree();

  // Load model assets
  const baseScene = config.assets?.base ? useGLTF(config.assets.base)?.scene : null;
  const doorsScene = config.assets?.doors ? useGLTF(config.assets.doors)?.scene : null;
  const glassDoorsScene = config.assets?.glassDoors ? useGLTF(config.assets.glassDoors)?.scene : null;
  const drawersScene = config.assets?.drawers ? useGLTF(config.assets.drawers)?.scene : null;
  const { scene } = !config.assets ? useGLTF(config.path) : { scene: null };

  const allObjects = useRef({});

  // Normalize helper
  const normalize = (n) => {
    if (!n) return "";
    let s = String(n).trim().toLowerCase();
    s = s.replace(/([._-]\d+$)/, "");
    s = s.replace(/(\.|_|-)\d{1,4}/g, "");
    return s.replace(/[^a-z0-9]/g, "");
  };

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

    // Always keep base visible
    if (baseScene) baseScene.traverse((o) => (o.visible = true));

    // Hide parts defined in hiddenInitially
    if (Array.isArray(config.hiddenInitially)) {
      config.hiddenInitially.forEach((name) => {
        const obj = allObjects.current[name];
        if (obj) obj.visible = false;
      });
    }

    // Apply initialState from interactionGroups
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

    // --- Apply dynamic camera config ---
    if (config.camera) {
      const { position, target, fov } = config.camera;
      if (position) {
        camera.position.set(position[0], position[1], position[2]);
      }
      if (fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (target) {
        // OrbitControls will handle lookAt automatically, but we keep target reference
        camera.lookAt(target[0], target[1], target[2]);
      }
    }
  }, [baseScene, doorsScene, glassDoorsScene, drawersScene, scene, modelName, config, camera]);

  const { togglePart } = useInteractions(allObjects, config);

  useEffect(() => {
    if (onTogglePart) {
      onTogglePart(() => togglePart);
    }
  }, [onTogglePart, togglePart]);

  // Door selection logic (same as before)
  const applyDoorSelection = (doorCount, position, doorType = "solid") => {
    if (!config?.presets?.doorSelections) return;
    const selection = config.presets.doorSelections?.[doorCount]?.[position];
    if (!selection) return;

    const visibleDoors = selection.doors || [];
    const visiblePanels = selection.panels || [];
    const hiddenParts = new Set(selection.hide || []);
    const showGlass = doorType === "glass";

    // Base always visible
    if (baseScene) {
      baseScene.traverse((o) => {
        if (o.isObject3D) o.visible = true;
      });
    }

    // Reset all doors
    if (doorsScene) {
      doorsScene.traverse((o) => (o.isObject3D ? (o.visible = false) : null));
      doorsScene.visible = true;
    }
    if (glassDoorsScene) {
      glassDoorsScene.traverse((o) => (o.isObject3D ? (o.visible = false) : null));
      glassDoorsScene.visible = true;
    }

    // Reset drawers
    if (drawersScene) {
      drawersScene.traverse((o) => (o.isObject3D ? (o.visible = true) : null));
    }

    // Show selected doors
    visibleDoors.forEach((doorName) => {
      let targetName = doorName;
      if (showGlass && config.presets?.doorTypeMap?.toGlass[doorName]) {
        targetName = config.presets.doorTypeMap.toGlass[doorName];
      }
      const obj = allObjects.current[targetName];
      if (obj) obj.traverse((o) => (o.visible = true));
    });

    // Show panels
    visiblePanels.forEach((panelName) => {
      const obj = allObjects.current[panelName];
      if (obj) obj.traverse((o) => (o.visible = true));
    });

    // Hide explicitly marked
    hiddenParts.forEach((name) => {
      const obj = allObjects.current[name];
      if (obj) obj.traverse((o) => (o.visible = false));
    });

    // Reset drawers to closedPosition
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

  // Expose API
  useEffect(() => {
    const api = {
      applyDoorSelection,
      togglePart,
      getAllNodeNames: () => Object.keys(allObjects.current || {}),
    };
    if (onApiReady) onApiReady(api);
  }, [onApiReady, applyDoorSelection]);

  return (
    <Suspense fallback={null}>
      <Environment preset="warehouse" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

      <group
        onPointerDownCapture={(e) => {
          e.stopPropagation();
          const picked = e.object;
          if (!picked) return;
          togglePart?.(picked.name, "auto");
        }}
      >
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
