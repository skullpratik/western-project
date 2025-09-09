import React, { useState, useEffect } from 'react';
import './UserManagement.css';

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
  const response = await fetch('/api/admin-dashboard/users', {
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
    setEditingUser({
      ...user,
      permissions: { ...user.permissions }
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`/api/admin-dashboard/users/${editingUser._id}/permissions`, {
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
  const response = await fetch(`/api/admin-dashboard/users/${userId}/toggle-active`, {
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
  const response = await fetch(`/api/admin-dashboard/users/${userId}`, {
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
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <div className="user-stats">
          <span>Total Users: {users.length}</span>
          <span>Active: {users.filter(u => u.isActive).length}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="users-table">
        <table>
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
                <td>
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {user.name}
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="user-actions">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEditUser(user)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteUser(user._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit User: {editingUser.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateUser}>
                <div className="form-section">
                  <h4>Basic Information</h4>
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" value={editingUser.name} disabled />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={editingUser.email} disabled />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" value={editingUser.role} disabled />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={!!editingUser.isActive}
                        onChange={() => handleToggleActive(editingUser._id)}
                      />
                      Active Account
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Permissions</h4>
                  <div className="permissions-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={grantAll}>Grant All</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={revokeAll}>Revoke All</button>
                  </div>
                  <div className="permissions-grid">
                    {Object.entries(editingUser.permissions).map(([key, value]) => (
                      <div key={key} className="permission-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handlePermissionChange(key, e.target.checked)}
                          />
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
