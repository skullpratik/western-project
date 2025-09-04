import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

// Usage: node scripts/scan-glb.js path/to/file.glb
(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/scan-glb.js path/to/file.glb');
    process.exit(1);
  }
  // Create a minimal loader using Node's fs + arraybuffer
  const arrayBuffer = fs.readFileSync(file).buffer;
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  // Ensure browser-like globals for loaders that expect them
  if (typeof global.self === 'undefined') global.self = global;
  // Setup DRACO decoder (three provides a DRACOLoader wrapper)
  const dracoLoader = new DRACOLoader();
  // Try to use a relative path to the local node_modules decoder files if available
  // Fallback to CDN path if not present
  try {
    // Node environment: point to decoder files inside three's examples directory
    const possible = path.join(path.dirname(require.resolve('three')), '..', 'examples', 'jsm', 'libs', 'draco');
    dracoLoader.setDecoderPath(possible);
  } catch (err) {
    // Use CDN fallback
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  }
  loader.setDRACOLoader(dracoLoader);
  try {
    const gltf = await new Promise((res, rej) => loader.parse(arrayBuffer, path.dirname(file), res, rej));
    const names = [];
    gltf.scene.traverse((c) => { if (c && c.name) names.push(c.name); });
    console.log(JSON.stringify({ file, names }, null, 2));
  } catch (err) {
    console.error('Failed to parse GLB:', err);
    process.exit(2);
  }
})();
