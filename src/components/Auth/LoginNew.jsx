// src/components/Auth/Login.jsx - Separate User/Admin Login
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export function Login() {
  const { login: authLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCustomLogin, setShowCustomLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Quick login handlers
  const handleQuickLogin = async (userType) => {
    setLoading(true);
    setError("");
    
    try {
      if (userType === 'admin') {
        await authLogin("admin@example.com", "admin123");
      } else {
        // Default user login
        await authLogin("user@example.com", "user123");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Custom login handler
  const handleCustomLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await authLogin(email, password);
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (showCustomLogin) {
    return (
      <div className="login-container">
        <div className="login-card custom-login">
          <div className="login-header">
            <h1>Custom Login</h1>
            <button 
              className="back-btn"
              onClick={() => setShowCustomLogin(false)}
            >
              ← Back
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>3D Configurator</h1>
          <p>Choose your access level</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="login-options">
          <div className="login-option user-login">
            <div className="option-icon">👤</div>
            <h3>User Access</h3>
            <p>View and interact with 3D models</p>
            <button 
              className="btn btn-user"
              onClick={() => handleQuickLogin('user')}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login as User"}
            </button>
          </div>

          <div className="login-option admin-login">
            <div className="option-icon">⚡</div>
            <h3>Admin Access</h3>
            <p>Full system administration</p>
            <button 
              className="btn btn-admin"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login as Admin"}
            </button>
          </div>
        </div>

        <div className="custom-login-link">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowCustomLogin(true)}
          >
            Custom Login
          </button>
        </div>

        <div className="demo-info">
          <p>Demo Credentials:</p>
          <small>Admin: admin@example.com / admin123</small><br/>
          <small>User: user@example.com / user123</small>
        </div>
      </div>
    </div>
  );
}
