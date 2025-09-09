import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalModels: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch user stats
  const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length
        }));
      }

      // Fetch model stats
  const modelsResponse = await fetch('/api/admin/models', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (modelsResponse.ok) {
        const models = await modelsResponse.json();
        setStats(prev => ({
          ...prev,
          totalModels: models.length
        }));
      }

      // Fetch activity stats
  const activityResponse = await fetch('/api/admin/activity/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (activityResponse.ok) {
        const activity = await activityResponse.json();
        setStats(prev => ({
          ...prev,
          recentActivity: activity.dailyStats || []
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, trend }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">
        <span>{icon}</span>
      </div>
      <div className="stat-content">
        <h3>{title}</h3>
        <div className="stat-value">{value}</div>
        {trend && (
          <div className={`stat-trend ${trend.direction}`}>
            <span>{trend.direction === 'up' ? '↗' : '↘'}</span>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}! Here's your system overview.</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Models"
          value={stats.totalModels}
          icon="🎯"
          color="purple"
        />
        <StatCard
          title="System Status"
          value="Online"
          icon="🟢"
          color="emerald"
        />
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">📊</div>
                  <div className="activity-content">
                    <div className="activity-title">
                      {activity._id} - {activity.count} actions
                    </div>
                    <div className="activity-time">Recent activity</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <span>📝</span>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button 
              className="action-btn primary"
              onClick={() => window.location.href = '/admin/users'}
            >
              <span>👥</span>
              Manage Users
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => window.location.href = '/admin/models'}
            >
              <span>🎯</span>
              Manage Models
            </button>
            <button 
              className="action-btn tertiary"
              onClick={fetchDashboardStats}
            >
              <span>🔄</span>
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
