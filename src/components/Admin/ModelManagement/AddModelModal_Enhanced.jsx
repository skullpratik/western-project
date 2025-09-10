import React, { useState, useCallback, useRef, useEffect } from 'react';
import './AddModelModal.css';

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
  editingPart: null, // { groupIndex, partIndex } when editing a specific part
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
  textureDraft: { name: '', path: '', file: null, uploading: false },
  rawMode: false,
  rawJson: ''
};

const parseVec = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') return input.split(',').map(v=>parseFloat(v.trim())).filter(v=>!Number.isNaN(v));
  return [];
};

const AddModelModalEnhanced = ({ onClose, onAdd, editModel = null, isEditMode = false }) => {
  const [state, setState] = useState(emptyState);
  const [feedback, setFeedback] = useState(null);
  const [rawError, setRawError] = useState(null);
  const objectUrlsRef = useRef([]);

  const update = (patch) => setState(s => ({ ...s, ...patch }));

  // Initialize form with edit model data
  useEffect(() => {
    if (isEditMode && editModel) {
      const editState = {
        name: editModel.name || '',
        path: editModel.file || '',
        selectedFile: null, // Don't include file for editing
        assets: editModel.assets || { base: '', doors: '', glassDoors: '', drawers: '' },
        useAssets: !!(editModel.assets?.base || editModel.assets?.doors || editModel.assets?.glassDoors || editModel.assets?.drawers),
        camera: {
          position: editModel.camera?.position ? (Array.isArray(editModel.camera.position) ? editModel.camera.position.join(',') : editModel.camera.position) : '0,2,5',
          target: editModel.camera?.target ? (Array.isArray(editModel.camera.target) ? editModel.camera.target.join(',') : editModel.camera.target) : '0,1,0',
          fov: editModel.camera?.fov?.toString() || '50'
        },
        hidden: editModel.hiddenInitially?.join(', ') || '',
        lights: editModel.lights || [],
        lightDraft: { name:'', defaultState:'on', intensity:'5' },
        groups: editModel.interactionGroups || [],
        groupDraft: { type:'doors', label:'', parts: [] },
        partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' },
        editingPart: null,
        widgets: editModel.uiWidgets?.filter(w => w.type !== 'textureWidget') || [],
        widgetDraft: { type:'lightWidget', title:'' },
        // Handle texture widget
        textureWidget: (() => {
          const textureWidget = editModel.uiWidgets?.find(w => w.type === 'textureWidget');
          if (textureWidget) {
            return {
              enabled: true,
              title: textureWidget.title || 'Textures',
              parts: textureWidget.parts || [],
              textures: textureWidget.textures || []
            };
          }
          return {
            enabled: false,
            title: 'Textures',
            parts: [],
            textures: []
          };
        })(),
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
        textureDraft: { name: '', path: '', file: null, uploading: false },
        rawMode: false,
        rawJson: ''
      };
      setState(editState);
    }
  }, [isEditMode, editModel]);

  // Light management
  const addLight = () => {
    if(!state.lightDraft.name) return;
    update({ lights: [...state.lights, { ...state.lightDraft }], lightDraft: { name:'', defaultState:'on', intensity:'5' } });
  };

  const removeLight = (i) => update({ lights: state.lights.filter((_,idx)=>idx!==i) });

  // Group management
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

  // Individual part management within groups
  const editPartInGroup = (groupIndex, partIndex) => {
    const group = state.groups[groupIndex];
    const part = group.parts[partIndex];
    
    // Populate the part draft with the selected part's data for editing
    update({ 
      partDraft: { 
        name: part.name,
        rotationAxis: part.rotationAxis || 'y',
        openAngle: part.openAngle || '90',
        positionAxis: part.positionAxis || '',
        openPosition: part.openPosition || ''
      },
      editingPart: { groupIndex, partIndex }
    });
  };

  const updatePartInGroup = () => {
    const { groupIndex, partIndex } = state.editingPart;
    if (groupIndex === undefined || partIndex === undefined) return;
    
    const updatedGroups = [...state.groups];
    const updatedPart = {
      name: state.partDraft.name,
      ...(state.partDraft.rotationAxis && { rotationAxis: state.partDraft.rotationAxis }),
      ...(state.partDraft.openAngle && { openAngle: state.partDraft.openAngle }),
      ...(state.partDraft.positionAxis && { positionAxis: state.partDraft.positionAxis }),
      ...(state.partDraft.openPosition && { openPosition: state.partDraft.openPosition })
    };
    
    updatedGroups[groupIndex].parts[partIndex] = updatedPart;
    
    update({ 
      groups: updatedGroups,
      partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' },
      editingPart: null
    });
  };

  const removePartFromGroup = (groupIndex, partIndex) => {
    const updatedGroups = [...state.groups];
    updatedGroups[groupIndex].parts.splice(partIndex, 1);
    
    // If group becomes empty, remove it
    if (updatedGroups[groupIndex].parts.length === 0) {
      updatedGroups.splice(groupIndex, 1);
    }
    
    update({ groups: updatedGroups });
  };

  const cancelPartEdit = () => {
    update({ 
      partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' },
      editingPart: null
    });
  };

  // Part management
  const addPart = () => {
    if(!state.partDraft.name) return;
    const isDrawer = state.groupDraft.type === 'drawers';
    const part = {
      name: state.partDraft.name,
      rotationAxis: isDrawer ? '' : state.partDraft.rotationAxis,
      openAngle: isDrawer ? '' : parseFloat(state.partDraft.openAngle) || 90,
      positionAxis: isDrawer ? state.partDraft.positionAxis : '',
      openPosition: isDrawer ? state.partDraft.openPosition : ''
    };
    update({ groupDraft: { ...state.groupDraft, parts: [...state.groupDraft.parts, part] }, partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' } });
  };

  const removePart = (i) => update({ groupDraft: { ...state.groupDraft, parts: state.groupDraft.parts.filter((_,idx)=>idx!==i) } });

  // Widget management
  const addWidget = () => {
    if(!state.widgetDraft.type) return;
    
    // For global texture widgets, add special configuration
    const widget = { ...state.widgetDraft };
    if (widget.type === 'globalTextureWidget') {
      widget.config = {
        global: true,
        applyToAll: true,
        allowedTextures: [], // Empty - users will upload their own
        defaultTexture: null,
        allowUserUpload: true // Allow users to upload textures
      };
    }
    
    update({ 
      widgets: [...state.widgets, widget], 
      widgetDraft: { type:'lightWidget', title:'' } 
    });
  };

  const removeWidget = (i) => update({ widgets: state.widgets.filter((_,idx)=>idx!==i) });

  // Texture widget management
  const addTexturePart = () => {
    if(!state.texturePartDraft.name) return;
    update({ 
      textureWidget: { 
        ...state.textureWidget, 
        parts: [...state.textureWidget.parts, { ...state.texturePartDraft }] 
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
    
    // Parse camera values safely
    const cameraPos = parseVec(state.camera.position);
    const cameraTarget = parseVec(state.camera.target);
    const cameraFov = parseFloat(state.camera.fov) || 50;
    
    if(cameraPos.length !== 3 || cameraTarget.length !== 3) { 
      setFeedback({ type:'error', msg:'Camera position and target must have 3 numbers (X,Y,Z)' }); 
      return null; 
    }
    
    const cfg = {};
    
    // Handle model path/assets
    if(state.useAssets) {
      const filtered = Object.fromEntries(Object.entries(state.assets).filter(([,v])=>v));
      if(Object.keys(filtered).length===0) { 
        setFeedback({ type:'error', msg:'At least one asset path required' }); 
        return null; 
      }
      cfg.assets = filtered;
    } else {
      const pathToUse = modelPath || state.path;
      if(!pathToUse && !state.selectedFile) { 
        setFeedback({ type:'error', msg:'Model path or file required' }); 
        return null; 
      }
      if(pathToUse) cfg.path = pathToUse;
    }
    
    // Set camera configuration
    cfg.camera = { 
      position: cameraPos, 
      target: cameraTarget, 
      fov: cameraFov 
    };
    
    // Handle hidden parts
    const hidden = state.hidden.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    if(hidden.length) cfg.hiddenInitially = hidden;
    
    // Handle lights
    if(state.lights.length) {
      cfg.lights = state.lights.map(l=>({ 
        name: l.name, 
        defaultState: l.defaultState, 
        intensity: parseFloat(l.intensity) || 1 
      }));
    }
    
    // Handle interaction groups
    if(state.groups.length) {
      cfg.interactionGroups = state.groups.map(g=>({ 
        type: g.type, 
        label: g.label, 
        parts: g.parts 
      }));
    }
    
    // Build UI widgets
    const widgets = [...(state.widgets || [])];
    console.log('BUILDING WIDGETS:', state.widgets);
    console.log('TEXTURE WIDGET STATE:', state.textureWidget);
    
    // Add texture widget if enabled and configured
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
    
    console.log('FINAL CONFIG:', cfg);
    return cfg;
  }, [state]);

  const submit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    
    if(!state.name.trim()) { 
      setFeedback({ type:'error', msg:'Name required' }); 
      return; 
    }
    
    // For edit mode, file is optional since the model already exists
    if(!isEditMode && !state.selectedFile && !state.path) {
      setFeedback({ type:'error', msg:'Model file required' }); 
      return; 
    }

    try {
      setFeedback({ type:'info', msg: isEditMode ? 'Updating model...' : 'Uploading model...' });
      
      let modelPath = state.path;
      
      // Only handle file upload for new models or when a new file is selected
      if (state.selectedFile && !isEditMode) {
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
      } else if (isEditMode) {
        // For edit mode, keep the existing file path
        modelPath = editModel.file;
      }
      
      // Build the complete configuration including texture widgets
      const config = buildConfig(modelPath);
      console.log('FINAL CONFIG:', config);
      console.log('FINAL CONFIG UI WIDGETS:', config?.uiWidgets);
      
      if (!config) {
        setFeedback({ type:'error', msg:'Invalid configuration' });
        return;
      }
      
      // Save or update model with complete configuration
      const url = isEditMode 
        ? `http://localhost:5000/api/admin/models/${editModel._id}`
        : 'http://localhost:5000/api/admin/models';
      const method = isEditMode ? 'PUT' : 'POST';
      
      console.log(`About to ${isEditMode ? 'update' : 'save'} model config...`);
      console.log('Model path:', modelPath);
      console.log('Config:', config);
      
      const response = await fetch(url, {
        method: method,
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
      
      console.log('REQUEST SENT TO BACKEND:', {
        name: state.name,
        path: modelPath,
        ...config
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`MODEL ${isEditMode ? 'UPDATED' : 'SAVED'}:`, result);
      
      onAdd();
      setFeedback({ 
        type:'success', 
        msg: isEditMode ? 'Model updated successfully!' : 'Model added successfully!' 
      });
      
      // Only reset form for new models, not for edits
      if (!isEditMode) {
        setState(emptyState);
      } else {
        // For edits, just show success message but keep the form data
        // The parent component should handle closing the modal
      }
      
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} model:`, err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setFeedback({ 
        type:'error', 
        msg: `Failed to ${isEditMode ? 'update' : 'add'} model: ${err.message}` 
      });
    }
  };

  const handleFileSingle = async (file) => {
    if(!file) return;
    setState(s=>({ ...s, selectedFile: file, path: null }));
  };

  const handleFileAsset = async (key, file) => {
    if(!file) return;
    // For simplicity, just set a placeholder path
    setState(s=>({ ...s, assets:{ ...s.assets, [key]: `/models/${file.name}` } }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal add-model-modal enhanced">
        <div className="modal-header">
          <h3>{isEditMode ? '✏️ Edit Model' : '🎯 Add New 3D Model'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Toggle for advanced mode */}
          <div className="mode-toggle">
            <label className="toggle-switch">
              <input type="checkbox" checked={state.rawMode} onChange={toggleRaw} />
              <span className="slider"></span>
              <span className="toggle-label">Advanced JSON Mode</span>
            </label>
          </div>

          {!state.rawMode ? (
            <form onSubmit={submit} className="enhanced-form">
              {/* Basic Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>📝 Basic Information</h4>
                  <p>Essential details about your 3D model</p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="model-name" className="required">Model Name</label>
                  <input 
                    id="model-name"
                    type="text"
                    value={state.name} 
                    onChange={e=>update({ name:e.target.value })} 
                    placeholder="e.g., UndercounterV2, DeepFridge, ModernCooler"
                    className="form-input"
                    required
                  />
                  <small className="help-text">Give your model a descriptive, unique name</small>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>📁 Model Files</h4>
                  <p>{isEditMode ? 'Update your 3D model files (optional)' : 'Upload your 3D model files'}</p>
                </div>

                <div className="form-group">
                  <label className="checkbox-group">
                    <input 
                      type="checkbox" 
                      checked={state.useAssets} 
                      onChange={e=>update({ useAssets:e.target.checked })}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-label">Use Multiple Asset Files</span>
                  </label>
                  <small className="help-text">Enable if your model uses separate files for different parts (doors, drawers, etc.)</small>
                </div>

                {!state.useAssets ? (
                  <div className="form-group">
                    <label htmlFor="model-file" className="required">3D Model File</label>
                    <div className="file-upload-area">
                      <input 
                        id="model-file"
                        type="file" 
                        accept=".glb,.gltf" 
                        onChange={e=>handleFileSingle(e.target.files?.[0])}
                        className="file-input"
                      />
                      <div className="file-upload-display">
                        <div className="file-icon">📄</div>
                        <div className="file-info">
                          <div className="file-name">
                            {state.selectedFile ? state.selectedFile.name : 'Choose GLB or GLTF file...'}
                          </div>
                          <div className="file-size">
                            {state.selectedFile ? `${(state.selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'No file selected'}
                          </div>
                        </div>
                        <button type="button" className="file-browse-btn">Browse Files</button>
                      </div>
                    </div>
                    <small className="help-text">Supported formats: GLB (recommended), GLTF. Max size: 50MB</small>
                  </div>
                ) : (
                  <div className="assets-grid">
                    <h5>Asset Files</h5>
                    {[
                      { key: 'base', label: 'Base Model', desc: 'Main structure' },
                      { key: 'doors', label: 'Doors', desc: 'Door components' },
                      { key: 'glassDoors', label: 'Glass Doors', desc: 'Glass door variants' },
                      { key: 'drawers', label: 'Drawers', desc: 'Drawer components' }
                    ].map(asset => (
                      <div className="asset-group" key={asset.key}>
                        <label htmlFor={`asset-${asset.key}`}>{asset.label}</label>
                        <small className="asset-desc">{asset.desc}</small>
                        <input 
                          id={`asset-${asset.key}`}
                          type="text"
                          value={state.assets[asset.key]} 
                          onChange={e=>update({ assets:{ ...state.assets, [asset.key]: e.target.value } })} 
                          placeholder={`/models/${asset.key}.glb`}
                          className="form-input"
                        />
                        <input 
                          type="file" 
                          accept=".glb,.gltf" 
                          onChange={e=>handleFileAsset(asset.key, e.target.files?.[0])}
                          className="file-input-mini"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Camera Settings Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>📷 Camera Configuration</h4>
                  <p>Set up the default camera view for your model</p>
                </div>
                
                <div className="camera-grid">
                  <div className="form-group">
                    <label htmlFor="camera-position">Camera Position</label>
                    <input 
                      id="camera-position"
                      type="text"
                      value={state.camera.position} 
                      onChange={e=>update({ camera:{ ...state.camera, position:e.target.value } })}
                      placeholder="0,2,5"
                      className="form-input"
                    />
                    <small className="help-text">X,Y,Z coordinates where camera is located</small>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="camera-target">Camera Target</label>
                    <input 
                      id="camera-target"
                      type="text"
                      value={state.camera.target} 
                      onChange={e=>update({ camera:{ ...state.camera, target:e.target.value } })}
                      placeholder="0,1,0"
                      className="form-input"
                    />
                    <small className="help-text">X,Y,Z coordinates camera looks at</small>
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
                      className="form-input"
                    />
                    <small className="help-text">Viewing angle in degrees (10-120)</small>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="form-section">
                <div className="section-header">
                  <h4>⚙️ Additional Settings</h4>
                  <p>Optional configuration for advanced features</p>
                </div>

                <div className="form-group">
                  <label htmlFor="hidden-parts">Hidden Parts Initially</label>
                  <textarea 
                    id="hidden-parts"
                    rows={3} 
                    value={state.hidden} 
                    onChange={e=>update({ hidden:e.target.value })}
                    placeholder="door1, drawer2, handle3..."
                    className="form-textarea"
                  />
                  <small className="help-text">Comma-separated list of part names to hide by default</small>
                </div>
              </div>

              {/* Interactive Elements Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>🎮 Interactive Elements</h4>
                  <p>Configure doors, drawers, and other interactive parts</p>
                </div>

                {/* Interaction Groups */}
                <div className="subsection">
                  <h5>Door & Drawer Controls</h5>
                  
                  <div className="interaction-draft">
                    <div className="draft-row">
                      <select 
                        value={state.groupDraft.type} 
                        onChange={e=>update({ groupDraft:{ ...state.groupDraft, type:e.target.value } })}
                        className="form-select"
                      >
                        <option value="doors">Doors</option>
                        <option value="Glassdoors">Glass Doors</option>
                        <option value="drawers">Drawers</option>
                      </select>
                      
                      <input 
                        placeholder="Control Label (e.g., Door Controls)" 
                        value={state.groupDraft.label} 
                        onChange={e=>update({ groupDraft:{ ...state.groupDraft, label:e.target.value } })}
                        className="form-input"
                      />
                      
                      <button type="button" onClick={addGroup} className="btn-add">Add Group</button>
                    </div>

                    {/* Parts for current group */}
                    {state.groupDraft.type && (
                      <div className="parts-section">
                        <h6>Add Parts to {state.groupDraft.type}</h6>
                        <div className="part-draft">
                          <input 
                            placeholder="Part name (e.g., door1, leftDoor)" 
                            value={state.partDraft.name} 
                            onChange={e=>update({ partDraft:{ ...state.partDraft, name:e.target.value } })}
                            className="form-input"
                          />
                          
                          {state.groupDraft.type !== 'drawers' ? (
                            <>
                              <select 
                                value={state.partDraft.rotationAxis} 
                                onChange={e=>update({ partDraft:{ ...state.partDraft, rotationAxis:e.target.value } })}
                                className="form-select"
                              >
                                <option value="y">Y-Axis (Vertical)</option>
                                <option value="x">X-Axis (Horizontal)</option>
                                <option value="z">Z-Axis (Depth)</option>
                              </select>
                              
                              <input 
                                placeholder="Open angle (90)" 
                                value={state.partDraft.openAngle} 
                                onChange={e=>update({ partDraft:{ ...state.partDraft, openAngle:e.target.value } })}
                                className="form-input"
                                type="number"
                              />
                            </>
                          ) : (
                            <>
                              <select 
                                value={state.partDraft.positionAxis} 
                                onChange={e=>update({ partDraft:{ ...state.partDraft, positionAxis:e.target.value } })}
                                className="form-select"
                              >
                                <option value="">Select axis</option>
                                <option value="x">X-Axis</option>
                                <option value="y">Y-Axis</option>
                                <option value="z">Z-Axis</option>
                              </select>
                              
                              <input 
                                placeholder="Open position" 
                                value={state.partDraft.openPosition} 
                                onChange={e=>update({ partDraft:{ ...state.partDraft, openPosition:e.target.value } })}
                                className="form-input"
                              />
                            </>
                          )}
                          
                          <button type="button" onClick={addPart} className="btn-add">Add Part</button>
                        </div>
                        
                        {/* Show editing buttons when editing a part */}
                        {state.editingPart && (
                          <div className="edit-part-actions">
                            <button type="button" onClick={updatePartInGroup} className="btn-update">Update Part</button>
                            <button type="button" onClick={cancelPartEdit} className="btn-cancel">Cancel Edit</button>
                          </div>
                        )}
                        
                        {state.groupDraft.parts.length > 0 && (
                          <div className="parts-list">
                            <h6>Parts in current group:</h6>
                            <ul className="pill-list">
                              {state.groupDraft.parts.map((p, i) => (
                                <li key={i} className="pill">
                                  <span className="part-name">{p.name}</span>
                                  {p.rotationAxis && <span className="part-detail">↻ {p.rotationAxis} axis</span>}
                                  {p.openAngle && <span className="part-detail">{p.openAngle}°</span>}
                                  {p.positionAxis && <span className="part-detail">→ {p.positionAxis} axis</span>}
                                  <button type="button" onClick={() => removePart(i)} className="btn-remove">×</button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {state.groups.length > 0 && (
                    <div className="groups-list">
                      <h6>Configured Groups:</h6>
                      <ul className="group-list">
                        {state.groups.map((g, groupIndex) => (
                          <li key={groupIndex} className="group-item">
                            <div className="group-header">
                              <span className="group-type">{g.type}</span>
                              <span className="group-label">{g.label}</span>
                              <button type="button" onClick={() => removeGroup(groupIndex)} className="btn-remove">Remove Group</button>
                            </div>
                            <div className="group-parts">
                              <h6>Parts ({g.parts.length}):</h6>
                              <ul className="parts-in-group">
                                {g.parts.map((part, partIndex) => (
                                  <li key={partIndex} className="part-item">
                                    <div className="part-info">
                                      <span className="part-name">{part.name}</span>
                                      <div className="part-details">
                                        {part.rotationAxis && <span className="part-detail">↻ {part.rotationAxis} axis, {part.openAngle}°</span>}
                                        {part.positionAxis && <span className="part-detail">→ {part.positionAxis} axis, {part.openPosition}</span>}
                                      </div>
                                    </div>
                                    <div className="part-actions">
                                      <button 
                                        type="button" 
                                        onClick={() => editPartInGroup(groupIndex, partIndex)} 
                                        className="btn-edit-small"
                                        title="Edit this part"
                                      >
                                        ✏️
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => removePartFromGroup(groupIndex, partIndex)} 
                                        className="btn-remove-small"
                                        title="Remove this part"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Other UI Widgets Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>🔧 Other UI Widgets</h4>
                  <p>Add additional interface widgets like light controls, reflection toggles, etc.</p>
                </div>

                <div className="subsection">
                  <h5>Add Widget</h5>
                  
                  <div className="widget-draft">
                    <div className="draft-row">
                      <select 
                        value={state.widgetDraft.type} 
                        onChange={e=>update({ widgetDraft:{ ...state.widgetDraft, type:e.target.value } })}
                        className="form-select"
                      >
                        <option value="lightWidget">Light Widget</option>
                        <option value="reflectionWidget">Reflection Widget</option>
                        <option value="movementWidget">Movement Widget</option>
                        <option value="globalTextureWidget">Global Texture Widget</option>
                        <option value="customWidget">Custom Widget</option>
                      </select>
                      
                      <input 
                        placeholder="Widget Title (e.g., Lighting Controls)" 
                        value={state.widgetDraft.title} 
                        onChange={e=>update({ widgetDraft:{ ...state.widgetDraft, title:e.target.value } })}
                        className="form-input"
                      />
                      
                      <button type="button" onClick={addWidget} className="btn-add">Add Widget</button>
                    </div>
                  </div>

                  {state.widgets.length > 0 && (
                    <div className="widgets-list">
                      <h6>Configured Widgets:</h6>
                      <ul className="pill-list">
                        {state.widgets.map((w, i) => (
                          <li key={i} className="pill">
                            <span className="widget-type">{w.type}</span>
                            <span className="widget-title">{w.title || 'Untitled'}</span>
                            <button type="button" onClick={() => removeWidget(i)} className="btn-remove">×</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Texture Configuration */}
              <div className="form-section">
                <div className="section-header">
                  <h4>🎨 Texture Configuration</h4>
                  <p>Enable users to change model textures dynamically</p>
                </div>

                <div className="form-group">
                  <label className="checkbox-group">
                    <input 
                      type="checkbox" 
                      checked={state.textureWidget.enabled} 
                      onChange={e=>update({ textureWidget: { ...state.textureWidget, enabled: e.target.checked } })}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-label">Enable Texture Widget</span>
                  </label>
                  <small className="help-text">Allow users to change textures on different parts of the model</small>
                </div>

                {state.textureWidget.enabled && (
                  <div className="texture-config">
                    <div className="form-group">
                      <label htmlFor="texture-title">Widget Title</label>
                      <input 
                        id="texture-title"
                        type="text"
                        value={state.textureWidget.title} 
                        onChange={e=>update({ textureWidget: { ...state.textureWidget, title: e.target.value } })}
                        placeholder="Textures"
                        className="form-input"
                      />
                    </div>

                    {/* Texture Parts */}
                    <div className="texture-parts">
                      <h6>Texture Parts</h6>
                      <div className="part-draft">
                        <input 
                          placeholder="Part name (e.g., body, door, handle)" 
                          value={state.texturePartDraft.name} 
                          onChange={e=>update({ texturePartDraft: { ...state.texturePartDraft, name: e.target.value } })}
                          className="form-input"
                        />
                        <button type="button" onClick={addTexturePart} className="btn-add">Add Part</button>
                      </div>
                      
                      {state.textureWidget.parts.length > 0 && (
                        <ul className="pill-list">
                          {state.textureWidget.parts.map((part, i) => (
                            <li key={i} className="pill">
                              <span>{part.name}</span>
                              <button type="button" onClick={() => removeTexturePart(i)} className="btn-remove">×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Available Textures */}
                    <div className="texture-files">
                      <h6>Available Textures</h6>
                      <div className="texture-draft">
                        <input 
                          placeholder="Texture name (e.g., Wood, Metal, Glass)" 
                          value={state.textureDraft.name} 
                          onChange={e=>update({ textureDraft: { ...state.textureDraft, name: e.target.value } })}
                          className="form-input"
                        />
                        <input 
                          placeholder="Texture file path" 
                          value={state.textureDraft.path} 
                          onChange={e=>update({ textureDraft: { ...state.textureDraft, path: e.target.value } })}
                          className="form-input"
                        />
                        <button type="button" onClick={addTexture} className="btn-add">Add Texture</button>
                      </div>
                      
                      {state.textureWidget.textures.length > 0 && (
                        <ul className="texture-list">
                          {state.textureWidget.textures.map((texture, i) => (
                            <li key={i} className="texture-item">
                              <span className="texture-name">{texture.name}</span>
                              <span className="texture-path">{texture.path}</span>
                              <button type="button" onClick={() => removeTexture(i)} className="btn-remove">×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`feedback ${feedback.type}`}>
                  {feedback.msg}
                </div>
              )}

              {/* Submit */}
              <div className="form-actions">
                <button type="submit" className="btn-primary btn-large">
                  {isEditMode ? '✏️ Update Model' : '🚀 Add Model'}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="raw-mode">
              <div className="form-group">
                <label htmlFor="raw-json">Raw JSON Configuration</label>
                <textarea 
                  id="raw-json"
                  rows={20} 
                  value={state.rawJson} 
                  onChange={handleRawChange}
                  className="raw-textarea"
                  placeholder="Paste your complete model configuration JSON here..."
                />
                {rawError && <div className="error-text">{rawError}</div>}
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={submit} 
                  disabled={!!rawError}
                  className="btn-primary btn-large"
                >
                  Add Model from JSON
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddModelModalEnhanced;
