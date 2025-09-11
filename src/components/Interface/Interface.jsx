import React, { useState } from 'react';
import { widgetRegistry } from './widgets/index.jsx';
import SaveConfigModal from './SaveConfigModal.jsx';
import SavedConfigsList from './SavedConfigsList.jsx';
import './Interface.css';

export function Interface({
  selectedModel,
  onModelChange,
  onLogout,
  userName,
  togglePart,
  applyDoorSelection,
  api,
  applyRequest,
  userPermissions,
  models = {}, // merged models map passed from MainApp
}) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showConfigsList, setShowConfigsList] = useState(false);
  const [currentModelTransform, setCurrentModelTransform] = useState({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 2
  });

  // Current model config from provided map
  const config = models[selectedModel] || {};
  const allWidgets = config.uiWidgets || [];

  // Function to capture current model state
  const captureCurrentState = () => {
    if (!api?.getCurrentState) {
      console.warn('API getCurrentState not available');
      return {};
    }

    return api.getCurrentState();
  };

  // Function to save configuration
  const handleSaveConfig = async (configData) => {
    try {
      const currentState = captureCurrentState();
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/configs/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...configData,
          configData: currentState
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  };

  // Function to load configuration
  const handleLoadConfig = (configData) => {
    if (!api?.loadState) {
      console.warn('API loadState not available');
      return;
    }

    api.loadState(configData);
    alert('Configuration loaded successfully!');
  };
  
  console.log('=== INTERFACE DEBUG ===');
  console.log('Selected Model:', selectedModel);
  console.log('Available Models:', Object.keys(models));
  console.log('Config for selected model:', config);
  console.log('Config.metadata:', config.metadata);
  console.log('Config.metadata.uiWidgets:', config.metadata?.uiWidgets);
  console.log('Config.uiWidgets:', config.uiWidgets);
  console.log('All Widgets:', allWidgets);
  console.log('User Permissions:', userPermissions);
  console.log('Config.interactionGroups:', config.interactionGroups);
  console.log('Interaction Groups Length:', config.interactionGroups?.length || 0);
  console.log('=======================');

  // Permission helpers (backend uses specific keys; derive common intents)
  const hasPermission = (permission) => {
    if (!userPermissions) return false;
    // Support old keys used earlier (canEdit/canTexture)
    if (permission === 'canEdit') {
      return (
        userPermissions.canEdit ||
        userPermissions.doorPresets ||
        userPermissions.doorToggles ||
        userPermissions.drawerToggles ||
        userPermissions.textureWidget ||
        userPermissions.globalTextureWidget ||
        userPermissions.lightWidget
      );
    }
    if (permission === 'canTexture') {
      return (
        userPermissions.canTexture ||
        userPermissions.textureWidget ||
        userPermissions.globalTextureWidget
      );
    }
    return !!userPermissions[permission];
  };

  // Map widget types to permission requirements
  const getWidgetPermission = (widgetType) => {
    // Map widget to backend permission keys; fall back to derived intents
    const permissionMap = {
      doorPresets: 'doorPresets',
      globalTextureWidget: 'globalTextureWidget',
      textureWidget: 'textureWidget',
      lightWidget: 'lightWidget',
      saveConfig: 'saveConfig',
      modelPosition: 'canMove',
    };
    return permissionMap[widgetType] || 'canRead';
  };

  // Filter widgets based on user permissions
  const widgets = allWidgets.filter(widget => {
    const requiredPermission = getWidgetPermission(widget.type);
    return hasPermission(requiredPermission);
  });

  // Render individual widget
  const renderWidget = (widget, index) => {
    const WidgetComponent = widgetRegistry[widget.type];
    if (!WidgetComponent) {
      console.warn(`Widget type "${widget.type}" not found in registry`);
      return null;
    }

    return (
      <WidgetComponent
        key={`${widget.type}-${index}`}
        config={config}
        api={api}
        togglePart={togglePart}
        applyDoorSelection={applyDoorSelection}
        applyRequest={applyRequest}
        userPermissions={userPermissions}
        hasPermission={hasPermission}
        {...widget.props}
      />
    );
  };

  // No permissions message
  if (!userPermissions || Object.keys(userPermissions).length === 0) {
    return (
      <div className="no-permissions">
        <h3>🔒 Access Required</h3>
        <p>You need appropriate permissions to use the configuration tools.</p>
      </div>
    );
  }

  // No widgets configured or no permissions for any widgets
  if (!widgets.length && !hasPermission('saveConfig')) {
    return (
      <div className="no-permissions">
        <h3>⚙️ No Configuration Available</h3>
        <p>You don't have permission to access configuration tools for this model.</p>
      </div>
    );
  }

  return (
    <div className="interface-container">
      <div className="interface-toolbar compact">
        <div className="toolbar-center left">
          <select
            id="modelSelect"
            aria-label="Select Model"
            className="toolbar-select enhanced"
            value={selectedModel}
            onChange={(e) => onModelChange?.(e.target.value)}
          >
            {Object.keys(models).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          {userName && <span className="user-label" title={userName}>{userName}</span>}
          {onLogout && (
            <button className="toolbar-logout" onClick={onLogout} title="Logout">Logout</button>
          )}
        </div>
      </div>
      
      <div className="widgets-container">
        {widgets.map((widget, index) => renderWidget(widget, index))}
      </div>

      {/* Model Position Controls */}

      {/* Configuration Manager */}
      {hasPermission('canEdit') && (
        <div className="widget-container save-config-widget">
          <h4 className="widget-title">💾 Configuration Manager</h4>
          
          <div className="config-buttons">
            <button 
              className="btn btn-primary save-config-btn"
              onClick={() => setShowSaveModal(true)}
            >
              💾 Save Current Config
            </button>
            
            <button 
              className="btn btn-secondary load-config-btn"
              onClick={() => setShowConfigsList(true)}
            >
              📋 Load Saved Config
            </button>
          </div>
          
          <div className="save-config-info">
            <span className="info-text">
              Save your current configuration or load a previously saved one
            </span>
          </div>
        </div>
      )}

      {/* Model Info */}
  <div className="widget-container">
        <h4 className="widget-title">📋 Model Information</h4>
        <div className="model-info">
          <div className="info-item">
            <span className="info-label">Model:</span>
            <span className="info-value">{selectedModel}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Widgets:</span>
            <span className="info-value">{widgets.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Interactive Groups:</span>
            <span className="info-value">{config.interactionGroups?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Save Configuration Modal */}
      <SaveConfigModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveConfig}
        currentConfig={showSaveModal ? captureCurrentState() : {}}
        modelName={selectedModel}
      />

      {/* Saved Configurations List Modal */}
      <SavedConfigsList
        isOpen={showConfigsList}
        onClose={() => setShowConfigsList(false)}
        onLoad={handleLoadConfig}
        modelName={selectedModel}
      />
    </div>
  );
}

export default Interface;
