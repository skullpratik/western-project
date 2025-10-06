import React, { useEffect, useRef, useState } from 'react';
// ...existing code...

const API_BASE_URL = 'http://192.168.1.7:5000';

export default function AddModelModalSimple({ onClose, onAdd, editModel = null, isEditMode = false, onOpenMultiAsset = null }) {
  // For config file editing
  const [configContent, setConfigContent] = useState('');
  const [configLoadError, setConfigLoadError] = useState('');
  const [name, setName] = useState(editModel?.name || '');
  const [modelPath, setModelPath] = useState(editModel?.file || editModel?.path || '');
  const [configUrl, setConfigUrl] = useState(editModel?.configUrl || '');
  const [section, setSection] = useState(editModel?.section || 'Upright Counter');
  // Fetch config JSON if editing and configUrl is present
  useEffect(() => {
    if (isEditMode && configUrl && configUrl.endsWith('.json')) {
      // Try to fetch config JSON
      const fetchConfig = async () => {
        try {
          setConfigLoadError('');
          const url = configUrl.startsWith('http') ? configUrl : `${API_BASE_URL}${configUrl}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
          const json = await res.json();
          setConfigContent(JSON.stringify(json, null, 2));
        } catch (err) {
          setConfigLoadError(err.message || 'Failed to load config');
        }
      };
      fetchConfig();
    } else {
      setConfigContent('');
      setConfigLoadError('');
    }
  }, [isEditMode, configUrl]);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [uploadingConfig, setUploadingConfig] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Check authentication status on component mount
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
          // Token is invalid, remove it
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
    const assetLabelOptions = ['doors', 'drawers', 'glassDoors', 'other'];
  const [assets, setAssets] = useState(() => {
    // On edit, load assets from model.assets field
    if (isEditMode && editModel && editModel.assets && typeof editModel.assets === 'object') {
      console.log('Loading assets from editModel:', editModel.assets);
      // Convert assets object to array with label
      return Object.entries(editModel.assets).map(([label, path]) => ({
        originalName: '',
        filename: '',
        path,
        label
      }));
    }
    console.log('No assets found in editModel:', editModel);
    return [];
  });
  const [showPasteJSON, setShowPasteJSON] = useState(false);
  const [pastedJSON, setPastedJSON] = useState('');
  const [pasteError, setPasteError] = useState('');
  const inlineUploadInProgress = useRef(false);

  useEffect(() => {
    setError('');
  }, [name, modelPath, configUrl]);
  
  // Debounced inline JSON paste auto-upload to avoid spamming the server
  useEffect(() => {
    const v = (configUrl || '').trim();
    // If the dedicated paste panel is open, don't auto-upload from the input field
    if (showPasteJSON) return;
    // Ignore if field is empty or looks like a URL/path already
    if (!v || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return;
    // Only handle if it looks like full JSON text
    if (!(v.startsWith('{') && v.endsWith('}'))) return;

    const timer = setTimeout(async () => {
      if (inlineUploadInProgress.current) return; // prevent duplicate concurrent uploads
      inlineUploadInProgress.current = true;
      try {
        // Parse and upload pasted JSON content
        const parsed = JSON.parse(v);
        const blob = new Blob([JSON.stringify(parsed)], { type: 'application/json' });
        const file = new File([blob], `config-${Date.now()}.json`, { type: 'application/json' });
        setUploadingConfig(true);
        const path = await uploadFile(file, 'configs');
        setConfigUrl(path);
        console.log('[ConfigInlineUpload] Uploaded from input paste (debounced), got path:', path);
      } catch (err) {
        console.error('[ConfigInlineUploadError]', err);
        setError(err.message || 'Failed to upload pasted JSON');
      } finally {
        setUploadingConfig(false);
        inlineUploadInProgress.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [configUrl, showPasteJSON]);

  const uploadFile = async (file, subPath = 'models') => {
    if (!isLoggedIn) {
      throw new Error('You must be logged in to upload files. Please log in and try again.');
    }

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    console.log('Upload token:', token ? 'present' : 'missing');
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    const endpoint = subPath === 'configs' ? '/api/upload-config' : '/api/upload';
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[UploadError]', res.status, err);
      throw new Error(err.message || `Upload failed (${res.status})`);
    }
    const data = await res.json();
    console.log('[UploadSuccess]', subPath, data);
    // Prefer /models or /configs prefix from server response
    return data?.path || (data?.filename ? (subPath === 'configs' ? `/configs/${data.filename}` : `/models/${data.filename}`) : '');
  };

  const handleModelPick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,model/*';
    input.onchange = async (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        setUploadingModel(true);
        const path = await uploadFile(file, 'models');
        setModelPath(path);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setUploadingModel(false);
      }
    };
    input.click();
  };

  // Save edited config (overwrites existing config file)
  async function handleConfigSave() {
    try {
      setUploadingConfig(true);
      setError('');
      // Try to parse JSON first
      let parsed = null;
      try {
        parsed = JSON.parse(configContent);
      } catch (err) {
        throw new Error('Invalid JSON content - please fix before saving');
      }

      // If editing and configUrl references a local config file, attempt to overwrite it
      if (isEditMode && configUrl && typeof configUrl === 'string' && configUrl.startsWith('/configs/')) {
        const filename = configUrl.split('/configs/')[1];
        if (!filename) throw new Error('Invalid local config path');
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/configs/${filename}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(parsed)
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Failed to update config (${res.status})`);
        }
        // Successfully updated file in-place; keep configUrl unchanged
        alert('Config updated in-place');
        return;
      }

      // Fallback: Save as new file and update configUrl (existing behavior)
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const file = new File([blob], `config-${Date.now()}.json`, { type: 'application/json' });
      const path = await uploadFile(file, 'configs');
      setConfigUrl(path);
      alert('Config uploaded as new file');
    } catch (err) {
      setError(err.message || 'Failed to save config');
    } finally {
      setUploadingConfig(false);
    }
  }

  const handleConfigPick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        setUploadingConfig(true);
        const path = await uploadFile(file, 'configs');
        setConfigUrl(path);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setUploadingConfig(false);
      }
    };
    input.click();
  };

  const handlePasteUpload = async () => {
    setPasteError('');
    try {
      if (!pastedJSON.trim()) {
        setPasteError('Please paste JSON content first');
        return;
      }
      // Validate JSON
      JSON.parse(pastedJSON);
      // Create a File from the pasted JSON and reuse the upload endpoint
      const blob = new Blob([pastedJSON], { type: 'application/json' });
      const filename = `config-${Date.now()}.json`;
      const file = new File([blob], filename, { type: 'application/json' });
      setUploadingConfig(true);
      const path = await uploadFile(file, 'configs');
      setConfigUrl(path);
      setShowPasteJSON(false);
      setPastedJSON('');
    } catch (err) {
      console.error(err);
      setPasteError(err.message || 'Invalid JSON');
    } finally {
      setUploadingConfig(false);
    }
  };

  const handleAssetsPick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,model/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target?.files || []);
      if (!files.length) return;
      setUploadingAssets(true);
      try {
        const labelOrder = ['doors', 'drawers', 'glassDoors', 'other'];
        const uploaded = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const path = await uploadFile(file, 'models');
            // Don't auto-label as 'base' - that's for the main model
            const label = labelOrder[i] || 'other';
            uploaded.push({ originalName: file.name, filename: file.name, path, label });
          } catch (err) {
            console.error('Asset upload failed:', err);
            // continue other uploads
          }
        }
        setAssets(prev => [...prev, ...uploaded]);
      } finally {
        setUploadingAssets(false);
      }
    };
    input.click();
  };

  const updateAssetLabel = (index, label) => {
    setAssets(prev => prev.map((a, i) => i === index ? { ...a, label } : a));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch (e) {
      console.warn('Clipboard write failed');
    }
  };

  const buildAssetsSnippet = () => {
    const obj = { assets: {} };
    assets.forEach(a => {
      const key = (a.label && a.label !== 'other') ? a.label : a.originalName.replace(/\.[^.]+$/, '');
      obj.assets[key] = a.path;
    });
    return JSON.stringify(obj, null, 2);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      if (!modelPath) {
        setError('Please upload or provide a model file');
        return;
      }

      // Build assets object from uploaded assets
      let assetsObj = {};
      assets.forEach(a => {
        // Use label if set, else use originalName without extension
        const key = (a.label && a.label !== 'other') ? a.label : a.originalName.replace(/\.[^.]+$/, '');
        assetsObj[key] = a.path;
      });
      // Only include assets if any were uploaded
      const modelData = {
        name,
        path: modelPath,
        file: modelPath,
        configUrl
      };
      // Include section when saving (supports edit/create)
      if (section) modelData.section = section;
      if (Object.keys(assetsObj).length > 0) {
        modelData.assets = assetsObj;
      }

      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

      if (isEditMode && editModel?._id) {
        const res = await fetch(`${API_BASE_URL}/api/admin/models/${editModel._id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(modelData)
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
      } else {
        const res = await fetch(`${API_BASE_URL}/api/admin/models`, {
          method: 'POST',
          headers,
          body: JSON.stringify(modelData)
        });
        if (!res.ok) throw new Error(`Create failed (${res.status})`);
      }

      if (onAdd) onAdd();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{isEditMode ? 'Edit Model' : 'Add Model'}</h3>
        
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
        
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Model name" />
          </label>
          <label>
            <span>Section</span>
            <select value={section} onChange={(e) => setSection(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
              <option value="Upright Counter">Upright Counter</option>
              <option value="Visicooler">Visicooler</option>
              <option value="XYZ">XYZ</option>
            </select>
          </label>
          <label>
            <span>Model File</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={modelPath} onChange={(e) => setModelPath(e.target.value)} placeholder="/models/YourModel.glb" />
              <button type="button" onClick={handleModelPick} disabled={uploadingModel || !isLoggedIn || checkingAuth}>
                {uploadingModel ? 'Uploading…' : !isLoggedIn && !checkingAuth ? 'Login Required' : 'Upload'}
              </button>
            </div>
          </label>
          <label>
            <span>Config JSON</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={configUrl} onChange={(e) => {
                const v = e.target.value;
                setConfigUrl(v);
              }} placeholder="/configs/your-model-config.json or https://..." />
              <button type="button" onClick={handleConfigPick} disabled={uploadingConfig || !isLoggedIn || checkingAuth}>
                {uploadingConfig ? 'Uploading…' : !isLoggedIn && !checkingAuth ? 'Login Required' : 'Upload'}
              </button>
              <button type="button" onClick={() => { setShowPasteJSON(v => !v); setPasteError(''); }} className="btn-secondary" disabled={!isLoggedIn || checkingAuth}>
                {showPasteJSON ? 'Hide paste' : 'Paste JSON'}
              </button>
            </div>
            {/* If configUrl is present and config loaded, show editable textarea */}
            {isEditMode && configUrl && configContent && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontWeight: 500 }}>Edit Config File:</span>
                <textarea
                  value={configContent}
                  onChange={e => setConfigContent(e.target.value)}
                  rows={14}
                  style={{ width: '100%', fontFamily: 'monospace', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 8, padding: 8 }}
                />
                <button type="button" className="btn-primary" style={{ marginTop: 6 }} onClick={handleConfigSave} disabled={uploadingConfig || !isLoggedIn || checkingAuth}>
                  {uploadingConfig ? 'Saving…' : 'Save Config Changes'}
                </button>
                {isEditMode && configUrl && configUrl.startsWith('/configs/') && (
                  <button type="button" className="btn-danger" style={{ marginTop: 6, marginLeft: 8 }} onClick={async () => {
                    if (!confirm('Delete this config file from the server? This cannot be undone.')) return;
                    try {
                      setUploadingConfig(true);
                      const filename = configUrl.split('/configs/')[1];
                      const token = localStorage.getItem('token');
                      const res = await fetch(`${API_BASE_URL}/api/configs/${filename}`, {
                        method: 'DELETE',
                        headers: {
                          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        }
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || `Delete failed (${res.status})`);
                      }
                      // Clear configUrl and configContent in the editor
                      setConfigUrl('');
                      setConfigContent('');
                      alert('Config file deleted');
                    } catch (err) {
                      console.error('Failed to delete config file:', err);
                      alert('Failed to delete config file: ' + (err.message || err));
                    } finally {
                      setUploadingConfig(false);
                    }
                  }}>
                    Delete Config File
                  </button>
                )}
                {configLoadError && <div style={{ color: '#b91c1c', marginTop: 4 }}>{configLoadError}</div>}
              </div>
            )}
            {isEditMode && configUrl && configLoadError && (
              <div style={{ color: '#b91c1c', marginTop: 4 }}>Failed to load config: {configLoadError}</div>
            )}
          </label>

          {showPasteJSON && (
            <div style={{ display: 'grid', gap: 8 }}>
              <textarea
                value={pastedJSON}
                onChange={(e) => setPastedJSON(e.target.value)}
                placeholder='Paste your config JSON here'
                rows={10}
                style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
              {pasteError && <div style={{ color: '#b91c1c' }}>{pasteError}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowPasteJSON(false); setPastedJSON(''); setPasteError(''); }}>Cancel</button>
                <button type="button" className="btn-primary" onClick={handlePasteUpload} disabled={uploadingConfig || !isLoggedIn || checkingAuth}>
                  {uploadingConfig ? 'Uploading…' : !isLoggedIn && !checkingAuth ? 'Login Required' : 'Upload pasted JSON'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Optional multi-asset uploads to help build external config JSON */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Additional assets (optional)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { if (onOpenMultiAsset) onOpenMultiAsset(); else handleAssetsPick(); }} disabled={uploadingAssets || !isLoggedIn || checkingAuth} className="btn-secondary">
                {uploadingAssets ? 'Uploading…' : !isLoggedIn && !checkingAuth ? 'Login Required' : 'Upload multiple'}
              </button>
              {assets.length > 0 && (
                <button type="button" className="btn-secondary" onClick={() => copyToClipboard(buildAssetsSnippet())}>
                  Copy JSON snippet
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Upload separate GLB/GLTF parts (e.g., doors, drawers) to get URLs you can reference in your config JSON under <code>assets</code>.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8, alignItems: 'center', marginTop: 8 }}>
            {assets.map((a, idx) => (
              <React.Fragment key={idx}>
                <select value={a.label} onChange={(e) => updateAssetLabel(idx, e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  <option value="">(label)</option>
                  {assetLabelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input value={a.path} readOnly style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
                <button type="button" className="btn-secondary" onClick={() => copyToClipboard(a.path)}>Copy</button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && <div className="error" style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !isLoggedIn || checkingAuth}>
            {saving ? 'Saving…' : !isLoggedIn && !checkingAuth ? 'Login Required' : 'Save'}
          </button>
        </div>
      </div>
      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .modal { background: #fff; padding: 16px; border-radius: 12px; width: 620px; max-width: 90vw; }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        label { display: flex; flex-direction: column; gap: 6px; }
        input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
        .btn-primary { background: #2563eb; color: #fff; border: none; padding: 8px 12px; border-radius: 8px; }
        .btn-secondary { background: #e2e8f0; color: #111827; border: none; padding: 8px 12px; border-radius: 8px; }
      `}</style>
    </div>
  );
}
