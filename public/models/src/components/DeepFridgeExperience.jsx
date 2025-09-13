import React, { useEffect, useRef, forwardRef, useImperativeHandle, Suspense } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

// Postprocessing
import { EffectComposer, Bloom, FXAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

useGLTF.preload("/models/deepfreezer.glb");

export const Experience = forwardRef(function DeepFridgeExperience(
  { ledEnabled = true, onAssetLoaded },
  ref
) {
  const { scene: threeScene, camera, gl } = useThree();
  const { scene } = useGLTF("/models/deepfreezer.glb");

  const door1Ref = useRef(null);
  const door2Ref = useRef(null);
  const isDoor1Open = useRef(false);
  const isDoor2Open = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const originalMaterials = useRef({});
  const currentTextures = useRef({});

  // 🔹 Apply texture logic remains the same
  const applyTexture = (mesh, imagePath) => {
    if (!mesh) return;
    if (currentTextures.current[mesh.name]) {
      currentTextures.current[mesh.name].dispose();
      currentTextures.current[mesh.name] = null;
    }
    if (!imagePath) {
      if (originalMaterials.current[mesh.name]) {
        mesh.material = originalMaterials.current[mesh.name];
        mesh.material.needsUpdate = true;
      }
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(imagePath, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      tex.anisotropy = gl.capabilities?.getMaxAnisotropy() || 16;

      const newMaterial = mesh.material.clone();
      newMaterial.map = tex;
      newMaterial.needsUpdate = true;

      mesh.material = newMaterial;
      currentTextures.current[mesh.name] = tex;
    });
  };

  const applyToTarget = (name, imagePath) => {
    const target = scene.getObjectByName(name);
    if (!target) return;

    if (target.isMesh && target.geometry?.attributes?.uv) {
      applyTexture(target, imagePath);
    } else if (target.isObject3D) {
      target.traverse((child) => {
        if (child.isMesh && child.geometry?.attributes?.uv) {
          applyTexture(child, imagePath);
        }
      });
    }
  };

  useImperativeHandle(ref, () => ({
    applyFrontTexture: (url) => applyToTarget("FrontPannel", url),
    resetFront: () => applyToTarget("FrontPannel", null),
    applyLeftTexture: (url) => applyToTarget("SidePannelLeft", url),
    resetLeft: () => applyToTarget("SidePannelLeft", null),
    applyRightTexture: (url) => applyToTarget("SidePannelRight", url),
    resetRight: () => applyToTarget("SidePannelRight", null),
  }));

  // Initial setup
  useEffect(() => {
    if (!scene || !threeScene) return;
    threeScene.background = null;
    scene.scale.set(2.5, 2.5, 2.5);
    scene.position.set(0.2, -1.16, 0);

    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        originalMaterials.current[obj.name] = obj.material.clone();
      }
    });

    if (onAssetLoaded) onAssetLoaded();
  }, [scene, threeScene, onAssetLoaded]);

  // Default textures
  useEffect(() => {
    if (!scene) return;
    applyToTarget("FrontPannel", "/texture/Deepfront.jpg");
    applyToTarget("SidePannelLeft", "/texture/DeepleftRight.jpg");
    applyToTarget("SidePannelRight", "/texture/DeepleftRight.jpg");
  }, [scene]);

  // Door animation
  useEffect(() => {
    if (!scene || !gl || !camera) return;

    door1Ref.current = scene.getObjectByName("Door1");
    door2Ref.current = scene.getObjectByName("Door2");

    const handleClick = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);

      if (door1Ref.current) {
        const intersects = raycaster.current.intersectObject(door1Ref.current, true);
        if (intersects.length > 0) {
          const targetRotation = isDoor1Open.current ? 0 : -(Math.PI / 2);
          gsap.to(door1Ref.current.rotation, { x: targetRotation, duration: 1 });
          isDoor1Open.current = !isDoor1Open.current;
          return;
        }
      }
      if (door2Ref.current) {
        const intersects = raycaster.current.intersectObject(door2Ref.current, true);
        if (intersects.length > 0) {
          const targetRotation = isDoor2Open.current ? 0 : -Math.PI / 2;
          gsap.to(door2Ref.current.rotation, { x: targetRotation, duration: 1 });
          isDoor2Open.current = !isDoor2Open.current;
        }
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [scene, camera, gl]);

  return (
    <Suspense fallback={null}>
      <Environment files="photo_studio_01_1k.hdr" background={false} intensity={1.2} />
      <ContactShadows position={[0, -1.1, 0]} opacity={0.8} scale={15} blur={2.5} far={10} />
      <OrbitControls
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={1.1}
        zoomSpeed={1}
        panSpeed={0.8}
        enablePan
        minDistance={2.5}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.5, 0]}
        makeDefault
      />

      {/* ✅ Model */}
      {scene && <primitive object={scene} />}

      {/* ✅ Postprocessing */}
      <EffectComposer multisampling={0}> 
        <FXAA />
        <Bloom
          intensity={0.4}     // glow strength
          luminanceThreshold={0.85}
          luminanceSmoothing={0.3}
          blendFunction={BlendFunction.SCREEN}
        />
      </EffectComposer>
    </Suspense>
  );
});
