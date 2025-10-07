import React from 'react';

function Dashboard() {
  return (
    <div className="sa-grid">
      <div className="sa-card">
        <h2>Welcome, Super Admin</h2>
        <p>You have top-level controls. Use the Admins section to manage admin accounts.</p>
      </div>
      <div className="sa-card">
        <h3>System Overview</h3>
        <ul>
          <li>Admins: coming soon</li>
          <li>Users: coming soon</li>
          <li>Models: coming soon</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;


