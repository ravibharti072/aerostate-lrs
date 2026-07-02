import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiUser,
  FiShield,
  FiLock,
  FiSave,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheckCircle,
  FiHome,
} from "react-icons/fi";
import api from "../api/axios";

const styles = `
.settings-page {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
  overflow-x: hidden;
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
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.settings-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.settings-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
  height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  flex: 0 0 auto;
}

.settings-back-btn:hover {
  background: #dbeafe;
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

.settings-title-wrap {
  min-width: 0;
}

.settings-title {
  margin: 0;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.settings-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
}

.settings-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.settings-summary-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.settings-summary-icon {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 21px;
  flex: 0 0 auto;
}

.settings-summary-icon.green {
  background: #ecfdf5;
  color: #059669;
}

.settings-summary-icon.orange {
  background: #fff7ed;
  color: #ea580c;
}

.settings-summary-label {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.settings-summary-value {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
  word-break: break-word;
}

.settings-main-tiles {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(460px, 1.35fr) minmax(300px, 0.9fr);
  gap: 18px;
  align-items: stretch;
}

.settings-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-card-head {
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  min-height: 78px;
  box-sizing: border-box;
}

.settings-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 15px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex: 0 0 auto;
}

.settings-card-icon.shop {
  background: #ecfdf5;
  color: #059669;
}

.settings-card-title {
  margin: 0;
  font-size: 19px;
  font-weight: 950;
  color: #0f172a;
}

.settings-card-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
}

.settings-card-body {
  padding: 20px;
  background: #ffffff;
  flex: 1;
}

.settings-card-body form {
  height: 100%;
}

.settings-card-body .settings-form {
  height: 100%;
}

.settings-card:nth-child(2) .settings-form,
.settings-shop-card .settings-form {
  display: flex;
  flex-direction: column;
}

.settings-card:nth-child(2) .settings-actions,
.settings-shop-card .settings-actions {
  margin-top: auto;
}

.user-profile-box {
  display: grid;
  gap: 14px;
  height: 100%;
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
  font-weight: 950;
}

.user-main-name {
  margin: 0;
  font-size: 22px;
  font-weight: 950;
  color: #0f172a;
}

.user-main-role {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 800;
}

.user-detail-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.user-detail-item {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.user-detail-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.user-detail-value {
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
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
  font-weight: 950;
}

.settings-input {
  width: 100%;
  height: 44px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  color: #0f172a;
  font-weight: 750;
}

.settings-input:focus {
  border-color: #2563eb;
  background: #ffffff;
}

.settings-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
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
  font-weight: 800;
  line-height: 1.5;
  display: flex;
  gap: 10px;
}

.settings-message {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 850;
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
  font-weight: 950;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
}

.settings-save-btn.shop {
  background: #059669;
  box-shadow: 0 10px 22px rgba(5, 150, 105, 0.16);
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
  font-weight: 950;
  cursor: pointer;
}

.shop-summary-card {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  border-radius: 16px;
  padding: 15px;
  margin-bottom: 15px;
}

.shop-summary-label {
  margin: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.shop-summary-name {
  margin: 8px 0 0;
  color: #1e3a8a;
  font-size: 22px;
  font-weight: 950;
  word-break: break-word;
}

.shop-summary-id {
  margin: 6px 0 0;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 850;
}

@media (max-width: 1550px) {
  .settings-main-tiles {
    grid-template-columns: minmax(280px, 1fr) minmax(420px, 1.25fr);
    align-items: stretch;
  }

  .settings-shop-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1200px) {
  .settings-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-main-tiles {
    grid-template-columns: 1fr;
  }

  .settings-shop-card {
    grid-column: auto;
  }
}

@media (max-width: 1024px) {
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

  .settings-header-left {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .settings-back-btn,
  .settings-save-btn,
  .settings-cancel-btn {
    width: 100%;
    justify-content: center;
  }

  .settings-title {
    font-size: 23px;
  }

  .settings-title-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .settings-summary-grid,
  .settings-main-tiles {
    grid-template-columns: 1fr;
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

  .settings-card-head {
    align-items: flex-start;
  }
}

@media (max-width: 420px) {
  .settings-page {
    padding: 10px;
  }

  .settings-header-left {
    flex-direction: column;
  }

  .settings-title {
    font-size: 22px;
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

function normalizeResponse(data) {
  return data?.store || data?.user || data?.data || data;
}

function getStoreIdFromUser(user) {
  return user?.store_id || user?.store?.id || null;
}

function getStoreNameFromUser(user, fallback = "") {
  return (
    user?.store_name ||
    user?.store?.name ||
    user?.shop_name ||
    user?.business_name ||
    fallback ||
    ""
  );
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

async function fetchStoreProfile(storeId) {
  if (!storeId) return null;

  const urls = [`/stores/${storeId}`, `/stores/${storeId}/`];

  for (const url of urls) {
    try {
      const response = await api.get(url);
      return normalizeResponse(response.data);
    } catch {
      // Try next endpoint.
    }
  }

  return null;
}

async function updateStoreProfile(storeId, payload) {
  if (!storeId) {
    throw new Error("Store ID not found for this user.");
  }

  const urls = [`/stores/${storeId}`, `/stores/${storeId}/`];

  for (const url of urls) {
    try {
      const response = await api.put(url, payload);
      return normalizeResponse(response.data);
    } catch {
      // Try PATCH fallback.
    }

    try {
      const response = await api.patch(url, payload);
      return normalizeResponse(response.data);
    } catch {
      // Try next endpoint.
    }
  }

  throw new Error("No store update endpoint found.");
}

function Settings({ onBack }) {
  const storedUser = useMemo(() => getStoredUser(), []);

  const [user, setUser] = useState(storedUser || {});
  const [store, setStore] = useState(null);

  const [username, setUsername] = useState(storedUser?.username || "");
  const [shopName, setShopName] = useState(
    getStoreNameFromUser(storedUser, "")
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [shopMessage, setShopMessage] = useState("");
  const [shopMessageType, setShopMessageType] = useState("");

  const storeId = getStoreIdFromUser(user);
  const currentShopName =
    store?.name || getStoreNameFromUser(user, shopName) || "-";

  const userInitial = safeText(user.username || username || "U", "U")
    .charAt(0)
    .toUpperCase();

  const userStatus = user.is_active === false ? "Inactive" : "Active";

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.location.href = "/dashboard";
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");
      setShopMessage("");
      setShopMessageType("");

      const profile = await fetchUserProfile();

      let normalizedUser = storedUser || {};

      if (profile) {
        normalizedUser = profile.user || profile.data || profile;
      }

      setUser(normalizedUser);
      setUsername(normalizedUser.username || "");

      const detectedStoreId = getStoreIdFromUser(normalizedUser);
      const userStoreName = getStoreNameFromUser(normalizedUser, "");

      if (userStoreName) {
        setShopName(userStoreName);
      }

      if (detectedStoreId) {
        const storeData = await fetchStoreProfile(detectedStoreId);

        if (storeData) {
          setStore(storeData);
          setShopName(storeData.name || userStoreName || "");
        } else {
          setStore(null);
          setShopName(userStoreName || "");
        }
      } else {
        setStore(null);
        setShopName(userStoreName || "");
      }

      saveStoredUser(normalizedUser);
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

  const resetShopForm = () => {
    setShopName(currentShopName === "-" ? "" : currentShopName);
    setShopMessage("");
    setShopMessageType("");
  };

  const handleSaveShop = async (event) => {
    event.preventDefault();

    const cleanShopName = shopName.trim();

    if (!cleanShopName) {
      setShopMessage("Shop name is required.");
      setShopMessageType("error");
      return;
    }

    if (!storeId) {
      setShopMessage("Store ID not found for this user.");
      setShopMessageType("error");
      return;
    }

    try {
      setSavingShop(true);
      setShopMessage("");
      setShopMessageType("");

      const updatedStore = await updateStoreProfile(storeId, {
        name: cleanShopName,
      });

      const finalStore = {
        ...(store || {}),
        ...updatedStore,
        id: updatedStore?.id || storeId,
        name: updatedStore?.name || cleanShopName,
      };

      const finalUser = {
        ...user,
        store_id: storeId,
        store_name: finalStore.name,
        store: {
          ...(user.store || {}),
          id: storeId,
          name: finalStore.name,
        },
      };

      setStore(finalStore);
      setUser(finalUser);
      setShopName(finalStore.name);
      saveStoredUser(finalUser);

      setShopMessage("Shop name updated successfully.");
      setShopMessageType("success");
    } catch (error) {
      console.error("Shop update error:", error);

      const backendMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to update shop name. Please check backend store API.";

      setShopMessage(backendMessage);
      setShopMessageType("error");
    } finally {
      setSavingShop(false);
    }
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

      <section className="settings-header-card">
        <div className="settings-header-left">
          <button type="button" className="settings-back-btn" onClick={handleBack}>
            <FiArrowLeft />
            Back
          </button>

          <div className="settings-title-icon">
            <FiShield />
          </div>

          <div className="settings-title-wrap">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">
              View account details, shop name, username and password settings.
            </p>
          </div>
        </div>
      </section>

      <section className="settings-summary-grid">
        <SummaryCard
          icon={<FiUser />}
          label="Username"
          value={safeText(user.username || username)}
        />

        <SummaryCard
          icon={<FiHome />}
          label="Shop Name"
          value={safeText(currentShopName)}
          tone="green"
        />

        <SummaryCard
          icon={<FiShield />}
          label="Role"
          value={formatRole(user.role || user.user_role)}
        />

        <SummaryCard
          icon={<FiCheckCircle />}
          label="Status"
          value={userStatus}
          tone={userStatus === "Active" ? "green" : "orange"}
        />
      </section>

      <section className="settings-main-tiles">
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
                  <span className="user-detail-label">Shop Name</span>
                  <span className="user-detail-value">
                    {safeText(currentShopName)}
                  </span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Store ID</span>
                  <span className="user-detail-value">{safeText(storeId)}</span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Status</span>
                  <span className="user-detail-value">{userStatus}</span>
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
                  {messageType === "success" ? (
                    <FiCheckCircle />
                  ) : (
                    <FiAlertCircle />
                  )}
                  {message}
                </div>
              )}

              <div className="settings-info-box">
                <FiAlertCircle />
                <span>
                  To change only username, leave password fields empty. To
                  change password, enter current password, new password and
                  confirm password.
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
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm new password"
                    />

                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
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

        <div className="settings-card settings-shop-card">
          <div className="settings-card-head">
            <div className="settings-card-icon shop">
              <FiHome />
            </div>

            <div>
              <h2 className="settings-card-title">Shop Details</h2>
              <p className="settings-card-subtitle">
                View and update your shop / store name.
              </p>
            </div>
          </div>

          <div className="settings-card-body">
            <form className="settings-form" onSubmit={handleSaveShop}>
              {shopMessage && (
                <div className={`settings-message ${shopMessageType}`}>
                  {shopMessageType === "success" ? (
                    <FiCheckCircle />
                  ) : (
                    <FiAlertCircle />
                  )}
                  {shopMessage}
                </div>
              )}

              <div className="shop-summary-card">
                <p className="shop-summary-label">Current Shop Name</p>
                <h3 className="shop-summary-name">
                  {safeText(currentShopName)}
                </h3>
                <p className="shop-summary-id">Store ID: {safeText(storeId)}</p>
              </div>

              <div className="settings-form-group">
                <label>Shop Name</label>
                <input
                  className="settings-input"
                  type="text"
                  value={shopName}
                  onChange={(event) => setShopName(event.target.value)}
                  placeholder="Enter shop name"
                  disabled={!storeId || savingShop}
                />
              </div>

              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-cancel-btn"
                  onClick={resetShopForm}
                  disabled={savingShop}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="settings-save-btn shop"
                  disabled={savingShop || !storeId}
                >
                  <FiSave />
                  {savingShop ? "Saving..." : "Save Shop Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone = "blue" }) {
  return (
    <div className="settings-summary-card">
      <div className={`settings-summary-icon ${tone}`}>{icon}</div>
      <div>
        <p className="settings-summary-label">{label}</p>
        <p className="settings-summary-value">{value}</p>
      </div>
    </div>
  );
}

export default Settings;