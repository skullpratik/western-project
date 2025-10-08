import React, { useState } from 'react';

const API_BASE_URL = 'http://192.168.1.7:5000';

export default function UploadModel() {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState('cabinet');
  const [section, setSection] = useState('Upright Counter');
  const [files, setFiles] = useState({ base: null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!name.trim()) { setError('Model name is required'); return; }
    if (!files.base) { setError('Base model file is required'); return; }

    try {
      setUploading(true);
      const form = new FormData();
      form.append('name', name);
      form.append('displayName', displayName || name);
      form.append('type', type);
      if (section) form.append('section', section);
      if (files.base) form.append('base', files.base);
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE_URL}/api/admin/models/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: form
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed (${resp.status})`);
      }
      const data = await resp.json();
      setResult(data);
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="kt-card" style={{maxWidth: 720}}>
      <div className="kt-card-header">Upload Model</div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <div style={{display:'grid', gap:10, gridTemplateColumns:'1fr 1fr'}}>
          <div>
            <label style={{fontSize:12, fontWeight:600}}>Name *</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <label style={{fontSize:12, fontWeight:600}}>Display Name</label>
            <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
          </div>
        </div>
        <div style={{display:'grid', gap:10, gridTemplateColumns:'1fr 1fr'}}>
          <div>
            <label style={{fontSize:12, fontWeight:600}}>Type</label>
            <select value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="cabinet">Cabinet</option>
              <option value="refrigerator">Refrigerator</option>
              <option value="freezer">Freezer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:12, fontWeight:600}}>Section</label>
            <select value={section} onChange={(e)=>setSection(e.target.value)}>
              <option value="Upright Counter">Upright Counter</option>
              <option value="Visicooler">Visicooler</option>
              <option value="XYZ">XYZ</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{fontSize:12, fontWeight:600}}>Base Model (.glb/.gltf) *</label>
          <input type="file" accept=".glb,.gltf" onChange={(e)=>setFiles({ ...files, base: e.target.files?.[0] || null })} />
        </div>
        {error && <div style={{color:'var(--kt-danger)'}}>{error}</div>}
        {result && <div style={{color:'var(--kt-success)'}}>Uploaded: {result?.model?.name || 'Success'}</div>}
        <div className="flex" style={{justifyContent:'flex-end', gap:12}}>
          <button className="kt-btn" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
      </form>
    </div>
  );
}
