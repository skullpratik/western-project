import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const API_BASE_URL = 'http://localhost:5000';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchUsers();
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
      // Add missing widget permissions
      reflectionWidget: false,
      movementWidget: false,
      customWidget: false,
      saveConfig: false,
      canRotate: true,
      canPan: false,
      canZoom: false,
      canMove: false
    };

    const completePermissions = { ...defaultPermissions, ...user.permissions };

    setEditingUser({
      ...user,
      permissions: completePermissions
    });
    setShowEditModal(true);
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

  const grantAll = () => {
    if (!editingUser) return;
    const allTrue = Object.keys(editingUser.permissions).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setEditingUser(prev => ({ ...prev, permissions: allTrue }));
  };

  const revokeAll = () => {
    if (!editingUser) return;
    const allFalse = Object.keys(editingUser.permissions).reduce((acc, key) => ({ ...acc, [key]: false }), {});
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
                  {Object.entries(editingUser.permissions).map(([key, value]) => (
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

              <div className="flex" style={{justifyContent:'flex-end', gap:12}}>
                <button type="button" className="kt-btn outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="kt-btn primary">Update User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
