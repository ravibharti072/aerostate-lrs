import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
  FiUser,
  FiLoader
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import "./login.css";

const AerostateLogo = () => {
  return (
    <div className="asl-logo-wrapper">
      <img
        src="/logo.png"
        alt="Aerostate Logo"
        className="asl-brand-logo-img"
      />
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [credentials, setCredentials] = useState({
    userId: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (error) setError("");
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const username = credentials.userId.trim();

    if (!username || !credentials.password) {
      setError("Please enter your User ID and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      await login(username, credentials.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login Error:", err);

      if (err.code === "ECONNABORTED") {
        setError("Login request timeout. Please check backend server.");
      } else if (err.response?.status === 401) {
        setError("Incorrect User ID or password.");
      } else if (err.response?.status === 403) {
        setError(
          err.response?.data?.detail ||
            "This user account is deactivated or unauthorized."
        );
      } else if (err.response?.status === 404) {
        setError("Login API not found. Please verify backend URL.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Incorrect User ID or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="asl-login-page">
      {/* Left Branding Panel (#0a1120) */}
      <section className="asl-brand-panel">
        <div className="asl-brand-content">
          <div className="asl-brand-main">
            <AerostateLogo />

            <div className="asl-brand-meta">
              <p className="asl-brand-kicker">Aerostate Lab</p>
              <h1>Loyalty Reward System (LRS)</h1>
              <p className="asl-brand-text">
                Loyalty reward, customer points, redemption, payout,
                WhatsApp messaging, and reporting in one secure platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="asl-form-panel">
        <div className="asl-login-card">
          <div className="asl-login-header">
            <h2>Welcome Back</h2>
            <p>Login to manage your store operations.</p>
          </div>

          <form onSubmit={handleSubmit} className="asl-login-form" noValidate>
            {/* User ID Field */}
            <div className="asl-field-group">
              <label htmlFor="userId">User ID</label>
              <div className={`asl-input-wrap ${error ? "has-error" : ""}`}>
                <FiUser className="asl-input-icon" />
                <input
                  id="userId"
                  type="text"
                  name="userId"
                  value={credentials.userId}
                  onChange={handleChange}
                  autoComplete="username"
                  placeholder="Enter your user ID"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="asl-field-group">
              <div className="asl-label-row">
                <label htmlFor="password">Password</label>
                <a
                  href="#forgot-password"
                  className="asl-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact your administrator to reset your login credentials.");
                  }}
                >
                  Forgot password?
                </a>
              </div>

              <div className={`asl-input-wrap ${error ? "has-error" : ""}`}>
                <FiLock className="asl-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="asl-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Inline Error State */}
            {error && (
              <div className="asl-inline-error">
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              className="asl-login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FiLoader className="asl-spinner" size={17} />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <FiArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Clean Security Footer */}
          <div className="asl-secure-note">
            <FiShield size={14} />
            <span>Secure access for authorized store users only.</span>
          </div>
        </div>
      </section>
    </main>
  );
}