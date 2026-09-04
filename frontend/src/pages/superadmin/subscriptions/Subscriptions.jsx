import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiEdit2,
  FiX,
  FiCheck,
  FiPackage,
  FiCalendar,
  FiClock,
  FiUserCheck,
  FiShield,
  FiDollarSign
} from "react-icons/fi";

import api from "../../../api/axios";
import PortalHeader from "../../../components/portalheader/PortalHeader";
import StatCard from "../../../components/statcard/StatCard";
import ModuleWriternHeader from "../../../components/modulewriternheader/ModuleWriternHeader";
import SuperAdminSidebar from "../sidebar/SuperAdminSidebar";
import "./subscriptions.css";

const defaultPlans = [
  {
    id: 1,
    name: "Aerostate Annual Standard",
    setup_cost: 50000,
    yearly_charge: 8000,
    duration_days: 365,
    billing_period: "1 Year",
    features: [
      "Dedicated Merchant Store Node",
      "Full Loyalty & POS Reward Entry",
      "Item Master & SKU Points System",
      "WhatsApp Cloud Automation API",
      "365 Days Tech Maintenance Included"
    ],
  },
  {
    id: 2,
    name: "Enterprise Multi-Store",
    setup_cost: 100000,
    yearly_charge: 15000,
    duration_days: 365,
    billing_period: "1 Year",
    features: [
      "Multi-Branch Central Architecture",
      "Custom ERP & POS Synchronization",
      "Priority WhatsApp Delivery Node",
      "Dedicated Technical SLA Support"
    ],
  },
];

export default function Subscriptions() {
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState("clients");
  const [plans] = useState(defaultPlans);
  const [clientSubscriptions, setClientSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: "",
    username: "",
    plan_name: "Aerostate Annual Standard",
    subscription_start: "",
    subscription_end: "",
    setup_cost: 50000,
    yearly_charge: 8000,
    is_active: true,
  });

  const currentSuperAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem("aerostate_loyalty_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : { username: "SuperAdmin", role: "SuperAdmin" };
    } catch {
      return { username: "SuperAdmin", role: "SuperAdmin" };
    }
  }, []);

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

  const isSuperAdminRole = (role) => {
    const r = String(role || "").toLowerCase();
    return r === "superadmin" || r === "super_admin";
  };

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/superadmin/users", { timeout: 10000 });
      const rawUsers = Array.isArray(res.data)
        ? res.data
        : res.data?.users || res.data?.data || [];

      const today = new Date();

      const mapped = rawUsers.map((u) => {
        const isRoot = isSuperAdminRole(u.role);

        if (isRoot) {
          return {
            ...u,
            plan_name: "Platform Master",
            subscription_start: null,
            subscription_end: null,
            setup_cost: 0,
            yearly_charge: 0,
            is_expired: false,
            is_active: true,
            is_root: true,
          };
        }

        const start = u.subscription_start || today.toISOString().split("T")[0];
        const defaultEnd = new Date(new Date(start).getTime() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const end = u.subscription_end || defaultEnd;
        const isExpired = new Date(end) < today;

        return {
          ...u,
          plan_name: u.plan_name || "Aerostate Annual Standard",
          subscription_start: start,
          subscription_end: end,
          setup_cost: u.setup_cost ?? 50000,
          yearly_charge: u.yearly_charge ?? 8000,
          is_expired: isExpired,
          is_active: isExpired ? false : u.is_active !== false,
          is_root: false,
        };
      });

      setClientSubscriptions(mapped);
    } catch {
      showToast("Unable to load client subscription data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const getRemainingDays = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const openAssignModal = (client) => {
    if (client.is_root) {
      showToast("SuperAdmin master account maintains permanent platform authorization.", "info");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const startDate = client.subscription_start || todayStr;
    const defaultEndDate = new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    setAssignForm({
      user_id: client.id,
      username: client.username,
      plan_name: client.plan_name || "Aerostate Annual Standard",
      subscription_start: startDate,
      subscription_end: client.subscription_end || defaultEndDate,
      setup_cost: client.setup_cost ?? 50000,
      yearly_charge: client.yearly_charge ?? 8000,
      is_active: client.is_active,
    });
    setIsAssignModalOpen(true);
  };

  const handleStartDateChange = (newStart) => {
    if (newStart) {
      const calculatedEnd = new Date(new Date(newStart).getTime() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      setAssignForm((prev) => ({
        ...prev,
        subscription_start: newStart,
        subscription_end: calculatedEnd,
      }));
    } else {
      setAssignForm((prev) => ({ ...prev, subscription_start: newStart }));
    }
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    try {
      const isExpired = new Date(assignForm.subscription_end) < new Date();
      const updatedActiveStatus = isExpired ? false : assignForm.is_active;

      const payload = {
        plan_name: assignForm.plan_name,
        subscription_start: assignForm.subscription_start,
        subscription_end: assignForm.subscription_end,
        setup_cost: Number(assignForm.setup_cost),
        yearly_charge: Number(assignForm.yearly_charge),
        is_active: updatedActiveStatus,
      };

      await api.put(`/superadmin/users/${assignForm.user_id}`, payload);

      setClientSubscriptions((prev) =>
        prev.map((c) =>
          c.id === assignForm.user_id
            ? {
                ...c,
                ...payload,
                is_expired: isExpired,
                is_active: updatedActiveStatus,
              }
            : c
        )
      );

      showToast("Subscription and commercial licensing terms updated successfully.");
      setIsAssignModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to commit subscription update.";
      showToast(msg, "error");
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

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clientSubscriptions;
    const q = searchTerm.toLowerCase();
    return clientSubscriptions.filter(
      (c) =>
        (c.username || "").toLowerCase().includes(q) ||
        (c.store?.name || c.store_name || "").toLowerCase().includes(q) ||
        (c.plan_name || "").toLowerCase().includes(q)
    );
  }, [clientSubscriptions, searchTerm]);

  return (
    <div className="super-admin-layout-container">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="/superadmin/subscriptions"
        onTabChange={() => navigate("/superadmin")}
        onNavigateRoute={(path) => navigate(path)}
        onOpenCredentials={() => navigate("/superadmin/profile")}
        user={currentSuperAdmin}
        onLogout={handleLogout}
      />

      <div className="lrs-main-content">
        <div className="directory-page subscriptions-scope">
          {toast && (
            <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
              {toast.type === "error" ? <FiAlertCircle size={16} /> : <FiCheckCircle size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          <PortalHeader
            title="Subscriptions & Commercial Licensing"
            kicker="SUPERADMIN CONTROL PANEL"
            description="Manage client software setup fees (₹50k), yearly license fees (₹8k), and account auto-deactivations."
            icon={FiCreditCard}
            backPath="/superadmin"
            rightAction={
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className={`sub-tab-btn ${currentTab === "clients" ? "active" : ""}`}
                  onClick={() => setCurrentTab("clients")}
                >
                  <FiUserCheck size={16} /> Client Licenses
                </button>
                <button
                  type="button"
                  className={`sub-tab-btn ${currentTab === "plans" ? "active" : ""}`}
                  onClick={() => setCurrentTab("plans")}
                >
                  <FiPackage size={16} /> Pricing Models
                </button>
              </div>
            }
          />

          {/* STANDALONE FLOATING STAT CARDS */}
          <div className="dir-stats-grid">
            <StatCard
              title="Active Licenses"
              value={clientSubscriptions.filter((c) => !c.is_root && !c.is_expired && c.is_active).length}
              Icon={FiCheckCircle}
              colorTheme="green"
            />
            <StatCard
              title="Expired / Inactive"
              value={clientSubscriptions.filter((c) => !c.is_root && (c.is_expired || !c.is_active)).length}
              Icon={FiClock}
              colorTheme="orange"
            />
            <StatCard
              title="Annual License Fee"
              value="₹8,000 / yr"
              Icon={FiDollarSign}
              colorTheme="blue"
            />
            <StatCard
              title="Setup Fee (1-Time)"
              value="₹50,000"
              Icon={FiShield}
              colorTheme="purple"
            />
          </div>

          {currentTab === "clients" ? (
            <section className="dir-modules-section">
              <ModuleWriternHeader
                title="Client License & Billing Registry"
                description="When a subscription date lapses, client status turns Inactive and merchant API access is blocked."
                badgeCount={filteredClients.length}
                badgeLabel="accounts"
              />

              <div className="dir-controls">
                <div className="dir-search-box" style={{ flex: 1.5 }}>
                  <FiSearch size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search client, store, or active plan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="dir-table-container">
                <table className="dir-table">
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Client / Store</th>
                      <th style={{ width: "16%" }}>Pricing Model</th>
                      <th style={{ width: "15%" }}>Setup / Annual</th>
                      <th style={{ width: "14%" }}>Start Date</th>
                      <th style={{ width: "14%" }}>Expiry Date</th>
                      <th style={{ width: "10%" }}>Remaining</th>
                      <th style={{ width: "9%" }}>Status</th>
                      <th style={{ width: "10%", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="empty-state">Loading registry...</td>
                      </tr>
                    ) : filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-state">No client subscription records found.</td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => {
                        const daysLeft = getRemainingDays(client.subscription_end);
                        const isExpired = daysLeft !== null && daysLeft <= 0;

                        return (
                          <tr
                            key={client.id}
                            className={`dir-table-row ${client.is_root ? "root-row" : ""}`}
                            onClick={() => !client.is_root && openAssignModal(client)}
                          >
                            <td>
                              <div className="customer-cell">
                                <div className={`staff-avatar ${client.is_root ? "root-avatar" : ""}`}>
                                  {String(client.username || "C").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span className="customer-name">{client.username}</span>
                                    {client.is_root && (
                                      <span className="role-pill SuperAdmin" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                        Root
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-muted" style={{ fontSize: "11px", display: "block" }}>
                                    {client.is_root ? "Master Node" : client.store?.name || client.store_name || "Unassigned Store"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`plan-badge ${client.is_root ? "root-badge" : ""}`}>
                                {client.plan_name}
                              </span>
                            </td>
                            <td>
                              {client.is_root ? (
                                <span className="text-muted">N/A</span>
                              ) : (
                                <div style={{ fontSize: "12px", lineHeight: 1.3 }}>
                                  <strong>₹{Number(client.setup_cost || 50000).toLocaleString()}</strong>
                                  <span className="text-muted" style={{ display: "block", fontSize: "11px" }}>
                                    + ₹{Number(client.yearly_charge || 8000).toLocaleString()}/yr
                                  </span>
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: "12.5px" }}>
                                {client.subscription_start || "—"}
                              </span>
                            </td>
                            <td>
                              {client.is_root ? (
                                <span className="lifetime-tag">
                                  <FiShield size={14} /> Permanent
                                </span>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <FiCalendar size={13} color="#64748b" />
                                  <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
                                    {client.subscription_end}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td>
                              {client.is_root ? (
                                <span className="days-pill permanent">Lifetime</span>
                              ) : (
                                <span className={`days-pill ${isExpired ? "expired" : daysLeft < 30 ? "warning" : "ok"}`}>
                                  {isExpired ? "Expired" : `${daysLeft} Days`}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`status ${!isExpired && client.is_active ? "active" : "inactive"}`}>
                                {!isExpired && client.is_active ? "Active" : "Deactivated"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              {client.is_root ? (
                                <span className="text-muted" style={{ fontSize: "11px" }}>Root Master</span>
                              ) : (
                                <button
                                  type="button"
                                  className="small-btn edit-btn"
                                  onClick={() => openAssignModal(client)}
                                >
                                  <FiEdit2 size={13} /> Update
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="dir-modules-section">
              <ModuleWriternHeader
                title="Defined Commercial Packages"
                description="Standard enterprise and merchant tier structures."
                badgeCount={plans.length}
                badgeLabel="tiers"
              />

              <div className="sub-plans-grid">
                {plans.map((p) => (
                  <div key={p.id} className="sub-plan-card">
                    <div className="plan-card-header">
                      <div>
                        <span className="plan-badge">{p.billing_period}</span>
                        <h3 className="plan-name">{p.name}</h3>
                      </div>
                      <div className="plan-price-wrap">
                        <span className="plan-price">₹{p.yearly_charge.toLocaleString()}</span>
                        <span className="plan-period">/ year recurring</span>
                      </div>
                    </div>

                    <div className="plan-limits-row">
                      <div className="limit-item">
                        <span className="limit-label">One-Time Setup Fee</span>
                        <strong>₹{p.setup_cost.toLocaleString()}</strong>
                      </div>
                      <div className="limit-item">
                        <span className="limit-label">Annual License</span>
                        <strong>₹{p.yearly_charge.toLocaleString()} / yr</strong>
                      </div>
                    </div>

                    <div className="plan-features-list">
                      <span className="features-kicker">Included Services</span>
                      <ul>
                        {p.features.map((feat, idx) => (
                          <li key={idx}>
                            <FiCheck size={14} className="feature-icon" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isAssignModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Update Client Commercial License</h2>
                <p className="modal-kicker">Client Account: {assignForm.username}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsAssignModalOpen(false)}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Pricing Package</label>
                  <select
                    value={assignForm.plan_name}
                    onChange={(e) => setAssignForm({ ...assignForm, plan_name: e.target.value })}
                  >
                    <option value="Aerostate Annual Standard">Aerostate Annual Standard (₹50k + ₹8k/yr)</option>
                    <option value="Enterprise Multi-Store">Enterprise Multi-Store (₹100k + ₹15k/yr)</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label>One-Time Setup Cost (₹)</label>
                    <input
                      type="number"
                      value={assignForm.setup_cost}
                      onChange={(e) => setAssignForm({ ...assignForm, setup_cost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Yearly Renewal Fee (₹)</label>
                    <input
                      type="number"
                      value={assignForm.yearly_charge}
                      onChange={(e) => setAssignForm({ ...assignForm, yearly_charge: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label>Starting Date</label>
                    <input
                      type="date"
                      value={assignForm.subscription_start}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input
                      type="date"
                      value={assignForm.subscription_end}
                      onChange={(e) => setAssignForm({ ...assignForm, subscription_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "4px" }}>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={assignForm.is_active}
                      onChange={(e) => setAssignForm({ ...assignForm, is_active: e.target.checked })}
                    />
                    <span>Account Active (Unchecking immediately shuts down store access)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}