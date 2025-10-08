import React from 'react';

export default function ViewerTopbar({ userName, onToggleDark, darkMode, onFullscreen, onHelp }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 54,
      background: 'rgba(30,32,40,0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      boxShadow: '0 2px 16px 0 rgba(0,0,0,0.08)'
    }}>
      <div style={{fontWeight:700, fontSize:20, color:'#fff', letterSpacing:1, flex:1}}>
        3D Viewer
      </div>
      <button onClick={onHelp} title="Quick Help" style={btnStyle}>❓</button>
      <button onClick={onFullscreen} title="Fullscreen" style={btnStyle}>⛶</button>
      <button onClick={onToggleDark} title={darkMode?'Light mode':'Dark mode'} style={btnStyle}>{darkMode?'🌞':'🌙'}</button>
      <div style={{marginLeft:18, color:'#fff', fontWeight:500, fontSize:15, opacity:0.85}}>
        {userName}
      </div>
    </div>
  );
}

const btnStyle = {
  background:'none',
  border:'none',
  color:'#fff',
  fontSize:22,
  marginLeft:12,
  cursor:'pointer',
  opacity:0.85,
  transition:'opacity 0.15s',
  borderRadius:6,
  padding:'4px 8px'
};
