import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Auth/Login';
import AdminLayout from './components/Admin/AdminLayout';
import MainApp from './components/MainApp/MainApp';
import SuperAdminLayout from './components/SuperAdmin/SuperAdminLayout';
import UserLayout from './components/User/UserLayout';
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

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <Routes>
        {/* Admin & Superadmin Routes */}
        {(user.role === 'admin' || user.role === 'superadmin') && (
          <Route path="/admin/*" element={<AdminLayout />} />
        )}
        {user.role === 'superadmin' && (
          <Route path="/superadmin/*" element={<SuperAdminLayout />} />
        )}
        
        {/* Regular user routes: dashboard first, viewer at /app */}
        {user.role !== 'admin' && user.role !== 'superadmin' && (
          <>
            <Route path="/user/*" element={<UserLayout />} />
            <Route path="/" element={<Navigate to="/user/dashboard" replace />} />
            <Route path="/app" element={<MainApp />} />
          </>
        )}
        
        {/* Redirect based on role */}
        <Route 
          path="*" 
          element={
            <Navigate 
              to={
                user.role === 'admin' || user.role === 'superadmin'
                  ? '/admin/dashboard'
                  : '/user/dashboard'
              } 
              replace 
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;