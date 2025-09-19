// src/hooks/useInteractions.js
import { useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

export function useInteractions(allObjects, config) {
  const debug = !!config?.debugLogs;
  const loggedKeys = {};
  const logOnce = (key, ...args) => {
    if (!debug) return;
    if (loggedKeys[key]) return;
    loggedKeys[key] = true;
    console.log(...args);
  };

  const doorStates = useRef({});
  const drawerStates = useRef({});
  const initialRotations = useRef({});
  const initialQuaternions = useRef({});
  const initialPositions = useRef({});

  // Normalize config to a simple map shape once
  const getParts = () => {
    const parts = { doors: {}, drawers: {} };
  logOnce('getParts_called', '🔧 useInteractions getParts() called');
  logOnce('config_snapshot', '🔧 Config snapshot (first call):', config);
  logOnce('config_interactionGroups', '🔧 Config.interactionGroups (first call):', config?.interactionGroups);
    
    if (config && Array.isArray(config.interactionGroups)) {
      console.log(`🔧 Processing ${config.interactionGroups.length} interaction groups`);
      config.interactionGroups.forEach((group, index) => {
        console.log(`🔧 Group ${index}:`, group);
        if (!Array.isArray(group.parts)) {
          console.warn(`⚠️ Group ${index} has no valid parts array`);
          return;
        }
        const type = String(group.type || "").toLowerCase();
        console.log(`🔧 Group type: "${type}"`);

        // Handle doors
        if (type.includes("door")) {
          console.log(`🚪 Processing door group with ${group.parts.length} parts`);
          group.parts.forEach((p) => {
            console.log(`🚪 Adding door part: ${p.name}`, p);
            parts.doors[p.name] = {
              axis: (p.rotationAxis || p.axis || "y").toLowerCase(),
              angle: p.openAngle ?? p.angle ?? 90,
              // Optional direction: 1 (default) or -1 to invert
              direction: p.rotationDirection ?? p.direction ?? p.openDirection ?? 1,
            };
          });
          return;
        }

        // Handle drawers
        if (type.includes("drawer")) {
          console.log(`📦 Processing drawer group with ${group.parts.length} parts`);
          group.parts.forEach((p) => {
            console.log(`📦 Adding drawer part: ${p.name}`, p);
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
    } else {
      console.warn('❌ No valid interactionGroups found in config');
    }
  if (debug) console.log('🔧 Final parts configuration:', parts);
    return parts;
  };

  const toggleDoor = (name) => {
    const obj = allObjects.current[name];
    console.log(`🚪 toggleDoor called for: ${name}`);
    console.log(`🔍 Object found:`, !!obj);
    if (!obj) {
      console.warn(`❌ Door object "${name}" not found in allObjects`);
      console.log('Available objects:', Object.keys(allObjects.current));
      return;
    }
    const parts = getParts();
    console.log('🔧 Door parts configuration:', parts.doors);
    const doorConfig = parts.doors[name];
    console.log(`🚪 Door config for "${name}":`, doorConfig);

    if (!doorConfig) {
      console.warn(`❌ No door configuration found for "${name}"`);
      return;
    }

    const isOpen = doorStates.current[name] === "open";

    // Capture initial quaternion once to support precise close/open relative to local axes
    if (!initialQuaternions.current[name]) {
      initialQuaternions.current[name] = obj.quaternion.clone();
    }

    const initialQuat = initialQuaternions.current[name].clone();

    // Build local axis vector (object-local). We'll create a quaternion delta in local space
    let axisVec = new THREE.Vector3(0, 1, 0);
    if (doorConfig.axis === 'x') axisVec.set(1, 0, 0);
    else if (doorConfig.axis === 'y') axisVec.set(0, 1, 0);
    else if (doorConfig.axis === 'z') axisVec.set(0, 0, 1);

    // delta quaternion representing the open rotation around the LOCAL axis
    const angleRad = THREE.MathUtils.degToRad(doorConfig.angle * (doorConfig.direction || 1));
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angleRad);

    // When applying a local rotation, multiply initial quaternion by delta
    const targetQuat = isOpen ? initialQuat.clone() : initialQuat.clone().multiply(deltaQuat);

    // Animate quaternion components (GSAP can tween numeric fields)
    gsap.to(obj.quaternion, {
      x: targetQuat.x,
      y: targetQuat.y,
      z: targetQuat.z,
      w: targetQuat.w,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        // Ensure quaternion stays normalized during the tween
        obj.quaternion.normalize();
      }
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
    console.log(`🎬 togglePart called for: ${name}, type: ${type}`);
    
    if (type === 'door') {
      console.log(`🚪 Directly calling toggleDoor for: ${name}`);
      toggleDoor(name);
    } else if (type === 'drawer') {
      console.log(`📦 Directly calling toggleDrawer for: ${name}`);
      toggleDrawer(name);
    } else {
      // Auto-detect type
      console.log(`🔍 Auto-detecting type for: ${name}`);
      const parts = getParts();
      console.log(`🔧 Parts available:`, parts);
      
      if (parts.doors[name]) {
        console.log(`🚪 Found ${name} in doors, calling toggleDoor`);
        toggleDoor(name);
      } else if (parts.drawers[name]) {
        console.log(`📦 Found ${name} in drawers, calling toggleDrawer`);
        toggleDrawer(name);
      } else {
        console.log(`❌ ${name} not found in doors or drawers`);
        console.log(`🔧 Available doors:`, Object.keys(parts.doors));
        console.log(`🔧 Available drawers:`, Object.keys(parts.drawers));
      }
    }
  };

  const isInteractiveObject = (objectName) => {
    const obj = allObjects.current[objectName];
    if (!obj || !obj.visible) return false;
    
    const parts = getParts();
    
    // Direct match first
    if (parts.doors[objectName] || parts.drawers[objectName]) {
      return true;
    }
    
    // If no direct match, check if this object or any of its parents match configured names
    let current = obj;
    while (current) {
      if (current.name && (parts.doors[current.name] || parts.drawers[current.name])) {
        return true;
      }
      current = current.parent;
    }
    
    return false;
  };

  // New function to find the actual interactive object name in hierarchy
  // Accepts either a THREE.Object3D (preferred) or a string name.
  const findInteractiveObjectName = (clicked) => {
    let clickedObj = null;
    const parts = getParts();

    // If the caller passed an object, use it directly
    if (clicked && typeof clicked === 'object' && clicked.isObject3D) {
      clickedObj = clicked;
    } else if (typeof clicked === 'string') {
      // Try to resolve name from allObjects map first
      clickedObj = allObjects.current[clicked] || null;
    }

    if (!clickedObj) {
      return null;
    }

    // If the clicked object's name itself is an interactive part, return it
    if (clickedObj.name && (parts.doors[clickedObj.name] || parts.drawers[clickedObj.name])) {
      return clickedObj.name;
    }

    // Otherwise traverse up the parent chain to find an interactive ancestor
    let current = clickedObj.parent;
    while (current) {
      if (current.name && (parts.doors[current.name] || parts.drawers[current.name])) {
        return current.name;
      }
      current = current.parent;
    }

    return null;
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
    findInteractiveObjectName,
    getInteractionType
  };
}