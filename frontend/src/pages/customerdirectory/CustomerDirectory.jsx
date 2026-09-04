import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiSearch,
  FiUserPlus,
  FiUsers,
  FiX,
  FiEdit2,
  FiPhone,
  FiMapPin,
  FiCreditCard,
  FiShield,
  FiHash,
  FiBriefcase,
  FiSave,
  FiTrash2,
  FiLock,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./customerDirectory.css";

export default function CustomerDirectory({ onBack }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Modal & Mode states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const emptyForm = {
    name: "",
    phone_number: "",
    address: "",
    aadhaar_number: "",
    pan_number: "",
    bank_account_number: "",
    ifsc_code: "",
    bank_name: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (location.state?.autoEdit) {
      openDetailsModal(location.state.autoEdit);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getApiErrorMessage = (error, fallback = "Something went wrong.") => {
    const detail = error?.response?.data?.detail;
    if (!detail) return error?.response?.data?.message || fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((err) => {
          const field = Array.isArray(err.loc) ? err.loc.join(" → ") : "field";
          return `${field}: ${err.msg}`;
        })
        .join("\n");
    }
    if (typeof detail === "object") return JSON.stringify(detail, null, 2);
    return String(detail);
  };

  const normalizeCustomers = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.customers)) return data.customers;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/customers/");
      setCustomers(normalizeCustomers(response.data));
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      showToast(getApiErrorMessage(error, "Unable to load customers."), "error");
    } finally {
      setLoading(false);
    }
  };

  const maskAadhaar = (value) => {
    const clean = String(value || "").replace(/\D/g, "");
    if (!clean) return null;
    return `XXXX XXXX ${clean.slice(-4)}`;
  };

  const formatPan = (value) => {
    const clean = String(value || "").trim().toUpperCase();
    return clean || null;
  };

  const formatPhone = (phone) => {
    const raw = String(phone || "").replace(/\D/g, "");
    if (!raw) return "Not added";
    if (raw.length === 10) {
      return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
    }
    return phone;
  };

  const hasBankDetails = (customer) =>
    Boolean(customer.bank_name || customer.bank_account_number || customer.ifsc_code);
  const hasIdentityDetails = (customer) =>
    Boolean(customer.aadhaar_number || customer.pan_number);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "pan_number" || name === "ifsc_code" ? value.toUpperCase() : value,
    }));
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openDetailsModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      phone_number: customer.phone_number || "",
      address: customer.address || "",
      aadhaar_number: customer.aadhaar_number || "",
      pan_number: customer.pan_number || "",
      bank_account_number: customer.bank_account_number || "",
      ifsc_code: customer.ifsc_code || "",
      bank_name: customer.bank_name || "",
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving || deleting) return;
    setIsModalOpen(false);
    setEditingCustomer(null);
    setIsEditing(false);
    setFormData(emptyForm);
  };

  const handleCancelEdit = () => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || "",
        phone_number: editingCustomer.phone_number || "",
        address: editingCustomer.address || "",
        aadhaar_number: editingCustomer.aadhaar_number || "",
        pan_number: editingCustomer.pan_number || "",
        bank_account_number: editingCustomer.bank_account_number || "",
        ifsc_code: editingCustomer.ifsc_code || "",
        bank_name: editingCustomer.bank_name || "",
      });
      setIsEditing(false);
    } else {
      closeModal();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: formData.name.trim(),
      phone_number: formData.phone_number.trim(),
      address: formData.address.trim(),
      aadhaar_number: formData.aadhaar_number.trim(),
      pan_number: formData.pan_number.trim().toUpperCase(),
      bank_account_number: formData.bank_account_number.trim(),
      ifsc_code: formData.ifsc_code.trim().toUpperCase(),
      bank_name: formData.bank_name.trim(),
    };

    if (!payload.name || !payload.phone_number) {
      showToast("Please enter customer name and phone number.", "error");
      return;
    }

    try {
      setSaving(true);
      if (editingCustomer?.id) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        showToast("Customer updated successfully.", "success");
      } else {
        await api.post("/customers/", payload);
        showToast("Customer registered successfully.", "success");
      }
      closeModal();
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      showToast(getApiErrorMessage(error, "Customer could not be saved."), "error");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirmation = () => {
    setAdminPassword("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteConfirmation = () => {
    if (deleting) return;
    setIsDeleteModalOpen(false);
    setAdminPassword("");
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      showToast("Please enter admin password.", "error");
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/customers/${editingCustomer.id}`, {
        data: { admin_password: adminPassword },
      });
      showToast("Customer deleted successfully.", "success");
      setIsDeleteModalOpen(false);
      closeModal();
      fetchCustomers();
    } catch (error) {
      console.error("Delete error:", error);
      showToast(getApiErrorMessage(error, "Invalid admin password or deletion failed."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    let list = customers.filter((customer) => {
      if (!search) return true;
      return (
        String(customer.name || "").toLowerCase().includes(search) ||
        String(customer.phone_number || "").toLowerCase().includes(search) ||
        String(customer.address || "").toLowerCase().includes(search) ||
        String(customer.aadhaar_number || "").toLowerCase().includes(search) ||
        String(customer.pan_number || "").toLowerCase().includes(search) ||
        String(customer.bank_name || "").toLowerCase().includes(search) ||
        String(customer.ifsc_code || "").toLowerCase().includes(search) ||
        String(customer.bank_account_number || "").toLowerCase().includes(search)
      );
    });

    list = list.filter((customer) => {
      if (filterBy === "bank_added") return hasBankDetails(customer);
      if (filterBy === "bank_missing") return !hasBankDetails(customer);
      if (filterBy === "aadhaar_added") return Boolean(customer.aadhaar_number);
      if (filterBy === "pan_added") return Boolean(customer.pan_number);
      if (filterBy === "identity_missing") return !hasIdentityDetails(customer);
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "name_desc")
        return String(b.name || "").localeCompare(String(a.name || ""), "en", {
          sensitivity: "base",
        });
      if (sortBy === "newest") return Number(b.id || 0) - Number(a.id || 0);
      if (sortBy === "oldest") return Number(a.id || 0) - Number(b.id || 0);
      return String(a.name || "").localeCompare(String(a.name || ""), "en", {
        sensitivity: "base",
      });
    });

    return list;
  }, [customers, searchTerm, filterBy, sortBy]);

  const summary = useMemo(() => {
    return {
      totalCustomers: customers.length,
      withBank: customers.filter(hasBankDetails).length,
      withAadhaar: customers.filter((c) => c.aadhaar_number).length,
      withPan: customers.filter((c) => c.pan_number).length,
    };
  }, [customers]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBy("all");
    setSortBy("name_asc");
  };

  return (
    <div className="directory-page">
      {toast && (
        <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      {/* PORTAL HEADER (Target #166962 class applied) */}
      <PortalHeader
        title="Customer Directory"
        kicker="LOYALTY MANAGEMENT"
        description="Register customers, manage identity details, and maintain payout bank information."
        icon={FiUsers}
        backPath="/dashboard"
        rightAction={
          <button
            type="button"
            className="portal-action-btn"
            onClick={openCreateModal}
          >
            <FiUserPlus size={18} /> Register Customer
          </button>
        }
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard
          title="Total Customers"
          value={summary.totalCustomers}
          Icon={FiUsers}
          colorTheme="blue"
        />
        <StatCard
          title="Bank Details Added"
          value={summary.withBank}
          Icon={FiCreditCard}
          colorTheme="green"
        />
        <StatCard
          title="Aadhaar Added"
          value={summary.withAadhaar}
          Icon={FiShield}
          colorTheme="purple"
        />
        <StatCard
          title="PAN Added"
          value={summary.withPan}
          Icon={FiHash}
          colorTheme="orange"
        />
      </div>

      <section className="dir-modules-section">
        <ModuleWriternHeader
          title="Customer List"
          description="Customer identity details and payout bank information."
          badgeCount={filteredCustomers.length}
          badgeLabel="customers"
        />

        {/* CONTROLS */}
        <div className="dir-controls">
          <div className="dir-search-box" style={{ flex: 1.5 }}>
            <FiSearch size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search name, phone, Aadhaar, PAN, bank..."
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
              <option value="all">All Customers</option>
              <option value="bank_added">Bank Details Added</option>
              <option value="bank_missing">Bank Details Missing</option>
              <option value="aadhaar_added">Aadhaar Added</option>
              <option value="pan_added">PAN Added</option>
              <option value="identity_missing">Identity Missing</option>
            </select>

            <select
              className="dir-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
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

        {/* CUSTOMER TABLE */}
        <div className="dir-table-container">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="th-customer">Customer</th>
                <th className="th-phone">Phone</th>
                <th className="th-address">Address</th>
                <th className="th-identity">Identity</th>
                <th className="th-bank">Bank Details</th>
                <th className="th-action"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No registered customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const initials = String(customer.name || "C")
                    .charAt(0)
                    .toUpperCase();
                  const maskedAadhaar = maskAadhaar(customer.aadhaar_number);
                  const panVal = formatPan(customer.pan_number);

                  return (
                    <tr
                      key={customer.id || `${customer.name}-${customer.phone_number}`}
                      className="dir-table-row"
                      onClick={() => openDetailsModal(customer)}
                    >
                      <td className="th-customer">
                        <div className="customer-cell">
                          <div className="staff-avatar">{initials}</div>
                          <span className="customer-name">
                            {customer.name || "Unnamed Customer"}
                          </span>
                        </div>
                      </td>

                      <td className="th-phone">
                        <span className="phone-text">
                          {formatPhone(customer.phone_number)}
                        </span>
                      </td>

                      <td className="th-address">
                        <span
                          className="truncate-cell text-muted"
                          title={customer.address || "Not added"}
                        >
                          {customer.address || "Not added"}
                        </span>
                      </td>

                      <td className="th-identity">
                        <div className="identity-pills-row">
                          {maskedAadhaar ? (
                            <span className="mono-pill" title="Aadhaar">
                              {maskedAadhaar}
                            </span>
                          ) : null}
                          {panVal ? (
                            <span className="mono-pill" title="PAN">
                              {panVal}
                            </span>
                          ) : null}
                          {!maskedAadhaar && !panVal ? (
                            <span className="text-muted">Not added</span>
                          ) : null}
                        </div>
                      </td>

                      <td className="th-bank">
                        {customer.bank_name || customer.bank_account_number ? (
                          <div className="bank-cell">
                            <span className="bank-primary">
                              {customer.bank_name || "Bank Added"}
                            </span>
                            <span className="bank-sub">
                              {customer.bank_account_number
                                ? `A/C ${customer.bank_account_number}`
                                : ""}
                              {customer.bank_account_number && customer.ifsc_code ? " • " : ""}
                              {customer.ifsc_code || ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">Not added</span>
                        )}
                      </td>

                      <td
                        className="th-action"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="dir-row-edit-btn"
                          onClick={() => openDetailsModal(customer)}
                          title="View / Edit Customer"
                        >
                          <FiEdit2 size={14} />
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

      {/* CUSTOMER DETAILS & EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {!editingCustomer
                    ? "Register New Customer"
                    : isEditing
                    ? "Edit Customer"
                    : "Customer Details"}
                </h2>
                {editingCustomer && !isEditing && (
                  <p className="modal-kicker">Read-Only Mode • Click 'Edit Details' to make changes</p>
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

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter customer address"
                    disabled={!isEditing || saving}
                    rows="2"
                    className={`asr-modal-textarea ${!isEditing ? "input-locked" : ""}`}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Aadhaar Card Number (Optional)</label>
                    <input
                      type="text"
                      name="aadhaar_number"
                      value={formData.aadhaar_number}
                      onChange={handleInputChange}
                      placeholder="Enter Aadhaar number"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                    />
                  </div>
                  <div className="form-group">
                    <label>PAN Number (Optional)</label>
                    <input
                      type="text"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleInputChange}
                      placeholder="Enter PAN number"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      placeholder="Enter bank name"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                    />
                  </div>
                  <div className="form-group">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      name="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={handleInputChange}
                      placeholder="Enter IFSC code"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Bank Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleInputChange}
                    placeholder="Enter bank account number"
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                  />
                </div>

                <div className="info-box-note">
                  <FiBriefcase size={15} color="#2d5696" style={{ flexShrink: 0 }} />
                  <span>
                    Bank details are used for payout/redemption records. Aadhaar number is securely masked in the customer directory list.
                  </span>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="modal-footer">
                {editingCustomer ? (
                  <>
                    <div className="footer-left">
                      <button
                        type="button"
                        className="btn-danger-outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteConfirmation();
                        }}
                        disabled={saving}
                      >
                        <FiTrash2 size={14} /> Delete Customer
                      </button>
                    </div>

                    <div className="footer-right">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={(e) => {
                              e.preventDefault();
                              closeModal();
                            }}
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            className="btn-submit"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsEditing(true);
                            }}
                          >
                            <FiEdit2 size={14} /> Edit Details
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCancelEdit();
                            }}
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
                  </>
                ) : (
                  <div className="footer-right" style={{ width: "100%", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={(e) => {
                        e.preventDefault();
                        closeModal();
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={saving}>
                      <FiSave size={14} /> {saving ? "Saving..." : "Register Customer"}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN PASSWORD DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay nested-modal" onClick={closeDeleteConfirmation}>
          <div
            className="modal-content delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FiShield size={18} color="#dc2626" />
                <h2 style={{ fontSize: "16px", color: "#dc2626" }}>Confirm Deletion</h2>
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
                  Are you sure you want to permanently delete customer{" "}
                  <strong>{editingCustomer?.name}</strong>? This action cannot be undone.
                </p>

                <div className="form-group" style={{ marginTop: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#0f172a" }}>
                    Enter Admin Password to proceed *
                  </label>
                  <div className="password-input-wrap">
                    <FiLock size={14} className="password-icon" />
                    <input
                      type="password"
                      className="asr-input"
                      style={{ paddingLeft: "34px" }}
                      placeholder="Admin Password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
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
                  disabled={deleting || !adminPassword.trim()}
                >
                  <FiTrash2 size={14} /> {deleting ? "Deleting..." : "Delete Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}