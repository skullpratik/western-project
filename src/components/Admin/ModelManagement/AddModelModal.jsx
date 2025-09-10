import React, { useState, useCallback, useRef, useEffect } from 'react';

const emptyState = {
  name: '',
  path: '',
  selectedFile: null,
  assets: { base: '', doors: '', glassDoors: '', drawers: '' },
  useAssets: false,
  camera: { position: '0,2,5', target: '0,1,0', fov: '50' },
  hidden: '',
  lights: [],
  lightDraft: { name:'', defaultState:'on', intensity:'5' },
  groups: [],
  groupDraft: { type:'doors', label:'', parts: [] },
  partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' },
  widgets: [],
  widgetDraft: { type:'lightWidget', title:'' },
  // Texture widget configuration
  textureWidget: {
    enabled: false,
    title: 'Textures',
    parts: [],
    textures: []
  },
  texturePartDraft: { 
    name: '', 
    mapping: {
      offset: { x: 0, y: 0 },
      center: { x: 0.5, y: 0.5 },
      rotation: 0,
      repeat: { x: 1, y: 1 },
      flipY: false,
      wrapS: 'ClampToEdgeWrapping',
      wrapT: 'ClampToEdgeWrapping'
    }
  },
  textureDraft: { name: '', path: '' },
  rawMode: false,
  rawJson: ''
};

const parseVec = (str) => str.split(',').map(v=>parseFloat(v.trim())).filter(v=>!Number.isNaN(v));

const AddModelModal = ({ onClose, onAdd }) => {
  const [state, setState] = useState(emptyState);
  const objectUrlsRef = useRef([]);
  const [feedback, setFeedback] = useState(null);
  const [rawError, setRawError] = useState(null);

  const update = (patch) => setState(s => ({ ...s, ...patch }));

  const addLight = () => {
    if(!state.lightDraft.name) return;
    update({ lights: [...state.lights, { ...state.lightDraft }], lightDraft: { name:'', defaultState:'on', intensity:'5' } });
  };

  const removeLight = (i) => update({ lights: state.lights.filter((_,idx)=>idx!==i) });

  const addWidget = () => {
    if(!state.widgetDraft.type) return;
    update({ widgets: [...state.widgets, { ...state.widgetDraft }], widgetDraft: { type:'lightWidget', title:'' } });
  };

  const removeWidget = (i) => update({ widgets: state.widgets.filter((_,idx)=>idx!==i) });

  const addGroup = () => {
    console.log('ADD GROUP CALLED');
    console.log('Current groupDraft:', state.groupDraft);
    console.log('Current groups:', state.groups);
    
    if(!state.groupDraft.type || !state.groupDraft.label) {
      console.log('ADD GROUP FAILED: Missing type or label');
      return;
    }
    
    const newGroup = { ...state.groupDraft };
    console.log('Adding new group:', newGroup);
    
    update({ groups: [...state.groups, newGroup], groupDraft: { type:'doors', label:'', parts: [] } });
    
    console.log('Groups after update should be:', [...state.groups, newGroup]);
  };

  const removeGroup = (i) => update({ groups: state.groups.filter((_,idx)=>idx!==i) });

  const addPart = () => {
    if(!state.partDraft.name) return;
    const isDrawer = state.groupDraft.type === 'drawers';
    const part = { name: state.partDraft.name };
    if(isDrawer) {
      if(state.partDraft.positionAxis) part.positionAxis = state.partDraft.positionAxis;  
      if(state.partDraft.openPosition) part.openPosition = parseFloat(state.partDraft.openPosition) || 0.5; 
    } else { // door-like
      if(state.partDraft.rotationAxis) part.rotationAxis = state.partDraft.rotationAxis;
      if(state.partDraft.openAngle) part.openAngle = parseFloat(state.partDraft.openAngle) || 90;
    }
    update({ groupDraft: { ...state.groupDraft, parts: [...state.groupDraft.parts, part] }, partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' } });
  };

  const removePart = (i) => update({ groupDraft: { ...state.groupDraft, parts: state.groupDraft.parts.filter((_,idx)=>idx!==i) } });

  // Texture widget handlers
  const addTexturePart = () => {
    if(!state.texturePartDraft.name) return;
    const newPart = { ...state.texturePartDraft };
    update({ 
      textureWidget: { 
        ...state.textureWidget, 
        parts: [...state.textureWidget.parts, newPart] 
      },
      texturePartDraft: { 
        name: '', 
        mapping: {
          offset: { x: 0, y: 0 },
          center: { x: 0.5, y: 0.5 },
          rotation: 0,
          repeat: { x: 1, y: 1 },
          flipY: false,
          wrapS: 'ClampToEdgeWrapping',
          wrapT: 'ClampToEdgeWrapping'
        }
      }
    });
  };

  const removeTexturePart = (i) => update({ 
    textureWidget: { 
      ...state.textureWidget, 
      parts: state.textureWidget.parts.filter((_,idx)=>idx!==i) 
    } 
  });

  const addTexture = () => {
    if(!state.textureDraft.name || !state.textureDraft.path) return;
    update({ 
      textureWidget: { 
        ...state.textureWidget, 
        textures: [...state.textureWidget.textures, { ...state.textureDraft }] 
      },
      textureDraft: { name: '', path: '' }
    });
  };

  const removeTexture = (i) => update({ 
    textureWidget: { 
      ...state.textureWidget, 
      textures: state.textureWidget.textures.filter((_,idx)=>idx!==i) 
    } 
  });

  const toggleRaw = () => update({ rawMode: !state.rawMode });

  const handleRawChange = (e) => {
    const value = e.target.value;
    update({ rawJson: value });
    try { JSON.parse(value); setRawError(null); } catch(err) { setRawError(err.message); }
  };

  const buildConfig = useCallback((modelPath = null) => {
    if(state.rawMode) {
      try { return JSON.parse(state.rawJson); } catch { return null; }
    }
    const cameraPos = parseVec(state.camera.position);
    const cameraTarget = parseVec(state.camera.target);
    if(cameraPos.length!==3 || cameraTarget.length!==3) { setFeedback({ type:'error', msg:'Camera vectors must have 3 numbers' }); return null; }
    const cfg = {};
  if(state.useAssets) {
      const filtered = Object.fromEntries(Object.entries(state.assets).filter(([,v])=>v));
      if(Object.keys(filtered).length===0) { setFeedback({ type:'error', msg:'At least one asset path required' }); return null; }
      cfg.assets = filtered;
    } else {
      const pathToUse = modelPath || state.path;
      if(!pathToUse && !state.selectedFile) { setFeedback({ type:'error', msg:'Model path or file required' }); return null; }
      if(pathToUse) cfg.path = pathToUse;
    }
    const hidden = state.hidden.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    if(hidden.length) cfg.hiddenInitially = hidden;
    if(state.lights.length) cfg.lights = state.lights.map(l=>({ name:l.name, defaultState:l.defaultState, intensity: parseFloat(l.intensity)||1 }));
    if(state.groups.length) cfg.interactionGroups = state.groups.map(g=>({ type:g.type, label:g.label, parts:g.parts }));
    
    // Build UI widgets
    const widgets = [...state.widgets];
    console.log('TEXTURE WIDGET STATE:', state.textureWidget);
    console.log('TEXTURE WIDGET ENABLED:', state.textureWidget.enabled);
    console.log('TEXTURE WIDGET PARTS:', state.textureWidget.parts.length);
    console.log('TEXTURE WIDGET TEXTURES:', state.textureWidget.textures.length);
    
    if(state.textureWidget.enabled && (state.textureWidget.parts.length > 0 || state.textureWidget.textures.length > 0)) {
      const textureWidgetConfig = {
        type: 'textureWidget',
        title: state.textureWidget.title,
        options: {
          parts: state.textureWidget.parts,
          textures: state.textureWidget.textures
        }
      };
      console.log('ADDING TEXTURE WIDGET:', textureWidgetConfig);
      widgets.push(textureWidgetConfig);
    }
    if(widgets.length) cfg.uiWidgets = widgets;
    
    cfg.camera = { position: cameraPos, target: cameraTarget, fov: parseFloat(state.camera.fov)||50 };
    return cfg;
  }, [state]);

  const submit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    
    if(!state.name.trim()) { 
      setFeedback({ type:'error', msg:'Name required' }); 
      return; 
    }
    
    if(!state.selectedFile && !state.path) {
      setFeedback({ type:'error', msg:'Model file required' }); 
      return; 
    }

    try {
      setFeedback({ type:'info', msg:'Uploading model...' });
      
      let modelPath = state.path;
      
      // If we have a selected file but no path, upload it now with complete configuration
      if (state.selectedFile && !state.path) {
        console.log('UPLOADING FILE WITH COMPLETE CONFIG...');
        console.log('Current state.groups before config build:', state.groups);
        console.log('Current state.groupDraft before config build:', state.groupDraft);
        
        // First upload just the file
        const formData = new FormData();
        formData.append('file', state.selectedFile);
        
        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(`File upload failed: ${uploadResponse.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        const uploadResult = await uploadResponse.json();
        modelPath = uploadResult.path;
        console.log('FILE UPLOADED TO:', modelPath);
      }      // Build the complete configuration including texture widgets
      const config = buildConfig(modelPath);
      console.log('FINAL UPLOAD CONFIG:', config);
      console.log('FINAL CONFIG UI WIDGETS:', config?.uiWidgets);
      console.log('CURRENT STATE.WIDGETS:', state.widgets);
      console.log('CURRENT STATE.TEXTUREWIDGET:', state.textureWidget);
      
      if (!config) {
        setFeedback({ type:'error', msg:'Invalid configuration' });
        return;
      }
      
      // Save model with complete configuration
      console.log('About to save model config...');
      console.log('Model path:', modelPath);
      console.log('Config:', config);
      
      const response = await fetch('http://localhost:5000/api/admin/models', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: state.name,
          path: modelPath,
          ...config
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('MODEL SAVED:', result);
      
      onAdd();
      setFeedback({ type:'success', msg:'Model added successfully!' });
      setState(emptyState);
      
    } catch (err) {
      console.error('Error adding model:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setFeedback({ type:'error', msg: `Failed to add model: ${err.message}` });
    }
  };

  // Cleanup on unmount
  useEffect(()=>()=>{ objectUrlsRef.current.forEach(url=>URL.revokeObjectURL(url)); },[]);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('modelFile', file);
    fd.append('name', state.name.trim() || file.name.replace(/\.[^/.]+$/, "")); // Use state name or filename without extension
    fd.append('displayName', state.name.trim() || file.name);
    fd.append('type', 'glb');
    
    // Build upload-safe configuration (more lenient than buildConfig)
    const buildUploadConfig = () => {
      // Parse camera with defaults
      const cameraPos = parseVec(state.camera.position).length === 3 
        ? parseVec(state.camera.position) 
        : [0, 2, 5];
      const cameraTarget = parseVec(state.camera.target).length === 3 
        ? parseVec(state.camera.target) 
        : [0, 1, 0];
      const fov = parseFloat(state.camera.fov) || 50;
      
      // Parse hidden parts
      const hidden = state.hidden ? state.hidden.split(/[,\n]/).map(s=>s.trim()).filter(Boolean) : [];
      
      // Build UI widgets (including texture widget)
      const widgets = [...(state.widgets || [])];
      if(state.textureWidget.enabled && (state.textureWidget.parts.length > 0 || state.textureWidget.textures.length > 0)) {
        widgets.push({
          type: 'textureWidget',
          title: state.textureWidget.title,
          options: {
            parts: state.textureWidget.parts,
            textures: state.textureWidget.textures
          }
        });
      }
      
      // Build safe configuration
      return {
        camera: { position: cameraPos, target: cameraTarget, fov },
        hiddenInitially: hidden,
        lights: state.lights || [],
        interactionGroups: state.groups || [],
        uiWidgets: widgets
      };
    };
    
    const config = buildUploadConfig();
    console.log('UPLOAD CONFIG:', config); // Debug log
    console.log('Raw state before upload:', {
      textureWidget: state.textureWidget,
      groups: state.groups,
      widgets: state.widgets
    });
    
    fd.append('interactionGroups', JSON.stringify(config.interactionGroups));
    console.log('Sending interactionGroups:', JSON.stringify(config.interactionGroups));
    
    const metadataToSend = {
      camera: config.camera,
      hiddenInitially: config.hiddenInitially,
      lights: config.lights,
      uiWidgets: config.uiWidgets
    };
    fd.append('metadata', JSON.stringify(metadataToSend));
    console.log('Sending metadata:', JSON.stringify(metadataToSend));
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/models/upload', { 
        method:'POST', 
        body: fd, 
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined 
      });
      
      if(!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      
      const data = await res.json();
      console.log('Model uploaded successfully:', data);
      
      // Return the full backend URL
      if(data.model?.file) {
        return `http://localhost:5000/models/${data.model.file}`;
      }
      
      throw new Error('No file path returned from upload');
      
    } catch(err) {
      console.error('Upload API failed:', err);
      // Don't fall back to object URL for database approach
      throw err;
    }
  };

  const handleFileSingle = async (file) => {
    if(!file) return;
    // Store file locally without uploading yet
    setState(s=>({ ...s, selectedFile: file, path: null }));
  };

  const handleFileAsset = async (key, file) => {
    if(!file) return;
    const path = await uploadFile(file);
    setState(s=>({ ...s, assets:{ ...s.assets, [key]: path } }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal add-model-modal">
        <div className="modal-header">
          <h3>Add Model</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="raw-toggle-row">
            <label className="switch"><input type="checkbox" checked={state.rawMode} onChange={toggleRaw} /><span>Raw JSON Mode</span></label>
          </div>
          {!state.rawMode && (
            <form onSubmit={submit} className="enhanced-form">
              {/* Basic Information Section */}
              <div className="form-section">
                <h4 className="section-title">📝 Basic Information</h4>
                <div className="form-row">
                  <div className="form-group required">
                    <label htmlFor="model-name">Model Name *</label>
                    <input 
                      id="model-name"
                      type="text"
                      value={state.name} 
                      onChange={e=>update({ name:e.target.value })} 
                      placeholder="e.g., UndercounterV2, DeepFridge"
                      required
                    />
                    <small className="help-text">Give your model a descriptive name</small>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="form-section">
                <h4 className="section-title">📁 Model Files</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="toggle-label">
                      <input 
                        type="checkbox" 
                        checked={state.useAssets} 
                        onChange={e=>update({ useAssets:e.target.checked })}
                      />
                      <span className="toggle-text">Use Multiple Asset Files (Advanced)</span>
                    </label>
                    <small className="help-text">Enable if your model uses separate files for different parts</small>
                  </div>
                </div>

                {!state.useAssets ? (
                  <div className="form-row">
                    <div className="form-group file-upload">
                      <label htmlFor="model-file">3D Model File *</label>
                      <div className="file-input-container">
                        <input 
                          id="model-file"
                          type="file" 
                          accept=".glb,.gltf" 
                          onChange={e=>handleFileSingle(e.target.files?.[0])}
                          className="file-input"
                        />
                        <div className="file-input-display">
                          <span className="file-name">
                            {state.selectedFile ? state.selectedFile.name : 'Choose GLB/GLTF file...'}
                          </span>
                          <button type="button" className="file-browse-btn">Browse</button>
                        </div>
                      </div>
                      <small className="help-text">Upload your 3D model file (GLB or GLTF format)</small>
                    </div>
                  </div>
                ) : (
                  <div className="assets-grid">
                    {['base','doors','glassDoors','drawers'].map(key => (
                      <div className="form-group" key={key}>
                        <label htmlFor={`asset-${key}`}>{key.charAt(0).toUpperCase() + key.slice(1)} Model</label>
                        <input 
                          id={`asset-${key}`}
                          type="text"
                          value={state.assets[key]} 
                          onChange={e=>update({ assets:{ ...state.assets, [key]: e.target.value } })} 
                          placeholder={`/models/${key}.glb`} 
                        />
                        <div className="file-upload-mini">
                          <input 
                            type="file" 
                            accept=".glb,.gltf" 
                            onChange={e=>handleFileAsset(key, e.target.files?.[0])} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Camera Settings Section */}
              <div className="form-section">
                <h4 className="section-title">📷 Camera Settings</h4>
                <div className="form-row three-column">
                  <div className="form-group">
                    <label htmlFor="camera-position">Camera Position</label>
                    <input 
                      id="camera-position"
                      type="text"
                      value={state.camera.position} 
                      onChange={e=>update({ camera:{ ...state.camera, position:e.target.value } })}
                      placeholder="x,y,z"
                    />
                    <small className="help-text">x,y,z coordinates (e.g., 0,2,5)</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="camera-target">Camera Target</label>
                    <input 
                      id="camera-target"
                      type="text"
                      value={state.camera.target} 
                      onChange={e=>update({ camera:{ ...state.camera, target:e.target.value } })}
                      placeholder="x,y,z"
                    />
                    <small className="help-text">What the camera looks at</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="camera-fov">Field of View</label>
                    <input 
                      id="camera-fov"
                      type="number"
                      value={state.camera.fov} 
                      onChange={e=>update({ camera:{ ...state.camera, fov:e.target.value } })}
                      placeholder="50"
                      min="10"
                      max="120"
                    />
                    <small className="help-text">Degrees (10-120)</small>
                  </div>
                </div>
              </div>
                <div className="field wide">
                  <label>Hidden Initially (comma or newline)</label>
                  <textarea rows={2} value={state.hidden} onChange={e=>update({ hidden:e.target.value })} />
                </div>
              </div>

              {/* Lights */}
              <div className="subsection">
                <h4>Lights</h4>
                <div className="inline-fields">
                  <input placeholder="Name" value={state.lightDraft.name} onChange={e=>update({ lightDraft:{ ...state.lightDraft, name:e.target.value } })} />
                  <select value={state.lightDraft.defaultState} onChange={e=>update({ lightDraft:{ ...state.lightDraft, defaultState:e.target.value } })}>
                    <option value="on">on</option>
                    <option value="off">off</option>
                  </select>
                  <input placeholder="Intensity" value={state.lightDraft.intensity} onChange={e=>update({ lightDraft:{ ...state.lightDraft, intensity:e.target.value } })} style={{width:80}} />
                  <button type="button" onClick={addLight}>Add</button>
                </div>
                {state.lights.length>0 && <ul className="pill-list">{state.lights.map((l,i)=>(<li key={i}>{l.name} <span>{l.defaultState}</span> <span>{l.intensity}</span> <button type="button" onClick={()=>removeLight(i)}>×</button></li>))}</ul>}
              </div>

              {/* Interaction Groups */}
              <div className="subsection">
                <h4>Interaction Group Draft</h4>
                <div className="inline-fields">
                  <select value={state.groupDraft.type} onChange={e=>update({ groupDraft:{ ...state.groupDraft, type:e.target.value } })}>
                    <option value="doors">doors</option>
                    <option value="Glassdoors">Glassdoors</option>
                    <option value="drawers">drawers</option>
                    <option value="toggles">toggles</option>
                  </select>
                  <input placeholder="Label" value={state.groupDraft.label} onChange={e=>update({ groupDraft:{ ...state.groupDraft, label:e.target.value } })} />
                  <button type="button" onClick={addGroup}>Add Group</button>
                </div>
                <div className="parts-builder">
                  <div className="inline-fields">
                    <input placeholder="Part Name" value={state.partDraft.name} onChange={e=>update({ partDraft:{ ...state.partDraft, name:e.target.value } })} />
                    {state.groupDraft.type === 'drawers' ? (
                      <>
                        <input placeholder="Pos Axis (z)" value={state.partDraft.positionAxis} onChange={e=>update({ partDraft:{ ...state.partDraft, positionAxis:e.target.value } })} style={{width:90}} />
                        <input placeholder="Open Pos" value={state.partDraft.openPosition} onChange={e=>update({ partDraft:{ ...state.partDraft, openPosition:e.target.value } })} style={{width:80}} />
                      </>
                    ) : (
                      <>
                        <input placeholder="Rot Axis" value={state.partDraft.rotationAxis} onChange={e=>update({ partDraft:{ ...state.partDraft, rotationAxis:e.target.value } })} style={{width:70}} />
                        <input placeholder="Open Angle" value={state.partDraft.openAngle} onChange={e=>update({ partDraft:{ ...state.partDraft, openAngle:e.target.value } })} style={{width:90}} />
                      </>
                    )}
                    <button type="button" onClick={addPart}>Add Part</button>
                  </div>
                  {state.groupDraft.parts.length>0 && <ul className="pill-list">{state.groupDraft.parts.map((p,i)=>(<li key={i}>{p.name} <button type="button" onClick={()=>removePart(i)}>×</button></li>))}</ul>}
                </div>
                {state.groups.length>0 && (
                  <div className="groups-preview">
                    <h5>Groups Added</h5>
                    <ul className="pill-list">{state.groups.map((g,i)=>(<li key={i}>{g.type}:{g.label} ({g.parts.length}) <button type="button" onClick={()=>removeGroup(i)}>×</button></li>))}</ul>
                  </div>
                )}
              </div>

              {/* Texture Widget Configuration */}
              <div className="subsection">
                <h4>Texture Widget</h4>
                <div className="inline-toggle">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={state.textureWidget.enabled} 
                      onChange={e=>update({ textureWidget: { ...state.textureWidget, enabled: e.target.checked } })} 
                    />
                    Enable Texture Widget
                  </label>
                  {state.textureWidget.enabled && (
                    <input 
                      placeholder="Widget Title" 
                      value={state.textureWidget.title} 
                      onChange={e=>update({ textureWidget: { ...state.textureWidget, title: e.target.value } })} 
                    />
                  )}
                </div>
                
                {state.textureWidget.enabled && (
                  <>
                    {/* Texture Parts */}
                    <div className="texture-parts">
                      <h5>Texture Parts (Mesh Names)</h5>
                      <div className="inline-fields">
                        <input 
                          placeholder="Part Name (e.g., canopy, SidePannel1)" 
                          value={state.texturePartDraft.name} 
                          onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, name: e.target.value } })} 
                        />
                        <button type="button" onClick={addTexturePart}>Add Part</button>
                      </div>
                      
                      {/* UV Mapping Settings */}
                      <div className="mapping-settings">
                        <h6>UV Mapping for Current Part</h6>
                        <div className="inline-fields">
                          <input placeholder="Offset X" type="number" step="0.1" value={state.texturePartDraft.mapping.offset.x} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, offset: { ...state.texturePartDraft.mapping.offset, x: parseFloat(e.target.value) || 0 } } } })} />
                          <input placeholder="Offset Y" type="number" step="0.1" value={state.texturePartDraft.mapping.offset.y} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, offset: { ...state.texturePartDraft.mapping.offset, y: parseFloat(e.target.value) || 0 } } } })} />
                          <input placeholder="Repeat X" type="number" step="0.1" value={state.texturePartDraft.mapping.repeat.x} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, repeat: { ...state.texturePartDraft.mapping.repeat, x: parseFloat(e.target.value) || 1 } } } })} />
                          <input placeholder="Repeat Y" type="number" step="0.1" value={state.texturePartDraft.mapping.repeat.y} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, repeat: { ...state.texturePartDraft.mapping.repeat, y: parseFloat(e.target.value) || 1 } } } })} />
                        </div>
                        <div className="inline-fields">
                          <input placeholder="Center X" type="number" step="0.1" value={state.texturePartDraft.mapping.center.x} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, center: { ...state.texturePartDraft.mapping.center, x: parseFloat(e.target.value) || 0.5 } } } })} />
                          <input placeholder="Center Y" type="number" step="0.1" value={state.texturePartDraft.mapping.center.y} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, center: { ...state.texturePartDraft.mapping.center, y: parseFloat(e.target.value) || 0.5 } } } })} />
                          <input placeholder="Rotation" type="number" step="0.1" value={state.texturePartDraft.mapping.rotation} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, rotation: parseFloat(e.target.value) || 0 } } })} />
                          <label><input type="checkbox" checked={state.texturePartDraft.mapping.flipY} onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, mapping: { ...state.texturePartDraft.mapping, flipY: e.target.checked } } })} /> Flip Y</label>
                        </div>
                      </div>
                      
                      {state.textureWidget.parts.length > 0 && (
                        <ul className="pill-list">
                          {state.textureWidget.parts.map((part,i)=>(
                            <li key={i}>
                              {part.name} 
                              <span className="muted">({part.mapping.repeat.x}x{part.mapping.repeat.y})</span>
                              <button type="button" onClick={()=>removeTexturePart(i)}>×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Available Textures */}
                    <div className="texture-files">
                      <h5>Available Textures</h5>
                      <div className="inline-fields">
                        <input 
                          placeholder="Texture Name (e.g., canopy, Glass Clear)" 
                          value={state.textureDraft.name} 
                          onChange={e=>update({ textureDraft: { ...state.textureDraft, name: e.target.value } })} 
                        />
                        <input 
                          placeholder="Texture Path (e.g., /texture/pepsicanopy.jpg)" 
                          value={state.textureDraft.path} 
                          onChange={e=>update({ textureDraft: { ...state.textureDraft, path: e.target.value } })} 
                        />
                        <button type="button" onClick={addTexture}>Add Texture</button>
                      </div>
                      
                      {state.textureWidget.textures.length > 0 && (
                        <ul className="pill-list">
                          {state.textureWidget.textures.map((texture,i)=>(
                            <li key={i}>
                              {texture.name} 
                              <span className="muted">{texture.path}</span>
                              <button type="button" onClick={()=>removeTexture(i)}>×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Widgets */}
              <div className="subsection">
                <h4>UI Widgets</h4>
                <div className="inline-fields">
                  <select value={state.widgetDraft.type} onChange={e=>update({ widgetDraft:{ ...state.widgetDraft, type:e.target.value } })}>
                    <option value="lightWidget">lightWidget</option>
                    <option value="textureWidget">textureWidget</option>
                    <option value="globalTextureWidget">globalTextureWidget</option>
                    <option value="doorPresets">doorPresets</option>
                  </select>
                  <input placeholder="Title (optional)" value={state.widgetDraft.title} onChange={e=>update({ widgetDraft:{ ...state.widgetDraft, title:e.target.value } })} />
                  <button type="button" onClick={addWidget}>Add Widget</button>
                </div>
                {state.widgets.length>0 && <ul className="pill-list">{state.widgets.map((w,i)=>(<li key={i}>{w.type}{w.title && `:${w.title}`} <button type="button" onClick={()=>removeWidget(i)}>×</button></li>))}</ul>}
              </div>

              {feedback && <div className={`form-feedback ${feedback.type}`}>{feedback.msg}</div>}
              <div className="modal-footer">
                <button type="submit" className="btn-primary">Add Model</button>
                <button type="button" className="btn-outline" onClick={()=>{ setState(emptyState); setFeedback(null); }}>Clear</button>
              </div>
            </form>
          )}
          {state.rawMode && (
            <div className="raw-json-pane">
              <div className="field">
                <label>Model Name</label>
                <input value={state.name} onChange={e=>update({ name:e.target.value })} placeholder="UniqueName" />
              </div>
              <textarea
                rows={18}
                value={state.rawJson}
                onChange={handleRawChange}
                placeholder={'{\n  "path": "/models/Example.glb",\n  "camera": { "position": [0,2,5], "target": [0,1,0], "fov": 50 }\n}'}
              />
              {rawError && <div className="form-feedback error">JSON Error: {rawError}</div>}
              {feedback && <div className={`form-feedback ${feedback.type}`}>{feedback.msg}</div>}
              <div className="modal-footer">
                <button className="btn-primary" onClick={submit} disabled={!!rawError}>Add Model</button>
                <button className="btn-outline" onClick={()=>{ update({ rawJson:'', name:'' }); setFeedback(null); }}>Clear</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddModelModal;
