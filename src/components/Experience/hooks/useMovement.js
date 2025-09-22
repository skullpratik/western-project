import { useEffect, useState } from "react";
import * as THREE from "three";

export function useMovement(scene) {
  const [position, setPosition] = useState(new THREE.Vector3(0.4, -0.836, 0));
  const moveSpeed = 0.05;

  useEffect(() => {
    const handleKeyDown = (e) => {
      const newPosition = position.clone();
      switch (e.key.toLowerCase()) {
        case "l": newPosition.x -= moveSpeed; break;
        case "r": newPosition.x += moveSpeed; break;
        case "u": newPosition.y += moveSpeed; break;
        case "d": newPosition.y -= moveSpeed; break;
        default: return;
      }
      setPosition(newPosition);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [position]);

  // Update scene position only when `position` changes instead of every frame
  useEffect(() => {
    if (scene) scene.position.copy(position);
  }, [scene, position]);
}
