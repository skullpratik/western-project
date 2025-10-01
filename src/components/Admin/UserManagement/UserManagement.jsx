import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import { ActivityLog } from '../../ActivityLog/ActivityLog';

const API_BASE_URL = 'http://localhost:5000';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityUserId, setActivityUserId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [createdPassword, setCreatedPassword] = useState('');
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
    loadModelPresets();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    // Ensure all permissions exist with default values
    const defaultPermissions = {
      doorPresets: false,
      doorToggles: false,
      drawerToggles: false,
      textureWidget: false,
      lightWidget: false,
  globalTextureWidget: false,
  screenshotWidget: false,
  // Removed reflectionWidget, movementWidget, customWidget
      saveConfig: false,
      canRotate: true,
      canPan: false,
      canZoom: false,
      canMove: false,
      imageDownloadQualities: ['average']
    };

    const completePermissions = { ...defaultPermissions, ...user.permissions, presetAccess: user.permissions?.presetAccess || {} };

    setEditingUser({
      ...user,
      permissions: completePermissions
    });
    setShowEditModal(true);
    // load available presets so admin can toggle them
    setTimeout(() => loadModelPresets(), 10);
  };

  // Presets for the currently-selected model (used to render per-preset controls)
  const [modelPresets, setModelPresets] = useState([]);

  // Load presets from server for the currently-selected model (uses same /api/models list as MainApp)
  const loadModelPresets = async () => {
    try {
      const selectedModel = localStorage.getItem('selectedModel');
      if (!selectedModel) return setModelPresets([]);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) return setModelPresets([]);
      const models = await res.json();
      const found = models.find(m => String(m.name) === String(selectedModel));
      if (!found) return setModelPresets([]);
      const cfgUrl = found.configUrl;
      if (!cfgUrl) return setModelPresets([]);
      const fullUrl = cfgUrl.startsWith('http') ? cfgUrl : `${API_BASE_URL}${cfgUrl.startsWith('/') ? '' : '/'}${cfgUrl}`;
      const cfgRes = await fetch(fullUrl);
      if (!cfgRes.ok) return setModelPresets([]);
      const json = await cfgRes.json();
      const presets = Array.isArray(json.presets) ? json.presets : [];
      setModelPresets(presets);
      // If editingUser is open and presetAccess wasn't initialized, default to allowing all
      setEditingUser(prev => {
        if (!prev) return prev;
        const currentAccess = prev.permissions?.presetAccess;
        if (currentAccess && Object.keys(currentAccess).length) return prev; // already set
        const map = {};
        presets.forEach(p => { if (p.id) map[p.id] = true; });
        return { ...prev, permissions: { ...prev.permissions, presetAccess: map } };
      });
    } catch (err) {
      console.warn('Failed to load model presets for admin UI', err);
      setModelPresets([]);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/users/${editingUser._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: editingUser.permissions }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers(users.map(user => 
        user._id === updatedUser.user._id ? updatedUser.user : user
      ));
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    }
  };

  // Toggle a preset for editingUser.permissions.presetAccess
  const handlePresetToggle = (presetId, checked) => {
    setEditingUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        presetAccess: {
          ...(prev.permissions?.presetAccess || {}),
          [presetId]: checked
        }
      }
    }));
  };

  const handleToggleActive = async (userId) => {
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/users/${userId}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle user status');
      }

      const data = await response.json();
      setUsers(prev => prev.map(u => (u._id === userId ? { ...u, isActive: data.isActive } : u)));
      setEditingUser(prev => (prev && prev._id === userId ? { ...prev, isActive: data.isActive } : prev));
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  const handlePermissionChange = (permission, value) => {
    setEditingUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const handleQualityChange = (quality, checked) => {
    setEditingUser(prev => {
      const currentQualities = prev.permissions.imageDownloadQualities || [];
      const newQualities = checked
        ? [...currentQualities, quality]
        : currentQualities.filter(q => q !== quality);
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          imageDownloadQualities: newQualities
        }
      };
    });
  };

  // Create user handler (moved out of inline form for clarity)
  const validateCreateForm = (user) => {
    const errs = {};
    if (!user.name || user.name.trim().length < 2) errs.name = 'Please enter a full name (min 2 characters).';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!user.email || !emailRe.test(user.email)) errs.email = 'Please enter a valid email address.';
    if (!user.password || user.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    return errs;
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Empty' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['Very weak', 'Weak', 'Medium', 'Good', 'Strong', 'Excellent'];
    return { score, label: labels[Math.min(score, labels.length - 1)] };
  };

  const generatePassword = () => {
    // create a reasonably strong password
    const part = () => Math.random().toString(36).slice(2, 8);
    const special = '!@#$%^&*()_+~'.charAt(Math.floor(Math.random() * 11));
    const pwd = (part() + part() + special + String.fromCharCode(65 + Math.floor(Math.random() * 26))).slice(0, 14);
    setNewUser(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
    setCreateErrors(prev => ({ ...prev, password: undefined }));
    return pwd;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSuccess('');
    const errs = validateCreateForm(newUser);
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE_URL}/api/admin-dashboard/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create user');
      }
      const data = await resp.json();
      const shownPwd = newUser.password || '';
      setCreatedPassword(shownPwd);
      setCreateSuccess('User created successfully');
      await fetchUsers();
      // reset form but keep createdPassword visible for copy
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Create user error', err);
      setCreateErrors({ form: err.message || 'Failed to create user' });
    } finally {
      setCreating(false);
    }
  };

  const grantAll = () => {
    if (!editingUser) return;
    const allTrue = Object.keys(editingUser.permissions).reduce((acc, key) => {
      if (key === 'imageDownloadQualities') {
        acc[key] = ['average', 'good', 'best'];
      } else {
        acc[key] = true;
      }
      return acc;
    }, {});
    setEditingUser(prev => ({ ...prev, permissions: allTrue }));
  };

  const revokeAll = () => {
    if (!editingUser) return;
    const allFalse = Object.keys(editingUser.permissions).reduce((acc, key) => {
      if (key === 'imageDownloadQualities') {
        acc[key] = [];
      } else {
        acc[key] = false;
      }
      return acc;
    }, {});
    setEditingUser(prev => ({ ...prev, permissions: allFalse }));
  };

  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="kt-stack gap-16">
      <div className="kt-card">
        <div className="flex gap-12" style={{alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div className="kt-card-header" style={{margin:0}}>User Management</div>
            <div className="text-faint" style={{fontSize:12}}>Manage permissions and status</div>
          </div>
          <div className="flex gap-12" style={{fontSize:12}}>
            <span className="badge primary">Total {users.length}</span>
            <span className="badge">Active {users.filter(u => u.isActive).length}</span>
            {/* Per-user delete available inside the ActivityLog modal */}
          </div>
          <div>
            <button className="kt-btn primary" onClick={() => setShowCreateModal(true)}>Create User</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="kt-card" style={{borderColor:'var(--kt-danger)'}}>
          <div style={{color:'var(--kt-danger)', fontSize:14, display:'flex', alignItems:'center', gap:8}}>
            <span>⚠️</span>{error}
          </div>
        </div>
      )}

      <div className="kt-table-wrapper">
        <table className="kt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td style={{display:'flex', alignItems:'center', gap:8}}>
                  <div className="kt-avatar" style={{width:34, height:34, fontSize:13}}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {user.name}
                </td>
                <td>{user.email}</td>
                <td>
                  <span className="badge primary" style={{textTransform:'capitalize'}}>{user.role}</span>
                </td>
                <td>
                  <span className="badge" style={{background: user.isActive ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.15)', color: user.isActive ? 'var(--kt-success)' : 'var(--kt-warning)'}}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="kt-actions">
                    <button onClick={() => handleEditUser(user)}>Edit</button>
                    <button onClick={() => { setActivityUserId(user._id); setShowActivityModal(true); }}>View Activity</button>
                    <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && editingUser && (
        <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'60px 20px', zIndex:200}}>
          <div className="kt-card" style={{width:'min(920px,100%)', maxHeight:'80vh', overflow:'auto'}}>
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="kt-card-header" style={{marginBottom:0}}>Edit User: {editingUser.name}</div>
              <button onClick={() => setShowEditModal(false)} style={{border:'none', background:'transparent', fontSize:24, lineHeight:1, cursor:'pointer'}}>×</button>
            </div>
            <form onSubmit={handleUpdateUser} className="flex flex-col gap-16" style={{marginTop:12}}>
              <div className="kt-card" style={{boxShadow:'none', border:'1px dashed var(--kt-border)'}}>
                <div className="kt-card-header" style={{marginBottom:12}}>Basic Information</div>
                <div className="flex gap-16" style={{flexWrap:'wrap'}}>
                  <div style={{flex:'1 1 220px'}}>
                    <label style={{fontSize:12, fontWeight:600, color:'var(--kt-text-soft)'}}>Name</label>
                    <input style={{width:'100%', marginTop:4}} type="text" value={editingUser.name} disabled />
                  </div>
                  <div style={{flex:'1 1 220px'}}>
                    <label style={{fontSize:12, fontWeight:600, color:'var(--kt-text-soft)'}}>Email</label>
                    <input style={{width:'100%', marginTop:4}} type="email" value={editingUser.email} disabled />
                  </div>
                  <div style={{flex:'1 1 220px'}}>
                    <label style={{fontSize:12, fontWeight:600, color:'var(--kt-text-soft)'}}>Role</label>
                    <input style={{width:'100%', marginTop:4}} type="text" value={editingUser.role} disabled />
                  </div>
                  <div style={{flex:'1 1 160px', display:'flex', alignItems:'flex-end'}}>
                    <label style={{display:'flex', gap:8, alignItems:'center', fontSize:13}}>
                      <input
                        type="checkbox"
                        checked={!!editingUser.isActive}
                        onChange={() => handleToggleActive(editingUser._id)}
                      /> Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="kt-card" style={{boxShadow:'none', border:'1px dashed var(--kt-border)'}}>
                <div className="flex" style={{justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                  <div className="kt-card-header" style={{marginBottom:0}}>Permissions</div>
                  <div className="flex gap-8">
                    <button type="button" className="kt-btn outline" onClick={grantAll}>Grant All</button>
                    <button type="button" className="kt-btn danger" onClick={revokeAll}>Revoke All</button>
                  </div>
                </div>
                <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
                  {Object.entries(editingUser.permissions)
                    .filter(([key]) => !["reflectionWidget","movementWidget","customWidget","imageDownloadQualities"].includes(key))
                    .map(([key, value]) => (
                      <label key={key} style={{display:'flex', gap:6, alignItems:'center', fontSize:12, background:'var(--kt-surface-alt)', padding:'6px 8px', borderRadius:6, border:'1px solid var(--kt-border)'}}>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handlePermissionChange(key, e.target.checked)}
                        />
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                    ))}
                </div>
              </div>

              {/* Per-preset controls (Coke/Pepsi etc) */}
              {modelPresets.length > 0 && (
                <div className="kt-card" style={{boxShadow:'none', border:'1px dashed var(--kt-border)'}}>
                  <div className="kt-card-header" style={{marginBottom:12}}>Presets Access</div>
                  <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))'}}>
                    {modelPresets.map(p => (
                      <label key={p.id} style={{display:'flex', gap:6, alignItems:'center', fontSize:12, background:'var(--kt-surface-alt)', padding:'6px 8px', borderRadius:6, border:'1px solid var(--kt-border)'}}>
                        <input
                          type="checkbox"
                          checked={!!editingUser.permissions?.presetAccess?.[p.id]}
                          onChange={(e) => handlePresetToggle(p.id, e.target.checked)}
                        />
                        {p.label || p.id}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="kt-card" style={{boxShadow:'none', border:'1px dashed var(--kt-border)'}}>
                <div className="kt-card-header" style={{marginBottom:12}}>Image Download Qualities</div>
                <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
                  {['average', 'good', 'best'].map(quality => (
                    <label key={quality} style={{display:'flex', gap:6, alignItems:'center', fontSize:12, background:'var(--kt-surface-alt)', padding:'6px 8px', borderRadius:6, border:'1px solid var(--kt-border)'}}>
                      <input
                        type="checkbox"
                        checked={(editingUser.permissions.imageDownloadQualities || []).includes(quality)}
                        onChange={(e) => handleQualityChange(quality, e.target.checked)}
                      />
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex" style={{justifyContent:'flex-end', gap:12}}>
                <button type="button" className="kt-btn outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="kt-btn primary">Update User</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'60px 20px', zIndex:200}}>
          <div className="kt-card" style={{width:'min(620px,100%)'}}>
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="kt-card-header" style={{marginBottom:0}}>Create User</div>
              <button aria-label="Close create user" onClick={() => setShowCreateModal(false)} style={{border:'none', background:'transparent', fontSize:24, lineHeight:1, cursor:'pointer'}}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-12" style={{marginTop:12}} noValidate>
              <div style={{display:'grid', gap:10, gridTemplateColumns:'1fr 1fr'}}>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <label style={{fontSize:12, fontWeight:600}}>Name</label>
                  <input aria-label="Full name" autoFocus value={newUser.name} onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))} />
                  {createErrors.name && <div style={{color:'var(--kt-danger)', fontSize:12, marginTop:6}}>{createErrors.name}</div>}
                </div>

                <div style={{display:'flex', flexDirection:'column'}}>
                  <label style={{fontSize:12, fontWeight:600}}>Email</label>
                  <input aria-label="Email address" type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} />
                  {createErrors.email && <div style={{color:'var(--kt-danger)', fontSize:12, marginTop:6}}>{createErrors.email}</div>}
                </div>
              </div>

              <div style={{display:'grid', gap:8, gridTemplateColumns:'1fr'}}>
                <label style={{fontSize:12, fontWeight:600}}>Password</label>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input aria-label="Password" type={showPassword ? 'text' : 'password'} value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} style={{flex:1}} />
                  <button type="button" className="kt-btn outline" onClick={() => setShowPassword(s => !s)} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
                  <button type="button" className="kt-btn" onClick={() => generatePassword()}>Generate</button>
                </div>
                {createErrors.password && <div style={{color:'var(--kt-danger)', fontSize:12}}>{createErrors.password}</div>}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:12, color:'var(--kt-text-soft)'}}>Strength: {passwordStrength(newUser.password).label}</div>
                  <div style={{width:120, height:8, background:'var(--kt-surface)', borderRadius:6, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${(passwordStrength(newUser.password).score/5)*100}%`, background: passwordStrength(newUser.password).score >=4 ? 'var(--kt-success)' : 'var(--kt-primary)'}} />
                  </div>
                </div>
              </div>

              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <label style={{fontSize:12, fontWeight:600}}>Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <div style={{marginLeft:'auto'}}>
                  {createErrors.form && <div style={{color:'var(--kt-danger)', fontSize:13, marginRight:12}}>{createErrors.form}</div>}
                  {createSuccess && <div style={{color:'var(--kt-success)', fontSize:13, marginRight:12}}>{createSuccess}</div>}
                </div>
              </div>

              <div className="flex" style={{justifyContent:'flex-end', gap:12}}>
                <button type="button" className="kt-btn outline" onClick={() => { setShowCreateModal(false); setCreateErrors({}); setNewUser({ name: '', email: '', password: '', role: 'user' }); }}>Cancel</button>
                <button type="submit" className="kt-btn primary" disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
              </div>
            </form>

            {createdPassword && (
              <div style={{marginTop:12, padding:10, borderTop:'1px dashed var(--kt-border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontSize:12, color:'var(--kt-text-soft)'}}>Temporary password (copy and provide to the user):</div>
                  <div style={{fontWeight:700, marginTop:6}}>{createdPassword}</div>
                </div>
                <div>
                  <button className="kt-btn" onClick={() => {
                    try {
                      navigator.clipboard.writeText(createdPassword);
                    } catch (e) {
                      console.warn('Clipboard write failed', e);
                    }
                  }}>Copy</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showActivityModal && activityUserId && (
        <div className="modal-overlay" style={{position:'fixed', inset:0, background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'60px 20px', zIndex:200}}>
          <div className="kt-card" style={{width:'min(920px,100%)', maxHeight:'80vh', overflow:'auto'}}>
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="kt-card-header" style={{marginBottom:0}}>Activity for user</div>
              <button onClick={() => { setShowActivityModal(false); setActivityUserId(null); }} style={{border:'none', background:'transparent', fontSize:24, lineHeight:1, cursor:'pointer'}}>×</button>
            </div>
            <div style={{marginTop:12}}>
              {/* ActivityLog component accepts userId prop */}
              <ActivityLog userId={activityUserId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
