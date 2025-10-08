import React, { useState, useEffect, useMemo } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../../../context/AuthContext';
import './Dashboard.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, ArcElement, BarElement, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    // active/inactive removed
    adminUsers: 0,
    standardUsers: 0,
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
  const usersResponse = await fetch('/api/admin-dashboard/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        const total = users.length;
  const admins = users.filter(u => (u.role === 'admin' || u.role === 'superadmin')).length;
  const standard = total - admins;
        setStats(prev => ({
          ...prev,
          totalUsers: total,
            adminUsers: admins,
            standardUsers: standard,
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
  const activityResponse = await fetch('/api/activity/stats', {
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

  const StatCard = ({ title, value, icon, color }) => (
    <div className="kt-card"> 
      <div className="kt-card-header">
        <div className="kt-card-icon">{icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:'12px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--kt-text-soft)', marginBottom:'4px'}}>{title}</div>
          <div className="kt-card-value">{value}</div>
        </div>
      </div>
    </div>
  );

  // Chart colors and data generation
  const chartColors = {
    primary: 'rgba(99,102,241,0.9)',
    primaryLine: 'rgba(99,102,241,0.3)',
    success: 'rgba(16,185,129,0.9)',
    warning: 'rgba(245,158,11,0.9)',
    danger: 'rgba(220,38,38,0.9)',
    info: 'rgba(14,165,233,0.9)',
    neutral: 'rgba(148,163,184,0.9)'
  };

  const activityChartData = useMemo(() => {
    const labels = stats.recentActivity.map(a => a._id).slice(-10);
    const values = stats.recentActivity.map(a => a.count).slice(-10);
    return {
      labels,
      datasets: [
        {
          label: 'Actions',
          data: values,
          fill: true,
          tension: 0.35,
          backgroundColor: chartColors.primaryLine,
          borderColor: chartColors.primary,
          pointBackgroundColor: chartColors.primary,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [stats.recentActivity]);

  const userRoleData = useMemo(() => ({
    labels: ['Admins', 'Users'],
    datasets: [
      {
        data: [stats.adminUsers, stats.standardUsers],
        backgroundColor: [chartColors.info, chartColors.primary],
        borderWidth: 0,
        hoverOffset: 6
      }
    ]
  }), [stats]);

  // Active/inactive chart removed

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { precision: 0 }
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="stats-grid kt-cards-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kt-card">
              <div className="kt-card-header"><div className="kt-skeleton line" style={{width:'60%'}}></div></div>
              <div className="flex gap-12" style={{alignItems:'center'}}>
                <div className="kt-skeleton" style={{width:54,height:54,borderRadius:14}}></div>
                <div className="flex flex-col" style={{flex:1}}>
                  <div className="kt-skeleton line" style={{height:32,width:'50%'}}></div>
                  <div className="kt-skeleton line" style={{width:'30%'}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="kt-charts-grid" style={{marginTop:24}}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="kt-card">
              <div className="kt-skeleton line" style={{width:'40%',marginBottom:12}}></div>
              <div className="kt-skeleton" style={{height:260,borderRadius:12}}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div style={{marginBottom:'16px'}}>
        <h1 style={{fontSize:'18px', fontWeight:'700', color:'var(--kt-text)', marginBottom:'4px'}}>Dashboard</h1>
        <p style={{color:'var(--kt-text-soft)', fontSize:'13px'}}>Welcome back, {user?.name}!</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
  {/* Active/inactive removed */}
        <StatCard title="Admins" value={stats.adminUsers} icon="🛡" />
        <StatCard title="Standard Users" value={stats.standardUsers} icon="🧑" />
        <StatCard title="Models" value={stats.totalModels} icon="🎯" />
      </div>

      <div className="kt-charts-grid">
        <div className="kt-card">
          <div className="kt-chart-title">📈 Activity</div>
          <div style={{height:'180px'}}>
            <Line data={activityChartData} options={baseOptions} />
          </div>
        </div>
        <div className="kt-card">
          <div className="kt-chart-title">🧩 User Roles</div>
          <div style={{height:'180px', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Doughnut data={userRoleData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                tooltip: { mode: 'nearest' }
              }
            }} />
          </div>
        </div>
        {/* Status chart removed */}
      </div>

      <div className="kt-card">
        <div style={{fontSize:'12px', fontWeight:'600', color:'var(--kt-text-soft)', marginBottom:'12px'}}>🎯 Quick Actions</div>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
          <button className="kt-btn primary sm" onClick={() => window.location.href = '/admin/users'}>👥 Manage Users</button>
          <button className="kt-btn info sm" onClick={() => window.location.href = '/admin/models'}>🧩 Model Management</button>
          <button className="kt-btn outline sm" onClick={fetchDashboardStats}>🔄 Refresh Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
