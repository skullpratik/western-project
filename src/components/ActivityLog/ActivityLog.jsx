import React, { useState, useEffect } from "react";
import { getActivityLogs, deleteActivityForUser, getUserConfigs, deleteUserConfig } from "../../api/user";
import { useAuth } from '../../context/AuthContext';
import './ActivityLog.css';

export function ActivityLog({ user: propUser, userId: propUserId = null, onClose, ...props }) {
  // Prefer an explicitly passed `user` prop, otherwise fall back to AuthContext.
  const { user: ctxUser } = useAuth() || {};
  const user = propUser || ctxUser || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(propUserId);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [userConfigs, setUserConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

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
      let filtered = (response.logs || []).filter((l) => l.action !== 'MODEL_LOADED' && l.action !== 'model-change');

      // Consolidate multiple TEXTURE_APPLIED events with same texture and timestamp into Global Texture Applied
      const consolidatedLogs = [];
      const textureGroups = new Map();

      filtered.forEach(log => {
        if (log.action === 'TEXTURE_APPLIED' && log.details?.textureSource) {
          const key = `${log.modelName}_${log.details.textureSource}_${new Date(log.timestamp).getTime()}`;
          if (!textureGroups.has(key)) {
            textureGroups.set(key, {
              logs: [],
              timestamp: log.timestamp,
              modelName: log.modelName,
              ipAddress: log.ipAddress,
              userName: log.userName,
              userEmail: log.userEmail
            });
          }
          textureGroups.get(key).logs.push(log);
        } else {
          consolidatedLogs.push(log);
        }
      });

      // Process texture groups
      textureGroups.forEach(group => {
        if (group.logs.length > 1) {
          // Multiple textures with same source - consolidate into Global Texture Applied
          consolidatedLogs.push({
            _id: `consolidated_${group.logs[0]._id}`,
            action: 'Global Texture Applied',
            timestamp: group.timestamp,
            modelName: group.modelName,
            ipAddress: group.ipAddress,
            userName: group.userName,
            userEmail: group.userEmail,
            details: {
              textureSource: group.logs[0].details.textureSource,
              appliedParts: group.logs.map(log => log.details.partName),
              partCount: group.logs.length,
              mappingConfig: group.logs[0].details.mappingConfig,
              widgetType: 'texture'
            }
          });
        } else {
          // Single texture - keep as TEXTURE_APPLIED
          consolidatedLogs.push(group.logs[0]);
        }
      });

      // Sort by timestamp (newest first)
      consolidatedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setLogs(consolidatedLogs);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserConfigs = async (userId) => {
    try {
      setLoadingConfigs(true);
      const configs = await getUserConfigs(userId);
      setUserConfigs(configs);
      setShowConfigModal(true);
    } catch (error) {
      console.error("Error fetching user configs:", error);
      alert("Failed to load user configurations");
    } finally {
      setLoadingConfigs(false);
    }
  };

  const deleteConfig = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUserConfig(configId);
      // Remove the deleted config from the state
      setUserConfigs(prevConfigs => prevConfigs.filter(config => config._id !== configId));
      alert('Configuration deleted successfully');
    } catch (error) {
      console.error("Error deleting config:", error);
      alert("Failed to delete configuration");
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
      "Global Texture Applied": "#10b981",
      DOOR: "#2196f3",
      DRAWER: "#9c27b0",
      LIGHT: "#ffc107",
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
          <div style={{ display: 'flex', gap: '8px' }}>
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

      {/* Activity Table */}
      <div className="activity-table-container">
        <table className="activity-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Model</th>
              <th>Timestamp</th>
              <th>Details</th>
              {user.role === "admin" && <th>IP Address</th>}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="activity-row">
                <td>
                  <div className="action-badge" style={{ backgroundColor: getActionColor(log.action) }}>
                    {log.action}
                  </div>
                </td>
                <td>
                  <div className="model-info">
                    {log.modelName && <div>{log.modelName}</div>}
                  </div>
                </td>
                <td className="activity-time">
                  {formatDate(log.timestamp)}
                </td>
                <td>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="activity-details-json">
                      <details>
                        <summary>View Details</summary>
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </td>
                {user.role === "admin" && (
                  <td className="ip-address">{log.ipAddress}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* User Configurations Modal */}
      {showConfigModal && (
        <div className="activity-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="activity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="activity-modal-header">
              <h3>User Saved Configurations</h3>
              <button 
                className="activity-modal-close" 
                onClick={() => setShowConfigModal(false)}
              >
                ×
              </button>
            </div>
            <div className="activity-modal-content">
              {loadingConfigs ? (
                <div className="loading">Loading configurations...</div>
              ) : userConfigs.length === 0 ? (
                <div className="no-configs">
                  <p>No saved configurations found for this user</p>
                </div>
              ) : (
                <>
                  <div className="config-summary">
                    <p><strong>Total Configurations:</strong> {userConfigs.length}</p>
                    <p><strong>Models Used:</strong> {[...new Set(userConfigs.map(c => c.modelName))].join(', ')}</p>
                  </div>
                  <div className="config-list">
                    {userConfigs.map((config) => (
                      <div key={config._id} className="config-item">
                        <div className="config-header">
                          <span className="config-model">{config.modelName}</span>
                          <span className="config-date">
                            {new Date(config.updatedAt).toLocaleDateString()}
                          </span>
                          <button 
                            className="kt-btn danger sm config-delete-btn" 
                            onClick={() => deleteConfig(config._id)}
                            title="Delete this configuration"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="config-details">
                          <small>ID: {config._id}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}