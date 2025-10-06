import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGLTF } from '@react-three/drei';
import AddModelModalSimple from './AddModelModal_Simple.jsx';
import AddModelModalMultiAsset from './AddModelModal_MultiAsset.jsx';
// import { modelsConfig } from '../../../modelsConfig'; // Removed - using dynamic configs only
import './ModelManagement.css';

const API_BASE_URL = 'http://192.168.1.7:5000';

const ModelCard = ({ modelName, config, onDelete, onEdit, isDbModel }) => {
  const [open, setOpen] = useState(false);

  const presetSummary = null; // Removed from admin view in simplified flow

  return (
    <div className={`model-card ${open ? 'expanded' : ''}`}>
      {config.configUrl && config.configUrl.startsWith('http') && null}
      <div className="model-card-header" onClick={() => setOpen(o => !o)}>
        <div>
          <h3>{modelName} {config.section ? <span className="section-badge">{config.section}</span> : null}</h3>
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
  // Default to showing all sections
  const [selectedSection, setSelectedSection] = useState('(All)');
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id, name}
  // Track per-model section edits in the debug panel
  const [sectionEdits, setSectionEdits] = useState({});

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
        section: typeof model.section === 'string' ? model.section.trim() : model.section,
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

  // Derive section options from DB models
  const sectionOptions = useMemo(() => {
    // default known sections (always include these as helpful options)
    const defaultSections = ['Upright Counter', 'Visicooler', 'XYZ'];
    const s = new Set(defaultSections);
    dbModels.forEach(m => {
      if (m.section && typeof m.section === 'string' && m.section.trim()) s.add(m.section.trim());
    });
    // Keep stable ordering: defaults first, then any additional DB-only sections
    const merged = Array.from(s);
    return ['(All)', ...merged];
  }, [dbModels]);

  const allModels = { ...dbModelsFormatted }; // Only use database models
  let modelEntries = Object.entries(allModels);
  if (selectedSection && selectedSection !== '(All)') {
    const needle = (selectedSection || '').toString().trim().toLowerCase();
    modelEntries = modelEntries.filter(([name, cfg]) => {
      const sectionVal = (cfg.section || '').toString().trim().toLowerCase();
      const displayNameVal = (cfg.displayName || name || '').toString().trim().toLowerCase();
      const nameVal = (name || '').toString().trim().toLowerCase();
      return (
        sectionVal === needle ||
        sectionVal.includes(needle) ||
        displayNameVal.includes(needle) ||
        nameVal.includes(needle)
      );
    });
  }
  // Refresh models after an add; used as onAdd handler for modals
  const handleAddModel = async () => {
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
        // Preload the newest model file if present
        const newModel = models[models.length - 1];
        if (newModel && newModel.file) {
          try { useGLTF.preload(`${API_BASE_URL}/models/${newModel.file}`); } catch (e) { console.warn('Failed to preload model:', e); }
        }
        // Notify other parts of app
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
      <div className="toolbar-row" style={{display:'flex', gap:8, alignItems: 'center'}}>
        <button className="btn-primary" onClick={()=>setShowAdd(true)}>Add Model (Simple)</button>
        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, marginRight: 8 }}>Section:</label>
          <select value={selectedSection || '(All)'} onChange={(e) => setSelectedSection(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
            {sectionOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
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
