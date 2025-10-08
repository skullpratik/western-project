// src/components/AdminDashboard/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminDashboard.css";

const API_BASE = "http://192.168.1.7:5000/api";

export function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/admin-dashboard/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error.response?.data?.message || "Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const updatePermissions = async (userId, newPermissions) => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/admin-dashboard/users/${userId}/permissions`,
        { permissions: newPermissions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers(); // Refresh list
      alert("Permissions updated successfully");
    } catch (error) {
      console.error("Error updating permissions:", error);
      setError(error.response?.data?.message || "Error updating permissions");
    }
  };

  const toggleUserActive = async (userId) => {
    // User active/deactivated status removed from system
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    
    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE}/admin-dashboard/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers(); // Refresh list
      alert("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error.response?.data?.message || "Error deleting user");
    }
  };

  if (loading) return <div className="admin-loading">Loading users...</div>;

  return (
    <div className="admin-dashboard">
      <h1>User Management Dashboard</h1>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="dismiss-error">×</button>
        </div>
      )}
      
      <div className="users-list">
        <h2>All Users ({users.length})</h2>
        {users.map(user => (
          <div key={user._id} className="user-card">
            <div className="user-info">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <p>Role: <span className={`role ${user.role}`}>{user.role}</span></p>
              {/* Status removed */}
              <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div className="user-actions">
              {/* Activate/Deactivate removed */}
              
              <button
                onClick={() => setSelectedUser(selectedUser?._id === user._id ? null : user)}
                className="btn-permissions"
              >
                {selectedUser?._id === user._id ? "Close" : "Edit Permissions"}
              </button>
              
              <button
                onClick={() => deleteUser(user._id)}
                className="btn-delete"
                disabled={user._id === JSON.parse(localStorage.getItem("user"))?.id}
              >
                Delete
              </button>
            </div>

            {selectedUser?._id === user._id && (
              <UserPermissionsForm
                user={user}
                onUpdate={updatePermissions}
                onCancel={() => setSelectedUser(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserPermissionsForm({ user, onUpdate, onCancel }) {
  const [permissions, setPermissions] = useState(user.permissions || {});

  const handlePermissionChange = (permission) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const handleSubmit = () => {
    onUpdate(user._id, permissions);
  };

  return (
    <div className="permissions-form">
      <h4>Edit Permissions for {user.name}</h4>
      
      <div className="permissions-grid">
        <div className="permission-group">
          <h5>3D Controls</h5>
          <label>
            <input
              type="checkbox"
              checked={permissions.canRotate || false}
              onChange={() => handlePermissionChange("canRotate")}
            />
            Can Rotate
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.canPan || false}
              onChange={() => handlePermissionChange("canPan")}
            />
            Can Pan
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.canZoom || false}
              onChange={() => handlePermissionChange("canZoom")}
            />
            Can Zoom
          </label>
        </div>

        <div className="permission-group">
          <h5>Widgets</h5>
          <label>
            <input
              type="checkbox"
              checked={permissions.doorPresets || false}
              onChange={() => handlePermissionChange("doorPresets")}
            />
            Door Presets
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.doorToggles || false}
              onChange={() => handlePermissionChange("doorToggles")}
            />
            Door Toggles
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.drawerToggles || false}
              onChange={() => handlePermissionChange("drawerToggles")}
            />
            Drawer Toggles
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.textureWidget || false}
              onChange={() => handlePermissionChange("textureWidget")}
            />
            Texture Widget
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.lightWidget || false}
              onChange={() => handlePermissionChange("lightWidget")}
            />
            Light Widget
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.globalTextureWidget || false}
              onChange={() => handlePermissionChange("globalTextureWidget")}
            />
            Global Texture
          </label>
          <label>
            <input
              type="checkbox"
              checked={permissions.saveConfig || false}
              onChange={() => handlePermissionChange("saveConfig")}
            />
            Save Config
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button onClick={handleSubmit} className="btn-save">Save Changes</button>
        <button onClick={onCancel} className="btn-cancel">Cancel</button>
      </div>
    </div>
  );
}