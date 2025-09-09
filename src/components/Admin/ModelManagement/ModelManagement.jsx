import React, { useState, useEffect } from "react";
import "./ModelManagement.css";

const ModelManagement = () => {
  const [models, setModels] = useState({});
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchModels();
    fetchFiles();
  }, []);

  const fetchModels = async () => {
    try {
  const response = await fetch('/api/admin/models', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setModels(data.models);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch models');
      console.error('Error fetching models:', error);
    }
  };

  const fetchFiles = async () => {
    try {
  const response = await fetch('/api/admin/models/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch files');
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('modelFile', file);

    try {
  const response = await fetch('/api/admin/models/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setUploadProgress(100);
        await fetchFiles();
        return data.filePath;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setError(`Upload failed: ${error.message}`);
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    type: 'single-asset',
    modelFile: null,
    interactionGroups: [
      {
        type: 'doors',
        label: 'Doors',
        parts: [{ name: '', rotationAxis: 'y', openAngle: 90 }]
      }
    ],
    uiWidgets: [
      { type: 'globalTextureWidget', title: 'Global Texture' }
    ],
    camera: { position: [0, 3, 8], target: [0, 1, 0], fov: 45 }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let modelPath = '';
      
      if (formData.modelFile) {
        modelPath = await handleFileUpload(formData.modelFile);
      }

      const modelConfig = {
        path: modelPath,
        hideDoorsByDefault: false,
        lights: [],
        interactionGroups: formData.interactionGroups,
        uiWidgets: formData.uiWidgets,
        camera: formData.camera
      };

  const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modelName: formData.name,
          modelConfig: modelConfig
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        await fetchModels();
        setFormData({
          name: '',
          displayName: '',
          type: 'single-asset',
          modelFile: null,
          interactionGroups: [
            {
              type: 'doors',
              label: 'Doors',
              parts: [{ name: '', rotationAxis: 'y', openAngle: 90 }]
            }
          ],
          uiWidgets: [
            { type: 'globalTextureWidget', title: 'Global Texture' }
          ],
          camera: { position: [0, 3, 8], target: [0, 1, 0], fov: 45 }
        });
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(`Failed to add model: ${error.message}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedExtensions = ['.glb', '.gltf'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (hasValidExtension) {
        setFormData(prev => ({ ...prev, modelFile: file }));
        setError('');
      } else {
        setError('Please select a valid GLB or GLTF file');
        e.target.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="model-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="model-management">
      <div className="model-management-header">
        <h2>Model Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          Add New Model
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="models-grid">
        <div className="models-section">
          <h3>Current Models</h3>
          <div className="models-list">
            {Object.entries(models).map(([key, model]) => (
              <div key={key} className="model-card">
                <div className="model-info">
                  <h4>{model.name}</h4>
                  <span className="model-type">{model.type}</span>
                  <span className={`model-status status-${model.status}`}>
                    {model.status}
                  </span>
                </div>
                <div className="model-actions">
                  <button className="btn btn-secondary btn-sm">Edit</button>
                  <button className="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="files-section">
          <h3>Model Files</h3>
          <div className="files-list">
            {files.map((file, index) => (
              <div key={index} className="file-card">
                <div className="file-info">
                  <span className="file-name">{file.filename}</span>
                  <span className="file-path">{file.path}</span>
                </div>
                <div className="file-actions">
                  <button className="btn btn-secondary btn-sm">Use</button>
                  <button className="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Model</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-section">
                <h4>Basic Information</h4>
                <div className="form-group">
                  <label>Model Name*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g., Undercounter"
                  />
                </div>

                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g., Under Counter Refrigerator"
                  />
                </div>

                <div className="form-group">
                  <label>Model Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="single-asset">Single Asset</option>
                    <option value="multi-asset">Multi Asset</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Model File</label>
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleFileChange}
                  />
                  {formData.modelFile && (
                    <p className="file-selected">Selected: {formData.modelFile.name}</p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Add Model'}
                </button>
              </div>

              {uploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p>Uploading... {uploadProgress}%</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelManagement;
