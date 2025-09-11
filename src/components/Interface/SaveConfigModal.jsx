import React, { useState } from 'react';
import './SaveConfigModal.css';

const SaveConfigModal = ({ isOpen, onClose, onSave, currentConfig, modelName }) => {
  const [configName, setConfigName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!configName.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    setLoading(true);
    
    try {
      const configData = {
        name: configName.trim(),
        description: description.trim(),
        modelName,
        configData: currentConfig,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPublic
      };

      await onSave(configData);
      
      // Reset form
      setConfigName('');
      setDescription('');
      setTags('');
      setIsPublic(false);
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="save-config-modal">
        <div className="modal-header">
          <h3>💾 Save Configuration</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Configuration Name *</label>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="e.g., My Kitchen Setup"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this configuration..."
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>Model: <strong>{modelName}</strong></label>
            <p className="model-info">
              This configuration will be saved for the {modelName} model
            </p>
          </div>

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., kitchen, modern, glass-doors"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span>Make this configuration public (others can view it)</span>
            </label>
          </div>

          <div className="config-preview">
            <h4>Current Configuration Preview:</h4>
            <div className="config-data">
              {currentConfig && (
                <div className="config-summary">
                  {currentConfig.doorConfiguration && (
                    <p>🚪 Doors: {Object.keys(currentConfig.doorConfiguration).length} configured</p>
                  )}
                  {currentConfig.textureSettings && Object.keys(currentConfig.textureSettings).length > 0 && (
                    <div>
                      <p>🎨 Textures: {Object.keys(currentConfig.textureSettings).length} applied</p>
                      <div style={{ marginLeft: '16px', fontSize: '12px' }}>
                        {Object.entries(currentConfig.textureSettings).map(([key, textureInfo]) => (
                          <p key={key} style={{ margin: '2px 0', color: '#666' }}>
                            {textureInfo.type === 'global' 
                              ? `🌍 Global: ${textureInfo.textureSource} on ${textureInfo.materialName}`
                              : `📦 Part: ${textureInfo.textureSource} on ${key}`
                            }
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentConfig.cameraPosition && (
                    <p>📷 Camera: Custom position saved</p>
                  )}
                  {currentConfig.visibilityStates && (
                    <p>👁️ Visibility: {Object.keys(currentConfig.visibilityStates).length} items</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={loading || !configName.trim()}
          >
            {loading ? '💾 Saving...' : '💾 Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveConfigModal;
