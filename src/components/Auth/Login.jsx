import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export function Login() {
  const { login: authLogin } = useAuth();
  const [userLoading, setUserLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCustomLogin, setShowCustomLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Quick login handlers
  const handleQuickLogin = async (userType) => {
    setError("");
    
    if (userType === 'admin') {
      setAdminLoading(true);
    } else {
      setUserLoading(true);
    }
    
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
      setUserLoading(false);
      setAdminLoading(false);
    }
  };

  // Custom auth handler (login/register)
  const handleCustomLogin = async (e) => {
    e.preventDefault();
    setUserLoading(true);
    setError("");
    
    try {
      if (isRegistering) {
        const response = await fetch(`/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Registration failed");
        }
        // Auto-login after register
        await authLogin(email, password);
      } else {
        await authLogin(email, password);
      }
    } catch (error) {
      console.error("Custom auth error:", error);
      setError(error.message || (isRegistering ? "Registration failed." : "Login failed. Please check your credentials."));
    } finally {
      setUserLoading(false);
    }
  };

  if (showCustomLogin) {
    return (
      <div className="login-container">
        <div className="login-card custom-login">
          <div className="login-header">
            <h1>{isRegistering ? "Create Account" : "Custom Login"}</h1>
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
            {isRegistering && (
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}
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
              disabled={userLoading}
            >
              {userLoading ? (isRegistering ? "Creating..." : "Logging in...") : (isRegistering ? "Register" : "Login")}
            </button>

            <div className="custom-login-link" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
              </button>
            </div>
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
              disabled={userLoading || adminLoading}
            >
              {userLoading ? "Logging in..." : "Login as User"}
            </button>
          </div>

          <div className="login-option admin-login">
            <div className="option-icon">⚡</div>
            <h3>Admin Access</h3>
            <p>Full system administration</p>
            <button 
              className="btn btn-admin"
              onClick={() => handleQuickLogin('admin')}
              disabled={userLoading || adminLoading}
            >
              {adminLoading ? "Logging in..." : "Login as Admin"}
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
