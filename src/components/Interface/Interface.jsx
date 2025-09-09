import React from 'react';
import { widgetRegistry } from './widgets/index.jsx';
import { modelsConfig } from '../../modelsConfig';
import './Interface.css';

export function Interface({ 
  selectedModel, 
  togglePart, 
  applyDoorSelection, 
  api, 
  applyRequest, 
  userPermissions 
}) {
  // Get the current model configuration
  const config = modelsConfig[selectedModel] || {};
  const allWidgets = config.uiWidgets || [];

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
    };
    return permissionMap[widgetType] || 'canRead';
  };

  // Filter widgets based on user permissions
  const widgets = allWidgets.filter(widget => {
    const requiredPermission = getWidgetPermission(widget.type);
    return hasPermission(requiredPermission);
  });

  // Render individual widget
  const renderWidget = (widget) => {
    const WidgetComponent = widgetRegistry[widget.type];
    if (!WidgetComponent) {
      console.warn(`Widget type "${widget.type}" not found in registry`);
      return null;
    }

    return (
      <WidgetComponent
        key={widget.type}
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
  if (!widgets.length) {
    return (
      <div className="no-permissions">
        <h3>⚙️ No Configuration Available</h3>
        <p>You don't have permission to access configuration tools for this model.</p>
      </div>
    );
  }

  return (
    <div className="interface-container">
      <div className="simple-guide">
        <p>📐 Configure your {selectedModel} model using the tools below:</p>
      </div>
      
      <div className="widgets-container">
        {widgets.map(renderWidget)}
      </div>

      {/* Quick Actions - Only show if user has edit permissions */}
  {(hasPermission('canEdit')) && (
        <div className="widget-container">
          <h4 className="widget-title">🎯 Quick Actions</h4>
          <div className="button-grid-2">
            <button 
              className="btn btn-secondary"
              onClick={() => api?.resetModel?.()}
      disabled={!hasPermission('canEdit')}
            >
              🔄 Reset Model
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => api?.saveConfiguration?.()}
      disabled={!hasPermission('canEdit')}
            >
              💾 Save Config
            </button>
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
    </div>
  );
}

export default Interface;
