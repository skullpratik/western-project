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
  texture: TextureWidget,
  textureWidget: TextureWidget,
  globalTextureWidget: GlobalTextureWidget,
  lightWidget: LightWidget,
};

export default widgetRegistry;
