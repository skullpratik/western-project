import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Auth/Login';
import AdminLayout from './components/Admin/AdminLayout';
import MainApp from './components/MainApp/MainApp';
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
        {/* Admin Routes */}
        {user.role === 'admin' && (
          <Route path="/admin/*" element={<AdminLayout />} />
        )}
        
        {/* Main 3D App Routes - only for non-admin users */}
        {user.role !== 'admin' && (
          <>
            <Route path="/" element={<MainApp />} />
            <Route path="/app" element={<MainApp />} />
          </>
        )}
        
        {/* Redirect based on role */}
        <Route 
          path="*" 
          element={
            <Navigate 
              to={user.role === 'admin' ? '/admin/dashboard' : '/'} 
              replace 
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;