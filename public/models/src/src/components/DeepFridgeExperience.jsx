import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

useGLTF.preload("/models/Deepfreezer.glb");

export function Experience({ ledEnabled = true, onAssetLoaded }) {
  const { scene: threeScene, camera, gl } = useThree();
  const { scene } = useGLTF("/models/Deepfreezer.glb", undefined, undefined, (loader) => {
    if (onAssetLoaded) onAssetLoaded();
  });

  const door1Ref = useRef(null);
  const door2Ref = useRef(null);
  const isDoor1Open = useRef(false);
  const isDoor2Open = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  
  // LED lights
  const light1Ref = useRef();
  const light2Ref = useRef();
  const isLight1On = useRef(false);
  const isLight2On = useRef(false);

  useEffect(() => {
    if (!scene || !threeScene) return;

   
    // Background
    threeScene.background = null;

    // Model scale & position
    scene.scale.set(2, 2, 2);
    scene.position.set(0.2, -1.16, 0);

    // Shadows
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Store Door references
    door1Ref.current = scene.getObjectByName("Door1");
    door2Ref.current = scene.getObjectByName("Door2");

    if (door1Ref.current) door1Ref.current.rotation.x = 0;
    if (door2Ref.current) door2Ref.current.rotation.x = 0;

    // Click handler
    const handleClick = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      // Door1
      if (door1Ref.current) {
        const intersects = raycaster.current.intersectObject(door1Ref.current, true);
        if (intersects.length > 0) {
          const targetRotation = isDoor1Open.current ? 0 : -(Math.PI/2);
          gsap.to(door1Ref.current.rotation, {
            x: targetRotation,
            duration: 1,
            ease: "power2.inOut",
          });
          
          // Toggle LED light if enabled
          if (ledEnabled) {
            const targetIntensity = isDoor1Open.current ? 0 : 1;
            gsap.to(light1Ref.current, { 
              intensity: targetIntensity,
              duration: 0.5,
              ease: "power2.out"
            });
          }
          
          isDoor1Open.current = !isDoor1Open.current;
          return;
        }
      }

      // Door2
      if (door2Ref.current) {
        const intersects = raycaster.current.intersectObject(door2Ref.current, true);
        if (intersects.length > 0) {
          const targetRotation = isDoor2Open.current ? 0 : -Math.PI / 2;
          gsap.to(door2Ref.current.rotation, {
            x: targetRotation,
            duration: 1,
            ease: "power2.inOut",
          });
          
          // Toggle LED light if enabled
          if (ledEnabled) {
            const targetIntensity = isDoor2Open.current ? 0 : 1;
            gsap.to(light2Ref.current, { 
              intensity: targetIntensity,
              duration: 0.5,
              ease: "power2.out"
            });
          }
          
          isDoor2Open.current = !isDoor2Open.current;
        }
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [scene, threeScene, camera, gl, ledEnabled]);

  return (
    <>
      <Environment 
        files="photo_studio_01_1k.hdr" 
        background={false} 
        intensity={1.2}
        onLoad={onAssetLoaded}
      />

      <ContactShadows
        position={[0, -1.1, 0]}
        opacity={0.8}
        scale={15}
        blur={2.5}
        far={10}
      />

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

      {scene && <primitive object={scene} />}
    </>
  );
}