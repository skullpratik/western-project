import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard/Dashboard';
import UserManagement from './UserManagement/UserManagement';
import ModelManagement from './ModelManagement/ModelManagement';
import UserPreview from './UserPreview/UserPreview';
import { useAuth } from '../../context/AuthContext';
import './admin-theme.css';
import './AdminLayout.css';
import { ToastProvider, useToasts } from './ToastProvider';

// Inner shell separated so we can access toast context
const AdminShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const { push } = useToasts();
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('admin-dark') === '1';
  });

  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  useEffect(() => {
    if (dark) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
    localStorage.setItem('admin-dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    push({ type: 'info', title: 'Welcome', message: `Hi ${user?.name || 'Admin'}!`, timeout: 2500 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(v => !v);
  const toggleDark = () => setDark(v => !v);

  const pathMap = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/models': 'Model Management',
  // '/admin/activity-log': 'Activity Logs',
  // '/admin/models/generator': 'Model Generator',
    '/admin/user-preview': 'User-Preview'
  };
  const pageTitle = pathMap[location.pathname] || 'Dashboard';

  return (
    <div className="kt-app">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="kt-main">
        <div className="kt-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/models" element={<ModelManagement />} />
            {/* Model Generator removed */}
            <Route path="/user-preview" element={<UserPreview />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};
const AdminLayout = () => (
  <ToastProvider>
    <AdminShell />
  </ToastProvider>
);

export default AdminLayout;
