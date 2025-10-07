import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SuperDashboard from './Dashboard/Dashboard';
import './superadmin.css';

function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.body.classList.add('superadmin-mode');
    return () => document.body.classList.remove('superadmin-mode');
  }, []);

  const pageTitleMap = {
    '/superadmin/dashboard': 'Super Admin Dashboard',
    '/superadmin/admins': 'Admins',
  };
  const pageTitle = pageTitleMap[location.pathname] || 'Super Admin';

  return (
    <div className="sa-app">
      <aside className={`sa-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sa-brand">👑 Super Admin</div>
        <nav className="sa-nav">
          <NavLink to="/superadmin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/superadmin/admins" className={({ isActive }) => isActive ? 'active' : ''}>Admins</NavLink>
        </nav>
      </aside>
      <main className="sa-main">
        <div className="sa-topbar">
          <button className="sa-burger" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar">{collapsed ? '☰' : '✕'}</button>
          <div className="sa-title">{pageTitle}</div>
          <div className="sa-user">
            <div className="sa-avatar">{user?.name?.[0]?.toUpperCase() || 'S'}</div>
            <div className="sa-username">{user?.name || 'Super Admin'}</div>
            <button className="sa-btn" onClick={logout}>Logout</button>
          </div>
        </div>
        <div className="sa-content">
          <Routes>
            <Route path="/" element={<SuperDashboard />} />
            <Route path="/dashboard" element={<SuperDashboard />} />
            <Route path="/admins" element={<AdminsPlaceholder />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function AdminsPlaceholder() {
  return (
    <div className="sa-card">
      <h2>Admin Management</h2>
      <p>This is a placeholder. Next, we will add controls to create, list, and deactivate admins here (superadmin-only).</p>
    </div>
  );
}

export default SuperAdminLayout;


