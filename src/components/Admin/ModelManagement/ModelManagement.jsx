import React, { useState, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import AddModelModalEnhanced from './AddModelModal_Enhanced';
import { modelsConfig } from '../../../modelsConfig';
import './ModelManagement.css';

const API_BASE_URL = 'http://localhost:5000';

const ModelCard = ({ modelName, config, onDelete, onEdit, isDbModel }) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const presetSummary = useMemo(() => {
    if (!config.presets?.doorSelections) return null;
    const groups = config.presets.doorSelections;
    let totalVariants = 0;
    let maxDoorsOption = 0;
    Object.values(groups).forEach(level => {
      Object.values(level).forEach(opt => {
        totalVariants += 1;
        maxDoorsOption = Math.max(maxDoorsOption, opt.doors?.length || 0);
      });
    });
    return { groupCount: Object.keys(groups).length, totalVariants, maxDoorsOption };
  }, [config.presets]);

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
                title="Edit model metadata"
              >
                ✏️
              </button>
              <button 
                className="btn-danger-small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
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
          {presetSummary && (
            <div className="detail-item">
              <span className="detail-label">Door Presets</span>
              <span className="detail-value">{presetSummary.totalVariants}</span>
            </div>
          )}
        </div>

        {open && (
          <div className="model-extra">
            {config.assets && (
              <section>
                <h4>Assets</h4>
                <ul className="simple-list">
                  {Object.entries(config.assets).map(([k,v]) => (
                    <li key={k}><strong>{k}</strong>: <span className="mono">{v}</span></li>
                  ))}
                </ul>
              </section>
            )}
            {config.camera && (
              <section>
                <h4>Camera</h4>
                <div className="kv-pair"><span>Position</span><code>{JSON.stringify(config.camera.position)}</code></div>
                <div className="kv-pair"><span>Target</span><code>{JSON.stringify(config.camera.target)}</code></div>
                <div className="kv-pair"><span>FOV</span><code>{config.camera.fov}</code></div>
              </section>
            )}
            {config.lights?.length > 0 && (
              <section>
                <h4>Lights ({config.lights.length})</h4>
                <ul className="chips">
                  {config.lights.map((l,i)=>(
                    <li key={i} className="chip">{l.name} <span className="muted">{l.defaultState}</span> <span className="muted">{l.intensity??''}</span></li>
                  ))}
                </ul>
              </section>
            )}
            {config.hiddenInitially?.length > 0 && (
              <section>
                <h4>Initially Hidden ({config.hiddenInitially.length})</h4>
                <div className="scroll-box">
                  {config.hiddenInitially.map(p => <span key={p} className="tag">{p}</span>)}
                </div>
              </section>
            )}
            {config.interactionGroups?.length > 0 && (
              <section>
                <h4>Interaction Groups ({config.interactionGroups.length})</h4>
                <div className="interaction-groups full">
                  {config.interactionGroups.map((group,gi)=>(
                    <div key={gi} className="interaction-group column">
                      <div className="group-head"><span className="group-type">{group.type}</span><span className="group-label">{group.label}</span><span className="group-parts">{group.parts.length} parts</span></div>
                      <ul className="part-list">
                        {group.parts.map((p,pi)=>(
                          <li key={pi} className="part-line"><code>{p.name}</code>{p.rotationAxis && <span className="muted"> rot:{p.rotationAxis}@{p.openAngle}</span>}{p.positionAxis && <span className="muted"> move:{p.positionAxis}@{p.openPosition}</span>}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {config.uiWidgets?.length > 0 && (
              <section>
                <h4>UI Widgets ({config.uiWidgets.length})</h4>
                <ul className="simple-list">
                  {config.uiWidgets.map((w,i)=>(
                    <li key={i}><strong>{w.type}</strong>{w.title ? ` – ${w.title}` : ''}</li>
                  ))}
                </ul>
              </section>
            )}
            {presetSummary && (
              <section>
                <h4>Door Presets</h4>
                <div className="kv-pair"><span>Preset Groups</span><code>{presetSummary.groupCount}</code></div>
                <div className="kv-pair"><span>Total Variants</span><code>{presetSummary.totalVariants}</code></div>
                <div className="kv-pair"><span>Max Doors in Variant</span><code>{presetSummary.maxDoorsOption}</code></div>
              </section>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Model</h3>
            <p>Are you sure you want to delete <strong>{modelName}</strong>?</p>
            <p className="warning-text">This action cannot be undone and will remove the model file from the server.</p>
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={() => {
                  onDelete(config.id, modelName);
                  setShowDeleteConfirm(false);
                }}
              >
                Delete Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModelManagement = () => {
  const [dbModels, setDbModels] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const allModels = { ...modelsConfig, ...dbModelsFormatted };
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

  const handleEditModel = (config) => {
    // Find the original model data from dbModels
    const originalModel = dbModels.find(model => model._id === config.id);
    if (originalModel) {
      // Create a properly formatted model object for editing
      const editModelData = {
        ...originalModel,
        file: originalModel.file, // Use the actual file path from DB
        name: originalModel.name,
        // Extract camera data from metadata if it's there, or use top-level
        camera: originalModel.camera || originalModel.metadata?.camera,
        lights: originalModel.lights || originalModel.metadata?.lights || [],
        hiddenInitially: originalModel.hiddenInitially || originalModel.metadata?.hiddenInitially || [],
        uiWidgets: originalModel.uiWidgets || originalModel.metadata?.uiWidgets || [],
        assets: originalModel.assets,
        interactionGroups: originalModel.interactionGroups || []
      };
      console.log('Setting edit model with camera data:', editModelData.camera);
      setEditModel(editModelData);
      setShowEdit(true);
    }
  };

  const handleUpdateModel = async (modelData) => {
    try {
      setLoading(true);
      
      // Refresh the models list after successful update
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
        
        // Fire event so MainApp can refresh
        window.dispatchEvent(new Event('modelsUpdated'));
      }
      
      setShowEdit(false);
      setEditModel(null);
    } catch (err) {
      console.error('Error refreshing models after update:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelId, modelName) => {
    try {
      setLoading(true);
      setError(null);
      
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

      // Refresh the models list
      const refreshResponse = await fetch(`${API_BASE_URL}/api/admin/models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (refreshResponse.ok) {
        const models = await refreshResponse.json();
        setDbModels(models);
        
        // Fire event so MainApp can refresh
        window.dispatchEvent(new Event('modelsUpdated'));
        
        console.log(`Model "${modelName}" deleted successfully`);
      }
      
    } catch (err) {
      console.error('Error deleting model:', err);
      setError(`Failed to delete model: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
      <div className="toolbar-row">
        <button className="btn-primary" onClick={()=>setShowAdd(true)}>Add Model</button>
      </div>
      <div className="models-grid">
        {modelEntries.map(([modelName, config]) => (
          <ModelCard 
            key={modelName} 
            modelName={modelName} 
            config={config}
            onDelete={handleDeleteModel}
            onEdit={handleEditModel}
            isDbModel={!!config.id} // Models from database have an id
          />
        ))}
      </div>
      {showAdd && <AddModelModalEnhanced onClose={()=>setShowAdd(false)} onAdd={handleAddModel} />}
      {showEdit && editModel && (
        <AddModelModalEnhanced 
          onClose={() => {
            setShowEdit(false);
            setEditModel(null);
          }} 
          onAdd={handleUpdateModel}
          editModel={editModel}
          isEditMode={true}
        />
      )}
    </div>
  );
};

export default ModelManagement;
