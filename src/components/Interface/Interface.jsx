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
  // Section filtering props (passed from MainApp). Provide safe defaults so
  // the component works standalone during development or in older builds.
  sectionOptions = ['(All)'],
  selectedSection = '(All)',
  onSectionChange = () => {},
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
      // Capture current scene state from the Experience API
      let currentState = captureCurrentState();

      // If API exposes captureCurrentTextures, use it to include textures only when saving
      if (api?.captureCurrentTextures) {
        try {
          const liveTextures = api.captureCurrentTextures();
          currentState = {
            ...currentState,
            textureSettings: {
              ...currentState.textureSettings,
              ...liveTextures
            }
          };
        } catch (err) {
          console.warn('Failed to capture live textures for save:', err);
        }
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://192.168.1.7:5000/api/configs/save', {
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
    // Normalize widgetType to a canonical key (lowercase, strip non-alphanum and trailing 'widget')
    if (!widgetType || typeof widgetType !== 'string') return 'textureWidget';
    const normalized = widgetType.replace(/[^a-zA-Z0-9]/g, '').replace(/widget$/i, '').toLowerCase();

    // Extended mapping: map many widget type variants to backend permission keys
    const permissionMap = {
      preset: 'canEdit',
      presets: 'canEdit',
      presetwidget: 'canEdit',
      doorpresets: 'doorPresets',
      doorpreset: 'doorPresets',
      doorpresetwidget: 'doorPresets',
      doortoggles: 'doorToggles',
      doortoggle: 'doorToggles',
      drawertoggles: 'drawerToggles',
      drawertoggle: 'drawerToggles',
      texture: 'textureWidget',
      texturewidget: 'textureWidget',
      globaltexture: 'globalTextureWidget',
      globaltexturewidget: 'globalTextureWidget',
      light: 'lightWidget',
      lightwidget: 'lightWidget',
      screenshot: 'screenshotWidget',
      screenshotwidget: 'screenshotWidget',
      reflection: 'lightWidget',
      movement: 'canMove',
      saveconfig: 'saveConfig',
      modelposition: 'canMove',
      custom: 'textureWidget'
    };

    // prefer exact normalized match, otherwise try suffix matches
    if (permissionMap[normalized]) return permissionMap[normalized];

    // try to find a key that contains normalized (covers odd naming)
    const found = Object.keys(permissionMap).find(k => k.includes(normalized) || normalized.includes(k));
    if (found) return permissionMap[found];

    // fallback defaults
    if (normalized.includes('door')) return 'doorToggles';
    if (normalized.includes('preset')) return 'canEdit';
    if (normalized.includes('texture')) return 'textureWidget';
    if (normalized.includes('light')) return 'lightWidget';
    return 'textureWidget';
  };

  // Filter widgets based on user permissions (memoized to prevent loops)
  const widgets = React.useMemo(() => {
    const filtered = allWidgets.filter(widget => {
      const requiredPermission = getWidgetPermission(widget.type);
      const hasPermissionResult = hasPermission(requiredPermission);
      if (!hasPermissionResult) {
        console.debug(`Interface: widget "${widget.type}" requires "${requiredPermission}" but user lacks it`);
      } else {
        console.debug(`Interface: widget "${widget.type}" allowed (permission: ${requiredPermission})`);
      }
      return hasPermissionResult;
    });
    
    // Simple logging without circular reference
    console.log('🎮 Widgets updated:', filtered.length, 'widgets available');
    
    return filtered;
  }, [JSON.stringify(allWidgets), JSON.stringify(userPermissions)]); // Use JSON.stringify to avoid object reference issues

  // Widget filtering debug removed to prevent infinite loops

  // Render individual widget
  const renderWidget = (widget, index) => {
    // Try direct lookup first
    let WidgetComponent = widgetRegistry[widget.type];

    // If not found, try common normalizations (lower-first-char, case-insensitive match,
    // and stripping 'widget' suffix). This lets configs use variants like "GlobalTextureWidget"
    // or different casing without breaking.
    if (!WidgetComponent && widget.type) {
      const lowerFirst = widget.type.charAt(0).toLowerCase() + widget.type.slice(1);
      if (widgetRegistry[lowerFirst]) {
        WidgetComponent = widgetRegistry[lowerFirst];
        console.log(`🛠 Interface: normalized widget type '${widget.type}' -> '${lowerFirst}'`);
      }
    }

    if (!WidgetComponent && widget.type) {
      const wanted = widget.type.toLowerCase();
      const foundKey = Object.keys(widgetRegistry).find(k => k.toLowerCase() === wanted);
      if (foundKey) {
        WidgetComponent = widgetRegistry[foundKey];
        console.log(`🛠 Interface: matched widget type case-insensitively '${widget.type}' -> '${foundKey}'`);
      }
    }

    if (!WidgetComponent && widget.type) {
      // Try stripping suffix 'widget' and matching
      const stripped = widget.type.replace(/widget$/i, '');
      const foundKey = Object.keys(widgetRegistry).find(k => k.replace(/widget$/i, '').toLowerCase() === stripped.toLowerCase());
      if (foundKey) {
        WidgetComponent = widgetRegistry[foundKey];
        console.log(`🛠 Interface: stripped suffix and matched '${widget.type}' -> '${foundKey}'`);
      }
    }

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
    const renderToolbar = () => (
      <div className="interface-toolbar compact">
        <div className="toolbar-center left">
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <select
              id="modelSelect"
              aria-label="Select Model"
              className="toolbar-select enhanced"
              value={selectedModel}
              onChange={(e) => onModelChange?.(e.target.value)}
            >
              {Object.keys(models).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {Array.isArray(sectionOptions) && (
              <select
                id="sectionSelect"
                aria-label="Filter by section"
                className="toolbar-select enhanced"
                value={selectedSection}
                onChange={(e) => onSectionChange?.(e.target.value)}
              >
                {sectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        </div>
        {/* Right side intentionally left empty per request (no username/logout) */}
        <div className="toolbar-right" />
      </div>
    );

    return (
      <div className="interface-container">
        {renderToolbar()}
        <div className="no-permissions">
          <h3>🔒 Access Required</h3>
          <p>You need appropriate permissions to use the configuration tools.</p>
        </div>
      </div>
    );
  }

  // No widgets configured or no permissions for any widgets
  if (!widgets.length && !hasPermission('saveConfig')) {
    const renderToolbar = () => (
      <div className="interface-toolbar compact">
        <div className="toolbar-center left">
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <select
              id="modelSelect"
              aria-label="Select Model"
              className="toolbar-select enhanced"
              value={selectedModel}
              onChange={(e) => onModelChange?.(e.target.value)}
            >
              {Object.keys(models).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {Array.isArray(sectionOptions) && (
              <select
                id="sectionSelect"
                aria-label="Filter by section"
                className="toolbar-select enhanced"
                value={selectedSection}
                onChange={(e) => onSectionChange?.(e.target.value)}
              >
                {sectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        </div>
        {/* Right side intentionally left empty per request (no username/logout) */}
        <div className="toolbar-right" />
      </div>
    );

    return (
      <div className="interface-container">
        {renderToolbar()}
        <div className="no-permissions">
          <h3>⚙️ No Configuration Available</h3>
          <p>You don't have permission to access configuration tools for this model.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interface-container">
      <div className="interface-toolbar compact">
        <div className="toolbar-center left">
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <select
              id="modelSelect"
              aria-label="Select Model"
              className="toolbar-select enhanced"
              value={selectedModel}
              onChange={(e) => onModelChange?.(e.target.value)}
            >
              {Object.keys(models).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {/* Section filter (optional) */}
            {Array.isArray(sectionOptions) && (
              <select
                id="sectionSelect"
                aria-label="Filter by section"
                className="toolbar-select enhanced"
                value={selectedSection}
                onChange={(e) => onSectionChange?.(e.target.value)}
              >
                {sectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        </div>
        {/* Right side intentionally left empty per request (no username/logout) */}
        <div className="toolbar-right" />
      </div>
      
      <div className="widgets-container">
        {widgets.map((widget, index) => renderWidget(widget, index))}
      </div>

      {/* Model Position Controls */}

      {/* Configuration Manager */}
      {hasPermission('canEdit') && (
        <div className="widget-container widget-full save-config-widget">
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

      {/* Model Information widget removed per request */}

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
