import React, { useState, useCallback, useEffect, useRef } from "react";
import "../Interface.css";
import { dlog } from '../../../utils/logger';

function GlobalTextureWidget({ applyRequest, modelName, editableParts }) {
  const [userTextures, setUserTextures] = useState([]);
  const [selected, setSelected] = useState(null);
  const createdUrlsRef = useRef([]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    const newTexture = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name.split('.')[0],
      url: localUrl,
      file: file  // Store the actual file object
    };

    // remember created blob URLs so we can revoke them on unmount
    createdUrlsRef.current.push(localUrl);
    setUserTextures(prev => [...prev, newTexture]);
  }, []);

  const handleApply = useCallback((texture) => {
    setSelected(texture.url);
    dlog("🌍 Applying global texture:", texture.name);
    try {
      dlog('🔔 GlobalTextureWidget: invoking applyRequest', { modelName, textureName: texture.name, hasApplyRequest: !!applyRequest?.current });
      if (!applyRequest?.current) {
        console.warn('applyRequest not available for GlobalTextureWidget');
        return;
      }
      const result = applyRequest.current({
        type: "global",
        modelName,
        texture: texture.file,  // Pass the file object instead of blob URL
        exclude: editableParts,
        persist: false // preview-only by default
      });
      if (result && typeof result.then === 'function') {
        result.then(() => dlog('✅ Global texture applied successfully')).catch(err => console.error('❌ Global texture apply error:', err));
      }
    } catch (err) {
      console.error('❌ GlobalTextureWidget: exception invoking applyRequest', err);
    }
  }, [applyRequest, modelName, editableParts]);

  // Revoke created object URLs when widget unmounts to avoid memory leaks
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(u => {
        try {
          if (u && u.startsWith && u.startsWith('blob:')) URL.revokeObjectURL(u);
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  return (
    <div className="widget-container">
      <div className="widget-title">🌍 Global Texture</div>

      <div className="widget-content">
        <div style={{ marginBottom: '15px' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
          />
        </div>

        {userTextures.length > 0 && (
          <div>
            <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
              Click on a texture below to apply it globally:
            </p>
            <div className="texture-grid">
              {userTextures.map((tex) => (
                <div key={tex.id} style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <button
                    onClick={() => handleApply(tex)}
                    className={`texture-option ${selected === tex.url ? 'selected' : ''}`}
                    style={{
                      border: selected === tex.url ? '3px solid #007bff' : '2px solid #ddd',
                      borderRadius: '8px',
                      padding: '8px',
                      backgroundColor: selected === tex.url ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                      marginBottom: '5px'
                    }}
                  >
                    <img 
                      src={tex.url} 
                      alt={tex.name} 
                      className="texture-preview"
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div className="texture-name" style={{ marginTop: '5px', fontSize: '12px' }}>
                      {tex.name}
                    </div>
                  </button>
                  <button
                    onClick={() => handleApply(tex)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginTop: '5px'
                    }}
                  >
                    🌍 Apply Globally
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {userTextures.length === 0 && (
          <p>Upload an image to use as global texture</p>
        )}
      </div>
    </div>
  );
}

export default React.memo(GlobalTextureWidget);
