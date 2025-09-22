import React, { useEffect, useState } from 'react';

export function ModelErrorOverlay() {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      setErrors((prev) => [d, ...prev].slice(0, 10));
    };
    window.addEventListener('modelLoadError', handler);
    return () => window.removeEventListener('modelLoadError', handler);
  }, []);

  if (!errors.length) return null;

  return (
    <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 1000 }}>
      {errors.map((err, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: 8, marginBottom: 8, borderRadius: 6, width: 380 }}>
          <b>Model load failed:</b>
          <div style={{ fontSize: 12, wordBreak: 'break-all' }}>{err.url}</div>
          <div style={{ fontSize: 12 }}>status: {err.status}</div>
          <div style={{ fontSize: 12 }}>model: {err.modelName}</div>
          <div style={{ marginTop: 6 }}>
            <a href={err.url} target="_blank" rel="noreferrer" style={{ color: '#7bd389' }}>Open URL</a>
          </div>
        </div>
      ))}
    </div>
  );
}
