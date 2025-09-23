import React from 'react';
import './ModelCard.css';

const ModelCard = ({ modelName, config, onDelete, onEdit, isDbModel }) => {
  const handleDelete = () => {
    onDelete(modelName, config);
  };

  const handleEdit = () => {
    onEdit(modelName, config);
  };

  return (
    <div className="model-card">
      <div className="model-card-header">
        <div className="model-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="model-actions">
          <button
            className="action-btn edit-btn"
            onClick={handleEdit}
            title="Edit Model"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="action-btn delete-btn"
            onClick={handleDelete}
            title="Delete Model"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="model-card-content">
        <h3 className="model-name">{modelName}</h3>

        <div className="model-meta">
          <div className="meta-item">
            <span className="meta-label">Type:</span>
            <span className="meta-value">{isDbModel ? 'Database' : 'Static'}</span>
          </div>

          {config.path && (
            <div className="meta-item">
              <span className="meta-label">Path:</span>
              <span className="meta-value path-value" title={config.path}>
                {config.path.length > 30 ? `${config.path.substring(0, 30)}...` : config.path}
              </span>
            </div>
          )}

          {config.scale && (
            <div className="meta-item">
              <span className="meta-label">Scale:</span>
              <span className="meta-value">{config.scale}</span>
            </div>
          )}

          {config.position && (
            <div className="meta-item">
              <span className="meta-label">Position:</span>
              <span className="meta-value">
                [{config.position.x?.toFixed(2) || 0}, {config.position.y?.toFixed(2) || 0}, {config.position.z?.toFixed(2) || 0}]
              </span>
            </div>
          )}

          {config.rotation && (
            <div className="meta-item">
              <span className="meta-label">Rotation:</span>
              <span className="meta-value">
                [{config.rotation.x?.toFixed(2) || 0}, {config.rotation.y?.toFixed(2) || 0}, {config.rotation.z?.toFixed(2) || 0}]
              </span>
            </div>
          )}
        </div>

        {config.textures && config.textures.length > 0 && (
          <div className="model-textures">
            <span className="textures-label">Textures ({config.textures.length})</span>
            <div className="texture-tags">
              {config.textures.slice(0, 3).map((texture, index) => (
                <span key={index} className="texture-tag" title={texture}>
                  {texture.length > 15 ? `${texture.substring(0, 15)}...` : texture}
                </span>
              ))}
              {config.textures.length > 3 && (
                <span className="texture-tag more-tag">+{config.textures.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="model-card-footer">
        <div className="model-status">
          <span className={`status-badge ${isDbModel ? 'db-model' : 'static-model'}`}>
            {isDbModel ? 'Database Model' : 'Static Model'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;