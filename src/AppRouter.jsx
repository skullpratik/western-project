import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Auth/Login';
import AdminLayout from './components/Admin/AdminLayout';
import SuperAdminLayout from './components/SuperAdmin/SuperAdminLayout';
import UserLayout from './components/User/UserLayout';
import MainApp from './components/MainApp/MainApp';
import Embed from './components/Embed/Embed';
import './App.css';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        {/* Public embed route - no authentication required */}
        <Route path="/embed" element={<Embed />} />
        
        {/* Authentication required for all other routes */}
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : user.role === 'superadmin' ? (
          <>
            <Route path="/superadmin/*" element={<SuperAdminLayout />} />
            <Route path="/" element={<Navigate to="/superadmin/dashboard" replace />} />
            <Route path="/app" element={<Navigate to="/superadmin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
          </>
        ) : user.role === 'admin' ? (
          <>
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/app" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/user/*" element={<UserLayout />} />
            <Route path="/" element={<Navigate to="/user/dashboard" replace />} />
            <Route path="/app" element={<MainApp />} />
            <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}

export default App;
