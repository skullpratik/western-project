import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddModelModal.css';

const emptyState = {
  name: '',
  path: '',
  selectedFile: null,
  assets: { base: '', doors: '', glassDoors: '', drawers: '' },
  useAssets: false,
  placementMode: 'autofit',
  modelPosition: '0,0,0',
  modelRotation: '0,0,0',
  modelScale: '1',
  hidden: '',
  lights: [],
  lightDraft: { name:'', meshName:'', defaultState:'on', intensity:'5' },
  groups: [],
  groupDraft: { type:'doors', label:'', parts: [] },
  partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' },
  editingPart: null, // { groupIndex, partIndex } when editing a specific part
  widgets: [],
  widgetDraft: { type:'globalTextureWidget', title:'', meshName:'' },
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
  const navigate = useNavigate();

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
  placementMode: editModel.placementMode || 'autofit',
  modelPosition: editModel.modelPosition ? (Array.isArray(editModel.modelPosition) ? editModel.modelPosition.join(',') : editModel.modelPosition) : '0,0,0',
  modelRotation: editModel.modelRotation ? (Array.isArray(editModel.modelRotation) ? editModel.modelRotation.map(r => r * 180 / Math.PI).join(',') : editModel.modelRotation) : '0,0,0',
  modelScale: (editModel.modelScale ?? 1).toString(),
        hidden: editModel.hiddenInitially?.join(', ') || '',
        lightDraft: { name:'', meshName:'', defaultState:'on', intensity:'5' },
        groups: editModel.interactionGroups || [],
        groupDraft: { type:'doors', label:'', parts: [] },
        partDraft: { name:'', rotationAxis:'y', openAngle:'90', positionAxis:'', openPosition:'' },
        editingPart: null,
        lights: (() => {
          const allLights = editModel.lights || [];
          // Remove duplicate lights (keep only the first one for each mesh)
          const seenLightMeshes = new Set();
          return allLights.filter(light => {
            if (seenLightMeshes.has(light.meshName)) {
              console.log(`🧹 Removing duplicate light for mesh: ${light.meshName}`);
              return false; // Remove duplicate
            }
            seenLightMeshes.add(light.meshName);
            return true; // Keep light
          });
        })(),
        widgets: (() => {
          const allWidgets = editModel.uiWidgets?.filter(w => w.type !== 'textureWidget') || [];
          // Remove duplicate light widgets (keep only the first one for each mesh)
          const seenLightMeshes = new Set();
          return allWidgets.filter(w => {
            if (w.type === 'lightWidget') {
              if (seenLightMeshes.has(w.meshName)) {
                console.log(`🧹 Removing duplicate light widget for mesh: ${w.meshName}`);
                return false; // Remove duplicate
              }
              seenLightMeshes.add(w.meshName);
            }
            return true; // Keep widget
          });
        })(),
        widgetDraft: { type:'globalTextureWidget', title:'', meshName:'' },
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

  // Light management with mesh validation
  const addLight = () => {
    if(!state.lightDraft.name || !state.lightDraft.meshName) return;
    
    // Log mesh validation attempt
    console.log(`🔍 Validating mesh name: "${state.lightDraft.meshName}"`);
    
    // TODO: Add actual mesh validation against model data when available
    // For now, just log the mesh name for verification
    console.log(`📝 Adding light with mesh: "${state.lightDraft.meshName}" - Please verify this mesh exists in your 3D model`);
    
    // Check for duplicate light with same mesh name
    const existingLight = state.lights.find(l => l.meshName === state.lightDraft.meshName);
    if (existingLight) {
      console.log(`⚠️ Light with mesh "${state.lightDraft.meshName}" already exists - BLOCKED`);
      setFeedback({ type: 'error', msg: `Light with mesh "${state.lightDraft.meshName}" already exists!` });
      return;
    }
    
    // Check for duplicate widget with same mesh name
    const existingWidget = state.widgets.find(w => 
      w.type === 'lightWidget' && w.meshName === state.lightDraft.meshName
    );
    if (existingWidget) {
      console.log(`⚠️ Widget with mesh "${state.lightDraft.meshName}" already exists - BLOCKED`);
      setFeedback({ type: 'error', msg: `Widget for mesh "${state.lightDraft.meshName}" already exists!` });
      return;
    }
    
    // Add the light
    const newLight = { ...state.lightDraft };
    
    // Create corresponding widget
    const newWidget = {
      type: 'lightWidget',
      title: `${newLight.name} Control`,
      meshName: newLight.meshName
    };
    
    console.log(`✅ Creating light: "${newLight.name}" with mesh: "${newLight.meshName}"`);
    console.log(`✅ Creating widget: "${newWidget.title}" for mesh: "${newWidget.meshName}"`);
    
    update({ 
      lights: [...state.lights, newLight], 
      widgets: [...state.widgets, newWidget],
      lightDraft: { name:'', meshName:'', defaultState:'on', intensity:'5' } 
    });
  };

  const removeLight = (i) => {
    const removedLight = state.lights[i];
    console.log(`🗑️ Removing light: "${removedLight.name}" with mesh: "${removedLight.meshName}"`);
    
    // Also remove the corresponding widget
    const updatedWidgets = state.widgets.filter(w => 
      !(w.type === 'lightWidget' && w.meshName === removedLight.meshName)
    );
    
    console.log(`🗑️ Also removed corresponding light widget for mesh: "${removedLight.meshName}"`);
    
    update({ 
      lights: state.lights.filter((_,idx)=>idx!==i),
      widgets: updatedWidgets
    });
  };

  // Clean up duplicate lights and widgets
  const cleanupDuplicates = () => {
    console.log('🧹 Starting duplicate cleanup...');
    
    // Remove duplicate lights (keep first occurrence)
    const seenLightMeshes = new Set();
    const cleanLights = state.lights.filter((light, index) => {
      if (seenLightMeshes.has(light.meshName)) {
        console.log(`🧹 Removing duplicate light: "${light.name}" with mesh: "${light.meshName}"`);
        return false;
      }
      seenLightMeshes.add(light.meshName);
      return true;
    });
    
    // Remove duplicate widgets (keep first occurrence)
    const seenWidgetMeshes = new Set();
    const cleanWidgets = state.widgets.filter((widget, index) => {
      if (widget.type === 'lightWidget') {
        if (seenWidgetMeshes.has(widget.meshName)) {
          console.log(`🧹 Removing duplicate widget: "${widget.title}" with mesh: "${widget.meshName}"`);
          return false;
        }
        seenWidgetMeshes.add(widget.meshName);
      }
      return true;
    });
    
    // Update state if changes were made
    if (cleanLights.length !== state.lights.length || cleanWidgets.length !== state.widgets.length) {
      console.log(`🧹 Cleanup complete: Removed ${state.lights.length - cleanLights.length} duplicate lights and ${state.widgets.length - cleanWidgets.length} duplicate widgets`);
      update({ 
        lights: cleanLights,
        widgets: cleanWidgets
      });
    } else {
      console.log('🧹 No duplicates found');
    }
  };

  // Create missing widgets for lights that don't have them
  const createMissingWidgets = () => {
    console.log('🔧 Checking for missing widgets...');
    
    const missingWidgets = [];
    
    state.lights.forEach(light => {
      const hasWidget = state.widgets.find(w => 
        w.type === 'lightWidget' && w.meshName === light.meshName
      );
      
      if (!hasWidget) {
        const newWidget = {
          type: 'lightWidget',
          title: `${light.name} Control`,
          meshName: light.meshName
        };
        missingWidgets.push(newWidget);
        console.log(`🔧 Creating missing widget for light: "${light.name}" with mesh: "${light.meshName}"`);
      }
    });
    
    if (missingWidgets.length > 0) {
      update({ 
        widgets: [...state.widgets, ...missingWidgets]
      });
      console.log(`✅ Created ${missingWidgets.length} missing widgets`);
    } else {
      console.log('✅ All lights have widgets');
    }
  };

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

  // Widget management with validation
  const addWidget = () => {
    if(!state.widgetDraft.type) return;
    
    // Validate light widget requirements
    if (state.widgetDraft.type === 'lightWidget' && !state.widgetDraft.meshName) {
      alert('Light widgets require a mesh name');
      return;
    }
    
    // Check for duplicate widgets
    const existingWidget = state.widgets.find(w => 
      w.type === state.widgetDraft.type && 
      (state.widgetDraft.type !== 'lightWidget' || w.meshName === state.widgetDraft.meshName)
    );
    
    if (existingWidget) {
      console.log(`⚠️ Widget of type "${state.widgetDraft.type}" already exists`);
      alert(`A ${state.widgetDraft.type} widget already exists!`);
      return;
    }
    
    // For light widgets, validate mesh and check for corresponding light
    if (state.widgetDraft.type === 'lightWidget' && state.widgetDraft.meshName) {
      console.log(`🔍 Validating light widget mesh: "${state.widgetDraft.meshName}"`);
      
      const meshName = state.widgetDraft.meshName;
      const existingLight = state.lights.find(l => l.meshName === meshName);
      
      if (!existingLight) {
        console.log(`⚠️ No light configuration found for mesh: "${meshName}"`);
        alert(`Please create a light configuration for mesh "${meshName}" first!`);
        return;
      } else {
        console.log(`✅ Found matching light configuration for mesh: "${meshName}"`);
      }
    }
    
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
      widgetDraft: { type:'globalTextureWidget', title:'', meshName:'' } 
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

    const cfg = { placementMode: state.placementMode };
    
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
    
  // Add model transform from admin inputs
  const modelPos = parseVec(state.modelPosition);
  const modelRot = parseVec(state.modelRotation).map(deg => deg * Math.PI / 180);
  const modelScale = parseFloat(state.modelScale);
  if (modelPos.length === 3) cfg.modelPosition = modelPos;
  if (modelRot.length === 3) cfg.modelRotation = modelRot;
  if (!Number.isNaN(modelScale) && modelScale > 0) cfg.modelScale = modelScale;
    
    // Handle hidden parts
    const hidden = state.hidden.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    if(hidden.length) cfg.hiddenInitially = hidden;
    
    // Pre-process widgets to auto-generate lights for light widgets
    const widgets = [...(state.widgets || [])];
    const autoGeneratedLights = [];
    
    widgets.forEach(widget => {
      if (widget.type === 'lightWidget' && widget.meshName) {
        const existingLight = state.lights.find(l => l.name === widget.meshName);
        if (!existingLight) {
          console.log(`🔧 Auto-creating light config for widget: ${widget.meshName}`);
          autoGeneratedLights.push({
            name: widget.meshName,
            meshName: widget.meshName,
            defaultState: 'on',
            intensity: 5
          });
        }
      }
    });
    
    // Handle lights (including auto-generated ones) - always set lights array
    const allLights = [...state.lights, ...autoGeneratedLights];
    cfg.lights = allLights.map(l=>({ 
      name: l.name,
      meshName: l.meshName, 
      defaultState: l.defaultState, 
      intensity: parseFloat(l.intensity) || 1 
    }));
    
    // Handle interaction groups
    if(state.groups.length) {
      cfg.interactionGroups = state.groups.map(g=>({ 
        type: g.type, 
        label: g.label, 
        parts: g.parts 
      }));
    }
    
    // Build UI widgets
    console.log('BUILDING WIDGETS:', state.widgets);
    console.log('TEXTURE WIDGET STATE:', state.textureWidget);
    
    // Auto-generate lights for light widgets that don't have corresponding light configs (already handled above)
    
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
    
    // Always set uiWidgets, even if empty array (to clear existing widgets)
    cfg.uiWidgets = widgets;
    
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
                  <>
                  <div className="info-banner" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 12px', border:'1px dashed #cbd5e1', borderRadius:8, marginBottom:12}}>
                    <div>
                      <strong>Guided setup available:</strong> build metadata with counts, visibility rules, and widgets using the wizard.
                    </div>
                    <button type="button" className="btn-secondary" onClick={()=>navigate('/admin/models/wizard')}>Open Model Wizard →</button>
                  </div>
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
                  </>
                )}
              </div>

              {/* Camera settings removed: unified camera, per-model placement handled below */}

              {/* Model Position Settings Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>🎯 Model Position Configuration</h4>
                  <p>Set the default position, rotation, and scale for your model</p>
                </div>
                
                <div className="model-position-grid">
                  <div className="form-group">
                    <label htmlFor="model-position">Model Position</label>
                    <input 
                      id="model-position"
                      type="text"
                      value={state.modelPosition || '0,0,0'} 
                      onChange={e=>update({ modelPosition: e.target.value })}
                      placeholder="0,0,0"
                      className="form-input"
                    />
                    <small className="help-text">X,Y,Z coordinates for model placement</small>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="model-rotation">Model Rotation</label>
                    <input 
                      id="model-rotation"
                      type="text"
                      value={state.modelRotation || '0,0,0'} 
                      onChange={e=>update({ modelRotation: e.target.value })}
                      placeholder="0,0,0"
                      className="form-input"
                    />
                    <small className="help-text">X,Y,Z rotation in degrees</small>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="model-scale">Model Scale</label>
                    <input 
                      id="model-scale"
                      type="number"
                      value={state.modelScale || 2} 
                      onChange={e=>update({ modelScale: e.target.value })}
                      placeholder="2"
                      min="0.1"
                      max="10"
                      step="0.1"
                      className="form-input"
                    />
                    <small className="help-text">Scale multiplier (1.0 = original size)</small>
                  </div>
                </div>
                
                <div className="model-position-presets">
                  <h5>Quick Position Presets</h5>
                  <div className="preset-buttons-grid">
                    <button 
                      type="button" 
                      className="preset-btn"
                      onClick={() => update({ 
                        modelPosition: '0,0,0', 
                        modelRotation: '0,0,0', 
                        modelScale: '2' 
                      })}
                    >
                      Center Default
                    </button>
                    <button 
                      type="button" 
                      className="preset-btn"
                      onClick={() => update({ 
                        modelPosition: '0,-1,0', 
                        modelRotation: '0,0,0', 
                        modelScale: '1.5' 
                      })}
                    >
                      Ground Level
                    </button>
                    <button 
                      type="button" 
                      className="preset-btn"
                      onClick={() => update({ 
                        modelPosition: '0,0,0', 
                        modelRotation: '0,45,0', 
                        modelScale: '2' 
                      })}
                    >
                      Angled View
                    </button>
                    <button 
                      type="button" 
                      className="preset-btn"
                      onClick={() => update({ 
                        modelPosition: '0,0,0', 
                        modelRotation: '0,0,0', 
                        modelScale: '3' 
                      })}
                    >
                      Large Scale
                    </button>
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

              {/* Lights Configuration Section */}
              <div className="form-section">
                <div className="section-header">
                  <h4>💡 Lights Configuration</h4>
                  <p>Configure lights that can be controlled by light widgets</p>
                </div>

                <div className="subsection">
                  <h5>Add Light</h5>
                  
                  <div className="light-draft">
                    <div className="draft-row">
                      <input 
                        placeholder="Light Name (e.g., Main Light)" 
                        value={state.lightDraft.name} 
                        onChange={e=>update({ lightDraft:{ ...state.lightDraft, name:e.target.value } })}
                        className="form-input"
                      />
                      
                      <input 
                        placeholder="Mesh Name (e.g., Point)" 
                        value={state.lightDraft.meshName} 
                        onChange={e=>update({ lightDraft:{ ...state.lightDraft, meshName:e.target.value } })}
                        className="form-input"
                      />
                      
                      <select 
                        value={state.lightDraft.defaultState} 
                        onChange={e=>update({ lightDraft:{ ...state.lightDraft, defaultState:e.target.value } })}
                        className="form-select"
                      >
                        <option value="on">Default ON</option>
                        <option value="off">Default OFF</option>
                      </select>
                      
                      <input 
                        placeholder="Intensity (1-10)" 
                        value={state.lightDraft.intensity} 
                        onChange={e=>update({ lightDraft:{ ...state.lightDraft, intensity:e.target.value } })}
                        className="form-input"
                        type="number"
                        min="1"
                        max="10"
                      />
                      
                      <button type="button" onClick={addLight} className="btn-add">Add Light</button>
                      <button type="button" onClick={cleanupDuplicates} className="btn-secondary" style={{marginLeft: '10px'}}>🧹 Clean Duplicates</button>
                      <button type="button" onClick={createMissingWidgets} className="btn-secondary" style={{marginLeft: '10px'}}>🔧 Fix Missing Widgets</button>
                    </div>
                  </div>

                  {state.lights.length > 0 && (
                    <div className="lights-list">
                      <h6>Configured Lights & Widgets:</h6>
                      <ul className="pill-list">
                        {state.lights.map((light, i) => {
                          const correspondingWidget = state.widgets.find(w => 
                            w.type === 'lightWidget' && w.meshName === light.meshName
                          );
                          return (
                            <li key={i} className="pill light-pill">
                              <div className="light-details">
                                <span className="light-name">💡 {light.name}</span>
                                <span className="light-mesh">Mesh: {light.meshName}</span>
                                <span className="light-state">Default: {light.defaultState}</span>
                                <span className="light-intensity">Intensity: {light.intensity}</span>
                                {correspondingWidget ? (
                                  <span className="widget-status enabled">✅ Widget: "{correspondingWidget.title}"</span>
                                ) : (
                                  <span className="widget-status missing">⚠️ No widget created</span>
                                )}
                              </div>
                              <button type="button" onClick={() => removeLight(i)} className="btn-remove">×</button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Widgets Section - NO LIGHT WIDGETS */}
              <div className="form-section">
                <div className="section-header">
                  <h4>🔧 Additional Widgets</h4>
                  <p>Add other interface widgets (lights are configured above in the Lights section)</p>
                </div>

                <div className="subsection">
                  <h5>Add Non-Light Widget</h5>
                  
                  <div className="widget-draft">
                    <div className="draft-row">
                      <select 
                        value={state.widgetDraft.type} 
                        onChange={e=>update({ widgetDraft:{ ...state.widgetDraft, type:e.target.value } })}
                        className="form-select"
                      >
                        <option value="globalTextureWidget">Global Texture Widget</option>
                        <option value="reflectionWidget">Reflection Toggle</option>
                        <option value="movementWidget">Movement Controls</option>
                      </select>
                      
                      <input 
                        placeholder="Widget Title (e.g., Texture Controls)" 
                        value={state.widgetDraft.title} 
                        onChange={e=>update({ widgetDraft:{ ...state.widgetDraft, title:e.target.value } })}
                        className="form-input"
                      />
                      
                      <button type="button" onClick={addWidget} className="btn-add">Add Widget</button>
                    </div>
                  </div>

                  {state.widgets.filter(w => w.type !== 'lightWidget').length > 0 && (
                    <div className="widgets-list">
                      <h6>Configured Additional Widgets:</h6>
                      <ul className="pill-list">
                        {state.widgets.filter(w => w.type !== 'lightWidget').map((w, i) => {
                          const originalIndex = state.widgets.findIndex(widget => widget === w);
                          return (
                            <li key={originalIndex} className="pill">
                              <span className="widget-type">{w.type}</span>
                              <span className="widget-title">{w.title || 'Untitled'}</span>
                              <button type="button" onClick={() => removeWidget(originalIndex)} className="btn-remove">×</button>
                            </li>
                          );
                        })}
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
