import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../Admin/Sidebar.css';

const UserSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const canViewModels = !!(user?.permissions?.modelUpload || user?.permissions?.modelManageUpload || user?.permissions?.modelManageEdit || user?.permissions?.modelManageDelete);
  const menuItems = [
    { path: '/user/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/user/viewer', icon: '🧭', label: 'Viewer' },
    ...(canViewModels ? [
      { path: '/user/model-management', icon: '🧩', label: 'Model Management' },
    ] : []),
    { path: '/user/change-password', icon: '🔒', label: 'Change Password' },
  ];

  return (
    <aside className={`kt-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div style={{padding:'12px 16px', borderBottom:'1px solid #334155'}}>
        <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'14px', fontWeight:'600'}}>
          ⚙️ {!collapsed && <span>User</span>}
        </div>
      </div>
      <nav className="kt-nav">
        {menuItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`kt-nav-link ${location.pathname === item.path ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="kt-icon">{item.icon}</span>
            <span className="kt-text">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div style={{padding:'12px 16px', borderTop:'1px solid #334155'}}>
        {!collapsed ? (
          <div style={{marginBottom:'8px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', background:'#334155', padding:'8px', borderRadius:'6px'}}>
              <div className="kt-avatar" style={{width:'24px', height:'24px', fontSize:'10px'}}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{flex:'1', minWidth:'0'}}>
                <div style={{fontSize:'11px', fontWeight:'600', color:'#fff', lineHeight:'1.2'}}>{user?.name || 'User'}</div>
                <div style={{fontSize:'9px', color:'#94a3b8', textTransform:'capitalize'}}>{user?.role || 'user'}</div>
              </div>
            </div>
          </div>
        ) : null}
        <button
          className={`kt-btn danger sm ${collapsed ? 'icon-only' : ''}`}
          onClick={logout}
          title="Logout"
          style={{width:'100%', justifyContent:'center', padding:'6px 8px'}}
        >
          <span>🚪</span>
          {!collapsed && <span style={{marginLeft:'6px'}}>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default UserSidebar;
