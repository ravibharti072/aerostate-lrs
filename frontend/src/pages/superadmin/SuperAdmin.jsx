import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiShoppingBag,
  FiCreditCard,
  FiUserPlus,
  FiArrowUpRight,
  FiClock,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiShield
} from "react-icons/fi";

import api from "../../api/axios";
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";
import SuperAdminSidebar from "./sidebar/SuperAdminSidebar";
import "./superAdmin.css";

const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.stores)) return payload.stores;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function SuperAdmin() {
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSuperAdmin, setCurrentSuperAdmin] = useState(null);

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Strict session check
  useEffect(() => {
    const token =
      localStorage.getItem("aerostate_loyalty_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");
    const rawUser = localStorage.getItem("aerostate_loyalty_user");

    if (token && rawUser) {
      try {
        const user = JSON.parse(rawUser);
        const role = String(user?.role || "").toLowerCase();
        if (role === "superadmin" || user?.loginType === "superadmin") {
          setCurrentSuperAdmin(user);
          return;
        }
      } catch {
        // Fall through to redirect
      }
    }

    navigate("/superadmin/login", { replace: true });
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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
    } catch (err) {
      console.error("SuperAdmin dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const displayName = useMemo(() => {
    if (currentSuperAdmin?.person_name) return currentSuperAdmin.person_name;
    if (currentSuperAdmin?.username) {
      return currentSuperAdmin.username.includes("@")
        ? currentSuperAdmin.username.split("@")[0]
        : currentSuperAdmin.username;
    }
    return "SuperAdmin";
  }, [currentSuperAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("aerostate_loyalty_token");
    localStorage.removeItem("aerostate_loyalty_user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/superadmin/login", { replace: true });
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const activeClients = users.filter((u) => {
      const isExpired = u.subscription_end && new Date(u.subscription_end) < now;
      return !isExpired && u.is_active !== false;
    }).length;

    const expiredClients = users.filter((u) => {
      return (u.subscription_end && new Date(u.subscription_end) < now) || u.is_active === false;
    }).length;

    return {
      totalTenants: users.length,
      activeStores: stores.filter((s) => s.is_active !== false).length,
      activeLicenses: activeClients,
      expiredLicenses: expiredClients,
    };
  }, [users, stores]);

  const recentTenants = useMemo(() => {
    return [...users].slice(-5).reverse();
  }, [users]);

  if (!currentSuperAdmin) return null;

  return (
    <div className="super-admin-layout-container">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="/superadmin"
        onTabChange={() => navigate("/superadmin")}
        onNavigateRoute={(path) => navigate(path)}
        onOpenCredentials={() => navigate("/superadmin/profile")}
        user={currentSuperAdmin}
        onLogout={handleLogout}
      />

      <div className="lrs-main-content">
        <main className="super-admin-content">
          <PortalHeader
            title={`${getGreeting(currentTime)}, ${displayName}`}
            kicker="LRS DASHBOARD"
            showBack={false}
            rightAction={
              <div className="header-actions">
                <div className="header-search-bar">
                  <FiSearch size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search modules, clients, stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="time-widget">
                  <FiClock size={16} className="time-icon" />
                  <div className="time-text">
                    <span className="date">{formattedDate}</span>
                    <span className="time">{formattedTime}</span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Quick Metrics Grid */}
          <div className="dir-stats-grid">
            <StatCard
              title="Total Clients / Tenants"
              value={metrics.totalTenants}
              Icon={FiUsers}
              colorTheme="blue"
            />
            <StatCard
              title="Active Store Entities"
              value={metrics.activeStores}
              Icon={FiShoppingBag}
              colorTheme="green"
            />
            <StatCard
              title="Active Licenses"
              value={metrics.activeLicenses}
              Icon={FiCheckCircle}
              colorTheme="purple"
            />
            <StatCard
              title="Expired / Inactive"
              value={metrics.expiredLicenses}
              Icon={FiAlertCircle}
              colorTheme="orange"
            />
          </div>

          {/* Quick Actions Bar */}
          <div className="sa-quick-actions-card">
            <div className="quick-actions-info">
              <FiShield size={22} className="quick-action-icon" />
              <div>
                <h3>Platform Management Console</h3>
                <p>Deploy new tenant storefronts, update root credentials, or adjust licensing terms.</p>
              </div>
            </div>
            <div className="quick-actions-buttons">
              <button
                type="button"
                className="sa-action-btn primary"
                onClick={() => navigate("/superadmin/onboard-client")}
              >
                <FiUserPlus size={16} /> Onboard New Client
              </button>
              <button
                type="button"
                className="sa-action-btn secondary"
                onClick={() => navigate("/superadmin/subscriptions")}
              >
                <FiCreditCard size={16} /> Manage Subscriptions
              </button>
            </div>
          </div>

          {/* Recent Tenants Section */}
          <section className="dir-modules-section">
            <ModuleWriternHeader
              title="Recent Client Onboardings"
              description="Latest tenant accounts provisioned on the platform."
              badgeCount={recentTenants.length}
              badgeLabel="recent"
            />

            <div className="dir-table-container">
              <table className="dir-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Tenant / Operator</th>
                    <th style={{ width: "25%" }}>Assigned Store</th>
                    <th style={{ width: "20%" }}>Plan Tier</th>
                    <th style={{ width: "15%" }}>Status</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        Loading system overview...
                      </td>
                    </tr>
                  ) : recentTenants.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No clients registered yet. Click "Onboard New Client" to start.
                      </td>
                    </tr>
                  ) : (
                    recentTenants.map((u, idx) => {
                      const initial = String(u.username || "C").charAt(0).toUpperCase();
                      const storeName = u.store?.name || u.store_name || u.shop_name || "Unassigned";
                      const isExpired = u.subscription_end && new Date(u.subscription_end) < new Date();
                      const isActive = !isExpired && u.is_active !== false;

                      return (
                        <tr
                          key={u.id || idx}
                          className="dir-table-row"
                          onClick={() => navigate("/superadmin/client-directory")}
                        >
                          <td>
                            <div className="customer-cell">
                              <div className="staff-avatar">{initial}</div>
                              <div>
                                <span className="customer-name">{u.username}</span>
                                <span className="text-muted" style={{ fontSize: "11px", display: "block" }}>
                                  ID: #{u.id || "—"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="store-name-text">{storeName}</span>
                          </td>
                          <td>
                            <span className="role-pill">{u.plan_name || "Standard Merchant"}</span>
                          </td>
                          <td>
                            <span className={`status ${isActive ? "active" : "inactive"}`}>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="dir-row-edit-btn"
                              style={{ opacity: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/superadmin/client-directory");
                              }}
                              title="Open Client Directory"
                            >
                              <FiArrowUpRight size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}