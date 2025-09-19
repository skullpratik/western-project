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
  const allWidgets = React.useMemo(() => {
    // Merge widgets from both direct and metadata locations
    let rawWidgets = [];
    if (Array.isArray(config.uiWidgets)) rawWidgets = rawWidgets.concat(config.uiWidgets);
    if (Array.isArray(config.metadata?.uiWidgets)) rawWidgets = rawWidgets.concat(config.metadata.uiWidgets);

    // If the model has door presets but no doorPresets widget configured, inject it automatically
    const hasDoorPresetsConfig = !!config?.presets?.doorSelections && Object.keys(config.presets.doorSelections).length > 0;
    const hasDoorWidget = rawWidgets.some(w => w.type === 'doorPresets' || w.type === 'doorPresetWidget');
    if (hasDoorPresetsConfig && !hasDoorWidget) {
      rawWidgets = [{ type: 'doorPresets', title: 'Door Presets' }, ...rawWidgets];
    }

    // If lights are defined but no light widget configured, inject a default light widget
    const hasLights = (Array.isArray(config.lights) && config.lights.length > 0) || (Array.isArray(config.metadata?.lights) && config.metadata.lights.length > 0);
    const hasLightWidget = rawWidgets.some(w => w.type === 'lightWidget');
    if (hasLights && !hasLightWidget) {
      rawWidgets = [...rawWidgets, { type: 'lightWidget', title: 'Lights' }];
    }
    
    console.log(`🔍 INTERFACE WIDGET FILTERING DEBUG:`);
    console.log(`  - selectedModel: ${selectedModel}`);
    console.log(`  - rawWidgets.length: ${rawWidgets.length}`);
    console.log(`  - rawWidgets:`, rawWidgets);
    
    // Log each raw widget
    rawWidgets.forEach((widget, i) => {
      console.log(`    [${i}] ${widget.type} - "${widget.title}" - mesh: ${widget.meshName}`);
    });
    
    // Remove duplicate light widgets (keep only the first one for each mesh)
    const seenLightMeshes = new Set();
    const uniqueWidgets = rawWidgets.filter((widget, index) => {
      if (widget.type === 'lightWidget') {
        if (seenLightMeshes.has(widget.meshName)) {
          console.log(`🧹 Interface: REMOVING duplicate light widget [${index}]: "${widget.title}" for mesh: ${widget.meshName}`);
          return false; // Remove duplicate
        }
        seenLightMeshes.add(widget.meshName);
        console.log(`✅ Interface: KEEPING light widget [${index}]: "${widget.title}" for mesh: ${widget.meshName}`);
      }
      return true; // Keep widget
    });
    
    console.log(`🧹 Interface: Filtered ${rawWidgets.length} widgets to ${uniqueWidgets.length} unique widgets`);
    console.log(`  - Final uniqueWidgets:`, uniqueWidgets);
    
    return uniqueWidgets;
  }, [config.uiWidgets, config.metadata?.uiWidgets, selectedModel]);

  // Enhanced widget debugging
  React.useEffect(() => {
    console.log('🔍 INTERFACE CONFIG DEBUG:');
    console.log('  selectedModel:', selectedModel);
    console.log('  FULL config object:', config);
    console.log('  config.lights:', config.lights);
    console.log('  config.lights length:', config.lights?.length || 0);
    console.log('  config.uiWidgets:', config.uiWidgets);
    console.log('  config.metadata:', config.metadata);
    console.log('  config.metadata?.uiWidgets:', config.metadata?.uiWidgets);
    console.log('  allWidgets (final):', allWidgets);
    console.log('  allWidgets.length:', allWidgets.length);
    
    // Check for lights in different places
    console.log('🔍 LIGHTS LOCATION CHECK:');
    console.log('  - config.lights:', config.lights);
    console.log('  - config.metadata?.lights:', config.metadata?.lights);
    
    if (allWidgets.length > 0) {
      allWidgets.forEach((widget, i) => {
        console.log(`    Widget ${i}:`, widget);
      });
    }
  }, [selectedModel, JSON.stringify(config)]);

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
  
  // Debug logging - only log when selectedModel changes
  React.useEffect(() => {
    console.log('=== INTERFACE DEBUG ===');
    console.log('Selected Model:', selectedModel);
    console.log('Available Models:', Object.keys(models));
    console.log('Config for selected model:', config);
    console.log('Config.metadata:', config.metadata);
    console.log('Config.metadata.uiWidgets:', config.metadata?.uiWidgets);
    console.log('Config.uiWidgets:', config.uiWidgets);
    console.log('All Widgets:', allWidgets);
    console.log('🔍 Widget Sources:');
    console.log('  - From config.uiWidgets:', config.uiWidgets || []);
    console.log('  - From config.metadata.uiWidgets:', config.metadata?.uiWidgets || []);
    console.log('  - Total merged widgets:', allWidgets.length);
    console.log('User Permissions:', userPermissions);
    console.log('🔍 Specific permission checks:');
    console.log('  - lightWidget permission:', userPermissions?.lightWidget);
    console.log('  - hasPermission(lightWidget):', hasPermission('lightWidget'));
    console.log('Config.interactionGroups:', config.interactionGroups);
    console.log('Interaction Groups Length:', config.interactionGroups?.length || 0);
    console.log('=======================');
  }, [selectedModel, config.uiWidgets]); // Only log when these change

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
      reflectionWidget: 'lightWidget', // Reflection uses light permission
      movementWidget: 'canMove', // Movement uses canMove permission
      customWidget: 'textureWidget', // Custom widgets use texture permission (most common)
      saveConfig: 'saveConfig',
      modelPosition: 'canMove',
    };
    const permission = permissionMap[widgetType] || 'textureWidget'; // Default to textureWidget instead of canRead
    return permission;
  };

  // Filter widgets based on user permissions (memoized to prevent loops)
  const widgets = React.useMemo(() => {
    const filtered = allWidgets.filter(widget => {
      const requiredPermission = getWidgetPermission(widget.type);
      const hasPermissionResult = hasPermission(requiredPermission);
      return hasPermissionResult;
    });
    
    // Simple logging without circular reference
    console.log('🎮 Widgets updated:', filtered.length, 'widgets available');
    
    return filtered;
  }, [JSON.stringify(allWidgets), JSON.stringify(userPermissions)]); // Use JSON.stringify to avoid object reference issues

  // Widget filtering debug removed to prevent infinite loops

  // Render individual widget
  const renderWidget = (widget, index) => {
    const WidgetComponent = widgetRegistry[widget.type];
    
    if (!WidgetComponent) {
      console.error(`❌ Widget type "${widget.type}" not found in registry`);
      return <div style={{color: 'red', padding: '10px', border: '1px solid red', marginBottom: '12px'}}>
        ❌ Widget "{widget.type}" not found
      </div>;
    }

    try {
      return (
        <div key={`${widget.type}-${index}`} style={{marginBottom: '12px'}}>
          <WidgetComponent
            config={config}
            api={api}
            togglePart={togglePart}
            applyDoorSelection={applyDoorSelection}
            applyRequest={applyRequest}
            userPermissions={userPermissions}
            hasPermission={hasPermission}
            {...widget.props}
          />
        </div>
      );
    } catch (error) {
      console.error(`❌ Error rendering ${widget.type}:`, error);
      return <div style={{color: 'red', padding: '10px', border: '1px solid red', marginBottom: '12px'}}>
        ❌ Error rendering {widget.type}: {error.message}
      </div>;
    }
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
            <span className="info-value">{config.interactionGroups?.length || config.metadata?.interactionGroups?.length || 0}</span>
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
