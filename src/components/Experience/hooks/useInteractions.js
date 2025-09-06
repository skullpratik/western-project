// src/hooks/useInteractions.js
import { useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

export function useInteractions(allObjects, config) {
  const doorStates = useRef({});
  const drawerStates = useRef({});
  const initialRotations = useRef({});
  const initialPositions = useRef({});

  // Normalize config to a simple map shape once
  const getParts = () => {
    const parts = { doors: {}, drawers: {} };
    if (config && Array.isArray(config.interactionGroups)) {
      config.interactionGroups.forEach((group) => {
        if (!Array.isArray(group.parts)) return;
        const type = String(group.type || "").toLowerCase();

        // Handle doors
        if (type.includes("door")) {
          group.parts.forEach((p) => {
            parts.doors[p.name] = {
              axis: p.rotationAxis || p.axis || "y",
              angle: p.openAngle ?? p.angle ?? 90,
            };
          });
          return;
        }

        // Handle drawers
        if (type.includes("drawer")) {
          group.parts.forEach((p) => {
            parts.drawers[p.name] = {
              axis: p.positionAxis || p.axis || "z",
              openPosition: p.openPosition ?? 0.15,
              closedPosition: p.closedPosition,
              specialCase: p.specialCase,
            };
          });
          return;
        }
      });
    }
    return parts;
  };

  const toggleDoor = (name) => {
    const obj = allObjects.current[name];
    if (!obj) return;
    const parts = getParts();
    const doorConfig = parts.doors[name];

    if (!doorConfig) return;

    const isOpen = doorStates.current[name] === "open";
    const targetRotation = new THREE.Euler().copy(obj.rotation);

    // Capture initial rotation once to support precise close
    if (!initialRotations.current[name]) {
      initialRotations.current[name] = obj.rotation.clone();
    }
    
    if (!isOpen) {
      targetRotation[doorConfig.axis] += THREE.MathUtils.degToRad(doorConfig.angle);
    } else {
      // Close back to the captured initial rotation
      targetRotation.copy(initialRotations.current[name]);
    }
    
    gsap.to(obj.rotation, {
      x: targetRotation.x,
      y: targetRotation.y,
      z: targetRotation.z,
      duration: 0.8,
      ease: "power2.out",
    });

    doorStates.current[name] = isOpen ? "closed" : "open";
  };

  const toggleDrawer = (name) => {
    const obj = allObjects.current[name];
    if (!obj) return;
    const parts = getParts();
    const drawerConfig = parts.drawers[name];

    if (!drawerConfig) return;

    const isOpen = drawerStates.current[name] === "open";

    // Capture initial closed position if not provided
    if (drawerConfig.closedPosition === undefined && !initialPositions.current[name]) {
      initialPositions.current[name] = obj.position.clone();
    }

    const axis = drawerConfig.axis;
    const fromClosed = drawerConfig.closedPosition ?? initialPositions.current[name]?.[axis] ?? obj.position[axis];
    const toPosition = isOpen ? fromClosed : drawerConfig.openPosition;

    const tweenTarget = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
    tweenTarget[axis] = toPosition;

    gsap.to(obj.position, {
      x: tweenTarget.x,
      y: tweenTarget.y,
      z: tweenTarget.z,
      duration: 0.8,
      ease: "power2.out",
    });

    // Handle special cases for the logo (from your reference code)
    if (drawerConfig.specialCase?.logo) {
      const logo = allObjects.current["Logo"];
      if (logo) {
        gsap.to(logo.position, {
          z: isOpen ? drawerConfig.specialCase.logo.closedPosition : drawerConfig.specialCase.logo.openPosition,
          duration: 0.8,
          ease: "power2.out",
        });
      }
    }

    drawerStates.current[name] = isOpen ? "closed" : "open";
  };

  const togglePart = (name, type) => {
    if (type === 'door') {
      toggleDoor(name);
    } else if (type === 'drawer') {
      toggleDrawer(name);
    } else {
      // Auto-detect type
      const parts = getParts();
      if (parts.doors[name]) {
        toggleDoor(name);
      } else if (parts.drawers[name]) {
        toggleDrawer(name);
      }
    }
  };

  const isInteractiveObject = (objectName) => {
    const obj = allObjects.current[objectName];
    if (!obj || !obj.visible) return false;
    
    const parts = getParts();
    return parts.doors[objectName] || parts.drawers[objectName];
  };

  const getInteractionType = (objectName) => {
    const parts = getParts();
    if (parts.doors[objectName]) return 'door';
    if (parts.drawers[objectName]) return 'drawer';
    return null;
  };

  return { 
    togglePart, 
    toggleDoor,  // Separate functions for explicit control
    toggleDrawer,
    isInteractiveObject,
    getInteractionType
  };
}