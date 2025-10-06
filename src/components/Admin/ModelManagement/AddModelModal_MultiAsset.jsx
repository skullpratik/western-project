// Multi-Asset Model Upload Modal
// - Upload base, doors, drawers, glassDoors, other assets in one request
// - Automatically generates JSON configuration with asset URLs
// - Admin can copy the JSON and use it as a starting point

import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://192.168.1.7:5000';

export default function AddModelModalMultiAsset({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState('cabinet');
  const [section, setSection] = useState('Upright Counter');
  const [interactionGroups, setInteractionGroups] = useState('');
  const [metadata, setMetadata] = useState('');

  // Asset files
  const [files, setFiles] = useState({
    base: null,
    doors: null,
    drawers: null,
    glassDoors: null,
    other: null
  });

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('token');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        setIsLoggedIn(false);
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleFileChange = (assetType, file) => {
    setFiles(prev => ({
      ...prev,
      [assetType]: file
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploadResult(null);

    if (!name.trim()) {
      setError('Model name is required');
      return;
    }

    if (!files.base) {
      setError('Base model file is required');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('name', name);
      formData.append('displayName', displayName || name);
      formData.append('type', type);
  // Section (category) for the model
  if (section) formData.append('section', section);

      if (interactionGroups.trim()) {
        formData.append('interactionGroups', interactionGroups);
      }

      if (metadata.trim()) {
        formData.append('metadata', metadata);
      }

      // Add asset files
      Object.entries(files).forEach(([assetType, file]) => {
        if (file) {
          formData.append(assetType, file);
        }
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/models/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed (${response.status})`);
      }

      const result = await response.json();
      setUploadResult(result);

      console.log('Upload successful:', result);

      if (onAdd) onAdd();

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('JSON configuration copied to clipboard!');
    } catch (e) {
      console.warn('Clipboard write failed');
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('JSON configuration copied to clipboard!');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <h3>Upload Multi-Asset Model</h3>

        {/* Authentication Status */}
        {checkingAuth ? (
          <div style={{ padding: '8px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '16px' }}>
            Checking authentication...
          </div>
        ) : !isLoggedIn ? (
          <div style={{ padding: '8px', background: '#fee2e2', border: '1px solid #dc2626', borderRadius: '8px', marginBottom: '16px' }}>
            <strong>Authentication Required:</strong> You must be logged in to upload files. Please log in through the admin panel and try again.
          </div>
        ) : (
          <div style={{ padding: '8px', background: '#d1fae5', border: '1px solid #10b981', borderRadius: '8px', marginBottom: '16px' }}>
            ✓ Authenticated - You can upload files
          </div>
        )}

        {error && (
          <div style={{ padding: '8px', background: '#fee2e2', border: '1px solid #dc2626', borderRadius: '8px', marginBottom: '16px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Model Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ModernCabinet"
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Modern Kitchen Cabinet"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="cabinet">Cabinet</option>
              <option value="refrigerator">Refrigerator</option>
              <option value="freezer">Freezer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Section
            </label>
            <select value={section} onChange={(e) => setSection(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="Upright Counter">Upright Counter</option>
              <option value="Visicooler">Visicooler</option>
              <option value="XYZ">XYZ</option>
            </select>
          </div>

          {/* Asset Files */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>Asset Files</h4>

            {Object.entries({
              base: 'Base Model (Required)',
              doors: 'Doors',
              drawers: 'Drawers',
              glassDoors: 'Glass Doors',
              other: 'Other Assets'
            }).map(([key, label]) => (
              <div key={key} style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  {label} {key === 'base' ? '*' : ''}
                </label>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={(e) => handleFileChange(key, e.target.files[0])}
                  style={{ width: '100%', padding: '4px' }}
                  required={key === 'base'}
                />
                {files[key] && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                    Selected: {files[key].name}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Advanced Options */}
          <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
              Advanced Options (Optional)
            </summary>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Interaction Groups (JSON)
              </label>
              <textarea
                value={interactionGroups}
                onChange={(e) => setInteractionGroups(e.target.value)}
                placeholder='[{"type": "doors", "label": "Doors", "parts": []}]'
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Metadata (JSON)
              </label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder='{"panels": [], "solidDoorMeshPrefixes": []}'
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
          </details>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: '#f5f5f5' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !isLoggedIn}
              style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#2563eb', color: 'white' }}
            >
              {uploading ? 'Uploading...' : 'Upload Model'}
            </button>
          </div>
        </form>

        {/* Upload Result */}
        {uploadResult && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px' }}>
            <h4 style={{ marginTop: 0, color: '#0ea5e9' }}>✅ Upload Successful!</h4>

            <div style={{ marginBottom: '12px' }}>
              <strong>Model:</strong> {uploadResult.model?.name} ({uploadResult.model?.displayName})
            </div>

            {/* Remove asset URLs display since we're not using hardcoded paths */}
            {/* <div style={{ marginBottom: '12px' }}>
              <strong>Asset URLs:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                {Object.entries(uploadResult.assetUrls || {}).map(([key, url]) => (
                  <li key={key}>
                    <strong>{key}:</strong> <code style={{ fontSize: '12px' }}>{url}</code>
                  </li>
                ))}
              </ul>
            </div> */}

            <div style={{ marginBottom: '12px' }}>
              <strong>Generated JSON Configuration:</strong>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Copy this JSON and use it as a starting point for your model configuration. The paths will be automatically filled from your uploaded model data.
              </p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <button
                onClick={() => copyToClipboard(JSON.stringify(uploadResult.jsonConfig, null, 2))}
                style={{ padding: '6px 12px', border: '1px solid #0ea5e9', borderRadius: '4px', background: '#e0f2fe', color: '#0ea5e9', cursor: 'pointer' }}
              >
                📋 Copy JSON Configuration
              </button>
            </div>

            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Full JSON</summary>
              <pre style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                maxHeight: '300px',
                marginTop: '8px'
              }}>
                {JSON.stringify(uploadResult.jsonConfig, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal {
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow: auto;
          }

          .modal h3 {
            margin-top: 0;
            margin-bottom: 16px;
          }
        `}</style>
      </div>
    </div>
  );
}