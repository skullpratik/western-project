import React from 'react';

export default function ViewerSidebar({
  sections = [],
  selectedSection,
  onSectionChange,
  models = {},
  selectedModel,
  onModelChange,
  children
}) {
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 220,
      background: 'rgba(30,32,40,0.55)',
      backdropFilter: 'blur(8px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      zIndex: 10,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      boxShadow: '2px 0 16px 0 rgba(0,0,0,0.08)'
    }}>
      <div style={{fontWeight:700, fontSize:18, color:'#fff', letterSpacing:1, marginBottom:8, opacity:0.92}}>
        3D Viewer
      </div>
      <div>
        <label style={{color:'#fff', fontSize:13, opacity:0.7}}>Section</label>
        <select value={selectedSection} onChange={e=>onSectionChange(e.target.value)} style={{width:'100%',marginTop:4,padding:6,borderRadius:6,border:'none',background:'rgba(255,255,255,0.12)',color:'#fff'}}>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label style={{color:'#fff', fontSize:13, opacity:0.7}}>Model</label>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
          {Object.entries(models).map(([name, cfg]) => (
            <button key={name} onClick={()=>onModelChange(name)} style={{
              background: name===selectedModel?'rgba(99,102,241,0.18)':'rgba(255,255,255,0.08)',
              color:'#fff',
              border:'none',
              borderRadius:5,
              padding:'6px 10px',
              fontWeight:600,
              cursor:'pointer',
              outline: name===selectedModel?'2px solid #6366f1':'none',
              transition:'all 0.15s',
              opacity: name===selectedModel?1:0.8
            }} title={cfg.displayName||name}>
              {cfg.displayName||name}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1}}/>
      {children}
    </div>
  );
}
