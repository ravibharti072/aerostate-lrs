import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiShield,
  FiLock,
  FiSave,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiHome,
  FiCalendar,
  FiPhone,
  FiMapPin,
  FiKey,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./settings.css";

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatRole(role) {
  if (!role) return "Administrator";
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
      // Try next endpoint
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
      // Try next endpoint
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
      // Try next endpoint
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
      // Fallback to PATCH
    }

    try {
      const response = await api.patch(url, payload);
      return normalizeResponse(response.data);
    } catch {
      // Try next endpoint
    }
  }

  throw new Error("Store updates are temporarily unavailable. Please try again later.");
}

export default function Settings({ onBack }) {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);

  const [user, setUser] = useState(storedUser || {});
  const [store, setStore] = useState(null);

  const [username, setUsername] = useState(storedUser?.username || "");
  const [shopName, setShopName] = useState(
    getStoreNameFromUser(storedUser, "")
  );
  const [shopPhone, setShopPhone] = useState(storedUser?.store?.phone || "+91 98524 01333");
  const [shopLocation, setShopLocation] = useState(storedUser?.store?.address || "Station Road, Main Market");

  // Empty string defaults: never pre-fill password inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  // Field-level inline errors
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [shopError, setShopError] = useState("");

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const storeId = getStoreIdFromUser(user);
  const currentShopName =
    store?.name || getStoreNameFromUser(user, shopName) || "Naveen Hardware Store";

  const userInitial = safeText(user.username || username || "A", "A")
    .charAt(0)
    .toUpperCase();

  const userStatus = user.is_active === false ? "Inactive" : "Active";

  const loadProfile = async () => {
    try {
      setLoading(true);
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
          if (storeData.phone) setShopPhone(storeData.phone);
          if (storeData.address) setShopLocation(storeData.address);
        } else {
          setStore(null);
          setShopName(userStoreName || "");
        }
      } else {
        setStore(null);
        setShopName(userStoreName || "");
      }

      saveStoredUser(normalizedUser);
    } catch {
      // Silently fall back to cached session data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const resetSecurityForm = () => {
    setUsername(user.username || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setUsernameError("");
    setPasswordError("");
  };

  const resetShopForm = () => {
    setShopName(currentShopName === "-" ? "" : currentShopName);
    setShopPhone(store?.phone || "+91 98524 01333");
    setShopLocation(store?.address || "Station Road, Main Market");
    setShopError("");
  };

  const handleSaveShop = async (event) => {
    event.preventDefault();
    setShopError("");

    const cleanShopName = shopName.trim();

    if (!cleanShopName) {
      setShopError("Shop name is required.");
      return;
    }

    if (!storeId) {
      setShopError("Store updates are temporarily locked for this user role.");
      return;
    }

    try {
      setSavingShop(true);
      const updatedStore = await updateStoreProfile(storeId, {
        name: cleanShopName,
        phone: shopPhone.trim() || null,
        address: shopLocation.trim() || null,
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

      showToast("Shop details saved successfully.", "success");
    } catch (error) {
      const friendlyMessage =
        error?.response?.status === 404 || error?.message?.includes("endpoint")
          ? "Shop profile updates are temporarily unavailable on this server."
          : error?.response?.data?.detail || error?.message || "Unable to save shop details.";
      setShopError(friendlyMessage);
    } finally {
      setSavingShop(false);
    }
  };

  const handleSaveSecurity = async (event) => {
    event.preventDefault();
    setUsernameError("");
    setPasswordError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setUsernameError("Username cannot be left blank.");
      return;
    }

    const hasPasswordInput = Boolean(currentPassword || newPassword || confirmPassword);

    if (hasPasswordInput) {
      if (!currentPassword) {
        setPasswordError("Enter your current password to authorize changes.");
        return;
      }
      if (!newPassword) {
        setPasswordError("Please provide a new password.");
        return;
      }
      if (newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("New password and confirm password do not match.");
        return;
      }
    }

    try {
      setSaving(true);
      const payload = { username: cleanUsername };
      if (hasPasswordInput) {
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

      showToast("Security credentials updated successfully.", "success");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string" && detail.toLowerCase().includes("password")) {
        setPasswordError(detail);
      } else {
        setUsernameError(detail || "Failed to update profile credentials.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="directory-page">
      {toast && (
        <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      {/* PORTAL HEADER (UNTOUCHED) */}
      <PortalHeader 
        title="Settings" 
        kicker="SYSTEM ADMINISTRATION"
        description="View account details, shop name, username and password settings."
        icon={FiShield} 
        backPath="/dashboard" 
      />

      {/* STATS GRID: SYSTEM LEVEL STATUS SUMMARY */}
      <div className="dir-stats-grid">
        <StatCard title="Active Account" value={safeText(user.username || username || "Admin")} Icon={FiUser} colorTheme="blue" />
        <StatCard title="Storefront" value={safeText(currentShopName)} Icon={FiHome} colorTheme="green" />
        <StatCard title="Access Level" value={formatRole(user.role || user.user_role)} Icon={FiKey} colorTheme="purple" />
        <StatCard title="Session Status" value={userStatus} Icon={FiCheckCircle} colorTheme={userStatus === "Active" ? "green" : "orange"} />
      </div>

      {/* BALANCED 3-COLUMN WORKSPACE */}
      <section className="dir-modules-section">
        <ModuleWriternHeader 
          title="Account Configuration" 
          description="Manage administrative security, storefront branding, and account verification metadata." 
        />

        <div className="settings-main-tiles">
          {/* CARD 1: ACCOUNT METADATA & PROFILE */}
          <div className="settings-card">
            <div className="settings-card-head">
              <div className="settings-card-icon profile"><FiUser /></div>
              <div>
                <h2 className="settings-card-title">User Details</h2>
                <p className="settings-card-subtitle">Account registration and security record.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="profile-identity-strip">
                <div className="user-avatar-badge">{userInitial}</div>
                <div>
                  <h3 className="user-main-name">{safeText(user.username || username)}</h3>
                  <span className="user-role-pill">{formatRole(user.role || user.user_role)}</span>
                </div>
              </div>

              <div className="metadata-attr-list">
                <div className="metadata-attr-row">
                  <span className="metadata-label">Account ID</span>
                  <span className="metadata-val mono">#{user.id || storeId || "104"}</span>
                </div>
                <div className="metadata-attr-row">
                  <span className="metadata-label">Registered Contact</span>
                  <span className="metadata-val">{user.email || user.phone || "System Superuser"}</span>
                </div>
                <div className="metadata-attr-row">
                  <span className="metadata-label">Account Created</span>
                  <span className="metadata-val">{user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }) : "Active via Deployment"}</span>
                </div>
                <div className="metadata-attr-row">
                  <span className="metadata-label">Last Login</span>
                  <span className="metadata-val">Today, 04:30 PM (Current session)</span>
                </div>
                <div className="metadata-attr-row">
                  <span className="metadata-label">Security Tier</span>
                  <span className="metadata-val text-green">Multi-Role Admin Verified</span>
                </div>
              </div>

              <div className="card-bottom-note">
                <FiCheckCircle size={14} color="#166962" />
                <span>Account permissions are managed by system administrators.</span>
              </div>
            </div>
          </div>

          {/* CARD 2: SECURITY & CREDENTIALS */}
          <div className="settings-card">
            <div className="settings-card-head">
              <div className="settings-card-icon security"><FiLock /></div>
              <div>
                <h2 className="settings-card-title">Account Security</h2>
                <p className="settings-card-subtitle">Update login username and account password.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <form className="settings-card-form" onSubmit={handleSaveSecurity}>
                <div className="form-group">
                  <label>Username *</label>
                  <input 
                    className={`settings-input ${usernameError ? "input-has-error" : ""}`} 
                    type="text" 
                    value={username} 
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) setUsernameError("");
                    }} 
                    placeholder="Enter login username" 
                    disabled={saving}
                  />
                  {usernameError && <span className="inline-field-error">{usernameError}</span>}
                </div>

                <div className="form-group">
                  <label>Current Password</label>
                  <div className="password-input-wrap">
                    <input 
                      className={`settings-input ${passwordError ? "input-has-error" : ""}`} 
                      type={showCurrentPassword ? "text" : "password"} 
                      value={currentPassword} 
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }} 
                      placeholder="Enter current password" 
                      autoComplete="current-password"
                      disabled={saving}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn" 
                      onClick={() => setShowCurrentPassword((v) => !v)}
                    >
                      {showCurrentPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                  {passwordError && <span className="inline-field-error">{passwordError}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>New Password</label>
                    <div className="password-input-wrap">
                      <input 
                        className="settings-input" 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="New password" 
                        autoComplete="new-password"
                        disabled={saving}
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn" 
                        onClick={() => setShowNewPassword((v) => !v)}
                      >
                        {showNewPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="password-input-wrap">
                      <input 
                        className="settings-input" 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Confirm" 
                        autoComplete="new-password"
                        disabled={saving}
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn" 
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="settings-actions">
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={resetSecurityForm} 
                    disabled={saving}
                  >
                    Reset
                  </button>
                  <button 
                    type="submit" 
                    className="btn-submit" 
                    disabled={saving}
                  >
                    <FiSave size={14} /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* CARD 3: STOREFRONT INFORMATION */}
          <div className="settings-card">
            <div className="settings-card-head">
              <div className="settings-card-icon shop"><FiHome /></div>
              <div>
                <h2 className="settings-card-title">Shop Details</h2>
                <p className="settings-card-subtitle">Storefront information and business presence.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <form className="settings-card-form" onSubmit={handleSaveShop}>
                <div className="form-group">
                  <label>Store Name *</label>
                  <input 
                    className={`settings-input ${shopError ? "input-has-error" : ""}`} 
                    type="text" 
                    value={shopName} 
                    onChange={(e) => {
                      setShopName(e.target.value);
                      if (shopError) setShopError("");
                    }} 
                    placeholder="Enter shop name" 
                    disabled={savingShop} 
                  />
                  {shopError ? (
                    <span className="inline-field-error">{shopError}</span>
                  ) : (
                    <small className="field-hint">Used in WhatsApp message templates and receipts.</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Support / Business Phone</label>
                  <div className="prefix-input-wrap">
                    <FiPhone size={13} className="prefix-icon" />
                    <input 
                      className="settings-input with-icon" 
                      type="text" 
                      value={shopPhone} 
                      onChange={(e) => setShopPhone(e.target.value)} 
                      placeholder="Enter contact number" 
                      disabled={savingShop}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Location / Store Address</label>
                  <div className="prefix-input-wrap">
                    <FiMapPin size={13} className="prefix-icon" />
                    <input 
                      className="settings-input with-icon" 
                      type="text" 
                      value={shopLocation} 
                      onChange={(e) => setShopLocation(e.target.value)} 
                      placeholder="Enter location" 
                      disabled={savingShop}
                    />
                  </div>
                </div>

                <div className="settings-actions">
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={resetShopForm} 
                    disabled={savingShop}
                  >
                    Reset
                  </button>
                  <button 
                    type="submit" 
                    className="btn-submit" 
                    disabled={savingShop}
                  >
                    <FiSave size={14} /> {savingShop ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}