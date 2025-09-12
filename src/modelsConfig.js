import { useGLTF } from "@react-three/drei";

// 🔧 Global drawer animation config (available for future models)
const globalDrawerConfig = {
  positionAxis: "z",
  openPosition: 0.7,  
  closedPosition: 0.39,
  duration: 0.8,
  ease: "power2.out",
};

// 🏗️ Empty models configuration - all models will be added through admin panel
export const modelsConfig = {
  // ✨ All static models removed - ready for manual addition through admin panel
  // Models will be dynamically loaded from the database
};

// 🔧 Preload all models (will work with dynamically added models)
Object.values(modelsConfig).forEach((config) => {
  if (config.assets) {
    Object.values(config.assets).forEach((p) => p && useGLTF.preload(p));
  } else if (config.path) {
    useGLTF.preload(config.path);
  }
});

// 📝 Global drawer config is still available for use in admin panel templates
export { globalDrawerConfig };
