import React, { useState, useEffect } from "react";
import { getActivityLogs, deleteActivityForUser } from "../../api/user";
import { useAuth } from '../../context/AuthContext';

export function ActivityLog({ user: propUser, userId: propUserId = null, onClose, ...props }) {
  // Prefer an explicitly passed `user` prop, otherwise fall back to AuthContext.
  const { user: ctxUser } = useAuth() || {};
  const user = propUser || ctxUser || {};
  const [logs, setLogs] = useState([]);
  // Stats removed per request — we no longer display aggregate action stats here
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(propUserId);

  useEffect(() => {
    // Include selectedUserId into filters for fetching logs
    const combinedFilters = { ...filters };
    if (selectedUserId) combinedFilters.userId = selectedUserId;
    fetchLogs(combinedFilters);
  }, [page, filters, selectedUserId]);

  const fetchLogs = async (overrideFilters = {}) => {
    try {
      setLoading(true);
      const query = { ...filters, ...overrideFilters, page, limit: 15 };
      const response = await getActivityLogs(query);
      // Filter out noisy client-side MODEL_LOADED events from display
      const filtered = (response.logs || []).filter((l) => l.action !== 'MODEL_LOADED');
      setLogs(filtered);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // fetchStats removed — component no longer shows aggregate stats

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getActionColor = (action) => {
    const actionColors = {
      LOGIN: "#4caf50",
      LOGOUT: "#f44336",
      TEXTURE: "#ff9800",
      DOOR: "#2196f3",
      DRAWER: "#9c27b0",
      LIGHT: "#ffeb3b",
      PRESET: "#673ab7",
      ERROR: "#f44336",
      default: "#607d8b"
    };

    for (const [key, color] of Object.entries(actionColors)) {
      if (action.includes(key)) return color;
    }
    return actionColors.default;
  };

  if (loading) return <div className="loading">Loading activity logs...</div>;

  return (
    <div className="activity-log-container">
      <div className="activity-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <h2>Activity History</h2>
          {user.role === "admin" && (
            <span className="user-role-badge">Admin View</span>
          )}
        </div>
        {/* If viewing a specific user's activity, allow admin to delete those logs */}
        {user.role === 'admin' && selectedUserId && (
          <div>
            <button className="kt-btn danger sm" onClick={async () => {
              if (!window.confirm('Permanently delete all activity logs for this user?')) return;
              try {
                const json = await deleteActivityForUser(selectedUserId);
                alert(`Deleted ${json.deletedCount} activity logs for user`);
                // Refresh list
                setSelectedUserId(null);
                fetchLogs();
              } catch (err) {
                // Enhanced debugging output
                console.error('Error deleting user activity logs:', err);
                if (err.response) {
                  console.error('Response status:', err.response.status);
                  console.error('Response data:', err.response.data);
                  alert(`Failed to delete logs: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
                } else {
                  alert(`Failed to delete logs: ${err.message}`);
                }
              }
            }}>Delete logs for this user</button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {/* Stats intentionally removed per admin request */}

      {/* Filters - Only for admin */}
      {user.role === "admin" && (
        <div className="activity-filters">
          <input
            type="text"
            placeholder="Filter by action..."
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          />
          <input
            type="date"
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            placeholder="Start date"
          />
          <input
            type="date"
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            placeholder="End date"
          />
        </div>
      )}

      {/* Activity List */}
      <div className="activity-list">
        {logs.map((log) => (
          <div key={log._id} className="activity-item">
            <div className="activity-header">
              <div className="action-badge" style={{ backgroundColor: getActionColor(log.action) }}>
                {log.action}
              </div>
              <span className="activity-time">{formatDate(log.timestamp)}</span>
            </div>
            
            <div className="activity-details">
              <div className="user-info">
                <strong className="user-clickable" onClick={() => setSelectedUserId(log.userId)} style={{cursor:'pointer', textDecoration:'underline'}}>{log.userName}</strong>
                <span className="user-email">{log.userEmail}</span>
                {user.role === "admin" && (
                  <span className="ip-address">IP: {log.ipAddress}</span>
                )}
              </div>

              {(log.modelName || log.partName) && (
                <div className="model-info">
                  {log.modelName && <span>Model: {log.modelName}</span>}
                  {log.partName && <span>Part: {log.partName}</span>}
                </div>
              )}

              {log.details && Object.keys(log.details).length > 0 && (
                <div className="activity-details-json">
                  <details>
                    <summary>Details</summary>
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          
          <span>Page {page} of {totalPages}</span>
          
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {logs.length === 0 && !loading && (
        <div className="no-activities">
          <p>No activities found</p>
        </div>
      )}
    </div>
  );
}