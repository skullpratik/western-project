import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './UserManagement.css';
import { ActivityLog } from '../../ActivityLog/ActivityLog';
import SavedConfigsList from '../../Interface/SavedConfigsList';
import SendPasswordReset from '../SendPasswordReset';

const API_BASE_URL = 'http://192.168.1.7:5000';

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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceUser, setTransferSourceUser] = useState(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState('');
  const [configCounts, setConfigCounts] = useState({});
  const [showUserConfigs, setShowUserConfigs] = useState(false);
  const [configsUserId, setConfigsUserId] = useState(null);
  const [debugMessage, setDebugMessage] = useState('');
  const { user: tokenUser } = useAuth();
  const isSuperAdmin = tokenUser?.role === 'superadmin';
  const [selectedTab, setSelectedTab] = useState('admins'); // 'admins' | 'users'
  const currentUserId = tokenUser?.id || tokenUser?._id || (tokenUser?._id && tokenUser._id.toString && tokenUser._id.toString());

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
      // Fetch saved-config counts for each user (show in table)
      (async () => {
        try {
          const counts = {};
          await Promise.all(data.map(async (u) => {
            try {
              const r = await fetch(`${API_BASE_URL}/api/admin/user-configs/${u._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!r.ok) { counts[u._id] = 0; return; }
              const arr = await r.json();
              counts[u._id] = Array.isArray(arr) ? arr.length : 0;
            } catch (e) {
              counts[u._id] = 0;
            }
          }));
          setConfigCounts(counts);
        } catch (e) {
          console.warn('Failed to fetch config counts', e);
        }
      })();
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
      modelUpload: false,
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

  // Active/deactivated status removed; no toggle function

  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');

      // Query the admin endpoint that returns the user's saved-widget configs array
      const cfgResp = await fetch(`${API_BASE_URL}/api/admin/user-configs/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!cfgResp.ok) throw new Error('Failed to query user saved configurations');
      const configs = await cfgResp.json();
      const count = Array.isArray(configs) ? configs.length : 0;
  console.log('Delete flow:', { userId, count, configsSample: configs && configs.slice ? configs.slice(0,2) : configs });
  setDebugMessage(`Delete flow for ${userId}: count=${count}`);

      if (count === 0) {
        // No saved configs - ask confirmation and delete immediately
        if (!window.confirm('This user has no saved configurations. Delete account?')) return;
        const delResp = await fetch(`${API_BASE_URL}/api/admin-dashboard/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!delResp.ok) {
          const err = await delResp.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to delete user');
        }
        setUsers(prev => prev.filter(u => u._id !== userId));
        return;
      }

      // Has configs - open transfer modal (do not show browser confirm yet)
      const src = users.find(u => u._id === userId) || null;
      console.log('Transfer source user resolved:', src);
      setDebugMessage(`Transfer modal should open for ${src ? src.name : 'null'}`);
      setTransferSourceUser(src);
      setTransferTargetUserId('');
      setShowTransferModal(true);
    } catch (error) {
      console.error('Error in delete flow:', error);
      setError(error.message || 'Failed to delete user');
    }
  };

  const confirmDeleteWithTransfer = async () => {
    if (!transferSourceUser) { setShowTransferModal(false); return; }
    // Ask final confirmation here so admin saw the transfer modal first
    if (!window.confirm('Are you sure you want to delete this user now? This action cannot be undone.')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const url = transferTargetUserId
        ? `${API_BASE_URL}/api/admin-dashboard/users/${transferSourceUser._id}?transferTo=${transferTargetUserId}`
        : `${API_BASE_URL}/api/admin-dashboard/users/${transferSourceUser._id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete user');
      }
  setUsers(prev => prev.filter(u => u._id !== transferSourceUser._id));
      setShowTransferModal(false);
      setTransferSourceUser(null);
      setTransferTargetUserId('');
    } catch (error) {
      console.error('Error deleting/transferring user:', error);
      setError(error.message || 'Failed to delete user');
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
  // Create user handler
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
      {/* DEBUG: show last delete-flow message and modal state for troubleshooting */}
      {debugMessage && (
        <div style={{padding:8, background:'rgba(15,23,42,0.04)', border:'1px solid var(--kt-border)', borderRadius:6}}>
          <strong>Debug:</strong> {debugMessage} {showTransferModal ? '(transfer modal open)' : '(modal closed)'}
        </div>
      )}
      <div className="kt-card">
        <div className="flex gap-12" style={{alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div className="kt-card-header" style={{margin:0}}>User Management</div>
            <div className="text-faint" style={{fontSize:12}}>Manage permissions and status</div>
          </div>
          <div className="flex gap-12" style={{fontSize:12}}>
            <span className="badge primary">Total {users.length}</span>
            {/* Active/inactive removed */}
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

      {isSuperAdmin ? (
        <div className="kt-card" style={{padding:12}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <button
                className={`kt-btn sm ${selectedTab === 'admins' ? 'primary' : 'outline'}`}
                onClick={() => setSelectedTab('admins')}
                style={{minWidth:110}}
              >
                Admins ({users.filter(u => (u.role === 'admin' || u.role === 'superadmin') && String(u._id) !== String(currentUserId)).length})
              </button>
              <button
                className={`kt-btn sm ${selectedTab === 'users' ? 'primary' : 'outline'}`}
                onClick={() => setSelectedTab('users')}
                style={{minWidth:110}}
              >
                Users ({users.filter(u => u.role === 'user').length})
              </button>
            </div>
            <div style={{fontSize:13, color:'var(--kt-text-soft)'}}>Select a list to manage</div>
          </div>

          <div style={{marginTop:12}}>
            {selectedTab === 'admins' ? (
              <div className="kt-table-wrapper">
                <table className="kt-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => (u.role === 'admin' || u.role === 'superadmin') && String(u._id) !== String(currentUserId)).map(user => (
                      <tr key={user._id}>
                        <td style={{display:'flex', alignItems:'center', gap:8}}>
                          <div className="kt-avatar" style={{width:34, height:34, fontSize:13}}>{user.name.charAt(0).toUpperCase()}</div>
                          <span>{user.name}</span>
                        </td>
                        <td>{user.email}</td>
                        <td><span className="badge primary" style={{textTransform:'capitalize'}}>{user.role}</span></td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="kt-actions">
                            {isSuperAdmin && <button onClick={() => handleEditUser(user)}>Edit</button>}
                            <button onClick={() => { setActivityUserId(user._id); setShowActivityModal(true); }}>View Activity</button>
                            {isSuperAdmin && <button onClick={() => handleDeleteUser(user._id)}>Delete</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="kt-table-wrapper">
                <table className="kt-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Saved Configs</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.role === 'user').map(user => (
                      <tr key={user._id}>
                        <td style={{display:'flex', alignItems:'center', gap:8}}>
                          <div className="kt-avatar" style={{width:34, height:34, fontSize:13}}>{user.name.charAt(0).toUpperCase()}</div>
                          <span>{user.name}</span>
                          {(() => { const p=user?.permissions||{}; return p.modelUpload||p.modelManageUpload||p.modelManageEdit||p.modelManageDelete; })() ? (
                            <span
                              title="Model management permission granted"
                              aria-label="Model management permission"
                              style={{
                                display:'inline-flex',
                                alignItems:'center',
                                justifyContent:'center',
                                fontSize:12,
                                lineHeight:1,
                                padding:'2px 6px',
                                borderRadius:999,
                                background:'var(--kt-primary-ghost, rgba(99,102,241,0.15))',
                                color:'var(--kt-primary, #6366f1)'
                              }}
                            >
                              ⤴️
                            </span>
                          ) : null}
                        </td>
                        <td>{user.email}</td>
                        <td style={{textAlign:'center'}}>
                          <div
                            role="button"
                            tabIndex={0}
                            title="Click to view saved configurations"
                            onClick={() => { setConfigsUserId(user._id); setShowUserConfigs(true); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setConfigsUserId(user._id); setShowUserConfigs(true); } }}
                            style={{display:'inline-flex', alignItems:'center', gap:8, cursor: typeof configCounts[user._id] === 'number' && configCounts[user._id] > 0 ? 'pointer' : 'default', padding:'6px 8px', borderRadius:6}}
                          >
                            {typeof configCounts[user._id] === 'number' && configCounts[user._id] > 0 ? (
                              <>
                                <span style={{fontSize:14, opacity:0.95}}>📋</span>
                                <span style={{textDecoration:'underline', color:'var(--kt-primary)', fontWeight:600}}>{configCounts[user._id]}</span>
                              </>
                            ) : (
                              <span className="badge" style={{background:'transparent', color:'var(--kt-text)'}}>-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="badge primary" style={{textTransform:'capitalize'}}>
                            {user.role === 'user' && user?.permissions?.modelUpload ? 'custom user' : user.role}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="kt-actions">
                            <button onClick={() => handleEditUser(user)}>Edit</button>
                            <button onClick={() => { setActivityUserId(user._id); setShowActivityModal(true); }}>View Activity</button>
                            <SendPasswordReset userEmail={user.email} />
                            <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="kt-table-wrapper">
          <table className="kt-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>
                  Saved Configs
                  <div style={{fontSize:11, color:'var(--kt-text-soft)', marginTop:4}}>Click the number to view</div>
                </th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'admin' && u.role !== 'superadmin').map(user => (
                <tr key={user._id}>
                  <td style={{display:'flex', alignItems:'center', gap:8}}>
                    <div className="kt-avatar" style={{width:34, height:34, fontSize:13}}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.name}</span>
                    {(() => { const p=user?.permissions||{}; return p.modelUpload||p.modelManageUpload||p.modelManageEdit||p.modelManageDelete; })() ? (
                      <span
                        title="Model management permission granted"
                        aria-label="Model management permission"
                        style={{
                          display:'inline-flex',
                          alignItems:'center',
                          justifyContent:'center',
                          fontSize:12,
                          lineHeight:1,
                          padding:'2px 6px',
                          borderRadius:999,
                          background:'var(--kt-primary-ghost, rgba(99,102,241,0.15))',
                          color:'var(--kt-primary, #6366f1)'
                        }}
                      >
                        ⤴️
                      </span>
                    ) : null}
                  </td>
                  <td>{user.email}</td>
                  <td style={{textAlign:'center'}}>
                    <div
                      role="button"
                      tabIndex={0}
                      title="Click to view saved configurations"
                      onClick={() => { setConfigsUserId(user._id); setShowUserConfigs(true); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setConfigsUserId(user._id); setShowUserConfigs(true); } }}
                      style={{display:'inline-flex', alignItems:'center', gap:8, cursor: typeof configCounts[user._id] === 'number' && configCounts[user._id] > 0 ? 'pointer' : 'default', padding:'6px 8px', borderRadius:6}}
                    >
                      {typeof configCounts[user._id] === 'number' && configCounts[user._id] > 0 ? (
                        <>
                          <span style={{fontSize:14, opacity:0.95}}>📋</span>
                          <span style={{textDecoration:'underline', color:'var(--kt-primary)', fontWeight:600}}>{configCounts[user._id]}</span>
                        </>
                      ) : (
                        <span className="badge" style={{background:'transparent', color:'var(--kt-text)'}}>-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge primary" style={{textTransform:'capitalize'}}>
                      {user.role === 'user' && user?.permissions?.modelUpload ? 'custom user' : user.role}
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
      )}

      {/* Transfer / Delete Modal */}
      {showTransferModal && transferSourceUser && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, pointerEvents:'auto'}}>
          <div className="kt-card" style={{width:'min(640px,100%)'}}>
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="kt-card-header">Delete User: {transferSourceUser.name}</div>
              <button onClick={() => { setShowTransferModal(false); setTransferSourceUser(null); }} style={{border:'none', background:'transparent', fontSize:24, lineHeight:1, cursor:'pointer'}}>×</button>
            </div>
            <div style={{padding:16}}>
              <p>This user has saved configurations. You can transfer them to another user, or delete them along with the account.</p>
              <div style={{marginTop:12}}>
                <label style={{display:'block', marginBottom:8}}>Transfer configurations to (optional):</label>
                <select value={transferTargetUserId} onChange={(e) => setTransferTargetUserId(e.target.value)} style={{width:'100%', padding:8}}>
                  <option value="">-- Do not transfer (delete configs) --</option>
                  {users.filter(u => u._id !== transferSourceUser._id && u.role !== 'admin' && u.role !== 'superadmin').map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:12, padding:12, borderTop:'1px solid var(--kt-border)'}}>
              <button className="kt-btn" onClick={() => { setShowTransferModal(false); setTransferSourceUser(null); setTransferTargetUserId(''); }}>Cancel</button>
              <button className="kt-btn danger" onClick={confirmDeleteWithTransfer}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved configs modal for admin viewing another user's configs */}
      <SavedConfigsList
        isOpen={showUserConfigs}
        onClose={() => { setShowUserConfigs(false); setConfigsUserId(null); }}
        onLoad={(configData) => {
          // Optionally load the configuration into the main viewer (if the app supports it)
          try {
            // Some apps expect onLoad to be async - keep this minimal
          } catch (e) {
            console.warn('onLoad handler for SavedConfigsList not implemented', e);
          }
        }}
        userId={configsUserId}
      />

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
                    <input
                      style={{width:'100%', marginTop:4}}
                      type="text"
                      value={(editingUser.role === 'user' && editingUser?.permissions?.modelUpload) ? 'custom user' : editingUser.role}
                      disabled
                    />
                  </div>
                  {/* Active flag removed */}
                </div>
              </div>

              {/* High-level: Model Management permissions (collapsible) */}
              <div className="kt-card" style={{boxShadow:'none', border:'1px dashed var(--kt-border)'}}>
                <div className="kt-card-header" style={{marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <label style={{display:'flex', gap:6, alignItems:'center', fontSize:12}}>
                      <input type="checkbox" checked={!!editingUser.permissions.modelUpload} onChange={(e) => handlePermissionChange('modelUpload', e.target.checked)} />
                      <div>
                        <div style={{fontWeight:600}}>Model Management</div>
                        <div style={{fontSize:11, color:'var(--kt-text-soft)'}}>If only this is on, user can view models</div>
                      </div>
                    </label>
                  </div>
                  <button type="button" className="kt-btn outline sm" onClick={() => setEditingUser(prev => ({...prev, __mmOpen: !prev?.__mmOpen}))}>
                    {editingUser?.__mmOpen ? 'Hide actions' : 'Choose actions'}
                  </button>
                </div>
                {editingUser?.__mmOpen && (
                  <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))'}}>
                    <label style={{display:'flex', gap:6, alignItems:'center', fontSize:12, background:'var(--kt-surface-alt)', padding:'10px 12px', borderRadius:6, border:'1px solid var(--kt-border)'}}>
                      <input type="checkbox" checked={!!editingUser.permissions.modelManageUpload} onChange={(e) => handlePermissionChange('modelManageUpload', e.target.checked)} />
                      <div>
                        <div style={{fontWeight:600}}>Allow Upload</div>
                        <div style={{fontSize:11, color:'var(--kt-text-soft)'}}>Add new models and assets</div>
                      </div>
                    </label>
                    <label style={{display:'flex', gap:6, alignItems:'center', fontSize:12, background:'var(--kt-surface-alt)', padding:'10px 12px', borderRadius:6, border:'1px solid var(--kt-border)'}}>
                      <input type="checkbox" checked={!!editingUser.permissions.modelManageEdit} onChange={(e) => handlePermissionChange('modelManageEdit', e.target.checked)} />
                      <div>
                        <div style={{fontWeight:600}}>Allow Edit</div>
                        <div style={{fontSize:11, color:'var(--kt-text-soft)'}}>Edit model details and config URL</div>
                      </div>
                    </label>
                    <label style={{display:'flex', gap:6, alignItems:'center', fontSize:12, background:'var(--kt-surface-alt)', padding:'10px 12px', borderRadius:6, border:'1px solid var(--kt-border)'}}>
                      <input type="checkbox" checked={!!editingUser.permissions.modelManageDelete} onChange={(e) => handlePermissionChange('modelManageDelete', e.target.checked)} />
                      <div>
                        <div style={{fontWeight:600}}>Allow Delete</div>
                        <div style={{fontSize:11, color:'var(--kt-text-soft)'}}>Delete models and assets</div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Other feature permissions */}
              <div className="kt-card" style={{boxShadow:'none', border:'1px dashed var(--kt-border)'}}>
                <div className="flex" style={{justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                  <div className="kt-card-header" style={{marginBottom:0}}>Feature Permissions</div>
                  <div className="flex gap-8">
                    <button type="button" className="kt-btn outline" onClick={grantAll}>Grant All</button>
                    <button type="button" className="kt-btn danger" onClick={revokeAll}>Revoke All</button>
                  </div>
                </div>
                <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
                  {Object.entries(editingUser.permissions)
                    .filter(([key]) => !["reflectionWidget","movementWidget","customWidget","imageDownloadQualities","modelUpload","modelManageUpload","modelManageEdit","modelManageDelete"].includes(key))
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
