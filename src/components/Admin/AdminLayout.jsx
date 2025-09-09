import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard/Dashboard';
import UserManagement from './UserManagement/UserManagement';
import ModelManagement from './ModelManagement/ModelManagement';
import './AdminLayout.css';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="admin-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main className={`admin-main ${sidebarCollapsed ? 'expanded' : ''}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/models" element={<ModelManagement />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;
