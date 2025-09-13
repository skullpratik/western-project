import React, { useEffect, useRef, useImperativeHandle, forwardRef, Suspense } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import tinycolor from "tinycolor2";

useGLTF.preload("/models/UV.glb");

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
  const { scene } = useGLTF("/models/UV.glb", undefined, undefined, () => {
    if (onAssetLoaded) onAssetLoaded();
  });

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

  // Helper function to adjust color brightness
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
      if (child.isMesh && child.name.toLowerCase().includes("canopy")) {
        canopyMeshRef.current = child;
        if (!child.userData.originalMaterial) child.userData.originalMaterial = child.material.clone ? child.material.clone() : child.material;
      }
      if (child.isMesh && child.name === "Louver") {
        louverMeshRef.current = child;
        if (!child.userData.originalMaterial) child.userData.originalMaterial = child.material.clone ? child.material.clone() : child.material;
        louverOriginalMatRef.current = child.userData.originalMaterial;
      }
    });

    const sp1 = scene.getObjectByName("SidePannel1");
    if (sp1 && sp1.isMesh) {
      sidePanel1MeshRef.current = sp1;
      if (!sp1.userData.originalMaterial) sp1.userData.originalMaterial = sp1.material.clone ? sp1.material.clone() : sp1.material;
      sidePanel1OriginalMatRef.current = sp1.userData.originalMaterial;
    }

    const sp2 = scene.getObjectByName("SidePannel2");
    if (sp2 && sp2.isMesh) {
      sidePanel2MeshRef.current = sp2;
      if (!sp2.userData.originalMaterial) sp2.userData.originalMaterial = sp2.material.clone ? sp2.material.clone() : sp2.material;
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

  // 🔥 change background depending on LED state
  if (threeScene) {
    threeScene.background = ledVisible ? new THREE.Color(0x666666) : null;
  }

  // 🌟 Make canopy glow when LED is on
  if (canopyMeshRef.current) {
    const materials = Array.isArray(canopyMeshRef.current.material)
      ? canopyMeshRef.current.material
      : [canopyMeshRef.current.material];

    materials.forEach(mat => {
      if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        // if a texture already applied, use it as emissive map
        if (mat.map) {
          mat.emissiveMap = mat.map;
        }
        mat.emissive = ledVisible ? new THREE.Color(0xffffff) : new THREE.Color(0x000000);
        mat.emissiveIntensity = ledVisible ? 1.2 : 0.0; // tweak intensity
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

      // Apply the updated position
      scene.position.set(positionRef.current.x, positionRef.current.y, positionRef.current.z);
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
    t.offset.y = -0.2;
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
    t.repeat.set(0.85, 3);
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

  // --- Canopy ---
  const applyCanopyTexture = (imageUrl) => {
    if (!canopyMeshRef.current) return;

    const prevTex = canopyTextureRef.current;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const squeezeY = 0.4;
      const newHeight = img.height * squeezeY;
      const offsetY = (canvas.height - newHeight) / 2;
      ctx.drawImage(img, 0, offsetY, canvas.width, newHeight);

      const tex = new THREE.CanvasTexture(canvas);
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = gl.capabilities?.getMaxAnisotropy ? gl.capabilities.getMaxAnisotropy() : 16;
      tex.flipY = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

      ensureUniqueMaterial(canopyMeshRef.current);
      setMapOnMesh(canopyMeshRef.current, tex);
      canopyTextureRef.current = tex;

      if (prevTex && prevTex !== tex && prevTex.dispose) prevTex.dispose();
      console.log("✅ Canopy texture applied");
    };
    img.src = imageUrl;
  };
  const resetCanopy = () => {
    const mesh = canopyMeshRef.current;
    if (!mesh) return;
    if (canopyTextureRef.current) { canopyTextureRef.current.dispose(); canopyTextureRef.current = null; }
    if (mesh.userData?.originalMaterial) mesh.material = mesh.userData.originalMaterial.clone ? mesh.userData.originalMaterial.clone() : mesh.userData.originalMaterial;
    mesh.userData._materialUnique = false;
  };

  // --- SidePanels ---
  const applySidePanel1Texture = (imageUrl) => {
    if (!sidePanel1MeshRef.current) return;
    const mesh = sidePanel1MeshRef.current;
    const prevTex = sidePanel1TextureRef.current;
    ensureUniqueMaterial(mesh);
    new THREE.TextureLoader().load(imageUrl, (t) => {
      setupCocaParams(t);
      setMapOnMesh(mesh, t);
      sidePanel1TextureRef.current = t;
      if (prevTex && prevTex !== t && prevTex.dispose) prevTex.dispose();
    });
  };
  const resetSidePanel1 = () => {
    const mesh = sidePanel1MeshRef.current;
    if (!mesh) return;
    if (sidePanel1TextureRef.current) { sidePanel1TextureRef.current.dispose(); sidePanel1TextureRef.current = null; }
    if (mesh.userData?.originalMaterial) mesh.material = mesh.userData.originalMaterial.clone ? mesh.userData.originalMaterial.clone() : mesh.userData.originalMaterial;
    mesh.userData._materialUnique = false;
  };

  const applySidePanel2Texture = (imageUrl) => {
    if (!sidePanel2MeshRef.current) return;
    const mesh = sidePanel2MeshRef.current;
    const prevTex = sidePanel2TextureRef.current;
    ensureUniqueMaterial(mesh);
    new THREE.TextureLoader().load(imageUrl, (t) => {
      setupCocaParams(t);
      setMapOnMesh(mesh, t);
      sidePanel2TextureRef.current = t;
      if (prevTex && prevTex !== t && prevTex.dispose) prevTex.dispose();
    });
  };
  const resetSidePanel2 = () => {
    const mesh = sidePanel2MeshRef.current;
    if (!mesh) return;
    if (sidePanel2TextureRef.current) { sidePanel2TextureRef.current.dispose(); sidePanel2TextureRef.current = null; }
    if (mesh.userData?.originalMaterial) mesh.material = mesh.userData.originalMaterial.clone ? mesh.userData.originalMaterial.clone() : mesh.userData.originalMaterial;
    mesh.userData._materialUnique = false;
  };

  // --- Louver ---
  const applyLouverTexture = (imageUrl) => {
    if (!louverMeshRef.current) return;
    if (louverTextureRef.current) { louverTextureRef.current.dispose(); louverTextureRef.current = null; }
    ensureUniqueMaterial(louverMeshRef.current);
    new THREE.TextureLoader().load(imageUrl, (t) => {
      setupLouverParams(t);
      setMapOnMesh(louverMeshRef.current, t);
      louverTextureRef.current = t;
      console.log("✅ Louver texture applied");
    });
  };
  const resetLouver = () => {
    const mesh = louverMeshRef.current;
    if (!mesh) return;
    if (louverTextureRef.current) { louverTextureRef.current.dispose(); louverTextureRef.current = null; }
    if (mesh.userData?.originalMaterial) mesh.material = mesh.userData.originalMaterial.clone ? mesh.userData.originalMaterial.clone() : mesh.userData.originalMaterial;
    mesh.userData._materialUnique = false;
  };

  // --- Colors ---
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

  // Apply colors with shading adjustments
  useEffect(() => { 
    ["Kanopiborder1","Kanopiborder2","Kanopiborder3","Kanopiborder4"].forEach(n => 
      applyColor(n, canopyColor, colorShading.canopy)
    ); 
  }, [canopyColor, colorShading.canopy]);
  
  useEffect(() => { 
    ["Bottomborder1","Bottomborder2"].forEach(n => 
      applyColor(n, bottomBorderColor, colorShading.bottom)
    ); 
  }, [bottomBorderColor, colorShading.bottom]);
  
  useEffect(() => { 
    if (doorRef.current) applyColor("Door", doorColor, colorShading.door); 
  }, [doorColor, colorShading.door]);
  
  useEffect(() => { 
    ["Toppannel","Back1","Back2","Back3","Back4"].forEach(n => 
      applyColor(n, topPanelColor, colorShading.toppanel)
    ); 
  }, [topPanelColor, colorShading.toppanel]);

  // Apply color to Louver mesh with shading
  useEffect(() => {
    if (!louverMeshRef.current) return;
    
    if (louverColor) {
      // If color is applied, reset any texture first
      if (louverTextureRef.current) {
        louverTextureRef.current.dispose();
        louverTextureRef.current = null;
      }
      
      const adjustedColor = adjustColorBrightness(louverColor, colorShading.louver);
      
      louverMeshRef.current.material = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(adjustedColor), 
        roughness: 0.3, 
        metalness: 0.2, 
        side: THREE.DoubleSide 
      });
    } else {
      // Reset to original material if no color is selected
      if (louverOriginalMatRef.current) {
        louverMeshRef.current.material = louverOriginalMatRef.current.clone ? 
          louverOriginalMatRef.current.clone() : louverOriginalMatRef.current;
      }
    }
  }, [louverColor, colorShading.louver]);

  // --- scene setup ---
  useEffect(() => {
    if (!scene || !threeScene) return;
    
    scene.scale.set(2,2,2);
    scene.position.set(positionRef.current.x, positionRef.current.y, positionRef.current.z);
    scene.traverse(c => { if (c.isMesh && c.name!=="Door") { c.castShadow = true; c.receiveShadow = true; } });
    if (onAssetLoaded) onAssetLoaded();
  }, [scene, threeScene, onAssetLoaded]);

  // --- cleanup ---
  useEffect(() => {
    return () => {
      if (canopyTextureRef.current) canopyTextureRef.current.dispose();
      if (sidePanel1TextureRef.current) sidePanel1TextureRef.current.dispose();
      if (sidePanel2TextureRef.current) sidePanel2TextureRef.current.dispose();
      if (louverTextureRef.current) louverTextureRef.current.dispose();
    };
  }, []);

  // --- expose functions ---
  useImperativeHandle(ref, () => ({
    toggleLEDLight1001(visible) {
      if (ledLight1001Ref.current) ledLight1001Ref.current.visible = visible;
      if (pointLightRef.current) pointLightRef.current.visible = visible;
      if (ambientLightRef.current) ambientLightRef.current.visible = visible;
    },
    applyCanopyTexture,
    resetCanopy,
    applySidePanel1Texture,
    resetSidePanel1,
    applySidePanel2Texture,
    resetSidePanel2,
    applyLouverTexture,
    resetLouver
  }));

  return (
    <Suspense fallback={null}>
      {!ledVisible && <Environment files="photo_studio_01_1k.hdr" background={false} intensity={1.2} onLoad={onAssetLoaded} />}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.3,0]} receiveShadow>
        <planeGeometry args={[1000,1000]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0} metalness={0} visible={false}/>
      </mesh>
      <ContactShadows position={[0,-1.42,0]} opacity={1.5} scale={15} blur={2.5} far={10} />
      <OrbitControls enableDamping dampingFactor={0.12} rotateSpeed={1.1} zoomSpeed={1} panSpeed={0.8} enablePan minDistance={2.5} maxDistance={20} minPolarAngle={Math.PI/6} maxPolarAngle={Math.PI/2.05} target={[0,0.5,0]} makeDefault />
      {scene && <primitive object={scene} />}
    </Suspense>
  );
});