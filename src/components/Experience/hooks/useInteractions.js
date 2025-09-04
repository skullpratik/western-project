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
    // Preferred modern shape
    if (config && config.parts) return config.parts;

    // Backward-compatible: derive maps from interactionGroups
    const parts = { doors: {}, drawers: {} };
    if (config && Array.isArray(config.interactionGroups)) {
      config.interactionGroups.forEach((group) => {
        if (!Array.isArray(group.parts)) return;
        const type = String(group.type || "").toLowerCase();

        // Accept several synonyms and casing variants for door groups
        if (type.includes("door")) {
          group.parts.forEach((p) => {
            parts.doors[p.name] = {
              axis: p.rotationAxis || p.axis || "y",
              angle: p.openAngle ?? p.angle ?? 90,
            };
          });
          return;
        }

        if (type.includes("drawer")) {
          group.parts.forEach((p) => {
            parts.drawers[p.name] = {
              axis: p.positionAxis || p.axis || "z",
              openPosition: p.openPosition ?? 0.15,
              closedPosition: p.closedPosition, // optional, will auto-capture if missing
              specialCase: p.specialCase,
            };
          });
          return;
        }
      });
    }
    return parts;
  };

  const togglePart = (name, type) => {
    const obj = allObjects.current[name];
    if (!obj) return;
    const parts = getParts();

    if (type === 'door' && parts.doors && parts.doors[name]) {
      const doorConfig = parts.doors[name];
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

    } else if (type === 'drawer' && parts.drawers && parts.drawers[name]) {
      const drawerConfig = parts.drawers[name];
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

      // Handle special cases for the logo
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
    }
  };

  return { togglePart };
}