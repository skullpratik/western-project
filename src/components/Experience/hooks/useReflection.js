export function useReflection(scene, materialCache, isReflective) {
  if (!scene) return;

  scene.traverse((child) => {
    if (child.isMesh) {
      if (!materialCache.current.has(child.uuid)) {
        materialCache.current.set(child.uuid, child.material.clone());
      }

      const originalMaterial = materialCache.current.get(child.uuid);

      const excludeParts = [
        "GlassDoor-01_1",
        "GlassDoor-02_1",
        "GlassDoor-03_1",
        "Handle_1",
        "Handle_2",
        "Handle_3",
        "Logo",
        "Logo.001",
        "Logo2",
      ];
      if (excludeParts.includes(child.name)) return;

      if (child.material && child.material.transparent === false) {
        if (isReflective) {
          child.material.metalness = 1.0;
          child.material.roughness = 0.13;
        } else {
          child.material.metalness = originalMaterial.metalness;
          child.material.roughness = originalMaterial.roughness;
        }
        child.material.needsUpdate = true;
      }
    }
  });
}
