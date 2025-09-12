import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../admin-theme.css';
import './ModelManagement.css';

const API_BASE_URL = 'http://localhost:5000';

const StepHeader = ({ step, total, title }) => (
  <div className="wizard-header">
    <div className="wizard-steps">Step {step} / {total}</div>
    <h2 className="wizard-title">{title}</h2>
  </div>
);

const initialState = {
  name: '',
  assets: { base: '', doors: '', glassDoors: '', drawers: '' },
  placementMode: 'autofit',
  // counts
  doorCountOptions: [1, 2, 3],
  drawerCountOptions: [0, 1, 2, 3],
  // visibility rules
  hiddenInitially: [],
  rules: {
    // per door count -> solid/glass -> visibility arrays
    // e.g., "1": { solid: { show: [], hide: [] }, glass: { show: [], hide: [] } }
  },
  // widgets the admin can add manually here too
  uiWidgets: [],
  lights: [],
  camera: { position: [0,2,5], target: [0,1,0], fov: 50 },
};

const ModelWizard = () => {
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(1);
  const total = 5;
  const nav = useNavigate();

  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const next = () => setStep((s) => Math.min(total, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const addRuleBucket = (count) => {
    setState((s) => ({
      ...s,
      rules: {
        ...s.rules,
        [count]: s.rules[count] || { solid: { show: [], hide: [] }, glass: { show: [], hide: [] } },
      },
    }));
  };

  const addWidget = () => {
    setState((s) => ({ ...s, uiWidgets: [...s.uiWidgets, { type: 'lightWidget', title: 'Light Control', meshName: '' }] }));
  };

  const save = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: state.name,
        assets: state.assets,
        placementMode: state.placementMode,
        hiddenInitially: state.hiddenInitially,
        presets: {
          doorSelections: Object.fromEntries(
            Object.entries(state.rules).map(([count, cfg]) => ([
              count,
              {
                // minimal structure for later extension
                solid: cfg.solid,
                glass: cfg.glass,
              },
            ])),
          ),
        },
        uiWidgets: state.uiWidgets,
        lights: state.lights,
        camera: state.camera,
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
      alert('✅ Model saved');
      nav('/admin/models');
    } catch (e) {
      console.error(e);
      alert('❌ Failed to save model');
    }
  };

  return (
    <div className="wizard">
      {step === 1 && (
        <>
          <StepHeader step={1} total={total} title="Basic Details & Assets" />
          <div className="form-grid">
            <label>Model Name<input value={state.name} onChange={(e)=>update({name: e.target.value})} /></label>
            <label>Base Path<input value={state.assets.base} onChange={(e)=>update({assets:{...state.assets, base:e.target.value}})} /></label>
            <label>Doors Path<input value={state.assets.doors} onChange={(e)=>update({assets:{...state.assets, doors:e.target.value}})} /></label>
            <label>Glass Doors Path<input value={state.assets.glassDoors} onChange={(e)=>update({assets:{...state.assets, glassDoors:e.target.value}})} /></label>
            <label>Drawers Path<input value={state.assets.drawers} onChange={(e)=>update({assets:{...state.assets, drawers:e.target.value}})} /></label>
          </div>
          <div className="wizard-actions"><button onClick={next} className="btn-primary">Next ›</button></div>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={total} title="Counts: Doors & Drawers" />
          <div className="form-grid">
            <label>Door count options (comma separated)
              <input value={state.doorCountOptions.join(',')} onChange={(e)=>update({doorCountOptions:e.target.value.split(',').map(v=>parseInt(v.trim())).filter(n=>!Number.isNaN(n))})} />
            </label>
            <label>Drawer count options (comma separated)
              <input value={state.drawerCountOptions.join(',')} onChange={(e)=>update({drawerCountOptions:e.target.value.split(',').map(v=>parseInt(v.trim())).filter(n=>!Number.isNaN(n))})} />
            </label>
          </div>
          <div className="wizard-actions"><button onClick={prev} className="btn-secondary">‹ Back</button><button onClick={next} className="btn-primary">Next ›</button></div>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={total} title="Initially Hidden Parts" />
          <div>
            <textarea rows={5} placeholder="Enter part names to hide initially, one per line" value={state.hiddenInitially.join('\n')} onChange={(e)=>update({hiddenInitially: e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)})} />
          </div>
          <div className="wizard-actions"><button onClick={prev} className="btn-secondary">‹ Back</button><button onClick={()=>{ state.doorCountOptions.forEach(addRuleBucket); next(); }} className="btn-primary">Next ›</button></div>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeader step={4} total={total} title="Visibility Rules by Door Count" />
          {state.doorCountOptions.map((count)=>{
            const bucket = state.rules[count] || { solid: { show: [], hide: [] }, glass: { show: [], hide: [] } };
            return (
              <div key={count} className="rule-bucket">
                <h4>Door count: {count}</h4>
                <div className="grid-2">
                  <div>
                    <h5>Solid Doors</h5>
                    <label>Show (one per line)
                      <textarea rows={4} value={bucket.solid.show.join('\n')} onChange={(e)=>{
                        setState((s)=>({
                          ...s,
                          rules: { ...s.rules, [count]: { ...bucket, solid: { ...bucket.solid, show: e.target.value.split('\n').map(v=>v.trim()).filter(Boolean) } } }
                        }));
                      }} />
                    </label>
                    <label>Hide (one per line)
                      <textarea rows={4} value={bucket.solid.hide.join('\n')} onChange={(e)=>{
                        setState((s)=>({
                          ...s,
                          rules: { ...s.rules, [count]: { ...bucket, solid: { ...bucket.solid, hide: e.target.value.split('\n').map(v=>v.trim()).filter(Boolean) } } }
                        }));
                      }} />
                    </label>
                  </div>
                  <div>
                    <h5>Glass Doors</h5>
                    <label>Show (one per line)
                      <textarea rows={4} value={bucket.glass.show.join('\n')} onChange={(e)=>{
                        setState((s)=>({
                          ...s,
                          rules: { ...s.rules, [count]: { ...bucket, glass: { ...bucket.glass, show: e.target.value.split('\n').map(v=>v.trim()).filter(Boolean) } } }
                        }));
                      }} />
                    </label>
                    <label>Hide (one per line)
                      <textarea rows={4} value={bucket.glass.hide.join('\n')} onChange={(e)=>{
                        setState((s)=>({
                          ...s,
                          rules: { ...s.rules, [count]: { ...bucket, glass: { ...bucket.glass, hide: e.target.value.split('\n').map(v=>v.trim()).filter(Boolean) } } }
                        }));
                      }} />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="wizard-actions"><button onClick={prev} className="btn-secondary">‹ Back</button><button onClick={next} className="btn-primary">Next ›</button></div>
        </>
      )}

      {step === 5 && (
        <>
          <StepHeader step={5} total={total} title="Widgets & Save" />
          <div className="widgets-editor">
            <button className="btn-secondary" onClick={addWidget}>+ Add Light Widget</button>
            <ul className="simple-list" style={{marginTop: 12}}>
              {state.uiWidgets.map((w,i)=> (
                <li key={i}>
                  <select value={w.type} onChange={(e)=>{
                    const type = e.target.value;
                    setState((s)=>{
                      const arr = [...s.uiWidgets];
                      arr[i] = { ...arr[i], type };
                      return { ...s, uiWidgets: arr };
                    });
                  }}>
                    <option value="lightWidget">Light Widget</option>
                    <option value="globalTextureWidget">Global Texture Widget</option>
                    <option value="textureWidget">Texture Widget</option>
                  </select>
                  <input placeholder="Title" value={w.title||''} onChange={(e)=>{
                    const title = e.target.value;
                    setState((s)=>{
                      const arr = [...s.uiWidgets];
                      arr[i] = { ...arr[i], title };
                      return { ...s, uiWidgets: arr };
                    });
                  }} />
                  {w.type === 'lightWidget' && (
                    <input placeholder="Mesh name" value={w.meshName||''} onChange={(e)=>{
                      const meshName = e.target.value;
                      setState((s)=>{
                        const arr = [...s.uiWidgets];
                        arr[i] = { ...arr[i], meshName };
                        return { ...s, uiWidgets: arr };
                      });
                    }} />
                  )}
                  <button className="btn-danger-small" onClick={()=>{
                    setState((s)=>({ ...s, uiWidgets: s.uiWidgets.filter((_,idx)=> idx!==i) }));
                  }}>×</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="wizard-actions">
            <button onClick={prev} className="btn-secondary">‹ Back</button>
            <button onClick={save} className="btn-primary">Save Model</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelWizard;
