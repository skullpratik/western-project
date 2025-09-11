// src/utils/modelPositioning.js
import * as THREE from "three";

/**
 * Calculate the bounding box of a 3D object or scene
 * @param {THREE.Object3D} object - The 3D object to calculate bounds for
 * @returns {THREE.Box3} The bounding box
 */
export function calculateBoundingBox(object) {
  const box = new THREE.Box3();
  box.setFromObject(object);
  return box;
}

/**
 * Get the center point of a 3D object
 * @param {THREE.Object3D} object - The 3D object
 * @returns {THREE.Vector3} The center point
 */
export function getModelCenter(object) {
  const box = calculateBoundingBox(object);
  return box.getCenter(new THREE.Vector3());
}

/**
 * Get the size (dimensions) of a 3D object
 * @param {THREE.Object3D} object - The 3D object
 * @returns {THREE.Vector3} The size (width, height, depth)
 */
export function getModelSize(object) {
  const box = calculateBoundingBox(object);
  return box.getSize(new THREE.Vector3());
}

/**
 * Center a model at the origin (0, 0, 0)
 * @param {THREE.Object3D} object - The 3D object to center
 * @param {boolean} centerY - Whether to center on Y axis (default: false, keeps model on ground)
 * @returns {THREE.Vector3} The offset that was applied
 */
export function centerModel(object, centerY = false) {
  const center = getModelCenter(object);
  const offset = new THREE.Vector3(-center.x, centerY ? -center.y : 0, -center.z);
  object.position.copy(offset);
  return offset;
}

/**
 * Calculate optimal camera position for a model
 * @param {THREE.Object3D} object - The 3D object
 * @param {number} fov - Camera field of view in degrees
 * @param {number} margin - Safety margin multiplier (default: 1.5)
 * @returns {Object} Camera configuration { position: [x, y, z], target: [x, y, z], distance }
 */
export function calculateOptimalCameraPosition(object, fov = 50, margin = 1.5) {
  const size = getModelSize(object);
  const center = getModelCenter(object);
  
  // Calculate the maximum dimension
  const maxDimension = Math.max(size.x, size.y, size.z);
  
  // Calculate distance needed to fit the model in view
  const fovRadians = (fov * Math.PI) / 180;
  const distance = (maxDimension * margin) / (2 * Math.tan(fovRadians / 2));
  
  // Position camera at an angle for good viewing
  const cameraPosition = [
    center.x + distance * 0.5,  // Slightly offset on X
    center.y + distance * 0.3,  // Elevated view
    center.z + distance         // Main distance on Z
  ];
  
  const cameraTarget = [center.x, center.y, center.z];
  
  return {
    position: cameraPosition,
    target: cameraTarget,
    distance,
    modelSize: size,
    modelCenter: center
  };
}

/**
 * Apply positioning configuration to a model
 * @param {THREE.Object3D} object - The 3D object
 * @param {Object} config - Position configuration
 * @param {Array} config.position - [x, y, z] position
 * @param {Array} config.rotation - [x, y, z] rotation in radians
 * @param {Array} config.scale - [x, y, z] scale or single number
 */
export function applyModelTransform(object, config = {}) {
  if (config.position) {
    if (Array.isArray(config.position) && config.position.length === 3) {
      object.position.fromArray(config.position);
    }
  }
  
  if (config.rotation) {
    if (Array.isArray(config.rotation) && config.rotation.length === 3) {
      object.rotation.fromArray(config.rotation);
    }
  }
  
  if (config.scale) {
    if (Array.isArray(config.scale) && config.scale.length === 3) {
      object.scale.fromArray(config.scale);
    } else if (typeof config.scale === 'number') {
      object.scale.setScalar(config.scale);
    }
  }
}

/**
 * Auto-fit a model in the scene with optimal positioning and camera
 * @param {THREE.Object3D} object - The 3D object
 * @param {THREE.Camera} camera - The camera
 * @param {Object} controls - OrbitControls instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.centerModel - Whether to center the model (default: true)
 * @param {boolean} options.centerY - Whether to center on Y axis (default: false)
 * @param {boolean} options.updateCamera - Whether to update camera position (default: true)
 * @param {number} options.fov - Camera FOV (default: 50)
 * @param {number} options.margin - Safety margin (default: 1.5)
 * @returns {Object} Applied configuration
 */
export function autoFitModel(object, camera, controls, options = {}) {
  const {
    centerModel: shouldCenter = true,
    centerY = false,
    updateCamera = true,
    fov = 50,
    margin = 1.5
  } = options;
  
  console.log('🎯 Auto-fitting model with options:', options);
  
  // Store original transform
  const originalPosition = object.position.clone();
  const originalRotation = object.rotation.clone();
  const originalScale = object.scale.clone();
  
  // Center the model if requested
  let centerOffset = new THREE.Vector3();
  if (shouldCenter) {
    centerOffset = centerModel(object, centerY);
    console.log('📐 Model centered with offset:', centerOffset);
  }
  
  // Calculate optimal camera position
  let cameraConfig = null;
  if (updateCamera) {
    cameraConfig = calculateOptimalCameraPosition(object, fov, margin);
    
    // Apply camera position
    camera.position.fromArray(cameraConfig.position);
    if (controls) {
      controls.target.fromArray(cameraConfig.target);
      controls.update();
    }
    
    console.log('📷 Camera positioned:', {
      position: cameraConfig.position,
      target: cameraConfig.target,
      distance: cameraConfig.distance
    });
  }
  
  return {
    centerOffset,
    cameraConfig,
    originalTransform: {
      position: originalPosition,
      rotation: originalRotation,
      scale: originalScale
    },
    modelInfo: {
      size: getModelSize(object),
      center: getModelCenter(object),
      boundingBox: calculateBoundingBox(object)
    }
  };
}

/**
 * Create a visual helper for model bounds (for debugging)
 * @param {THREE.Object3D} object - The 3D object
 * @param {THREE.Color} color - Helper color (default: red)
 * @returns {THREE.BoxHelper} The bounding box helper
 */
export function createBoundingBoxHelper(object, color = 0xff0000) {
  const helper = new THREE.BoxHelper(object, color);
  helper.name = 'BoundingBoxHelper';
  return helper;
}

/**
 * Smooth transition to a new position
 * @param {THREE.Object3D} object - The object to move
 * @param {Array} targetPosition - Target [x, y, z] position
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when animation completes
 */
export function animateToPosition(object, targetPosition, duration = 1000) {
  return new Promise((resolve) => {
    const startPosition = object.position.clone();
    const target = new THREE.Vector3().fromArray(targetPosition);
    const startTime = Date.now();
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      
      object.position.lerpVectors(startPosition, target, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    animate();
  });
}
