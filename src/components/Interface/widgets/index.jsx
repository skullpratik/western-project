import React from 'react';
import { DoorPresetWidget } from "./DoorPresetWidget";
import { TextureWidget } from "./TextureWidget";
import { LightWidget } from "./LightWidget";
import GlobalTextureWidget from "./GlobalTextureWidget";
import ColorPickerWidget from "./ColorPickerWidget";
import { ScreenshotWidget } from "./ScreenshotWidget";
import { DoorControls } from "../controls/DoorControls";
import { PresetWidget } from './PresetWidget';

// ✅ Toggle widgets removed - using raycasting interactions instead
// All door/drawer interactions are now handled via raycasting with metadata from modelsConfig

export const widgetRegistry = {
  doorPresets: DoorPresetWidget,
  doorPresetWidget: DoorPresetWidget,
  texture: TextureWidget,
  textureWidget: TextureWidget,
  globalTextureWidget: GlobalTextureWidget,
  colorPicker: ColorPickerWidget,
  colorpicker: ColorPickerWidget,
  lightWidget: LightWidget,
  screenshotWidget: ScreenshotWidget,
  // Map missing widget types to existing components (excluding movement)
  reflectionWidget: LightWidget, // Reflection controls use light widget
  customWidget: TextureWidget, // Custom widgets default to texture widget
  // movementWidget intentionally not mapped - will be filtered out
  presets: PresetWidget,
  presetWidget: PresetWidget,
};

export default widgetRegistry;
