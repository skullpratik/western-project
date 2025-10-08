import React, { useEffect, useMemo, useState } from 'react';
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
import '../../Admin/Dashboard/Dashboard.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, ArcElement, BarElement, Tooltip, Legend);

const UserDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalModels: 0, recentActivity: [] });

  useEffect(() => {
    // Try to fetch models count available to users
    const load = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const models = await res.json();
          setStats((s) => ({ ...s, totalModels: models.length || 0 }));
        }
      } catch (_) {}
    };
    load();
  }, []);

  const StatCard = ({ title, value, icon }) => (
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

  const chartColors = {
    primary: 'rgba(99,102,241,0.9)',
    primaryLine: 'rgba(99,102,241,0.3)',
    success: 'rgba(16,185,129,0.9)',
    warning: 'rgba(245,158,11,0.9)',
    info: 'rgba(14,165,233,0.9)'
  };

  const activityChartData = useMemo(() => {
    const labels = (stats.recentActivity || []).map(a => a._id).slice(-10);
    const values = (stats.recentActivity || []).map(a => a.count).slice(-10);
    return {
      labels: labels.length ? labels : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [
        {
          label: 'Actions',
          data: values.length ? values : [2,5,3,6,4,1,2],
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
    labels: ['Users'],
    datasets: [
      {
        data: [1],
        backgroundColor: [chartColors.info],
        borderWidth: 0,
        hoverOffset: 6
      }
    ]
  }), []);

  const activeUserData = useMemo(() => ({
    labels: ['You'],
    datasets: [
      {
        label: 'Activity',
        data: [stats.totalModels || 0],
        backgroundColor: [chartColors.success],
        borderRadius: 6,
        maxBarThickness: 42
      }
    ]
  }), [stats.totalModels]);

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } } }
  };

  return (
    <div className="dashboard">
      <div style={{marginBottom:'16px'}}>
        <h1 style={{fontSize:'18px', fontWeight:'700', color:'var(--kt-text)', marginBottom:'4px'}}>Dashboard</h1>
        <p style={{color:'var(--kt-text-soft)', fontSize:'13px'}}>Welcome back, {user?.name || 'User'}!</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Your Role" value={(user?.role || 'user').toUpperCase()} icon="🧑" />
        <StatCard title="Models" value={stats.totalModels} icon="🎯" />
        <StatCard title="Recent Actions" value={'—'} icon="📄" />
      </div>

      <div className="kt-charts-grid">
        <div className="kt-card">
          <div className="kt-chart-title">📈 Activity</div>
          <div style={{height:'180px'}}>
            <Line data={activityChartData} options={baseOptions} />
          </div>
        </div>
        <div className="kt-card">
          <div className="kt-chart-title">🧩 Role</div>
          <div style={{height:'180px', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Doughnut data={userRoleData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
        <div className="kt-card">
          <div className="kt-chart-title">📦 Models Available</div>
          <div style={{height:'180px'}}>
            <Bar data={activeUserData} options={baseOptions} />
          </div>
        </div>
      </div>

      <div className="kt-card">
        <div style={{fontSize:'12px', fontWeight:'600', color:'var(--kt-text-soft)', marginBottom:'12px'}}>🎯 Quick Actions</div>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
          <a className="kt-btn primary sm" href="/user/viewer">🧭 Open Viewer</a>
          <a className="kt-btn outline sm" href="/user/change-password">🔒 Change Password</a>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
