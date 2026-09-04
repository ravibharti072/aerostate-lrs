import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShield,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUser,
  FiLoader,
  FiArrowRight
} from "react-icons/fi";

import api from "../../../api/axios";
import "./superAdminLogin.css";

const AerostateLogo = () => {
  return (
    <div className="sa-logo-wrapper">
      <img
        src="/logo.png"
        alt="Aerostate Logo"
        className="sa-brand-logo-img"
      />
    </div>
  );
};

export default function SuperAdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("aerostate_loyalty_token");
    const rawUser = localStorage.getItem("aerostate_loyalty_user");
    if (token && rawUser) {
      try {
        const user = JSON.parse(rawUser);
        const role = String(user?.role || "").toLowerCase();
        if (role === "superadmin" || user?.loginType === "superadmin") {
          navigate("/superadmin", { replace: true });
        }
      } catch {
        localStorage.removeItem("aerostate_loyalty_token");
        localStorage.removeItem("aerostate_loyalty_user");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const form = new URLSearchParams();
      form.append("username", username.trim());
      form.append("password", password);

      const response = await api.post("/superadmin/token", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const token = response.data?.access_token;
      if (!token) throw new Error("Access token missing from server response.");

      const userData = {
        username: username.trim(),
        role: "SuperAdmin",
        loginType: "superadmin",
      };

      localStorage.setItem("aerostate_loyalty_token", token);
      localStorage.setItem("aerostate_loyalty_user", JSON.stringify(userData));

      navigate("/superadmin", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d?.msg || d?.message || JSON.stringify(d)).join(", "));
      } else {
        setError("Invalid SuperAdmin credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="sa-login-page">
      {/* Left Branding Panel (#0a1120) */}
      <section className="sa-brand-panel">
        <div className="sa-brand-content">
          <div className="sa-brand-main">
            <AerostateLogo />

            <div className="sa-brand-meta">
              <p className="sa-brand-kicker">Aerostate Lab</p>
              <h1>LRS SuperAdmin</h1>
              <p className="sa-brand-text">
                Centralized multi-tenant management, merchant provisioning,
                license control, and administrative system orchestration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="sa-form-panel">
        <div className="sa-login-card">
          <div className="sa-login-header">
            <h2>SuperAdmin Access</h2>
            <p>Authenticate with master credentials to proceed.</p>
          </div>

          <form onSubmit={handleSubmit} className="sa-login-form" noValidate>
            {/* Username Field */}
            <div className="sa-field-group">
              <label htmlFor="saUsername">SuperAdmin Username</label>
              <div className={`sa-input-wrap ${error ? "has-error" : ""}`}>
                <FiUser className="sa-input-icon" />
                <input
                  id="saUsername"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    if (error) setError("");
                    setUsername(e.target.value);
                  }}
                  autoComplete="username"
                  placeholder="Enter username"
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="sa-field-group">
              <label htmlFor="saPassword">Master Password</label>
              <div className={`sa-input-wrap ${error ? "has-error" : ""}`}>
                <FiLock className="sa-input-icon" />
                <input
                  id="saPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    if (error) setError("");
                    setPassword(e.target.value);
                  }}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="sa-password-toggle"
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
              <div className="sa-inline-error">
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              className="sa-login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FiLoader className="sa-spinner" size={17} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Access</span>
                  <FiArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Clean Security Footer */}
          <div className="sa-secure-note">
            <FiShield size={14} />
            <span>Protected Area • Aerostate Lab Security Protocols</span>
          </div>
        </div>
      </section>
    </main>
  );
}