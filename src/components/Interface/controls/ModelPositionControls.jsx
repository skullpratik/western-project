// src/components/Interface/controls/ModelPositionControls.jsx
import React, { useState, useEffect } from 'react';
import './ModelPositionControls.css';

const ModelPositionControls = ({ 
  api, 
  userPermissions,
  onPositionChange,
  currentPosition = [0, 0, 0],
  currentRotation = [0, 0, 0],
  currentScale = 2
}) => {
  const [position, setPosition] = useState(currentPosition);
  const [rotation, setRotation] = useState(currentRotation.map(r => r * 180 / Math.PI)); // Convert to degrees
  const [scale, setScale] = useState(currentScale);
  const [autoFitEnabled, setAutoFitEnabled] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setPosition(currentPosition);
    setRotation(currentRotation.map(r => r * 180 / Math.PI));
    setScale(currentScale);
  }, [currentPosition, currentRotation, currentScale]);

  // Check if user has movement permissions
  const canMove = userPermissions?.canMove || userPermissions?.isAdmin || false;

  if (!canMove) {
    return null;
  }

  const handlePositionChange = (axis, value) => {
    const newPosition = [...position];
    newPosition[axis] = parseFloat(value) || 0;
    setPosition(newPosition);
    
    // Immediate update
    const newTransform = {
      position: newPosition,
      rotation: rotation.map(r => r * Math.PI / 180), // Convert back to radians
      scale
    };
    
    if (onPositionChange) {
      onPositionChange(newTransform);
    }
  };

  const handleRotationChange = (axis, value) => {
    const newRotation = [...rotation];
    newRotation[axis] = parseFloat(value) || 0;
    setRotation(newRotation);
    
    // Immediate update
    const newTransform = {
      position,
      rotation: newRotation.map(r => r * Math.PI / 180), // Convert back to radians
      scale
    };
    
    if (onPositionChange) {
      onPositionChange(newTransform);
    }
  };

  const handleScaleChange = (value) => {
    const newScale = parseFloat(value) || 1;
    setScale(newScale);
    
    // Immediate update
    const newTransform = {
      position,
      rotation: rotation.map(r => r * Math.PI / 180),
      scale: newScale
    };
    
    if (onPositionChange) {
      onPositionChange(newTransform);
    }
  };

  const handleAutoFit = () => {
    if (api?.autoFitModel) {
      console.log('🎯 Auto-fitting model...');
      const result = api.autoFitModel({
        centerModel: true,
        centerY: false,
        updateCamera: true,
        margin: 1.5
      });
      
      if (result) {
        // Update local state to reflect the new transform
        const modelInfo = api.getModelInfo?.();
        if (modelInfo?.transform) {
          setPosition(modelInfo.transform.position || [0, 0, 0]);
          setRotation((modelInfo.transform.rotation || [0, 0, 0]).map(r => r * 180 / Math.PI));
          setScale(modelInfo.transform.scale || 2);
        }
      }
      setAutoFitEnabled(!autoFitEnabled);
    }
  };

  const handleUpdateCamera = () => {
    if (api?.updateCameraForModel) {
      console.log('📷 Updating camera for current model position...');
      api.updateCameraForModel();
    }
  };

  const handleReset = () => {
    const resetValues = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 2
    };
    
    setPosition(resetValues.position);
    setRotation(resetValues.rotation);
    setScale(resetValues.scale);
    
    if (onPositionChange) {
      onPositionChange({
        ...resetValues,
        rotation: resetValues.rotation.map(r => r * Math.PI / 180)
      });
    }
  };

  const presets = [
    { name: 'Center', position: [0, 0, 0], rotation: [0, 0, 0] },
    { name: 'Front View', position: [0, 0, 0], rotation: [0, 0, 0] },
    { name: 'Back View', position: [0, 0, 0], rotation: [0, 180, 0] },
    { name: 'Left Side', position: [0, 0, 0], rotation: [0, 90, 0] },
    { name: 'Right Side', position: [0, 0, 0], rotation: [0, -90, 0] },
  ];

  const applyPreset = (preset) => {
    setPosition(preset.position);
    setRotation(preset.rotation);
    
    if (onPositionChange) {
      onPositionChange({
        position: preset.position,
        rotation: preset.rotation.map(r => r * Math.PI / 180),
        scale
      });
    }
  };

  return (
    <div className="model-position-controls">
      <div className="control-header">
        <h4>🎯 Model Position</h4>
        <div className="control-actions">
          <button 
            className="btn-auto-fit"
            onClick={handleAutoFit}
            title="Automatically center and fit model in view"
          >
            🎯 Auto Fit
          </button>
          <button 
            className="btn-camera-update"
            onClick={handleUpdateCamera}
            title="Update camera to focus on current model position"
          >
            📷 Focus Camera
          </button>
          <button 
            className="btn-reset"
            onClick={handleReset}
            title="Reset to default position"
          >
            🔄 Reset
          </button>
          <button 
            className="btn-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Show/hide advanced controls"
          >
            {showAdvanced ? '🔽' : '▶️'}
          </button>
        </div>
      </div>

      {/* Position Controls */}
      <div className="position-section">
        <h5>Position</h5>
        <div className="xyz-controls">
          <div className="axis-control">
            <label>X</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={position[0]}
              onChange={(e) => handlePositionChange(0, e.target.value)}
              className="position-slider"
            />
            <input
              type="number"
              value={position[0].toFixed(1)}
              onChange={(e) => handlePositionChange(0, e.target.value)}
              className="position-input"
              step="0.1"
            />
          </div>
          <div className="axis-control">
            <label>Y</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={position[1]}
              onChange={(e) => handlePositionChange(1, e.target.value)}
              className="position-slider"
            />
            <input
              type="number"
              value={position[1].toFixed(1)}
              onChange={(e) => handlePositionChange(1, e.target.value)}
              className="position-input"
              step="0.1"
            />
          </div>
          <div className="axis-control">
            <label>Z</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={position[2]}
              onChange={(e) => handlePositionChange(2, e.target.value)}
              className="position-slider"
            />
            <input
              type="number"
              value={position[2].toFixed(1)}
              onChange={(e) => handlePositionChange(2, e.target.value)}
              className="position-input"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Scale Control */}
      <div className="scale-section">
        <h5>Scale</h5>
        <div className="scale-control">
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={scale}
            onChange={(e) => handleScaleChange(e.target.value)}
            className="scale-slider"
          />
          <input
            type="number"
            value={scale.toFixed(1)}
            onChange={(e) => handleScaleChange(e.target.value)}
            className="scale-input"
            step="0.1"
            min="0.1"
            max="10"
          />
          <span className="scale-label">×{scale.toFixed(1)}</span>
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="advanced-controls">
          {/* Rotation Controls */}
          <div className="rotation-section">
            <h5>Rotation (degrees)</h5>
            <div className="xyz-controls">
              <div className="axis-control">
                <label>X</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[0]}
                  onChange={(e) => handleRotationChange(0, e.target.value)}
                  className="rotation-slider"
                />
                <input
                  type="number"
                  value={rotation[0].toFixed(0)}
                  onChange={(e) => handleRotationChange(0, e.target.value)}
                  className="rotation-input"
                  step="5"
                />
              </div>
              <div className="axis-control">
                <label>Y</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[1]}
                  onChange={(e) => handleRotationChange(1, e.target.value)}
                  className="rotation-slider"
                />
                <input
                  type="number"
                  value={rotation[1].toFixed(0)}
                  onChange={(e) => handleRotationChange(1, e.target.value)}
                  className="rotation-input"
                  step="5"
                />
              </div>
              <div className="axis-control">
                <label>Z</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[2]}
                  onChange={(e) => handleRotationChange(2, e.target.value)}
                  className="rotation-slider"
                />
                <input
                  type="number"
                  value={rotation[2].toFixed(0)}
                  onChange={(e) => handleRotationChange(2, e.target.value)}
                  className="rotation-input"
                  step="5"
                />
              </div>
            </div>
          </div>

          {/* Preset Positions */}
          <div className="presets-section">
            <h5>Quick Presets</h5>
            <div className="preset-buttons">
              {presets.map((preset, index) => (
                <button
                  key={index}
                  className="preset-btn"
                  onClick={() => applyPreset(preset)}
                  title={`Apply ${preset.name} orientation`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="position-info">
        <small>
          Position: [{position.map(p => p.toFixed(1)).join(', ')}] | 
          Scale: {scale.toFixed(1)}x
          {showAdvanced && ` | Rotation: [${rotation.map(r => r.toFixed(0)).join('°, ')}°]`}
        </small>
      </div>
    </div>
  );
};

export default ModelPositionControls;
