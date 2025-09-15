import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGLTF } from '@react-three/drei';
import AddModelModalSimple from './AddModelModal_Simple.jsx';
import AddModelModalMultiAsset from './AddModelModal_MultiAsset.jsx';
// import { modelsConfig } from '../../../modelsConfig'; // Removed - using dynamic configs only
import './ModelManagement.css';

const API_BASE_URL = 'http://localhost:5000';

const ModelCard = ({ modelName, config, onDelete, onEdit, isDbModel }) => {
  const [open, setOpen] = useState(false);

  const presetSummary = null; // Removed from admin view in simplified flow

  return (
    <div className={`model-card ${open ? 'expanded' : ''}`}>
      <div className="model-card-header" onClick={() => setOpen(o => !o)}>
        <div>
          <h3>{modelName}</h3>
          <span className="model-path">{config.path || config.assets?.base}</span>
        </div>
        <div className="card-actions">
          {isDbModel && (
            <>
              <button 
                className="btn-secondary-small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(config);
                }}
                title="Edit model"
              >
                ✏️
              </button>
              <button 
                className={`btn-danger-small`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(config.id || config._id, modelName);
                }}
                title="Delete model"
              >
                🗑️
              </button>
            </>
          )}
          <button className="details-toggle" type="button">{open ? 'Hide' : 'Details'}</button>
        </div>
      </div>
      <div className="model-card-body">
        <div className="model-details-grid">
          <div className="detail-item">
            <span className="detail-label">Camera FOV</span>
            <span className="detail-value">{config.camera?.fov ?? '—'}°</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Hidden Parts</span>
            <span className="detail-value">{config.hiddenInitially?.length || 0}</span>
          </div>
            <div className="detail-item">
              <span className="detail-label">Lights</span>
              <span className="detail-value">{config.lights?.length || 0}</span>
            </div>
          <div className="detail-item">
            <span className="detail-label">UI Widgets</span>
            <span className="detail-value">{config.uiWidgets?.length || 0}</span>
          </div>
          {config.configUrl ? (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">Config URL</span>
              <span className="detail-value" title={config.configUrl}>{config.configUrl}</span>
            </div>
          ) : null}
          {/* Door presets summary removed in simplified admin */}
        </div>

        {open && (
          <div className="model-extra">
            {/* Asset and metadata details hidden from admin */}
            
            
            
            
            
            
          </div>
        )}
      </div>
    </div>
  );
};

const ModelManagement = () => {
  const [dbModels, setDbModels] = useState([]);
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMultiAsset, setShowAddMultiAsset] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id, name}

  // Fetch models from database
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/models`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const models = await response.json();
        setDbModels(models);
        setError(null);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Convert database models to the format expected by ModelCard
  const dbModelsFormatted = useMemo(() => {
    const formatted = {};
    dbModels.forEach(model => {
      formatted[model.name] = {
        id: model._id,
        path: `${API_BASE_URL}/models/${model.file}`,
        displayName: model.displayName,
        type: model.type,
        configUrl: model.configUrl,
        interactionGroups: model.interactionGroups || [],
        metadata: model.metadata || {},
        uploadedBy: model.uploadedBy,
        createdAt: model.createdAt,
        status: model.status,
        // Include all the fields that might contain configuration data
        camera: model.camera,
        lights: model.lights,
        hiddenInitially: model.hiddenInitially,
        uiWidgets: model.uiWidgets,
        assets: model.assets,
        presets: model.presets
      };
    });
    return formatted;
  }, [dbModels]);

  const allModels = { ...dbModelsFormatted }; // Only use database models
  const modelEntries = Object.entries(allModels);

  const handleAddModel = async (modelData) => {
    try {
      setLoading(true);
      
      // Refresh the models list after successful upload
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const models = await response.json();
        setDbModels(models);
        
        // Preload the new model
        const newModel = models[models.length - 1];
        if (newModel) {
          try {
            useGLTF.preload(`${API_BASE_URL}/models/${newModel.file}`);
          } catch(e) {
            console.warn('Failed to preload model:', e);
          }
        }
        
        // Fire event so MainApp can refresh
        window.dispatchEvent(new Event('modelsUpdated'));
      }
      
      setShowAdd(false);
    } catch (err) {
      console.error('Error refreshing models after add:', err);
    } finally {
      setLoading(false);
    }
  };

  // Called after editing an existing model to refresh the list
  const handleUpdateModel = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const models = await response.json();
        setDbModels(models);
        // Preload the edited model if we have its id
        const updated = models.find(m => m._id === editModel?._id);
        if (updated) {
          try {
            useGLTF.preload(`${API_BASE_URL}/models/${updated.file}`);
          } catch (e) {
            console.warn('Failed to preload updated model:', e);
          }
        }

        // Notify other parts of app
        window.dispatchEvent(new Event('modelsUpdated'));
      }

      setShowEdit(false);
      setEditModel(null);
    } catch (err) {
      console.error('Error refreshing models after update:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditModel = (config) => {
    const originalModel = dbModels.find(model => model._id === (config.id || config._id));
    if (originalModel) {
      setEditModel(originalModel);
      setShowEdit(true);
    }
  };

  const [deletingIds, setDeletingIds] = useState(new Set());
  const handleDeleteModel = async (modelId, modelName) => {
    if (!modelId) return;
    // Optimistic update: remove immediately to avoid flicker
    setDeletingIds(prev => new Set([...prev, modelId]));
    const previous = dbModels;
    setDbModels(models => models.filter(m => m.id !== modelId && m._id !== modelId));
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete model');
      }
      // Notify other parts of app
      window.dispatchEvent(new Event('modelsUpdated'));
      console.log(`✅ Model "${modelName}" deleted`);
    } catch (err) {
      console.error('Error deleting model:', err);
      setError(`Failed to delete model: ${err.message}`);
      // Revert optimistic removal
      setDbModels(previous);
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(modelId); return n; });
    }
  };

  // Function to trigger delete confirmation modal
  const handleDeleteRequest = (modelId, modelName) => {
    setDeleteTarget({ id: modelId, name: modelName });
    setShowDeleteConfirm(true);
  };

  // Function to confirm and execute delete
  const handleConfirmDelete = () => {
    if (deleteTarget) {
      handleDeleteModel(deleteTarget.id, deleteTarget.name);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // Function to cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="model-management-container">
        <div className="page-header">
          <h1>Model Management</h1>
          <p>Loading models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="model-management-container">
        <div className="page-header">
          <h1>Model Management</h1>
          <p className="error">Error loading models: {error}</p>
        </div>
        <div className="toolbar-row">
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="model-management-container">
      <div className="page-header">
        <h1>Model Management</h1>
        <p>Overview of all 3D models configured in the application.</p>
      </div>
      <div className="toolbar-row" style={{display:'flex', gap:8}}>
        <button className="btn-primary" onClick={()=>setShowAdd(true)}>Add Model (Simple)</button>
        {/* Multi-asset upload now opened from the Simple modal's "Upload multiple" button to avoid duplicate flows */}
      </div>
      <div className="models-grid">
        {modelEntries.map(([modelName, config]) => (
          <ModelCard 
            key={modelName} 
            modelName={modelName} 
            config={config}
            onDelete={handleDeleteRequest}
            onEdit={handleEditModel}
            isDbModel={!!config.id} // Models from database have an id
          />
        ))}
      </div>
  {showAdd && <AddModelModalSimple onClose={()=>setShowAdd(false)} onAdd={handleAddModel} onOpenMultiAsset={() => setShowAddMultiAsset(true)} />}
      {showAddMultiAsset && <AddModelModalMultiAsset onClose={()=>setShowAddMultiAsset(false)} onAdd={handleAddModel} />}
      {showEdit && editModel && (
        <AddModelModalSimple
          onClose={() => {
            setShowEdit(false);
            setEditModel(null);
          }}
          onAdd={handleUpdateModel}
          editModel={editModel}
          isEditMode={true}
        />
      )}
      
      {/* Delete Confirmation Modal - Rendered at top level */}
      {showDeleteConfirm && deleteTarget && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Model</h3>
            <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
            <p className="warning-text">This action cannot be undone and will remove the model file from the server.</p>
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManagement;
