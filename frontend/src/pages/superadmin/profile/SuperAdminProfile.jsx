import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiLock,
  FiShield,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiKey,
  FiMail
} from "react-icons/fi";

import api from "../../../api/axios";
import PortalHeader from "../../../components/portalheader/PortalHeader";
import SuperAdminSidebar from "../sidebar/SuperAdminSidebar";
import "./superAdminProfile.css";

export default function SuperAdminProfile() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authenticated SuperAdmin state
  const currentSuperAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem("aerostate_loyalty_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : { username: "SuperAdmin", role: "SuperAdmin" };
    } catch {
      return { username: "SuperAdmin", role: "SuperAdmin" };
    }
  }, []);

  const [formData, setFormData] = useState({
    person_name: currentSuperAdmin?.person_name || currentSuperAdmin?.name || "",
    username: currentSuperAdmin?.username || "",
    email: currentSuperAdmin?.email || "",
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Redirect if no active token
  useEffect(() => {
    const token =
      localStorage.getItem("aerostate_loyalty_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");
    if (!token) {
      navigate("/superadmin/login", { replace: true });
    }
  }, [navigate]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getApiErrorMessage = (error, fallback = "Something went wrong.") => {
    const detail = error?.response?.data?.detail;
    if (!detail) return error?.response?.data?.message || fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((err) => err?.msg || err?.message || JSON.stringify(err)).join("\n");
    }
    return String(detail);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.current_password) {
      showToast("Please enter your current password to authorize changes.", "error");
      return;
    }

    if (formData.new_password && formData.new_password !== formData.confirm_new_password) {
      showToast("New password and confirm password do not match.", "error");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        person_name: formData.person_name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim() || null,
        current_password: formData.current_password,
        new_password: formData.new_password || null,
      };

      // Call SuperAdmin profile update endpoint
      const response = await api.put("/superadmin/profile", payload);

      // Update local storage session
      const updatedUser = {
        ...currentSuperAdmin,
        username: formData.username.trim(),
        person_name: formData.person_name.trim(),
        email: formData.email.trim(),
      };

      if (response.data?.access_token) {
        localStorage.setItem("aerostate_loyalty_token", response.data.access_token);
      }
      localStorage.setItem("aerostate_loyalty_user", JSON.stringify(updatedUser));

      showToast("SuperAdmin profile and credentials updated successfully!", "success");

      // Reset password fields
      setFormData((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_new_password: "",
      }));
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to update profile credentials."), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aerostate_loyalty_token");
    localStorage.removeItem("aerostate_loyalty_user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/superadmin/login", { replace: true });
  };

  return (
    <div className="super-admin-layout-container">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="/superadmin/profile"
        onTabChange={() => navigate("/superadmin")}
        onNavigateRoute={(path) => navigate(path)}
        onOpenCredentials={() => {}}
        user={currentSuperAdmin}
        onLogout={handleLogout}
      />

      <div className="lrs-main-content">
        <main className="super-admin-content">
          {toast && (
            <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
              {toast.type === "error" ? <FiAlertCircle size={16} /> : <FiCheckCircle size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          <PortalHeader
            title="SuperAdmin Profile & Security"
            kicker="LRS SUPERADMIN CONTROL PANEL"
            description="Manage your root master identity, primary portal username, and system password credentials."
            icon={FiKey}
            backPath="/superadmin"
          />

          <div className="profile-grid-container">
            {/* Form Card */}
            <form className="admin-card profile-card" onSubmit={handleSubmit}>
              <div className="card-section-header">
                <FiUser size={20} className="section-header-icon" />
                <div>
                  <h2>Personal & Account Identity</h2>
                  <p>Update personal operator details and portal login identifier.</p>
                </div>
              </div>

              <div className="profile-form-grid">
                <div className="form-group">
                  <label>Operator Full Name *</label>
                  <input
                    type="text"
                    name="person_name"
                    value={formData.person_name}
                    onChange={handleChange}
                    placeholder="e.g. Ravi Bharti"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Portal Username / Login ID *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g. ravibharti072@gmail.com"
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Notification / Contact Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. admin@aerostate.io"
                  />
                </div>
              </div>

              <div className="profile-divider" />

              <div className="card-section-header">
                <FiLock size={20} className="section-header-icon" />
                <div>
                  <h2>Change Master Password</h2>
                  <p>Leave new password blank if you only wish to update identity fields.</p>
                </div>
              </div>

              <div className="profile-form-grid">
                <div className="form-group">
                  <label>New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleChange}
                      placeholder="Enter new master password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_new_password"
                    value={formData.confirm_new_password}
                    onChange={handleChange}
                    placeholder="Repeat new master password"
                  />
                </div>
              </div>

              <div className="profile-divider" />

              <div className="auth-verification-box">
                <div className="form-group" style={{ maxWidth: "420px" }}>
                  <label style={{ color: "#0f172a", fontWeight: 700 }}>
                    Current SuperAdmin Password *
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleChange}
                      placeholder="Verify current password to commit"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
                <p className="auth-hint">
                  Your current credentials are required to verify master administrator identity before applying changes.
                </p>
              </div>

              <div className="profile-actions-bar">
                <button
                  type="submit"
                  className="sa-save-btn"
                  disabled={loading}
                >
                  <FiSave size={16} />
                  <span>{loading ? "Committing Changes..." : "Save Profile & Credentials"}</span>
                </button>
              </div>
            </form>

            {/* Side Overview Card */}
            <div className="admin-card profile-info-card">
              <div className="profile-badge-summary">
                <div className="profile-avatar-large">
                  {String(formData.person_name || formData.username || "S").charAt(0).toUpperCase()}
                </div>
                <h3>{formData.person_name || "SuperAdmin Operator"}</h3>
                <span className="role-pill SuperAdmin">Root SuperAdmin</span>
              </div>

              <div className="info-summary-list">
                <div className="summary-item">
                  <span className="label">Active Identifier</span>
                  <strong className="value">{formData.username}</strong>
                </div>
                <div className="summary-item">
                  <span className="label">Platform Scope</span>
                  <strong className="value">All Stores & Tenants</strong>
                </div>
                <div className="summary-item">
                  <span className="label">Security Tier</span>
                  <strong className="value">Level 0 Master Node</strong>
                </div>
              </div>

              <div className="security-notice-box">
                <FiShield size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>
                  Updating your SuperAdmin username will require logging in with the new identifier during next session.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}