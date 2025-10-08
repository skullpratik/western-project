import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserSidebar from './Sidebar';
import UserDashboard from './Dashboard/Dashboard';
import MainApp from '../MainApp/MainApp';
import '../Admin/admin-theme.css';
import '../Admin/AdminLayout.css';
import AddModelModalMultiAsset from '../Admin/ModelManagement/AddModelModal_MultiAsset';
import ModelManagement from '../Admin/ModelManagement/ModelManagement';

const ChangePassword = () => (
  <div className="kt-card" style={{ maxWidth: 520 }}>
    <div style={{fontSize:'12px', fontWeight:'600', color:'var(--kt-text-soft)', marginBottom:'12px'}}>🔒 Change Password</div>
    <div style={{display:'grid', gap:8}}>
      <input disabled placeholder="Current password" className="kt-input" />
      <input disabled placeholder="New password" className="kt-input" />
      <input disabled placeholder="Confirm new password" className="kt-input" />
      <button className="kt-btn" disabled>Update (coming soon)</button>
    </div>
  </div>
);

const Topbar = ({ collapsed, onToggle, name }) => (
  <div className="kt-topbar">
    <button className="kt-burger" onClick={onToggle} aria-label="Toggle Sidebar">
      {collapsed ? '☰' : '✕'}
    </button>
    <div className="kt-title">{name || 'User'}</div>
    <div style={{flex:1}}></div>
    <div className="kt-user">
      <div className="kt-avatar">{name?.[0]?.toUpperCase() || 'U'}</div>
      <div className="kt-username">{name || 'User'}</div>
    </div>
  </div>
);

const UserShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  const pageTitleMap = {
    '/user/dashboard': 'Dashboard',
    '/user/viewer': 'Viewer',
    '/user/change-password': 'Change Password',
  };
  const pageTitle = pageTitleMap[location.pathname] || 'Dashboard';

  const toggleSidebar = () => setSidebarCollapsed(v => !v);

  return (
    <div className="kt-app">
      <UserSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="kt-main">
        <Topbar collapsed={sidebarCollapsed} onToggle={toggleSidebar} name={user?.name} />
        <div className="kt-content">
          <Routes>
            <Route path="/" element={<UserDashboard />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/viewer" element={<MainApp />} />
            <Route path="/upload-model" element={<UserUpload />} />
            <Route path="/model-management" element={<UserModelManagement />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const UserLayout = () => {
  const { user } = useAuth();
  if (!user || user.role !== 'user') return <div style={{ padding:16 }}>Access denied</div>;
  return <UserShell />;
};

const UserUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!(user?.permissions?.modelManageUpload || (user?.role === 'admin') || (user?.role === 'superadmin'))) {
    return <div className="kt-card">You do not have permission to upload models.</div>;
  }
  return (
    <AddModelModalMultiAsset
      onClose={() => navigate('/user/dashboard')}
      onAdd={() => navigate('/user/dashboard')}
    />
  );
};

const UserModelManagement = () => {
  const { user } = useAuth();
  const canView = !!(user?.role === 'admin' || user?.role === 'superadmin' || user?.permissions?.modelUpload || user?.permissions?.modelManageUpload || user?.permissions?.modelManageEdit || user?.permissions?.modelManageDelete);
  if (!canView) return <div className="kt-card">You do not have permission to manage models.</div>;
  return <ModelManagement />;
};

export default UserLayout;
