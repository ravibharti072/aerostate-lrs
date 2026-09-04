import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPackage,
  FiUserPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiShield,
  FiCheck,
  FiCopy,
  FiUsers,
  FiShoppingBag,
  FiLock,
  FiArrowRight
} from "react-icons/fi";

import api from "../../../api/axios";
import PortalHeader from "../../../components/portalheader/PortalHeader";
import StatCard from "../../../components/statcard/StatCard";
import ModuleWriternHeader from "../../../components/modulewriternheader/ModuleWriternHeader";
import SuperAdminSidebar from "../sidebar/SuperAdminSidebar";
import "./onboardClient.css";

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.stores)) return payload.stores;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function OnboardClient() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Exact fields matching SQLAlchemy Store & User models
  const [formData, setFormData] = useState({
    name: "",
    business_type: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    admin_username: "",
    admin_password: "",
  });

  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentSuperAdmin = (() => {
    try {
      const raw = localStorage.getItem("aerostate_loyalty_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : { username: "SuperAdmin", role: "SuperAdmin" };
    } catch {
      return { username: "SuperAdmin", role: "SuperAdmin" };
    }
  })();

  const fetchOverviewData = async () => {
    try {
      setDataLoading(true);
      const [usersRes, storesRes] = await Promise.allSettled([
        api.get("/superadmin/users", { timeout: 10000 }),
        api.get("/stores/", { timeout: 10000 }),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        setUsers(normalizeList(usersRes.value.data));
      }
      if (storesRes.status === "fulfilled" && storesRes.value?.data) {
        setStores(normalizeList(storesRes.value.data));
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const summary = useMemo(() => {
    return {
      totalClients: users.length,
      activeStores: stores.filter((s) => s.is_active !== false).length,
      activeAdmins: users.filter((u) => u.is_active !== false && String(u.role || "").toLowerCase() === "admin").length,
      superAdmins: users.filter((u) => String(u.role || "").toLowerCase() === "superadmin").length,
    };
  }, [users, stores]);

  const recentClients = useMemo(() => {
    return users.slice(0, 4);
  }, [users]);

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(", ");
    }
    if (typeof detail === "string") return detail;
    return err?.message || fallback;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      business_type: "",
      owner_name: "",
      owner_phone: "",
      owner_email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      admin_username: "",
      admin_password: "",
    });
  };

  const handleCreateShopAndAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");

      // 1. Create Store in SQLAlchemy stores table
      const storePayload = {
        name: formData.name,
        business_type: formData.business_type || null,
        owner_name: formData.owner_name || null,
        owner_phone: formData.owner_phone || null,
        owner_email: formData.owner_email || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        is_active: true,
      };

      const storeResponse = await api.post("/stores/", storePayload, { timeout: 15000 });
      const storeId = storeResponse.data?.id || storeResponse.data?.store_id;
      if (!storeId) throw new Error("Store was created but store ID was not returned.");

      // 2. Create Admin User for this store in SQLAlchemy users table
      const adminPayload = {
        username: formData.admin_username,
        password: formData.admin_password,
        store_id: storeId,
        role: "Admin",
        is_active: true,
      };

      const adminResponse = await api.post("/superadmin/create-client/", adminPayload, { timeout: 15000 });
      const createdUserId = adminResponse.data?.id || adminResponse.data?.user_id || "Created";

      setCreatedCredentials({
        store_id: storeId,
        user_id: createdUserId,
        ...formData,
      });

      setMessage("Store and client admin credentials provisioned successfully.");
      resetForm();
      fetchOverviewData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to provision client account."));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Shop: ${createdCredentials.name}\nStore ID: ${createdCredentials.store_id}\nUsername: ${createdCredentials.admin_username}\nPassword: ${createdCredentials.admin_password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("aerostate_loyalty_token");
    localStorage.removeItem("aerostate_loyalty_user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="super-admin-layout-container">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="onboard-client"
        onTabChange={() => navigate("/superadmin")}
        onNavigateRoute={(path) => navigate(path)}
        onOpenCredentials={() => {}}
        user={currentSuperAdmin}
        onLogout={handleLogout}
      />

      <div className="lrs-main-content">
        <main className="super-admin-content onboard-client-scope">
          <PortalHeader
            title="Onboard Client & Credentials"
            kicker="LRS SUPERADMIN CONTROL PANEL"
            description="Register client store nodes, assign administrator accounts, and generate secure portal credentials."
            showBack={true}
            backPath="/superadmin"
          />

          {message && <div className="alert success-alert"><FiCheckCircle size={18} />{message}</div>}
          {error && <div className="alert error-alert"><FiAlertCircle size={18} />{error}</div>}

          {/* 4 STAT CARDS - FLOATING CUSTOMER DIRECTORY STYLE */}
          <div className="dir-stats-grid">
            <StatCard
              title="Total Clients"
              value={summary.totalClients}
              Icon={FiUsers}
              colorTheme="blue"
            />
            <StatCard
              title="Active Stores"
              value={summary.activeStores}
              Icon={FiShoppingBag}
              colorTheme="green"
            />
            <StatCard
              title="Active Admins"
              value={summary.activeAdmins}
              Icon={FiShield}
              colorTheme="purple"
            />
            <StatCard
              title="SuperAdmins"
              value={summary.superAdmins}
              Icon={FiLock}
              colorTheme="orange"
            />
          </div>

          {/* PROVISIONING FORM & CREDENTIALS SECTION */}
          <section className="onboard-form-section">
            <ModuleWriternHeader
              title="Provision Client Account"
              description="Configure new merchant node details and assign master administrator credentials."
              badgeCount="New"
              badgeLabel="Onboarding"
            />

            <div className="top-grid">
              <form className="admin-card create-card" onSubmit={handleCreateShopAndAdmin}>
                <div className="card-title">
                  <FiPackage size={21} />
                  <h2>Store / Tenant Profile</h2>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Shop / Business Name *</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Acme Retail"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Type *</label>
                    <input
                      name="business_type"
                      value={formData.business_type}
                      onChange={handleChange}
                      placeholder="e.g. Retail, Grocery, Hardware"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Full Name *</label>
                    <input
                      name="owner_name"
                      value={formData.owner_name}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Kumar"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Phone Number *</label>
                    <input
                      name="owner_phone"
                      value={formData.owner_phone}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Email</label>
                    <input
                      type="email"
                      name="owner_email"
                      value={formData.owner_email}
                      onChange={handleChange}
                      placeholder="owner@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Shop #12, Market Complex"
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="6-digit PIN"
                    />
                  </div>
                </div>

                <div className="section-divider" />

                <div className="card-title small-title">
                  <FiUserPlus size={20} />
                  <h2>Assign Admin Login Credentials</h2>
                </div>

                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>Admin Username *</label>
                    <input
                      name="admin_username"
                      value={formData.admin_username}
                      onChange={handleChange}
                      placeholder="e.g. acme_admin"
                      required
                    />
                  </div>
                  <div className="form-group password-group">
                    <label>Admin Password *</label>
                    <div className="password-wrapper">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        name="admin_password"
                        value={formData.admin_password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowAdminPassword((p) => !p)}
                      >
                        {showAdminPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button className="primary-btn" type="submit" disabled={loading}>
                  {loading ? "Provisioning Client..." : "Provision Client & Create Account"}
                </button>
              </form>

              <div className="admin-card credentials-card">
                <div className="card-title">
                  <FiCheckCircle size={21} />
                  <h2>Generated Credentials</h2>
                </div>

                {createdCredentials ? (
                  <div className="credential-box">
                    <div className="credential-row">
                      <span>Shop Name</span>
                      <strong>{createdCredentials.name}</strong>
                    </div>
                    <div className="credential-row">
                      <span>Store ID</span>
                      <strong>#{createdCredentials.store_id}</strong>
                    </div>
                    <div className="credential-row">
                      <span>Username</span>
                      <strong>{createdCredentials.admin_username}</strong>
                    </div>
                    <div className="credential-row password-row">
                      <span>Password</span>
                      <strong>{createdCredentials.admin_password}</strong>
                    </div>

                    <button
                      type="button"
                      className="sa-copy-btn"
                      onClick={handleCopyCredentials}
                    >
                      {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
                      {copied ? "Copied to Clipboard!" : "Copy Credentials"}
                    </button>

                    <div className="login-note">
                      Client admin can log in immediately with these credentials.
                    </div>
                  </div>
                ) : (
                  <div className="empty-box">
                    Newly created shop details and credentials will appear here after creation.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RECENT 4 CLIENT ENTRIES SECTION */}
          <section className="recent-clients-section">
            <div className="recent-section-header">
              <ModuleWriternHeader
                title="Recently Onboarded Clients"
                description="Latest tenant accounts and merchant stores provisioned on the platform."
                badgeCount={recentClients.length}
                badgeLabel="recent"
              />
            </div>

            <div className="recent-clients-grid">
              {recentClients.map((client) => {
                const storeName = client.store?.name || client.store_name || "Unassigned Store";
                const initial = String(client.username || "C").charAt(0).toUpperCase();

                return (
                  <div className="recent-client-card" key={client.id || client.username}>
                    <div className="rcc-header">
                      <div className="rcc-user-wrap">
                        <div className="rcc-avatar">{initial}</div>
                        <div>
                          <h4 className="rcc-name">{client.username}</h4>
                          <span className="rcc-sub">ID: #{client.id || "—"}</span>
                        </div>
                      </div>
                      <span className={`rcc-status ${client.is_active !== false ? "active" : "inactive"}`}>
                        {client.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="rcc-body">
                      <span className="rcc-store-tag">{storeName}</span>
                      <span className="rcc-role-tag">{client.role || "Admin"}</span>
                    </div>

                    <div className="rcc-footer">
                      <span className="rcc-plan-name">{client.plan_name || "Standard Merchant"}</span>
                      <button
                        type="button"
                        className="rcc-view-btn"
                        onClick={() => navigate("/superadmin/client-directory")}
                      >
                        Details <FiArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}