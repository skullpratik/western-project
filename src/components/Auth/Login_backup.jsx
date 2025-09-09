// src/components/Auth/Login.jsx - Separate Admin/User Login
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export function Login() {
  const { login: authLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomLogin, setShowCustomLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Quick login for admin
  const handleAdminLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      await authLogin("admin@example.com", "admin123");
    } catch (error) {
      console.error("Admin login error:", error);
      setError("Admin login failed. Please check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Quick login for demo user
  const handleUserLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Try to login with a demo user, if not exists, create one
      try {
        await authLogin("user@example.com", "user123");
      } catch (loginError) {
        // If user doesn't exist, create demo user first
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            name: "Demo User", 
            email: "user@example.com", 
            password: "user123" 
          }),
        });

        if (response.ok) {
          // Now login with the created user
          await authLogin("user@example.com", "user123");
        } else {
          throw new Error("Failed to create demo user");
        }
      }
    } catch (error) {
      console.error("User login error:", error);
      setError("User login failed. Please check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Custom login form submission
  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (isRegistering) {
        // Handle registration
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();
        localStorage.setItem("token", data.token);
        window.location.reload();
      } else {
        await authLogin(email, password);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError(error.message || 
              (isRegistering ? "Registration failed." : "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  if (showCustomLogin) {
    // Custom login form
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>{isRegistering ? "Create Account" : "Custom Login"}</h2>
            <button 
              className="back-btn"
              onClick={() => setShowCustomLogin(false)}
            >
              ← Back
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleCustomSubmit} className="login-form">
            {isRegistering && (
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Processing..." : (isRegistering ? "Register" : "Login")}
            </button>
          </form>

          <div className="login-footer">
            <button 
              type="button" 
              className="link-btn"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main login selection screen
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>3D Configurator</h1>
          <p>Choose your login option</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="login-options">
          <button 
            className="login-option admin-option"
            onClick={handleAdminLogin}
            disabled={loading}
          >
            <div className="option-icon">👑</div>
            <div className="option-content">
              <h3>Admin Login</h3>
              <p>Access admin panel with full control</p>
              <small>admin@example.com</small>
            </div>
          </button>

          <button 
            className="login-option user-option"
            onClick={handleUserLogin}
            disabled={loading}
          >
            <div className="option-icon">👤</div>
            <div className="option-content">
              <h3>Demo User Login</h3>
              <p>Try the 3D configurator as a user</p>
              <small>user@example.com</small>
            </div>
          </button>

          <button 
            className="login-option custom-option"
            onClick={() => setShowCustomLogin(true)}
            disabled={loading}
          >
            <div className="option-icon">🔑</div>
            <div className="option-content">
              <h3>Custom Login</h3>
              <p>Login with your own credentials</p>
              <small>Use existing account or register</small>
            </div>
          </button>
        </div>

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Logging in...</p>
          </div>
        )}
      </div>
    </div>
  );
}