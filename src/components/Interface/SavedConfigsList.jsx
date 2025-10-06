import React, { useState, useEffect } from 'react';
import './SavedConfigsList.css';

const SavedConfigsList = ({ isOpen, onClose, onLoad, modelName, userId }) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
    }
  }, [isOpen, modelName, userId]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // If userId is provided and we're an admin, fetch via admin endpoint for that user
      const url = userId
        ? `http://192.168.1.7:5000/api/admin/user-configs/${userId}${modelName ? `?modelName=${encodeURIComponent(modelName)}` : ''}`
        : modelName
          ? `http://192.168.1.7:5000/api/configs/user?modelName=${encodeURIComponent(modelName)}`
          : 'http://192.168.1.7:5000/api/configs/user';
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }

      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching configs:', error);
      alert('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadConfig = async (config) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://192.168.1.7:5000/api/configs/${config._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const fullConfig = await response.json();
      await onLoad(fullConfig.configData);
      onClose();
    } catch (error) {
      console.error('Error loading config:', error);
      alert('Failed to load configuration');
    }
  };

  const handleDeleteConfig = async (configId) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://192.168.1.7:5000/api/configs/${configId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      // Refresh the list
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="saved-configs-modal">
        <div className="modal-header">
          <h3>📋 Saved Configurations</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading configurations...</div>
          ) : configs.length === 0 ? (
            <div className="empty-state">
              <p>No saved configurations found.</p>
              <p>Configure a model and save it to see it here.</p>
            </div>
          ) : (
            <div className="configs-list">
              {configs.map((config) => (
                <div 
                  key={config._id} 
                  className={`config-item ${selectedConfig?._id === config._id ? 'selected' : ''}`}
                  onClick={() => setSelectedConfig(config)}
                >
                  <div className="config-header">
                    <h4>{config.name}</h4>
                    <div className="config-actions">
                      <button
                        className="btn-load"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadConfig(config);
                        }}
                      >
                        📥 Load
                      </button>
                      <button
                        className="btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfig(config._id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="config-details">
                    <p className="config-model">
                      🏗️ Model: <strong>{config.modelName}</strong>
                    </p>
                    
                    {config.description && (
                      <p className="config-description">{config.description}</p>
                    )}

                    <div className="config-meta">
                      <span className="config-date">
                        💾 Saved: {formatDate(config.createdAt)}
                      </span>
                      {config.tags && config.tags.length > 0 && (
                        <div className="config-tags">
                          {config.tags.map((tag, index) => (
                            <span key={index} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {config.isPublic && (
                      <span className="public-badge">🌐 Public</span>
                    )}
                  </div>

                  {selectedConfig?._id === config._id && (
                    <div className="config-preview">
                      <h5>Configuration Details:</h5>
                      {config.configData && (
                        <div className="config-summary">
                          {config.configData.doorConfiguration && (
                            <p>🚪 Doors: {Object.keys(config.configData.doorConfiguration).length} configured</p>
                          )}
                          {config.configData.textureSettings && Object.keys(config.configData.textureSettings).length > 0 && (
                            <div>
                              <p>🎨 Textures: {Object.keys(config.configData.textureSettings).length} applied</p>
                              <div style={{ marginLeft: '16px', fontSize: '11px', opacity: 0.8 }}>
                                {Object.entries(config.configData.textureSettings).slice(0, 3).map(([key, textureInfo]) => (
                                  <p key={key} style={{ margin: '2px 0' }}>
                                    {textureInfo.type === 'global' 
                                      ? `🌍 ${textureInfo.textureSource}`
                                      : `📦 ${textureInfo.textureSource}`
                                    }
                                  </p>
                                ))}
                                {Object.keys(config.configData.textureSettings).length > 3 && (
                                  <p style={{ margin: '2px 0', fontStyle: 'italic' }}>
                                    ...and {Object.keys(config.configData.textureSettings).length - 3} more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {config.configData.cameraPosition && (
                            <p>📷 Camera: Custom position saved</p>
                          )}
                          {config.configData.visibilityStates && (
                            <p>👁️ Visibility: {Object.keys(config.configData.visibilityStates).length} items</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {selectedConfig && selectedConfig.configData.textureSettings && 
           Object.keys(selectedConfig.configData.textureSettings).length > 0 && (
            <div className="texture-warning" style={{
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '10px',
              fontSize: '12px',
              textAlign: 'left'
            }}>
              ✅ <strong>Good news:</strong> This configuration includes {Object.keys(selectedConfig.configData.textureSettings).length} texture(s) 
              that will be automatically restored when you load the configuration!
            </div>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {selectedConfig && (
            <button 
              className="btn-primary"
              onClick={() => handleLoadConfig(selectedConfig)}
            >
              📥 Load Selected Configuration
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedConfigsList;
