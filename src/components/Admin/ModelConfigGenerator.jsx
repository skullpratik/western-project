// Single-Page Multi-Asset Model Config (Admin)
// - Fully dynamic: no hardcoded model data
// - Enter assets, drawers, doors (solid/glass), panels, mappings, door rotations
// - Define visibility per door-count and position
// - Add widgets and lights manually
// - Import existing JSON and preview/export final JSON

import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from '../Experience/Experience.jsx';
import { useLocation } from 'react-router-dom';

const emptyAssets = { base: '', doors: '', glassDoors: '', drawers: '' };

export default function ModelConfigGenerator({ onSave, onConfigGenerated }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  const isEditMode = !!editId;
  // Core
  const [name, setName] = useState('');
  const [assets, setAssets] = useState(emptyAssets);
  const [camera, setCamera] = useState({ position: [0, 2, 5], target: [0, 1, 0], fov: 50 });
  const [hiddenInitially, setHiddenInitially] = useState([]);
  const [uploading, setUploading] = useState({}); // { base: boolean, doors: boolean, glassDoors: boolean, drawers: boolean }
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'info'|'success'|'error', msg: string }
  const [loadingModel, setLoadingModel] = useState(false);

  // Drawers
  const [drawerTargetGroups, setDrawerTargetGroups] = useState([]);
  const [drawerClosedZ, setDrawerClosedZ] = useState(0);
  const [drawerOpenZ, setDrawerOpenZ] = useState(0);

  // Doors & panels
  const [solidDoors, setSolidDoors] = useState([]);
  const [glassDoors, setGlassDoors] = useState([]);
  const [panels, setPanels] = useState([]);
  const [glassPanels, setGlassPanels] = useState([]);
  const [solidDoorMeshPrefixes, setSolidDoorMeshPrefixes] = useState([]);

  // Door rotation config and type mapping
  const [doorConfig, setDoorConfig] = useState({}); // { [doorName]: { axis, angle } }
  const [toGlass, setToGlass] = useState({}); // { solidDoorName: glassDoorName }
  const [toSolid, setToSolid] = useState({}); // { glassDoorName: solidDoorName }

  // Visibility rules by door count and position
  // { [doorCount: string]: { [position: string]: { doors: [], panels: [], hide: [] } } }
  const [positionConfigs, setPositionConfigs] = useState({});

  // UI Widgets and Lights
  const [uiWidgets, setUiWidgets] = useState([]); // each: { type, title, meshName? }
  const [lights, setLights] = useState([]); // each: { name, meshName, defaultState:on|off, intensity:number }

  // Load configuration from uploaded file (no longer hardcoded)
  const loadConfigFromFile = () => {
    setFeedback({ type: 'info', msg: 'Please upload a JSON configuration file using the "Upload JSON File" option in the Import section.' });
  };

  const ensureDoorConfig = (door) => {
    setDoorConfig((cfg) => ({
      ...cfg,
      [door]: cfg[door] || { axis: 'y', angle: 90 },
    }));
  };

  const addDoor = (door, kind) => {
    if (!door) return;
    if (kind === 'solid') setSolidDoors((arr) => (arr.includes(door) ? arr : [...arr, door]));
    if (kind === 'glass') setGlassDoors((arr) => (arr.includes(door) ? arr : [...arr, door]));
    ensureDoorConfig(door);
  };

  const removeDoor = (door, kind) => {
    if (kind === 'solid') setSolidDoors((arr) => arr.filter((d) => d !== door));
    if (kind === 'glass') setGlassDoors((arr) => arr.filter((d) => d !== door));
    setDoorConfig((cfg) => {
      const copy = { ...cfg };
      delete copy[door];
      return copy;
    });
  };

  const updateDoorConfig = (door, prop, value) => {
    setDoorConfig((cfg) => ({ ...cfg, [door]: { ...(cfg[door] || { axis: 'y', angle: 90 }), [prop]: value } }));
  };

  const addDoorCount = (count) => {
    const key = String(count);
    if (!key) return;
    setPositionConfigs((pc) => ({ ...pc, [key]: pc[key] || {} }));
  };

  const removeDoorCount = (count) => {
    const key = String(count);
    setPositionConfigs((pc) => {
      const copy = { ...pc };
      delete copy[key];
      return copy;
    });
  };

  const addPosition = (count, pos) => {
    const ck = String(count);
    const pk = String(pos);
    setPositionConfigs((pc) => ({
      ...pc,
      [ck]: { ...(pc[ck] || {}), [pk]: pc[ck]?.[pk] || { doors: [], panels: [], hide: [] } },
    }));
  };

  const updatePositionField = (count, pos, field, listValue) => {
    const ck = String(count);
    const pk = String(pos);
    setPositionConfigs((pc) => ({
      ...pc,
      [ck]: {
        ...(pc[ck] || {}),
        [pk]: { ...(pc[ck]?.[pk] || { doors: [], panels: [], hide: [] }), [field]: listValue },
      },
    }));
  };

  const removePosition = (count, pos) => {
    const ck = String(count);
    const pk = String(pos);
    setPositionConfigs((pc) => {
      const bucket = { ...(pc[ck] || {}) };
      delete bucket[pk];
      return { ...pc, [ck]: bucket };
    });
  };

  const addWidget = () => setUiWidgets((arr) => [...arr, { type: 'lightWidget', title: 'Light Control', meshName: '' }]);
  const removeWidget = (i) => setUiWidgets((arr) => arr.filter((_, idx) => idx !== i));

  const addLight = () => setLights((arr) => [...arr, { name: '', meshName: '', defaultState: 'on', intensity: 1 }]);
  const removeLight = (i) => setLights((arr) => arr.filter((_, idx) => idx !== i));

  // Upload helpers
  const uploadFile = async (key, file) => {
    try {
      setUploading((u) => ({ ...u, [key]: true }));
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed with status ${res.status}`);
      }
      const data = await res.json();
      // Prefer relative path to avoid hardcoding host
      const path = data?.filename ? `/models/${data.filename}` : (data?.path || '');
      if (!path) throw new Error('No path returned by server');
      setAssets((a) => ({ ...a, [key]: path }));
    } catch (e) {
      console.error('Upload failed:', e);
      alert(`Upload failed: ${e.message}`);
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const pickAndUpload = (key) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,model/*';
    input.onchange = (ev) => {
      const file = ev.target?.files?.[0];
      if (file) uploadFile(key, file);
    };
    input.click();
  };

  // Build final config
  const finalConfig = useMemo(() => {
    const interactionGroups = [];

    if (solidDoors.length || glassDoors.length) {
      const parts = [...solidDoors, ...glassDoors].map((d) => ({
        name: d,
        rotationAxis: doorConfig[d]?.axis || 'y',
        openAngle: doorConfig[d]?.angle ?? 90,
      }));
      interactionGroups.push({ type: 'doors', label: 'Doors', parts });
    }

    if (drawerTargetGroups.length) {
      const parts = drawerTargetGroups.map((n) => ({ name: n, positionAxis: 'z', openPosition: drawerOpenZ }));
      interactionGroups.push({ type: 'drawers', label: 'Drawers', parts });
    }

    const presets = { doorSelections: {} };
    Object.entries(positionConfigs).forEach(([doorCount, positions]) => {
      presets.doorSelections[doorCount] = {};
      Object.entries(positions || {}).forEach(([pos, cfg]) => {
        presets.doorSelections[doorCount][pos] = {
          doors: cfg.doors || [],
          panels: cfg.panels || [],
          hide: cfg.hide || [],
        };
      });
    });

    return {
      name,
      assets,
      camera,
      placementMode: 'autofit',
      hiddenInitially,
      interactionGroups,
      presets,
      doorTypeMap: { toGlass, toSolid },
      uiWidgets,
      lights,
      metadata: {
        solidDoorMeshPrefixes,
        panels,
        glassPanels,
        drawers: { targetGroups: drawerTargetGroups, closedZ: drawerClosedZ, openZ: drawerOpenZ },
      },
    };
  }, [name, assets, camera, hiddenInitially, solidDoors, glassDoors, doorConfig, drawerTargetGroups, drawerOpenZ, drawerClosedZ, positionConfigs, toGlass, toSolid, solidDoorMeshPrefixes, panels, glassPanels, uiWidgets, lights]);

  // Import/export
  const [importText, setImportText] = useState('');
  const importJson = () => {
    try {
      const data = JSON.parse(importText);
      setName(data.name || '');
      setAssets(data.assets || emptyAssets);
      setCamera(data.camera || { position: [0, 2, 5], target: [0, 1, 0], fov: 50 });
      setHiddenInitially(data.hiddenInitially || data.metadata?.hiddenInitially || []);

      // derive doors & doorConfig from interactionGroups if present
      const ig = data.interactionGroups || [];
      const doorGroup = ig.find((g) => g.type === 'doors');
      if (doorGroup?.parts?.length) {
        const doors = doorGroup.parts.map((p) => p.name);
        const solids = doors.filter((d) => !(data.doorTypeMap?.toSolid && data.doorTypeMap.toSolid[d]));
        // best-effort: if in toSolid keys, treat as glass; else solid
        const glasses = doors.filter((d) => data.doorTypeMap?.toSolid && data.doorTypeMap.toSolid[d]);
        setSolidDoors(solids);
        setGlassDoors(glasses);
        const cfg = {};
        doorGroup.parts.forEach((p) => {
          cfg[p.name] = { axis: p.rotationAxis || 'y', angle: p.openAngle ?? 90 };
        });
        setDoorConfig(cfg);
      } else {
        setSolidDoors([]);
        setGlassDoors([]);
        setDoorConfig({});
      }

      const drawerGroup = ig.find((g) => g.type === 'drawers');
      if (drawerGroup?.parts?.length) {
        setDrawerTargetGroups(drawerGroup.parts.map((p) => p.name));
        const first = drawerGroup.parts[0];
        setDrawerOpenZ(first?.openPosition ?? 0);
      } else {
        setDrawerTargetGroups([]);
        setDrawerOpenZ(0);
      }

      setDrawerClosedZ(data.metadata?.drawers?.closedZ ?? 0);

      setPanels(data.metadata?.panels || []);
      setGlassPanels(data.metadata?.glassPanels || []);
      setSolidDoorMeshPrefixes(data.metadata?.solidDoorMeshPrefixes || []);

      setToGlass(data.doorTypeMap?.toGlass || {});
      setToSolid(data.doorTypeMap?.toSolid || {});

      const pc = {};
      const ds = data.presets?.doorSelections || {};
      Object.entries(ds).forEach(([dc, positions]) => {
        pc[dc] = {};
        Object.entries(positions || {}).forEach(([pos, cfg]) => {
          pc[dc][pos] = { doors: cfg.doors || [], panels: cfg.panels || [], hide: cfg.hide || [] };
        });
      });
      setPositionConfigs(pc);

      setUiWidgets(data.uiWidgets || []);
      setLights(data.lights || []);
      alert('Imported configuration');
    } catch (e) {
      console.error(e);
      alert('Invalid JSON');
    }
  };

  const handleJsonUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Please select a valid JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Apply the same logic as importJson
        setName(data.name || '');
        setAssets(data.assets || emptyAssets);
        setCamera(data.camera || { position: [0, 2, 5], target: [0, 1, 0], fov: 50 });
        setHiddenInitially(data.hiddenInitially || data.metadata?.hiddenInitially || []);

        // derive doors & doorConfig from interactionGroups if present
        const ig = data.interactionGroups || [];
        const doorGroup = ig.find((g) => g.type === 'doors');
        if (doorGroup?.parts?.length) {
          const doors = doorGroup.parts.map((p) => p.name);
          const solids = doors.filter((d) => !(data.doorTypeMap?.toSolid && data.doorTypeMap.toSolid[d]));
          const glasses = doors.filter((d) => data.doorTypeMap?.toSolid && data.doorTypeMap.toSolid[d]);
          setSolidDoors(solids);
          setGlassDoors(glasses);
          const cfg = {};
          doorGroup.parts.forEach((p) => {
            cfg[p.name] = { axis: p.rotationAxis || 'y', angle: p.openAngle ?? 90 };
          });
          setDoorConfig(cfg);
        } else {
          setSolidDoors([]);
          setGlassDoors([]);
          setDoorConfig({});
        }

        const drawerGroup = ig.find((g) => g.type === 'drawers');
        if (drawerGroup?.parts?.length) {
          setDrawerTargetGroups(drawerGroup.parts.map((p) => p.name));
          const first = drawerGroup.parts[0];
          setDrawerOpenZ(first?.openPosition ?? 0);
        } else {
          setDrawerTargetGroups([]);
          setDrawerOpenZ(0);
        }

        setDrawerClosedZ(data.metadata?.drawers?.closedZ ?? 0);

        setPanels(data.metadata?.panels || []);
        setGlassPanels(data.metadata?.glassPanels || []);
        setSolidDoorMeshPrefixes(data.metadata?.solidDoorMeshPrefixes || []);

        setToGlass(data.doorTypeMap?.toGlass || {});
        setToSolid(data.doorTypeMap?.toSolid || {});

        const pc = {};
        const ds = data.presets?.doorSelections || {};
        Object.entries(ds).forEach(([dc, positions]) => {
          pc[dc] = {};
          Object.entries(positions || {}).forEach(([pos, cfg]) => {
            pc[dc][pos] = { doors: cfg.doors || [], panels: cfg.panels || [], hide: cfg.hide || [] };
          });
        });
        setPositionConfigs(pc);

        setUiWidgets(data.uiWidgets || []);
        setLights(data.lights || []);
        setFeedback({ type: 'success', msg: 'Configuration loaded from file!' });
      } catch (e) {
        console.error(e);
        setFeedback({ type: 'error', msg: 'Invalid JSON file' });
      }
    };
    reader.readAsText(file);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(finalConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'model-config'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    try {
      setFeedback(null);
      if (!name.trim()) {
        setFeedback({ type: 'error', msg: 'Name is required' });
        return;
      }
      // pick a primary path required by backend (file is already uploaded)
      const primaryPath = assets.base || assets.doors || assets.glassDoors || assets.drawers;
      if (!primaryPath) {
        setFeedback({ type: 'error', msg: 'Please upload at least one asset (Base recommended)' });
        return;
      }

      setSaving(true);
      const token = localStorage.getItem('token');
      const baseHeaders = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

      let targetId = editId;
      if (!isEditMode) {
        // 1) Create minimal model (backend requires name + path)
        const createRes = await fetch('http://localhost:5000/api/admin/models', {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({
            name,
            path: primaryPath,
            placementMode: finalConfig.placementMode,
            camera: finalConfig.camera,
            hiddenInitially: finalConfig.hiddenInitially,
            lights: finalConfig.lights,
            uiWidgets: finalConfig.uiWidgets,
            interactionGroups: finalConfig.interactionGroups
          })
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          throw new Error(err.message || `Create failed (${createRes.status})`);
        }
        const created = await createRes.json();
        targetId = created?.model?._id || created?.model?.id;
        if (!targetId) throw new Error('Create succeeded but no model ID returned');
      }

      // 2) Update with full config (assets, presets, etc.)
      const payloadPresets = { ...(finalConfig.presets || {}), doorTypeMap: finalConfig.doorTypeMap || {} };
      const updateRes = await fetch(`http://localhost:5000/api/admin/models/${targetId}`, {
        method: 'PUT',
        headers: baseHeaders,
        body: JSON.stringify({
          name,
          camera: finalConfig.camera,
          lights: finalConfig.lights,
          hiddenInitially: finalConfig.hiddenInitially,
          uiWidgets: finalConfig.uiWidgets,
          interactionGroups: finalConfig.interactionGroups,
          assets: finalConfig.assets,
          presets: payloadPresets,
          placementMode: finalConfig.placementMode,
          modelPosition: finalConfig.modelPosition,
          modelRotation: finalConfig.modelRotation,
          modelScale: finalConfig.modelScale
        })
      });
      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err.message || `Update failed (${updateRes.status})`);
      }

      setFeedback({ type: 'success', msg: 'Configuration saved successfully' });
      if (onConfigGenerated) onConfigGenerated(finalConfig);
      if (onSave) onSave(finalConfig);
    } catch (e) {
      console.error('Save configuration failed:', e);
      setFeedback({ type: 'error', msg: e.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  // Load existing model if editing
  useEffect(() => {
    const loadForEdit = async () => {
      if (!isEditMode) return;
      try {
        setLoadingModel(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/admin/models`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        });
        if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`);
        const models = await res.json();
        const model = models.find(m => m._id === editId);
        if (!model) throw new Error('Model not found');

        // Populate fields
        setName(model.name || '');
        setAssets(model.assets || emptyAssets);
        const cam = model.camera || model.metadata?.camera;
        if (cam) setCamera(cam);
        setHiddenInitially(model.hiddenInitially || model.metadata?.hiddenInitially || []);

        const ig = model.interactionGroups || [];
        // Doors
        const doorGroup = ig.find(g => g.type === 'doors');
        if (doorGroup?.parts?.length) {
          const doors = doorGroup.parts.map(p => p.name);
          setSolidDoors(doors); // we can't infer glass vs solid reliably; keep as solids for edit
          const cfg = {};
          doorGroup.parts.forEach(p => { cfg[p.name] = { axis: p.rotationAxis || 'y', angle: p.openAngle ?? 90 }; });
          setDoorConfig(cfg);
        }
        // Drawers
        const drawersGroup = ig.find(g => g.type === 'drawers');
        if (drawersGroup?.parts?.length) {
          setDrawerTargetGroups(drawersGroup.parts.map(p => p.name));
          const first = drawersGroup.parts[0];
          setDrawerOpenZ(first?.openPosition ?? 0);
        }
        setDrawerClosedZ(model.metadata?.drawers?.closedZ ?? 0);

        // Panels & glass panels
        setPanels(model.metadata?.panels || []);
        setGlassPanels(model.metadata?.glassPanels || []);
        setSolidDoorMeshPrefixes(model.metadata?.solidDoorMeshPrefixes || []);

        // Presets with doorTypeMap if present
        const pc = {};
        const ds = model.presets?.doorSelections || {};
        Object.entries(ds).forEach(([dc, positions]) => {
          pc[dc] = {};
          Object.entries(positions || {}).forEach(([pos, cfg]) => {
            pc[dc][pos] = { doors: cfg.doors || [], panels: cfg.panels || [], hide: cfg.hide || [] };
          });
        });
        setPositionConfigs(pc);
        setToGlass(model.presets?.doorTypeMap?.toGlass || model.doorTypeMap?.toGlass || {});
        setToSolid(model.presets?.doorTypeMap?.toSolid || model.doorTypeMap?.toSolid || {});

        // Widgets & lights
        setUiWidgets(model.uiWidgets || model.metadata?.uiWidgets || []);
        setLights(model.lights || model.metadata?.lights || []);
      } catch (e) {
        console.error('Edit load failed:', e);
        setFeedback({ type: 'error', msg: e.message });
      } finally {
        setLoadingModel(false);
      }
    };
    loadForEdit();
  }, [isEditMode, editId]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section className="card">
          <h3>Basic & Assets</h3>
          <div style={{ marginBottom: 12 }}>
            <button 
              onClick={loadConfigFromFile} 
              className="btn-secondary"
              style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            >
              � Load Config from File
            </button>
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
              Upload a JSON configuration file to auto-fill the form
            </span>
          </div>
          <div className="grid">
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Model name" /></label>
            <label>Base
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={assets.base} onChange={(e) => setAssets({ ...assets, base: e.target.value })} placeholder="/models/base.glb" />
                <button type="button" onClick={() => pickAndUpload('base')} disabled={!!uploading.base}>{uploading.base ? 'Uploading…' : 'Upload'}</button>
              </div>
            </label>
            <label>Doors
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={assets.doors} onChange={(e) => setAssets({ ...assets, doors: e.target.value })} placeholder="/models/doors.glb" />
                <button type="button" onClick={() => pickAndUpload('doors')} disabled={!!uploading.doors}>{uploading.doors ? 'Uploading…' : 'Upload'}</button>
              </div>
            </label>
            <label>Glass Doors
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={assets.glassDoors} onChange={(e) => setAssets({ ...assets, glassDoors: e.target.value })} placeholder="/models/glass-doors.glb" />
                <button type="button" onClick={() => pickAndUpload('glassDoors')} disabled={!!uploading.glassDoors}>{uploading.glassDoors ? 'Uploading…' : 'Upload'}</button>
              </div>
            </label>
            <label>Drawers
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={assets.drawers} onChange={(e) => setAssets({ ...assets, drawers: e.target.value })} placeholder="/models/drawers.glb" />
                <button type="button" onClick={() => pickAndUpload('drawers')} disabled={!!uploading.drawers}>{uploading.drawers ? 'Uploading…' : 'Upload'}</button>
              </div>
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Hidden Initially</h3>
          <textarea rows={3} placeholder="One per line" value={hiddenInitially.join('\n')} onChange={(e) => setHiddenInitially(parseList(e.target.value))} />
        </section>

        <section className="card">
          <h3>Drawers</h3>
          <div className="grid">
            <label>Target Groups<textarea rows={3} placeholder="One per line" value={drawerTargetGroups.join('\n')} onChange={(e) => setDrawerTargetGroups(parseList(e.target.value))} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <label>Closed Z<input type="number" step="0.001" value={drawerClosedZ} onChange={(e) => setDrawerClosedZ(Number(e.target.value))} /></label>
              <label>Open Z<input type="number" step="0.001" value={drawerOpenZ} onChange={(e) => setDrawerOpenZ(Number(e.target.value))} /></label>
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Doors & Panels</h3>
          <div className="grid">
            <label>Solid Doors<textarea rows={2} placeholder="One per line" value={solidDoors.join('\n')} onChange={(e) => setSolidDoors(parseList(e.target.value))} /></label>
            <label>Glass Doors<textarea rows={2} placeholder="One per line" value={glassDoors.join('\n')} onChange={(e) => setGlassDoors(parseList(e.target.value))} /></label>
            <label>Panels<textarea rows={2} placeholder="One per line" value={panels.join('\n')} onChange={(e) => setPanels(parseList(e.target.value))} /></label>
            <label>Glass Panels<textarea rows={2} placeholder="One per line" value={glassPanels.join('\n')} onChange={(e) => setGlassPanels(parseList(e.target.value))} /></label>
            <label>Solid Door Mesh Prefixes<textarea rows={2} placeholder="One per line" value={solidDoorMeshPrefixes.join('\n')} onChange={(e) => setSolidDoorMeshPrefixes(parseList(e.target.value))} /></label>
          </div>
        </section>

        <section className="card">
          <h3>Door Rotations</h3>
          {[...solidDoors, ...glassDoors].map((d) => (
            <div key={d} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <code style={{ minWidth: 140 }}>{d}</code>
              <select value={doorConfig[d]?.axis || 'y'} onChange={(e) => updateDoorConfig(d, 'axis', e.target.value)}>
                <option value="x">x</option>
                <option value="y">y</option>
                <option value="z">z</option>
              </select>
              <input type="number" value={doorConfig[d]?.angle ?? 90} onChange={(e) => updateDoorConfig(d, 'angle', Number(e.target.value))} />
            </div>
          ))}
        </section>

        <section className="card">
          <h3>Solid ↔ Glass Mapping</h3>
          <div className="grid">
            <label>toGlass (JSON)
              <textarea rows={3} placeholder='{"Door_01":"GlassDoor-01"}' value={JSON.stringify(toGlass, null, 2)} onChange={(e) => { try { setToGlass(JSON.parse(e.target.value)); } catch {} }} />
            </label>
            <label>toSolid (JSON)
              <textarea rows={3} placeholder='{"GlassDoor-01":"Door_01"}' value={JSON.stringify(toSolid, null, 2)} onChange={(e) => { try { setToSolid(JSON.parse(e.target.value)); } catch {} }} />
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Visibility Rules (by Door Count → Position)</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="number" placeholder="Add door count" id="add-dc" />
            <button onClick={() => { const v = document.getElementById('add-dc'); addDoorCount(v.value); v.value=''; }}>+ Add Count</button>
          </div>
          {Object.entries(positionConfigs).map(([dc, positions]) => (
            <div key={dc} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Door Count: {dc}</h4>
                <div>
                  <input type="number" placeholder="Add position" id={`add-pos-${dc}`} style={{ marginRight: 6 }} />
                  <button onClick={() => { const el = document.getElementById(`add-pos-${dc}`); addPosition(dc, el.value); el.value=''; }}>+ Add Position</button>
                  <button style={{ marginLeft: 6 }} onClick={() => removeDoorCount(dc)}>Remove Count</button>
                </div>
              </div>
              {Object.entries(positions || {}).map(([pos, cfg]) => (
                <div key={pos} style={{ padding: 8, border: '1px dashed #cbd5e1', borderRadius: 6, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h5 style={{ margin: 0 }}>Position {pos}</h5>
                    <button onClick={() => removePosition(dc, pos)}>Remove Position</button>
                  </div>
                  <label>Doors (show)<input value={(cfg.doors || []).join(', ')} onChange={(e) => updatePositionField(dc, pos, 'doors', parseList(e.target.value))} /></label>
                  <label>Panels (show)<input value={(cfg.panels || []).join(', ')} onChange={(e) => updatePositionField(dc, pos, 'panels', parseList(e.target.value))} /></label>
                  <label>Hide (drawers/parts)<textarea rows={2} value={(cfg.hide || []).join('\n')} onChange={(e) => updatePositionField(dc, pos, 'hide', parseList(e.target.value))} /></label>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className="card">
          <h3>Widgets</h3>
          <button onClick={addWidget}>+ Add Widget</button>
          <ul style={{ marginTop: 8 }}>
            {uiWidgets.map((w, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <select value={w.type} onChange={(e) => setUiWidgets((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], type: e.target.value }; return copy; })}>
                  <option value="doorPresets">Door Presets</option>
                  <option value="resetWidget">Reset Widget</option>
                  <option value="lightWidget">Light Widget</option>
                  <option value="globalTextureWidget">Global Texture Widget</option>
                  <option value="textureWidget">Texture Widget</option>
                </select>
                <input placeholder="Title" value={w.title || ''} onChange={(e) => setUiWidgets((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], title: e.target.value }; return copy; })} />
                {w.type === 'lightWidget' && (
                  <input placeholder="Mesh name" value={w.meshName || ''} onChange={(e) => setUiWidgets((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], meshName: e.target.value }; return copy; })} />
                )}
                <button onClick={() => removeWidget(i)}>×</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h3>Lights</h3>
          <button onClick={addLight}>+ Add Light</button>
          <ul style={{ marginTop: 8 }}>
            {lights.map((l, i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 90px auto', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input placeholder="Light name" value={l.name} onChange={(e) => setLights((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], name: e.target.value }; return copy; })} />
                <input placeholder="Mesh name" value={l.meshName} onChange={(e) => setLights((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], meshName: e.target.value }; return copy; })} />
                <select value={l.defaultState} onChange={(e) => setLights((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], defaultState: e.target.value }; return copy; })}>
                  <option value="on">on</option>
                  <option value="off">off</option>
                </select>
                <input type="number" step="0.1" placeholder="Intensity" value={l.intensity} onChange={(e) => setLights((arr) => { const copy = [...arr]; copy[i] = { ...copy[i], intensity: Number(e.target.value) }; return copy; })} />
                <button onClick={() => removeLight(i)}>×</button>
              </li>
            ))}
          </ul>
        </section>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Configuration'}</button>
          <button onClick={exportJson} disabled={saving}>Export JSON</button>
          {feedback && (
            <span style={{ fontSize: 13, color: feedback.type === 'error' ? '#b91c1c' : feedback.type === 'success' ? '#065f46' : '#475569' }}>
              {feedback.msg}
            </span>
          )}
        </div>

        <section className="card">
          <h3>Import JSON</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Upload JSON File:
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonUpload}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Or paste JSON below:</strong>
          </div>
          <textarea rows={6} placeholder="Paste JSON here" value={importText} onChange={(e) => setImportText(e.target.value)} />
          <div style={{ marginTop: 6 }}>
            <button onClick={importJson}>Import from Text</button>
          </div>
        </section>
      </div>

      <aside style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
        <h3>Live Preview</h3>
        <div style={{ height: 320, marginBottom: 12 }}>
          <Canvas shadows camera={{ position: [2,2,2], fov: 35 }}>
            <Experience
              modelName={name || 'Preview'}
              modelConfig={{
                assets: {
                  base: assets.base ? (assets.base.startsWith('http') ? assets.base : `http://localhost:5000${assets.base.startsWith('/models') ? assets.base : `/models/${assets.base}`}`) : undefined,
                  doors: assets.doors ? (assets.doors.startsWith('http') ? assets.doors : `http://localhost:5000${assets.doors.startsWith('/models') ? assets.doors : `/models/${assets.doors}`}`) : undefined,
                  glassDoors: assets.glassDoors ? (assets.glassDoors.startsWith('http') ? assets.glassDoors : `http://localhost:5000${assets.glassDoors.startsWith('/models') ? assets.glassDoors : `/models/${assets.glassDoors}`}`) : undefined,
                  drawers: assets.drawers ? (assets.drawers.startsWith('http') ? assets.drawers : `http://localhost:5000${assets.drawers.startsWith('/models') ? assets.drawers : `/models/${assets.drawers}`}`) : undefined,
                },
                camera,
                hiddenInitially,
                interactionGroups: finalConfig.interactionGroups,
                presets: finalConfig.presets,
                doorTypeMap: finalConfig.doorTypeMap,
                uiWidgets,
                lights,
                placementMode: 'autofit'
              }}
              allModels={{}}
              onTogglePart={() => {}}
              onApiReady={() => {}}
              applyRequest={{ current: null }}
              userPermissions={{ canRotate: true, canZoom: true, canPan: true }}
              user={{ role: 'admin' }}
            />
          </Canvas>
        </div>
        <h3>Preview JSON</h3>
        <pre style={{ maxHeight: '40vh', overflow: 'auto' }}>{JSON.stringify(finalConfig, null, 2)}</pre>
      </aside>

      <style jsx>{`
        .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
        label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
        input, textarea, select { padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .btn-primary { background: #2563eb; color: #fff; border: none; padding: 8px 12px; border-radius: 8px; }
      `}</style>
    </div>
  );
}
