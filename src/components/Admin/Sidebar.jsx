import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: '📊',
      label: 'Dashboard'
    },
    {
      path: '/admin/users',
      icon: '👥',
      label: 'User Management'
    },
    {
      path: '/admin/models',
      icon: '🎯',
      label: 'Model Management'
    }
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? '☰' : '✕'}
        </button>
        {!collapsed && (
          <div className="sidebar-title">
            <h2>Admin Panel</h2>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name || 'Admin'}</div>
              <div className="user-role">{user?.role || 'Administrator'}</div>
            </div>
          </div>
        )}
        <button 
          className={`logout-btn ${collapsed ? 'icon-only' : ''}`}
          onClick={handleLogout}
          title="Logout"
        >
          <span className="logout-icon">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
