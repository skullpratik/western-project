import React from 'react';
import UserDashboard from './Dashboard';

// Renders the user dashboard with the 3D Viewer embedded on the right side
export default function DashboardWithViewer() {
  return (
    <div className="dashboard" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
      <div style={{ minWidth: 0 }}>
        <UserDashboard />
      </div>
      <div className="kt-card" style={{ minHeight: 520, display: 'flex', flexDirection: 'column' }}>
        <div className="kt-card-header" style={{ marginBottom: 8 }}>🧭 Viewer</div>
        <div style={{ flex: 1, minHeight: 420, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
          <iframe
            title="Embedded Viewer"
            src="/app"
            style={{ width: '100%', height: '100%', border: '0' }}
          />
        </div>
      </div>
    </div>
  );
}
