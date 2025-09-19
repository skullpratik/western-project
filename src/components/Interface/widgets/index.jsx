import React from 'react';
import { DoorPresetWidget } from "./DoorPresetWidget";
import { TextureWidget } from "./TextureWidget";
import { LightWidget } from "./LightWidget";
import GlobalTextureWidget from "./GlobalTextureWidget";
import { DoorControls } from "../controls/DoorControls";

// ✅ Toggle widgets removed - using raycasting interactions instead
// All door/drawer interactions are now handled via raycasting with metadata from modelsConfig

export const widgetRegistry = {
  doorPresets: DoorPresetWidget,
  doorPresetWidget: DoorPresetWidget,
  texture: TextureWidget,
  textureWidget: TextureWidget,
  globalTextureWidget: GlobalTextureWidget,
  lightWidget: LightWidget,
  // Map missing widget types to existing components (excluding movement)
  reflectionWidget: LightWidget, // Reflection controls use light widget
  customWidget: TextureWidget, // Custom widgets default to texture widget
  // movementWidget intentionally not mapped - will be filtered out
};

export default widgetRegistry;
