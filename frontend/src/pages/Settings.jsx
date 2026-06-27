import { useEffect, useMemo, useState } from "react";
import {
  FiUser,
  FiShield,
  FiLock,
  FiSave,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import api from "../api/axios";

const styles = `
.settings-page {
  width: 100%;
  min-height: 100%;
  padding: 18px;
  background: #f8fafc;
  color: #0f172a;
}

.settings-header-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 22px;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.settings-title-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.settings-title-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: 0 0 auto;
}

.settings-title {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.settings-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.settings-refresh-btn {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.settings-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.2fr;
  gap: 18px;
}

.settings-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
}

.settings-card-head {
  padding: 18px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex: 0 0 auto;
}

.settings-card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
}

.settings-card-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.settings-card-body {
  padding: 18px;
}

.user-profile-box {
  display: grid;
  gap: 14px;
}

.user-avatar-large {
  width: 78px;
  height: 78px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2563eb, #22c55e);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 900;
}

.user-main-name {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.user-main-role {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.user-detail-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.user-detail-item {
  background: #f8fafc;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.user-detail-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.user-detail-value {
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  text-align: right;
  word-break: break-word;
}

.settings-form {
  display: grid;
  gap: 15px;
}

.settings-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.settings-form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.settings-form-group label {
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

.settings-input {
  width: 100%;
  height: 44px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 13px;
  padding: 0 13px;
  font-size: 14px;
  outline: none;
}

.settings-input:focus {
  border-color: #2563eb;
  background: #ffffff;
}

.password-input-wrap {
  position: relative;
}

.password-input-wrap .settings-input {
  padding-right: 44px;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.settings-info-box {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e40af;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
  display: flex;
  gap: 10px;
}

.settings-message {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 9px;
}

.settings-message.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.settings-message.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.settings-save-btn {
  border: none;
  background: #2563eb;
  color: #ffffff;
  height: 44px;
  padding: 0 18px;
  border-radius: 13px;
  font-weight: 900;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settings-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-cancel-btn {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  height: 44px;
  padding: 0 18px;
  border-radius: 13px;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .settings-form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 12px;
  }

  .settings-header-card {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }

  .settings-title {
    font-size: 22px;
  }

  .settings-refresh-btn,
  .settings-save-btn,
  .settings-cancel-btn {
    width: 100%;
    justify-content: center;
  }

  .settings-actions {
    flex-direction: column-reverse;
  }

  .user-detail-item {
    flex-direction: column;
  }

  .user-detail-value {
    text-align: left;
  }
}
`;

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatRole(role) {
  if (!role) return "-";
  return String(role)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStoredUser() {
  const keys = [
    "aerostate_loyalty_user",
    "aerostate_user",
    "user",
    "currentUser",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Ignore invalid localStorage value.
    }
  }

  return null;
}

function saveStoredUser(updatedUser) {
  const keys = [
    "aerostate_loyalty_user",
    "aerostate_user",
    "user",
    "currentUser",
  ];

  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        localStorage.setItem(
          key,
          JSON.stringify({
            ...parsed,
            ...updatedUser,
          })
        );
      }
    } catch {
      // Ignore invalid localStorage value.
    }
  });
}

async function fetchUserProfile() {
  const urls = ["/users/me", "/me", "/auth/me", "/profile"];

  for (const url of urls) {
    try {
      const response = await api.get(url);
      return response.data;
    } catch {
      // Try next endpoint.
    }
  }

  return null;
}

async function updateUserProfile(payload) {
  const urls = ["/users/me", "/me", "/auth/me", "/profile"];

  for (const url of urls) {
    try {
      const response = await api.put(url, payload);
      return response.data;
    } catch {
      // Try next endpoint.
    }
  }

  throw new Error("No profile update endpoint found.");
}

function Settings() {
  const storedUser = useMemo(() => getStoredUser(), []);

  const [user, setUser] = useState(storedUser || {});
  const [username, setUsername] = useState(storedUser?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const userInitial = safeText(user.username || username || "U", "U")
    .charAt(0)
    .toUpperCase();

  const loadProfile = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const profile = await fetchUserProfile();

      if (profile) {
        const normalizedUser = profile.user || profile.data || profile;

        setUser(normalizedUser);
        setUsername(normalizedUser.username || "");
        saveStoredUser(normalizedUser);
      } else if (storedUser) {
        setUser(storedUser);
        setUsername(storedUser.username || "");
      }
    } catch (error) {
      console.error("Profile load error:", error);
      setMessage("Unable to load user profile. Showing saved login details.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setUsername(user.username || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setMessage("Username is required.");
      setMessageType("error");
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setMessage("Current password is required to change password.");
        setMessageType("error");
        return;
      }

      if (!newPassword) {
        setMessage("New password is required.");
        setMessageType("error");
        return;
      }

      if (newPassword.length < 6) {
        setMessage("New password must be at least 6 characters.");
        setMessageType("error");
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage("New password and confirm password do not match.");
        setMessageType("error");
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");
      setMessageType("");

      const payload = {
        username: cleanUsername,
      };

      if (currentPassword && newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const response = await updateUserProfile(payload);
      const updatedUser = response.user || response.data || response;

      const finalUser = {
        ...user,
        ...updatedUser,
        username: updatedUser.username || cleanUsername,
      };

      setUser(finalUser);
      setUsername(finalUser.username || cleanUsername);
      saveStoredUser(finalUser);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage("Settings updated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Profile update error:", error);

      const backendMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to update settings. Please check backend profile API.";

      setMessage(backendMessage);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <style>{styles}</style>

      <div className="settings-header-card">
        <div className="settings-title-wrap">
          <div className="settings-title-icon">
            <FiShield />
          </div>

          <div>
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">
              View your account details and update username or password.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="settings-refresh-btn"
          onClick={loadProfile}
          disabled={loading}
        >
          <FiRefreshCw />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon">
              <FiUser />
            </div>

            <div>
              <h2 className="settings-card-title">User Details</h2>
              <p className="settings-card-subtitle">
                Current logged in account information.
              </p>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="user-profile-box">
              <div className="user-avatar-large">{userInitial}</div>

              <div>
                <h3 className="user-main-name">
                  {safeText(user.username || username)}
                </h3>
                <p className="user-main-role">
                  {formatRole(user.role || user.user_role)}
                </p>
              </div>

              <div className="user-detail-list">

                <div className="user-detail-item">
                  <span className="user-detail-label">Username</span>
                  <span className="user-detail-value">
                    {safeText(user.username || username)}
                  </span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Role</span>
                  <span className="user-detail-value">
                    {formatRole(user.role || user.user_role)}
                  </span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Status</span>
                  <span className="user-detail-value">
                    {user.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon">
              <FiLock />
            </div>

            <div>
              <h2 className="settings-card-title">Account Security</h2>
              <p className="settings-card-subtitle">
                Update username and change password safely.
              </p>
            </div>
          </div>

          <div className="settings-card-body">
            <form className="settings-form" onSubmit={handleSave}>
              {message && (
                <div className={`settings-message ${messageType}`}>
                  {messageType === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
                  {message}
                </div>
              )}

              <div className="settings-info-box">
                <FiAlertCircle />
                <span>
                  To change only username, leave password fields empty. To change
                  password, enter current password, new password and confirm password.
                </span>
              </div>

              <div className="settings-form-group">
                <label>Username</label>
                <input
                  className="settings-input"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="settings-form-group">
                <label>Current Password</label>
                <div className="password-input-wrap">
                  <input
                    className="settings-input"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Enter current password"
                  />

                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group">
                  <label>New Password</label>
                  <div className="password-input-wrap">
                    <input
                      className="settings-input"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password"
                    />

                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((value) => !value)}
                    >
                      {showNewPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label>Confirm Password</label>
                  <div className="password-input-wrap">
                    <input
                      className="settings-input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm new password"
                    />

                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-cancel-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="settings-save-btn"
                  disabled={saving}
                >
                  <FiSave />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;