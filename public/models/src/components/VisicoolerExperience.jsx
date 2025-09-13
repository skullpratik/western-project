import React, { useEffect, useRef, useImperativeHandle, forwardRef, Suspense } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import tinycolor from "tinycolor2";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';


useGLTF.preload("/models/Visicooler.glb");

export const Experience = forwardRef(({
  canopyColor,
  bottomBorderColor,
  doorColor,
  topPanelColor,
  ledVisible,
  louverColor,
  colorShading,
  onAssetLoaded
}, ref) => {
  const { scene: threeScene, camera, gl } = useThree();
  const { scene } = useGLTF("/models/Visicooler.glb");

  // --- refs ---
  const doorRef = useRef();
  const glassRef = useRef();
  const ledLight1001Ref = useRef();
  const pointLightRef = useRef();
  const ambientLightRef = useRef();
  const isDoorOpen = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const canopyMeshRef = useRef(null);
  const canopyTextureRef = useRef(null);
  const canopyOriginalMatRef = useRef(null);

  const sidePanel1MeshRef = useRef(null);
  const sidePanel1TextureRef = useRef(null);
  const sidePanel1OriginalMatRef = useRef(null);

  const louverMeshRef = useRef(null);
  const louverTextureRef = useRef(null);
  const louverOriginalMatRef = useRef(null);

  const sidePanel2MeshRef = useRef(null);
  const sidePanel2TextureRef = useRef(null);
  const sidePanel2OriginalMatRef = useRef(null);

  // Position ref for keyboard controls
  const positionRef = useRef({ x: 0.15, y: -1.1, z: -0.19 });

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      if (threeScene) {
        threeScene.background = null;
      }
    };
  }, [threeScene]);

  // --- helpers ---
  const setMapOnMesh = (mesh, tex) => {
    if (!mesh) return;
    const mat = mesh.material;
    if (!mat) {
      mesh.material = new THREE.MeshStandardMaterial({ map: tex });
      return;
    }
    if (Array.isArray(mat)) {
      mat.forEach(m => { m.map = tex; m.needsUpdate = true; });
    } else {
      mat.map = tex;
      mat.needsUpdate = true;
    }
  };

  const ensureUniqueMaterial = (mesh) => {
    if (!mesh) return;
    if (mesh.userData._materialUnique) return;
    const mat = mesh.material;
    if (!mat) return;
    if (Array.isArray(mat)) mesh.material = mat.map(m => m.clone());
    else mesh.material = mat.clone();
    mesh.userData._materialUnique = true;
  };

  const adjustColorBrightness = (color, adjustment) => {
    if (!color) return null;
    const tc = tinycolor(color);
    return adjustment > 0
      ? tc.lighten(adjustment / 2).toHexString()
      : tc.darken(-adjustment / 2).toHexString();
  };

  // --- find meshes & store original materials ---
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.originalMaterial) child.userData.originalMaterial = child.material.clone ? child.material.clone() : child.material;
      }

      if (child.isMesh && child.name.toLowerCase().includes("canopy")) {
        canopyMeshRef.current = child;
        canopyOriginalMatRef.current = child.userData.originalMaterial;
      }
      if (child.isMesh && child.name === "Louver") {
        louverMeshRef.current = child;
        louverOriginalMatRef.current = child.userData.originalMaterial;
      }
    });

    const sp1 = scene.getObjectByName("SidePannel1");
    if (sp1 && sp1.isMesh) {
      sidePanel1MeshRef.current = sp1;
      sidePanel1OriginalMatRef.current = sp1.userData.originalMaterial;
    }

    const sp2 = scene.getObjectByName("SidePannel2");
    if (sp2 && sp2.isMesh) {
      sidePanel2MeshRef.current = sp2;
      sidePanel2OriginalMatRef.current = sp2.userData.originalMaterial;
    }
  }, [scene]);

  // --- click & lights ---
  useEffect(() => {
    if (!scene) return;

    const led = scene.getObjectByName("LEDLight1001");
    if (led) {
      ledLight1001Ref.current = led;
      led.visible = false;
    }

    doorRef.current = scene.getObjectByName("Door") || null;
    glassRef.current = scene.getObjectByName("Glass") || null;
    if (doorRef.current) doorRef.current.rotation.y = 0;
    if (glassRef.current) glassRef.current.rotation.y = 0;

    const pointLight = scene.getObjectByName("Point");
    if (pointLight) {
      pointLightRef.current = pointLight;
      pointLightRef.current.intensity = 2.5;
      pointLightRef.current.visible = false;
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    ambient.visible = false;
    scene.add(ambient);
    ambientLightRef.current = ambient;

    const handleClick = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);

      const intersectsDoor = doorRef.current ? raycaster.current.intersectObject(doorRef.current, true) : [];
      const intersectsGlass = glassRef.current ? raycaster.current.intersectObject(glassRef.current, true) : [];

      if (intersectsDoor.length > 0 || intersectsGlass.length > 0) {
        const targetRotation = isDoorOpen.current ? 0 : Math.PI / 2;
        if (doorRef.current) gsap.to(doorRef.current.rotation, { y: targetRotation, duration: 1, ease: "power2.inOut" });
        if (glassRef.current) gsap.to(glassRef.current.rotation, { y: targetRotation, duration: 1, ease: "power2.inOut" });
        isDoorOpen.current = !isDoorOpen.current;
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [scene, gl, camera]);

  useEffect(() => {
    if (!ledLight1001Ref.current || !pointLightRef.current || !ambientLightRef.current) return;

    ledLight1001Ref.current.visible = ledVisible;
    pointLightRef.current.visible = ledVisible;
    ambientLightRef.current.visible = ledVisible;

    // Keep background transparent for better lighting
    if (threeScene) {
      threeScene.background = null;
    }

    if (canopyMeshRef.current) {
      const materials = Array.isArray(canopyMeshRef.current.material)
        ? canopyMeshRef.current.material
        : [canopyMeshRef.current.material];

      materials.forEach(mat => {
        if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
          if (mat.map) {
            mat.emissiveMap = mat.map;
          }
          mat.emissive = ledVisible ? new THREE.Color(0xffffff) : new THREE.Color(0x000000);
          mat.emissiveIntensity = ledVisible ? 1.2 : 0.0;
          mat.needsUpdate = true;
        }
      });
    }
  }, [ledVisible, threeScene]);

  // --- Keyboard controls for model movement ---
  useEffect(() => {
    if (!scene) return;

    const handleKeyDown = (e) => {
      const step = 0.1;

      switch (e.key.toLowerCase()) {
        case 'r':
          positionRef.current.x += step;
          break;
        case 'l':
          positionRef.current.x -= step;
          break;
        case 'u':
          positionRef.current.y += step;
          break;
        case 'd':
          positionRef.current.y -= step;
          break;
        default:
          return;
      }

      // Trigger re-render to update position
      if (scene) {
        scene.position.set(positionRef.current.x, positionRef.current.y, positionRef.current.z);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scene]);

  // --- Texture setup functions ---
  const setupCocaParams = (t) => {
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = gl.capabilities?.getMaxAnisotropy ? gl.capabilities.getMaxAnisotropy() : 16;
    t.flipY = false;
    t.offset.y = 0;
    t.offset.x=-0.25;
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI ;
    t.repeat.set(3.2,0.9);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  };

  const setupLouverParams = (t) => {
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = gl.capabilities?.getMaxAnisotropy ? gl.capabilities.getMaxAnisotropy() : 16;
    t.flipY = false;
    t.offset.set(0.5, 0);
    t.repeat.set(1.5, 1.6);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.rotation = Math.PI / 2;
    t.center.set(0.5, 0.5);
    t.offset.y = -0.09;
    t.offset.x = -0.3;
  };

  // --- Unified Material Application Functions ---
  const applyCanopyMaterial = () => {
    if (!canopyMeshRef.current || !canopyOriginalMatRef.current) return;
    const texture = canopyTextureRef.current;
    if (texture) {
      ensureUniqueMaterial(canopyMeshRef.current);
      setMapOnMesh(canopyMeshRef.current, texture);
      canopyMeshRef.current.material.color.set(0xffffff);
    } else if (canopyColor) {
      const adjustedColor = adjustColorBrightness(canopyColor, colorShading.canopy);
      canopyMeshRef.current.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(adjustedColor),
        roughness: 0.3,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
    } else {
      canopyMeshRef.current.material = canopyOriginalMatRef.current.clone();
    }
  };

  const applySidePanel1Material = () => {
    if (!sidePanel1MeshRef.current || !sidePanel1OriginalMatRef.current) return;
    const texture = sidePanel1TextureRef.current;
    if (texture) {
      ensureUniqueMaterial(sidePanel1MeshRef.current);
      setMapOnMesh(sidePanel1MeshRef.current, texture);
      sidePanel1MeshRef.current.material.color.set(0xffffff);
    } else {
      sidePanel1MeshRef.current.material = sidePanel1OriginalMatRef.current.clone();
    }
  };

  const applySidePanel2Material = () => {
    if (!sidePanel2MeshRef.current || !sidePanel2OriginalMatRef.current) return;
    const texture = sidePanel2TextureRef.current;
    if (texture) {
      ensureUniqueMaterial(sidePanel2MeshRef.current);
      setMapOnMesh(sidePanel2MeshRef.current, texture);
      sidePanel2MeshRef.current.material.color.set(0xffffff);
    } else {
      sidePanel2MeshRef.current.material = sidePanel2OriginalMatRef.current.clone();
    }
  };

  const applyLouverMaterial = () => {
    if (!louverMeshRef.current || !louverOriginalMatRef.current) return;
    const texture = louverTextureRef.current;
    const color = louverColor;
    if (texture) {
      ensureUniqueMaterial(louverMeshRef.current);
      setMapOnMesh(louverMeshRef.current, texture);
      louverMeshRef.current.material.color.set(0xffffff);
      louverMeshRef.current.material.needsUpdate = true;
    } else if (color) {
      const adjustedColor = adjustColorBrightness(color, colorShading.louver);
      louverMeshRef.current.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(adjustedColor),
        roughness: 0.3,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
    } else {
      louverMeshRef.current.material = louverOriginalMatRef.current.clone ?
        louverOriginalMatRef.current.clone() : louverOriginalMatRef.current;
    }
  };

  // --- Hooks for applying materials ---
  useEffect(() => { applyCanopyMaterial(); }, [canopyColor, colorShading.canopy, canopyTextureRef.current]);
  useEffect(() => { applySidePanel1Material(); }, [sidePanel1TextureRef.current]);
  useEffect(() => { applySidePanel2Material(); }, [sidePanel2TextureRef.current]);
  useEffect(() => { applyLouverMaterial(); }, [louverColor, colorShading.louver, louverTextureRef.current]);
  
  // Apply colors with shading adjustments
  const applyColor = (objName, color, adjustment = 0) => {
    if (!scene) return;
    const obj = scene.getObjectByName(objName);
    if (!obj) return;
    
    let finalColor = color;
    if (color && adjustment !== 0) {
      finalColor = adjustColorBrightness(color, adjustment);
    }
    
    obj.traverse(c => {
      if (c.isMesh) {
        c.material = finalColor
          ? new THREE.MeshStandardMaterial({
              color: new THREE.Color(finalColor),
              roughness: 0.3,
              metalness: 0.2,
              side: THREE.DoubleSide
            })
          : new THREE.MeshStandardMaterial({
              color: 0xaaaaaa,
              roughness: 0.3,
              metalness: 0.2,
              side: THREE.DoubleSide
            });
      }
    });
  };

  useEffect(() => {
    ["Kanopiborder1", "Kanopiborder2", "Kanopiborder3", "Kanopiborder4"].forEach(n =>
      applyColor(n, canopyColor, colorShading.canopy)
    );
  }, [canopyColor, colorShading.canopy]);

  useEffect(() => {
    ["Bottomborder1", "Bottomborder2"].forEach(n =>
      applyColor(n, bottomBorderColor, colorShading.bottom)
    );
  }, [bottomBorderColor, colorShading.bottom]);

  useEffect(() => {
    if (doorRef.current) applyColor("Door", doorColor, colorShading.door);
  }, [doorColor, colorShading.door]);

  useEffect(() => {
    ["Toppannel", "Back1", "Back2", "Back3", "Back4"].forEach(n =>
      applyColor(n, topPanelColor, colorShading.toppanel)
    );
  }, [topPanelColor, colorShading.toppanel]);

  // --- Texture upload and reset functions ---
  const applyCanopyTexture = (imageUrl) => {
    if (!canopyMeshRef.current) return;
    const prevTex = canopyTextureRef.current;
    new THREE.TextureLoader().load(imageUrl, (t) => {
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = gl.capabilities?.getMaxAnisotropy ? gl.capabilities.getMaxAnisotropy() : 16;
      t.flipY = false;
      t.offset.set(0, -0.45);
       t.repeat.set(1, 1.9);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      canopyTextureRef.current = t;
      applyCanopyMaterial();
      if (prevTex && prevTex !== t && prevTex.dispose) prevTex.dispose();
      console.log("✅ Canopy texture applied");
    });
  };
  const resetCanopyTexture = () => {
    if (canopyTextureRef.current) {
      canopyTextureRef.current.dispose();
      canopyTextureRef.current = null;
    }
    applyCanopyMaterial();
  };

  const applySidePanel1Texture = (imageUrl) => {
    if (!sidePanel1MeshRef.current) return;
    const prevTex = sidePanel1TextureRef.current;
    new THREE.TextureLoader().load(imageUrl, (t) => {
      setupCocaParams(t);
      sidePanel1TextureRef.current = t;
      applySidePanel1Material();
      if (prevTex && prevTex !== t && prevTex.dispose) prevTex.dispose();
      console.log("✅ Side Panel 1 texture applied");
    });
  };
  const resetSidePanel1Texture = () => {
    if (sidePanel1TextureRef.current) {
      sidePanel1TextureRef.current.dispose();
      sidePanel1TextureRef.current = null;
    }
    applySidePanel1Material();
  };

  const applySidePanel2Texture = (imageUrl) => {
    if (!sidePanel2MeshRef.current) return;
    const prevTex = sidePanel2TextureRef.current;
    new THREE.TextureLoader().load(imageUrl, (t) => {
      setupCocaParams(t);
      sidePanel2TextureRef.current = t;
      applySidePanel2Material();
      if (prevTex && prevTex !== t && prevTex.dispose) prevTex.dispose();
      console.log("✅ Side Panel 2 texture applied");
    });
  };
  const resetSidePanel2Texture = () => {
    if (sidePanel2TextureRef.current) {
      sidePanel2TextureRef.current.dispose();
      sidePanel2TextureRef.current = null;
    }
    applySidePanel2Material();
  };

  const applyLouverTexture = (imageUrl) => {
    if (!louverMeshRef.current) return;
    if (louverTextureRef.current) {
      louverTextureRef.current.dispose();
      louverTextureRef.current = null;
    }
    new THREE.TextureLoader().load(imageUrl, (t) => {
      setupLouverParams(t);
      louverTextureRef.current = t;
      applyLouverMaterial();
      console.log("✅ Louver texture applied");
    });
  };
  const resetLouverTexture = () => {
    if (louverTextureRef.current) {
      louverTextureRef.current.dispose();
      louverTextureRef.current = null;
    }
    applyLouverMaterial();
  };
  
  // --- New function to adjust canopy texture ---
  const adjustCanopyTexture = ({ offsetX = 0, offsetY = 0, repeatX = 1, repeatY = 1, rotation = 0 }) => {
    const texture = canopyTextureRef.current;
    if (texture) {
      texture.offset.set(offsetX, offsetY);
      texture.repeat.set(repeatX, repeatY);
      texture.rotation = rotation;
      texture.needsUpdate = true;
      applyCanopyMaterial(); // Re-apply the material to ensure the update
      console.log("✅ Canopy texture adjusted");
    }
  };

  // --- scene setup ---
useEffect(() => {
  if (!scene || !threeScene) return;

  scene.scale.set(2.5, 2.5, 2.5);
  // Only set initial position on first setup
  if (!scene.userData.positionInitialized) {
    scene.position.set(positionRef.current.x, positionRef.current.y, positionRef.current.z);
    scene.userData.positionInitialized = true;
  }
  scene.traverse(c => { if (c.isMesh && c.name !== "Door") { c.castShadow = true; c.receiveShadow = true; } });

  // Apply default canopy texture on load
  if (canopyMeshRef.current && !canopyTextureRef.current) {
    new THREE.TextureLoader().load("/texture/canopydefault.jpg", (t) => {
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = gl.capabilities?.getMaxAnisotropy ? gl.capabilities.getMaxAnisotropy() : 16;
      t.flipY = false;
      t.offset.set(0, -0.45);
      t.repeat.set(1, 1.9);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      canopyTextureRef.current = t;
      applyCanopyMaterial();
      console.log("✅ Default canopy texture applied");
    });
  }

  if (onAssetLoaded) onAssetLoaded();
}, [scene, threeScene, onAssetLoaded]);


  // --- cleanup ---
  useEffect(() => {
    return () => {
      // Clean up textures
      if (canopyTextureRef.current) canopyTextureRef.current.dispose();
      if (sidePanel1TextureRef.current) sidePanel1TextureRef.current.dispose();
      if (sidePanel2TextureRef.current) sidePanel2TextureRef.current.dispose();
      if (louverTextureRef.current) louverTextureRef.current.dispose();
      
      // Clean up scene if it exists
      if (scene && threeScene) {
        scene.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        // Remove the scene object from the Three.js scene
        if (scene.parent) {
          scene.parent.remove(scene);
        }
      }
    };
  }, [scene, threeScene]);

  // --- expose functions ---
  useImperativeHandle(ref, () => ({
    toggleLEDLight1001(visible) {
      if (ledLight1001Ref.current) ledLight1001Ref.current.visible = visible;
      if (pointLightRef.current) pointLightRef.current.visible = visible;
      if (ambientLightRef.current) ambientLightRef.current.visible = visible;
    },
    applyCanopyTexture,
    resetCanopyTexture,
    adjustCanopyTexture, // <-- Added here
    applySidePanel1Texture,
    resetSidePanel1Texture,
    applySidePanel2Texture,
    resetSidePanel2Texture,
    applyLouverTexture,
    resetLouverTexture
  }));

  return (
    <Suspense fallback={null}>
      <Environment files="photo_studio_01_1k.hdr" background={false} intensity={2.0} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      {/* <ContactShadows position={[0, -1.42, 0]} opacity={0.4} scale={15} blur={2.5} far={10} /> */}
      <OrbitControls enableDamping dampingFactor={0.12} rotateSpeed={1.1} zoomSpeed={1} panSpeed={0.8} enablePan minDistance={2.5} maxDistance={20} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.05} target={[0, 0.5, 0]} makeDefault />
      {scene && <primitive object={scene} />}
    </Suspense>
  );
});