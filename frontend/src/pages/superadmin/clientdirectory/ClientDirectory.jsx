import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiUserPlus,
  FiShoppingBag,
  FiShield,
  FiSearch,
  FiEdit2,
  FiHome,
  FiTrash2,
  FiX,
  FiLock,
  FiSave,
  FiBriefcase
} from "react-icons/fi";

import api from "../../../api/axios";
import PortalHeader from "../../../components/portalheader/PortalHeader";
import StatCard from "../../../components/statcard/StatCard";
import ModuleWriternHeader from "../../../components/modulewriternheader/ModuleWriternHeader";
import SuperAdminSidebar from "../sidebar/SuperAdminSidebar";

import "./clientDirectory.css";

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

export default function ClientDirectory() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal & Mode states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Store profile modal
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState({
    id: "",
    name: "",
    business_type: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_active: true,
  });
  const [storeLoading, setStoreLoading] = useState(false);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [superadminPassword, setSuperadminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [editForm, setEditForm] = useState({
    user_id: "",
    username: "",
    new_password: "",
    is_active: true,
    superadmin_password: "",
  });

  // Guard: Redirect if no active SuperAdmin session
  useEffect(() => {
    const token =
      localStorage.getItem("aerostate_loyalty_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");
    if (!token) {
      navigate("/superadmin", { replace: true });
    }
  }, [navigate]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  const currentSuperAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem("aerostate_loyalty_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : { username: "SuperAdmin", role: "SuperAdmin" };
    } catch {
      return { username: "SuperAdmin", role: "SuperAdmin" };
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [usersRes, storesRes] = await Promise.allSettled([
        api.get("/superadmin/users", { timeout: 10000 }),
        api.get("/stores/", { timeout: 10000 }),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        setUsers(normalizeList(usersRes.value.data));
      } else if (usersRes.status === "rejected") {
        showToast(getApiErrorMessage(usersRes.reason, "Failed to load clients."), "error");
      }

      if (storesRes.status === "fulfilled" && storesRes.value?.data) {
        setStores(normalizeList(storesRes.value.data));
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, "Unable to load client records."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isCurrentLoggedInUser = (user) => {
    if (!currentSuperAdmin || !user) return false;
    const userId = user.id || user.user_id;
    const savedId = currentSuperAdmin.id || currentSuperAdmin.user_id;
    if (userId && savedId && Number(userId) === Number(savedId)) return true;
    return String(user.username || "").toLowerCase() === String(currentSuperAdmin.username || "").toLowerCase();
  };

  // User modal open / close
  const openDetailsModal = (user) => {
    setEditingUser(user);
    setEditForm({
      user_id: user.id,
      username: user.username || "",
      new_password: "",
      is_active: user.is_active !== false,
      superadmin_password: "",
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving || deleting) return;
    setIsModalOpen(false);
    setEditingUser(null);
    setIsEditing(false);
  };

  const handleUpdateAdminUser = async (e) => {
    e.preventDefault();
    if (!editForm.superadmin_password.trim()) {
      showToast("Please enter SuperAdmin password to authorize changes.", "error");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/superadmin/users/${editForm.user_id}`, {
        new_username: editForm.username || null,
        new_password: editForm.new_password || null,
        is_active: editForm.is_active,
        superadmin_password: editForm.superadmin_password,
      });
      showToast("Client user credentials updated successfully.", "success");
      closeModal();
      fetchData();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to update client user."), "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete modal open / confirm
  const openDeleteConfirmation = () => {
    if (isCurrentLoggedInUser(editingUser)) {
      showToast("You cannot delete your own SuperAdmin account.", "error");
      return;
    }
    setSuperadminPassword("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteConfirmation = () => {
    if (deleting) return;
    setIsDeleteModalOpen(false);
    setSuperadminPassword("");
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!superadminPassword.trim()) {
      showToast("Please enter SuperAdmin password.", "error");
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/superadmin/users/${editingUser.id}`, {
        data: { superadmin_password: superadminPassword },
      });
      showToast("Client account deleted successfully.", "success");
      setIsDeleteModalOpen(false);
      closeModal();
      fetchData();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Deletion failed. Check password."), "error");
    } finally {
      setDeleting(false);
    }
  };

  // Store modal
  const openStoreModal = async (user) => {
    try {
      if (!user.store_id) {
        showToast("User has no store profile linked.", "error");
        return;
      }
      setStoreLoading(true);
      const res = await api.get(`/stores/${user.store_id}`);
      setEditingStore(res.data);
      setStoreForm({
        id: res.data.id,
        name: res.data.name || "",
        business_type: res.data.business_type || "",
        owner_name: res.data.owner_name || "",
        owner_phone: res.data.owner_phone || "",
        owner_email: res.data.owner_email || "",
        address: res.data.address || "",
        city: res.data.city || "",
        state: res.data.state || "",
        pincode: res.data.pincode || "",
        is_active: res.data.is_active !== false,
      });
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to load store profile."), "error");
    } finally {
      setStoreLoading(false);
    }
  };

  const handleUpdateStore = async (e) => {
    e.preventDefault();
    try {
      setStoreLoading(true);
      await api.put(`/stores/${storeForm.id}`, storeForm);
      showToast("Store profile updated successfully.", "success");
      setEditingStore(null);
      fetchData();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to update store profile."), "error");
    } finally {
      setStoreLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aerostate_loyalty_token");
    localStorage.removeItem("aerostate_loyalty_user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/superadmin");
  };

  // Filter & Search Logic
  const filteredClients = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    let list = users.filter((u) => {
      if (!search) return true;
      const storeName = String(u.store?.name || u.store_name || u.shop_name || "").toLowerCase();
      const uname = String(u.username || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      return uname.includes(search) || storeName.includes(search) || role.includes(search);
    });

    list = list.filter((u) => {
      const role = String(u.role || "").toLowerCase();
      if (filterBy === "active") return u.is_active !== false;
      if (filterBy === "inactive") return u.is_active === false;
      if (filterBy === "admin") return role === "admin";
      if (filterBy === "superadmin") return role === "superadmin";
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "name_desc") return String(b.username || "").localeCompare(String(a.username || ""));
      if (sortBy === "newest") return Number(b.id || 0) - Number(a.id || 0);
      if (sortBy === "oldest") return Number(a.id || 0) - Number(b.id || 0);
      return String(a.username || "").localeCompare(String(b.username || ""));
    });

    return list;
  }, [users, searchTerm, filterBy, sortBy]);

  const summary = useMemo(() => {
    return {
      totalClients: users.length,
      activeStores: stores.filter((s) => s.is_active !== false).length,
      activeAdmins: users.filter((u) => u.is_active !== false && String(u.role || "").toLowerCase() === "admin").length,
      superAdmins: users.filter((u) => String(u.role || "").toLowerCase() === "superadmin").length,
    };
  }, [users, stores]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBy("all");
    setSortBy("name_asc");
  };

  return (
    <div className="super-admin-layout-container">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="/superadmin/client-directory"
        onTabChange={() => navigate("/superadmin")}
        onNavigateRoute={(path) => navigate(path)}
        onOpenCredentials={() => {}}
        user={currentSuperAdmin}
        onLogout={handleLogout}
      />

      <div className="lrs-main-content">
        <div className="directory-page">
          {toast && (
            <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
              {toast.message}
            </div>
          )}

          {/* PORTAL HEADER (Target #166962 class applied, no search/clock) */}
          <PortalHeader
            title="Client Directory"
            kicker="LRS SUPERADMIN CONTROL PANEL"
            description="Manage client credentials, tenant accounts, store branches, and administrative access."
            icon={FiUsers}
            backPath="/superadmin"
            rightAction={
              <button
                type="button"
                className="portal-action-btn"
                onClick={() => navigate("/superadmin/onboard-client")}
              >
                <FiUserPlus size={18} /> Onboard Client
              </button>
            }
          />

          {/* STATS GRID */}
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

          <section className="dir-modules-section">
            <ModuleWriternHeader
              title="Registered Clients"
              description="Full directory of tenant administrators, assigned store entities, and access states."
              badgeCount={filteredClients.length}
              badgeLabel="clients"
            />

            {/* CONTROLS TOOLBAR */}
            <div className="dir-controls">
              <div className="dir-search-box" style={{ flex: 1.5 }}>
                <FiSearch size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search client username, store name, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <select
                  className="dir-filter-select"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                >
                  <option value="all">All Clients</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="admin">Store Admins</option>
                  <option value="superadmin">SuperAdmins</option>
                </select>

                <select
                  className="dir-filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name_asc">Username A-Z</option>
                  <option value="name_desc">Username Z-A</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>

                <button
                  type="button"
                  className="btn-cancel"
                  style={{ height: "38px", padding: "0 16px" }}
                  onClick={clearFilters}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* DIRECTORY DATA TABLE */}
            <div className="dir-table-container">
              <table className="dir-table">
                <thead>
                  <tr>
                    <th className="th-client">Client / Admin</th>
                    <th className="th-role">Role</th>
                    <th className="th-store">Assigned Store</th>
                    <th className="th-status">Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        Loading clients...
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No client records match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((u) => {
                      const initial = String(u.username || "C").charAt(0).toUpperCase();
                      const storeName = u.store?.name || u.store_name || u.shop_name || "Unassigned Store";

                      return (
                        <tr
                          key={u.id || u.username}
                          className="dir-table-row"
                          onClick={() => openDetailsModal(u)}
                        >
                          <td className="th-client">
                            <div className="customer-cell">
                              <div className="staff-avatar">{initial}</div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span className="customer-name">{u.username}</span>
                                <span className="text-muted" style={{ fontSize: "11px" }}>
                                  ID: #{u.id || "—"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="th-role">
                            <span className={`role-pill ${u.role}`}>{u.role || "Admin"}</span>
                          </td>

                          <td className="th-store">
                            <span className="store-name-text">{storeName}</span>
                          </td>

                          <td className="th-status">
                            <span className={`status ${u.is_active === false ? "inactive" : "active"}`}>
                              {u.is_active === false ? "Inactive" : "Active"}
                            </span>
                          </td>

                          <td
                            className="th-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isCurrentLoggedInUser(u) ? (
                              <span className="text-muted" style={{ fontSize: "11.5px", fontStyle: "italic" }}>
                                Current Session
                              </span>
                            ) : (
                              <div className="action-buttons">
                                <button
                                  type="button"
                                  className="small-btn edit-btn"
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditForm({
                                      user_id: u.id,
                                      username: u.username || "",
                                      new_password: "",
                                      is_active: u.is_active !== false,
                                      superadmin_password: "",
                                    });
                                    setIsEditing(true);
                                    setIsModalOpen(true);
                                  }}
                                  title="Edit Credentials"
                                >
                                  <FiEdit2 size={13} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="small-btn shop-btn"
                                  onClick={() => openStoreModal(u)}
                                  title="Manage Store"
                                >
                                  <FiHome size={13} /> Shop
                                </button>
                                <button
                                  type="button"
                                  className="small-btn delete-btn"
                                  onClick={() => {
                                    setEditingUser(u);
                                    openDeleteConfirmation();
                                  }}
                                  title="Delete Account"
                                >
                                  <FiTrash2 size={13} /> Delete
                                </button>
                              </div>
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
        </div>
      </div>

      {/* CLIENT DETAILS & CREDENTIALS MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            style={{ maxWidth: "580px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{isEditing ? "Edit Client Credentials" : "Client Account Details"}</h2>
                {!isEditing && (
                  <p className="modal-kicker">Read-Only Mode • Click 'Edit Credentials' to modify</p>
                )}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdminUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password {isEditing && "(Leave blank to keep existing)"}</label>
                  <input
                    type="password"
                    value={editForm.new_password}
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    placeholder={isEditing ? "Enter new password" : "••••••••"}
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-row" style={{ marginTop: "4px" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      disabled={!isEditing || saving}
                    />
                    <span>Active Client Account</span>
                  </label>
                </div>

                {isEditing && (
                  <div className="form-group" style={{ marginTop: "8px" }}>
                    <label style={{ color: "#0f172a", fontWeight: 700 }}>
                      Confirm SuperAdmin Password *
                    </label>
                    <div className="password-input-wrap">
                      <FiLock size={14} className="password-icon" />
                      <input
                        type="password"
                        style={{ paddingLeft: "34px" }}
                        value={editForm.superadmin_password}
                        onChange={(e) =>
                          setEditForm({ ...editForm, superadmin_password: e.target.value })
                        }
                        placeholder="Enter SuperAdmin password"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="info-box-note">
                  <FiBriefcase size={15} color="#2d5696" style={{ flexShrink: 0 }} />
                  <span>
                    Changes made here directly alter login authorization for this store's administrator account.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <div className="footer-left">
                  {!isCurrentLoggedInUser(editingUser) && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={() => openDeleteConfirmation()}
                      disabled={saving}
                    >
                      <FiTrash2 size={14} /> Delete User
                    </button>
                  )}
                </div>

                <div className="footer-right">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={closeModal}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="btn-submit"
                        onClick={() => setIsEditing(true)}
                      >
                        <FiEdit2 size={14} /> Edit Credentials
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-submit"
                        disabled={saving}
                      >
                        <FiSave size={14} /> {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORE DETAILS MODAL */}
      {editingStore && (
        <div className="modal-overlay" onClick={() => setEditingStore(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "640px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Store Profile: {editingStore.name}</h2>
                <p className="modal-kicker">Linked Store Entity ID: #{editingStore.id}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingStore(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStore}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Store Name *</label>
                    <input
                      type="text"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Type</label>
                    <input
                      type="text"
                      value={storeForm.business_type}
                      onChange={(e) => setStoreForm({ ...storeForm, business_type: e.target.value })}
                      placeholder="e.g. Retail, Pharmacy, Grocery"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Owner Name</label>
                    <input
                      type="text"
                      value={storeForm.owner_name}
                      onChange={(e) => setStoreForm({ ...storeForm, owner_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Phone</label>
                    <input
                      type="text"
                      value={storeForm.owner_phone}
                      onChange={(e) => setStoreForm({ ...storeForm, owner_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Owner Email</label>
                  <input
                    type="email"
                    value={storeForm.owner_email}
                    onChange={(e) => setStoreForm({ ...storeForm, owner_email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={storeForm.city}
                      onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={storeForm.state}
                      onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      type="text"
                      value={storeForm.pincode}
                      onChange={(e) => setStoreForm({ ...storeForm, pincode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingStore(null)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={storeLoading}
                >
                  <FiSave size={14} /> {storeLoading ? "Saving..." : "Save Store Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPERADMIN DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay nested-modal" onClick={closeDeleteConfirmation}>
          <div
            className="modal-content delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FiShield size={18} color="#dc2626" />
                <h2 style={{ fontSize: "16px", color: "#dc2626" }}>Confirm Permanent Deletion</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeDeleteConfirmation}
                disabled={deleting}
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete}>
              <div className="modal-body" style={{ gap: "12px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.4" }}>
                  Are you sure you want to delete user account{" "}
                  <strong>{editingUser?.username}</strong>? This user will lose system access immediately.
                </p>

                <div className="form-group" style={{ marginTop: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#0f172a" }}>
                    Enter SuperAdmin Password to Authorize *
                  </label>
                  <div className="password-input-wrap">
                    <FiLock size={14} className="password-icon" />
                    <input
                      type="password"
                      style={{ paddingLeft: "34px" }}
                      placeholder="SuperAdmin Password"
                      value={superadminPassword}
                      onChange={(e) => setSuperadminPassword(e.target.value)}
                      disabled={deleting}
                      autoFocus
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ background: "#f8fafc" }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeDeleteConfirmation}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-danger"
                  disabled={deleting || !superadminPassword.trim()}
                >
                  <FiTrash2 size={14} /> {deleting ? "Deleting..." : "Delete Client Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}