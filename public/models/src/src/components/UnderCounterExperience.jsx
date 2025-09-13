import React, { useEffect, useRef, useImperativeHandle, forwardRef, Suspense, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

// Drawers
const TARGET_GROUPS = [
  "Drawer-09001", "Drawer-03001", "Drawer-05", "Drawer-08",
  "Drawer-07", "Drawer-04", "Drawer-03", "Drawer-02", "Drawer-01001",
];

const CLOSED_Z = -0.327;
const OPEN_Z = 0;

// Doors
const SOLID_DOORS = ["Door_01", "Door_02", "Door_03"];
const GLASS_DOORS = ["GlassDoor-01", "GlassDoor-02", "GlassDoor-03"];
const ALL_DOORS = [...SOLID_DOORS, ...GLASS_DOORS];

const PANELS = ["Door_Inside_Panel___01", "Door_Inside_Panel___02", "Door_Inside_Panel___03"];
const GlassPanels = ["GlassDoorHinges1", "GlassDoorHinges2", "GlassDoorHinges3"];

// For direct mesh-level control inside solid door objects:
const SOLID_DOOR_MESH_PREFIXES = ["Door_01_", "Door_02_", "Door_03_"]; // matches Door_01_1, Door_02_3, etc.

// Door rotation configuration
const doorConfig = {
  Door_01: { axis: "z", angle: 90 },
  Door_02: { axis: "z", angle: -90 },
  Door_03: { axis: "z", angle: -90 },
  "GlassDoor-01": { axis: "x", angle: 90 },
  "GlassDoor-02": { axis: "z", angle: -90 },
  "GlassDoor-03": { axis: "x", angle: 90 },
};

// Mapping between solid and glass
const toGlass = { Door_01: "GlassDoor-01", Door_02: "GlassDoor-02", Door_03: "GlassDoor-03" };
const toSolid = { "GlassDoor-01": "Door_01", "GlassDoor-02": "Door_02", "GlassDoor-03": "Door_03" };

// Config for different positions
const positionConfigs = {
  1: {
    1: { doors: ["Door_01"], panels: [PANELS[0]], hiddenDrawers: ["Drawer-01001", "Drawer-04", "Drawer-07", "Door_02", "Door_03", "Drawer-01_Inside_Panal"] },
    2: { doors: ["Door_02"], panels: [PANELS[1]], hiddenDrawers: ["Drawer-05", "Drawer-08", "Drawer-02", "Door_03", "Door_01", "Drawer-02_Inside_Panal"] },
    3: { doors: ["Door_03"], panels: [PANELS[2]], hiddenDrawers: ["Drawer-03", "Drawer-09001", "Drawer-03001", "Door_01", "Door_02", "Drawer-3_Inside_Panal", "Drawer-03_Inside_Panal"].filter(Boolean) }
  },
  2: {
    1: { doors: ["Door_01", "Door_02"], panels: [PANELS[0], PANELS[1]], hiddenDrawers: ["Drawer-01001", "Drawer-05", "Drawer-02", "Drawer-08", "Drawer-07", "Drawer-04", "Door_03", "Drawer-01_Inside_Panal", "Drawer-02_Inside_Panal"] },
    2: { doors: ["Door_01", "Door_03"], panels: [PANELS[0], PANELS[2]], hiddenDrawers: ["Drawer-01001", "Drawer-04", "Drawer-03", "Drawer-03001", "Drawer-09001", "Drawer-07", "Door_02", "Drawer-01_Inside_Panal", "Drawer-03_Inside_Panal"] },
    3: { doors: ["Door_02", "Door_03"], panels: [PANELS[1], PANELS[2]], hiddenDrawers: ["Drawer-08", "Drawer-09001", "Drawer-05", "Drawer-02", "Drawer-03", "Drawer-03001", "Door_01", "Drawer-03_Inside_Panal", "Drawer-02_Inside_Panal"] }
  },
  3: {
    1: {
      doors: SOLID_DOORS,
      panels: PANELS,
      hiddenDrawers: [
        "Drawer-01001", "Drawer-04", "Drawer-07", "Drawer-01_Inside_Panal",
        "Drawer-05", "Drawer-08", "Drawer-02", "Drawer-02_Inside_Panal",
        "Drawer-03", "Drawer-09001", "Drawer-03001", "Drawer-03_Inside_Panal"
      ]
    }
  }
};

// Preload GLTF
useGLTF.preload("/models/pra.glb");

export const Experience = forwardRef(({ lighting = "photo_studio_01_4k_11zon.hdr", doorType = "solid" }, ref) => {
  const { scene: threeScene, camera, gl } = useThree();
  const { scene } = useGLTF("/models/pra.glb");
  
  const [position, setPosition] = useState(new THREE.Vector3(0.4, -0.836, 0));
  const moveSpeed = 0.05;

  const allObjects = useRef({});
  const activeDrawers = useRef([]);
  const activeDoors = useRef([]);
  const drawerStates = useRef({});
  const doorStates = useRef({});
  const logoRef = useRef(null);
  const logo2Ref = useRef(null);
  const logo2InitialRot = useRef(new THREE.Euler());
  const lastSelectionRef = useRef({ doors: [], panels: [], drawers: [] });
  const initialRotations = useRef({});

  // --- Shadow/Renderer setup (defensive if parent Canvas didn't pass `shadows`) ---
  useEffect(() => {
    if (!gl) return;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  const isGlassType = () => doorType === "glass";
  const mapDoorName = (name) => (isGlassType() ? (toGlass[name] || name) : name);

  const updateActiveObjects = () => {
    activeDrawers.current = TARGET_GROUPS.filter(n => allObjects.current[n]?.visible).map(n => allObjects.current[n]);
    activeDoors.current = ALL_DOORS.filter(n => allObjects.current[n]?.visible).map(n => allObjects.current[n]);
  };

  const updateLogoVisibility = () => {
    const door3Solid = allObjects.current["Door_03"];
    const drawer3 = allObjects.current["Drawer-03"];
    if (!logoRef.current || !logo2Ref.current) return;
    if (door3Solid?.visible) {
      logo2Ref.current.visible = true;
      logoRef.current.visible = false;
    } else if (drawer3?.visible) {
      logo2Ref.current.visible = false;
      logoRef.current.visible = true;
    } else {
      logo2Ref.current.visible = false;
      logoRef.current.visible = false;
    }
  };

  const resetToDefault = () => {
    if (!scene) return;
    scene.traverse((child) => {
      if ([...SOLID_DOORS, ...GLASS_DOORS, ...PANELS].includes(child.name)) child.visible = false;
      if (TARGET_GROUPS.includes(child.name)) { child.position.z = CLOSED_Z; child.visible = true; drawerStates.current[child.name] = "closed"; }
      if (GlassPanels.includes(child.name)) child.visible = false;
      if (ALL_DOORS.includes(child.name)) { child.rotation.copy(initialRotations.current[child.name]); doorStates.current[child.name] = "closed"; }
    });
    if (logoRef.current) logoRef.current.position.set(0.522, 0.722, 0.39);
    if (logo2Ref.current) { logo2Ref.current.rotation.copy(logo2InitialRot.current); logo2Ref.current.visible = false; }
    updateActiveObjects();
    updateLogoVisibility();
    lastSelectionRef.current = { doors: [], panels: [], drawers: [] };
    setPosition(new THREE.Vector3(0.4, -0.836, 0));
  };

  // Helpers to apply materials
  const applyBaseMaterialTuning = (obj) => {
    if (!obj) return;
    obj.traverse((n) => {
      if (n.isMesh && n.material) {
        n.material.metalness = 1;
        n.material.roughness = 0.3;
        n.material.needsUpdate = true;
      }
    });
  };

  const isSolidDoorInnerMesh = (meshName) =>
    SOLID_DOOR_MESH_PREFIXES.some((prefix) => meshName?.startsWith(prefix));

  const applySolidDoorMaterialTuning = (obj) => {
    if (!obj) return;
    obj.traverse((n) => {
      if (n.isMesh && n.material && isSolidDoorInnerMesh(n.name)) {
        if (!n.material.isMeshStandardMaterial) return;
        if (n.material.userData?._clonedForDoor !== true) {
          n.material = n.material.clone();
          n.material.userData._clonedForDoor = true;
        }
        n.material.metalness = 1;
        n.material.roughness = 0.2;
        n.material.needsUpdate = true;
      }
    });
  };

  // Initialize scene and objects
  useEffect(() => {
    if (!scene) return;
    threeScene.background = null;
    scene.scale.set(2, 2, 2);
    scene.position.set(0.4, -0.836, 0);

    // Enable cast/receive shadows for all meshes in the model
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // One pass only
    applyBaseMaterialTuning(scene);
    applySolidDoorMaterialTuning(scene);

    scene.traverse((child) => {
      if (!child?.name) return;

      allObjects.current[child.name] = child;

      if (ALL_DOORS.includes(child.name)) {
        initialRotations.current[child.name] = new THREE.Euler().copy(child.rotation);
        doorStates.current[child.name] = "closed";
        child.visible = false;
      }
      if (PANELS.includes(child.name)) child.visible = false;
      if (GlassPanels.includes(child.name)) child.visible = false;

      if (child.name === "Logo" || child.name === "Logo.001") logoRef.current = child;
      if (child.name === "Logo2") {
        logo2Ref.current = child;
        logo2InitialRot.current.copy(child.rotation);
        logo2Ref.current.visible = false;
      }

      if (TARGET_GROUPS.includes(child.name)) {
        child.position.z = CLOSED_Z;
        drawerStates.current[child.name] = "closed";
      }
    });

    if (logoRef.current) logoRef.current.position.set(0.522, 0.722, 0.39);

    updateActiveObjects();
    updateLogoVisibility();
  }, [scene, threeScene]);

  // Handle keyboard input for model movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      const newPosition = position.clone();
      switch (e.key.toLowerCase()) {
        case 'l': newPosition.x -= moveSpeed; break;
        case 'r': newPosition.x += moveSpeed; break;
        case 'u': newPosition.y += moveSpeed; break;
        case 'd': newPosition.y -= moveSpeed; break;
        default: return;
      }
      setPosition(newPosition);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position]);

  // Update scene position based on keyboard input
  useFrame(() => {
    if (scene) {
      scene.position.copy(position);
    }
  });

  const handleClick = (event) => {
    if (!scene || !gl) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Doors
    const visibleDoors = activeDoors.current.filter(obj => obj.visible);
    const intersectsDoors = raycaster.intersectObjects(visibleDoors, true);
    if (intersectsDoors.length > 0) {
      let obj = intersectsDoors[0].object;
      while (obj && !ALL_DOORS.includes(obj.name)) obj = obj.parent;
      if (obj) {
        const name = obj.name;
        const isOpen = doorStates.current[name] === "open";
        const targetRotation = new THREE.Euler().copy(initialRotations.current[name]);
        if (!isOpen) {
          const config = doorConfig[name];
          if (config) targetRotation[config.axis] += THREE.MathUtils.degToRad(config.angle);
        }
        gsap.to(obj.rotation, { x: targetRotation.x, y: targetRotation.y, z: targetRotation.z, duration: 0.8, ease: "power2.out" });

        // Rotate Logo2 for Door_03
        if (name === "Door_03" && logo2Ref.current) {
          const targetY = isOpen ? logo2InitialRot.current.y : logo2InitialRot.current.y + THREE.MathUtils.degToRad(90);
          gsap.to(logo2Ref.current.rotation, { y: targetY, duration: 0.8, ease: "power2.out" });
        }

        doorStates.current[name] = isOpen ? "closed" : "open";
        updateLogoVisibility();
        return;
      }
    }

    // Drawers
    const visibleDrawers = activeDrawers.current.filter(obj => obj.visible);
    const intersectsDrawers = raycaster.intersectObjects(visibleDrawers, true);
    if (intersectsDrawers.length > 0) {
      let obj = intersectsDrawers[0].object;
      while (obj && !TARGET_GROUPS.includes(obj.name)) obj = obj.parent;
      if (obj) {
        const name = obj.name;
        const isOpen = drawerStates.current[name] === "open";
        gsap.to(obj.position, { z: isOpen ? CLOSED_Z : OPEN_Z, duration: 0.8, ease: "power2.out" });

        if (name === "Drawer-03" && logoRef.current) {
          gsap.to(logoRef.current.position, { z: isOpen ? 0.39 : 0.718, duration: 0.8, ease: "power2.out" });
        }

        drawerStates.current[name] = isOpen ? "closed" : "open";
        updateLogoVisibility();
      }
    }
  };

  useEffect(() => {
    if (!gl) return;
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [gl, camera]);

  const showSelectionWithDoorType = () => {
    [...SOLID_DOORS, ...GLASS_DOORS].forEach(n => { if (allObjects.current[n]) allObjects.current[n].visible = false; });
    lastSelectionRef.current.doors.forEach(solidName => {
      const mapped = mapDoorName(solidName);
      if (allObjects.current[mapped]) {
        allObjects.current[mapped].visible = true;
        if (initialRotations.current[mapped]) allObjects.current[mapped].rotation.copy(initialRotations.current[mapped]);
        doorStates.current[mapped] = "closed";
      }
    });
    lastSelectionRef.current.panels.forEach(n => { if (allObjects.current[n]) allObjects.current[n].visible = true; });
    updateActiveObjects();
    updateLogoVisibility();
  };

  useEffect(() => { showSelectionWithDoorType(); }, [doorType]);

  useImperativeHandle(ref, () => ({
    resetToDefault,
    setDoorSelection(doorCount, position) {
      resetToDefault();
      if (!doorCount || !position) { lastSelectionRef.current = { doors: [], panels: [], drawers: [] }; return; }
      const config = positionConfigs[doorCount]?.[position];
      if (!config) return;
      lastSelectionRef.current = { doors: [...config.doors], panels: [...config.panels], drawers: [...config.hiddenDrawers] };
      showSelectionWithDoorType();
      config.hiddenDrawers.forEach(n => { if (allObjects.current[n]) allObjects.current[n].visible = false; });
    }
  }));

  return (
    <Suspense fallback={null}>
      {/* Softer, more realistic environment lighting */}
      <Environment 
        files="photo_studio_01_1k.hdr" 
        background={false} 
        intensity={0.1} // Reduced intensity for softer lighting
      />

      {/* Subtle ambient fill */}
     

      {/* Main directional light with softer shadows */}
      <directionalLight
  position={[5, 10, 5]}
  intensity={0.01}
  castShadow
  shadow-mapSize={[1024, 1024]} // Lower resolution for softer shadows
  shadow-camera-near={0.5}
  shadow-camera-far={25}
  shadow-camera-left={-10}
  shadow-camera-right={10}
  shadow-camera-top={10}
  shadow-camera-bottom={-10}
  shadow-bias={0.0001}
  shadow-radius={8} // Increase for softer edges
/>

     
      

      {/* Ground plane to catch shadows */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.9, 0]} 
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>

      {/* Soft contact shadows */}
      <ContactShadows
        position={[0, -0.91, 0]} // Slightly above the ground plane
        opacity={0.25}
        scale={15}
        blur={8} // Increased blur for softer shadows
        far={10}
        resolution={1024} // Higher resolution for better quality
        color="#000000"
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={1.1}
        zoomSpeed={1.0}
        panSpeed={0.8}
        enablePan
        minDistance={0}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.5, 0]}
        makeDefault
      />

      {/* GLTF Model */}
      {scene && <primitive object={scene} castShadow receiveShadow />}
    </Suspense>
  );
});