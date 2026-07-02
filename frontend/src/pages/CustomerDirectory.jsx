import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
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
  FiFilter,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function CustomerDirectory({ onBack }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
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

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const getApiErrorMessage = (error, fallback = "Something went wrong.") => {
    const detail = error?.response?.data?.detail;

    if (!detail) {
      return error?.response?.data?.message || fallback;
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((err) => {
          const field = Array.isArray(err.loc) ? err.loc.join(" → ") : "field";
          return `${field}: ${err.msg}`;
        })
        .join("\n");
    }

    if (typeof detail === "object") {
      return JSON.stringify(detail, null, 2);
    }

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

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate("/dashboard");
  };

  const maskAadhaar = (value) => {
    const clean = String(value || "").replace(/\D/g, "");

    if (!clean) return "-";
    if (clean.length <= 4) return clean;

    return `XXXX XXXX ${clean.slice(-4)}`;
  };

  const formatPan = (value) => {
    return String(value || "").trim().toUpperCase();
  };

  const hasBankDetails = (customer) => {
    return Boolean(
      customer.bank_name ||
        customer.bank_account_number ||
        customer.ifsc_code
    );
  };

  const hasIdentityDetails = (customer) => {
    return Boolean(customer.aadhaar_number || customer.pan_number);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "pan_number" || name === "ifsc_code"
          ? value.toUpperCase()
          : value,
    }));
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
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

    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData(emptyForm);
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

      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData(emptyForm);
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      showToast(
        getApiErrorMessage(error, "Customer could not be saved."),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    let list = customers.filter((customer) => {
      const name = String(customer.name || "").toLowerCase();
      const phone = String(customer.phone_number || "").toLowerCase();
      const address = String(customer.address || "").toLowerCase();
      const aadhaar = String(customer.aadhaar_number || "").toLowerCase();
      const pan = String(customer.pan_number || "").toLowerCase();
      const bankName = String(customer.bank_name || "").toLowerCase();
      const ifsc = String(customer.ifsc_code || "").toLowerCase();
      const accountNumber = String(
        customer.bank_account_number || ""
      ).toLowerCase();

      if (!search) return true;

      return (
        name.includes(search) ||
        phone.includes(search) ||
        address.includes(search) ||
        aadhaar.includes(search) ||
        pan.includes(search) ||
        bankName.includes(search) ||
        ifsc.includes(search) ||
        accountNumber.includes(search)
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
      if (sortBy === "name_desc") {
        return String(b.name || "").localeCompare(String(a.name || ""), "en", {
          sensitivity: "base",
        });
      }

      if (sortBy === "newest") {
        return Number(b.id || 0) - Number(a.id || 0);
      }

      if (sortBy === "oldest") {
        return Number(a.id || 0) - Number(b.id || 0);
      }

      return String(a.name || "").localeCompare(String(b.name || ""), "en", {
        sensitivity: "base",
      });
    });

    return list;
  }, [customers, searchTerm, filterBy, sortBy]);

  const summary = useMemo(() => {
    const withBank = customers.filter((customer) =>
      hasBankDetails(customer)
    ).length;

    const withAadhaar = customers.filter(
      (customer) => customer.aadhaar_number
    ).length;

    const withPan = customers.filter((customer) => customer.pan_number).length;

    return {
      totalCustomers: customers.length,
      withBank,
      withAadhaar,
      withPan,
    };
  }, [customers]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBy("all");
    setSortBy("name_asc");
  };

  return (
    <>
      <style>{customerDirectoryCss}</style>

      <div className="asc-page">
        {toast && (
          <div
            className={`asc-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
            {toast.message}
          </div>
        )}

        <section className="asc-header-card">
          <div className="asc-header-left">
            <button type="button" onClick={handleBack} className="asc-back-btn">
              <FiArrowLeft />
              Back
            </button>

            <div className="asc-title-icon">
              <FiUsers />
            </div>

            <div className="asc-title-wrap">
              <h1 className="asc-title">Customer Directory</h1>
              <p className="asc-subtitle">
                Register customers, manage identity details, and maintain payout
                bank information.
              </p>
            </div>
          </div>

          <div className="asc-header-actions">
            <button
              type="button"
              onClick={openCreateModal}
              className="asc-add-btn"
            >
              <FiUserPlus />
              Register Customer
            </button>
          </div>
        </section>

        <section className="asc-summary-grid">
          <SummaryCard
            icon={<FiUsers />}
            label="Total Customers"
            value={summary.totalCustomers}
            tone="blue"
          />

          <SummaryCard
            icon={<FiCreditCard />}
            label="Bank Details"
            value={summary.withBank}
            tone="green"
          />

          <SummaryCard
            icon={<FiShield />}
            label="Aadhaar Added"
            value={summary.withAadhaar}
            tone="purple"
          />

          <SummaryCard
            icon={<FiHash />}
            label="PAN Added"
            value={summary.withPan}
            tone="orange"
          />
        </section>

        <section className="asc-toolbar-card">
          <div className="asc-search-wrapper">
            <FiSearch className="asc-search-icon" />

            <input
              type="text"
              placeholder="Search name, phone, Aadhaar, PAN, bank..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="asc-search-input"
            />
          </div>

          <div className="asc-filter-wrapper">
            <FiFilter className="asc-filter-icon" />

            <select
              value={filterBy}
              onChange={(event) => setFilterBy(event.target.value)}
              className="asc-filter-select"
            >
              <option value="all">All Customers</option>
              <option value="bank_added">Bank Details Added</option>
              <option value="bank_missing">Bank Details Missing</option>
              <option value="aadhaar_added">Aadhaar Added</option>
              <option value="pan_added">PAN Added</option>
              <option value="identity_missing">Identity Missing</option>
            </select>
          </div>

          <div className="asc-filter-wrapper">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="asc-filter-select"
            >
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <button type="button" className="asc-clear-btn" onClick={clearFilters}>
            Clear
          </button>
        </section>

        <section className="asc-table-card">
          <div className="asc-table-header">
            <div>
              <h2 className="asc-card-title">Customer List</h2>
              <p className="asc-card-subtitle">
                Customer identity details and payout bank information.
              </p>
            </div>

            <span className="asc-record-badge">
              {filteredCustomers.length} customers
            </span>
          </div>

          <div className="asc-table-wrapper">
            <table className="asc-table">
              <colgroup>
                <col className="asc-col-name" />
                <col className="asc-col-phone" />
                <col className="asc-col-address" />
                <col className="asc-col-identity" />
                <col className="asc-col-bank" />
                <col className="asc-col-action" />
              </colgroup>

              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Identity</th>
                  <th>Bank Details</th>
                  <th className="center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="asc-empty-cell">
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="asc-empty-cell">
                      No registered customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={
                        customer.id || `${customer.name}-${customer.phone_number}`
                      }
                    >
                      <td>
                        <div className="asc-customer-name-cell">
                          <div className="asc-avatar">
                            {String(customer.name || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>{customer.name || "Unnamed Customer"}</strong>
                        </div>
                      </td>

                      <td>
                        <span className="asc-phone-text">
                          <FiPhone />
                          {customer.phone_number || "N/A"}
                        </span>
                      </td>

                      <td>
                        <div className="asc-address-cell">
                          <FiMapPin />
                          <span>{customer.address || "-"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="asc-stack-cell">
                          <span>
                            <strong>Aadhaar:</strong>{" "}
                            {maskAadhaar(customer.aadhaar_number)}
                          </span>

                          <span>
                            <strong>PAN:</strong>{" "}
                            <span className="asc-pan-pill">
                              {formatPan(customer.pan_number) || "-"}
                            </span>
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="asc-stack-cell">
                          <span>
                            <strong>Bank:</strong> {customer.bank_name || "-"}
                          </span>

                          <span>
                            <strong>A/C:</strong>{" "}
                            {customer.bank_account_number || "-"}
                          </span>

                          <span>
                            <strong>IFSC:</strong> {customer.ifsc_code || "-"}
                          </span>
                        </div>
                      </td>

                      <td className="center">
                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className="asc-edit-btn"
                        >
                          <FiEdit2 />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="asc-mobile-list">
            {loading ? (
              <div className="asc-mobile-empty">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="asc-mobile-empty">
                No registered customers found.
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id || `${customer.name}-${customer.phone_number}`}
                  className="asc-mobile-card"
                >
                  <div className="asc-mobile-card-top">
                    <div className="asc-mobile-customer">
                      <div className="asc-avatar">
                        {String(customer.name || "C").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h3>{customer.name || "Unnamed Customer"}</h3>

                        <p>
                          <FiPhone />
                          {customer.phone_number || "N/A"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(customer)}
                      className="asc-edit-btn mobile"
                    >
                      <FiEdit2 />
                      Edit
                    </button>
                  </div>

                  <div className="asc-mobile-detail">
                    <FiMapPin />
                    <span>{customer.address || "-"}</span>
                  </div>

                  <div className="asc-mobile-bank-grid">
                    <div>
                      <span>Aadhaar No</span>
                      <strong>{maskAadhaar(customer.aadhaar_number)}</strong>
                    </div>

                    <div>
                      <span>PAN No</span>
                      <strong>{formatPan(customer.pan_number) || "-"}</strong>
                    </div>

                    <div>
                      <span>Bank Name</span>
                      <strong>{customer.bank_name || "-"}</strong>
                    </div>

                    <div>
                      <span>IFSC Code</span>
                      <strong>{customer.ifsc_code || "-"}</strong>
                    </div>

                    <div className="full">
                      <span>Account Number</span>
                      <strong>
                        <FiCreditCard />
                        {customer.bank_account_number || "-"}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {isModalOpen && (
          <div className="asc-modal-overlay" onClick={closeModal}>
            <div
              className="asc-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="asc-modal-header">
                <div>
                  <p className="asc-modal-kicker">
                    {editingCustomer ? "Update Customer" : "Create Customer"}
                  </p>

                  <h3>
                    {editingCustomer ? "Edit Customer" : "Register New Customer"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="asc-close-btn"
                  disabled={saving}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="asc-form">
                <div className="asc-grid-two">
                  <div className="asc-field-group">
                    <label>Customer Name *</label>

                    <input
                      required
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>

                  <div className="asc-field-group">
                    <label>Phone Number *</label>

                    <input
                      required
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="asc-field-group">
                  <label>Address</label>

                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter customer address"
                    rows="3"
                    disabled={saving}
                  />
                </div>

                <div className="asc-grid-two">
                  <div className="asc-field-group">
                    <label>Aadhaar Card Number Optional</label>

                    <input
                      name="aadhaar_number"
                      value={formData.aadhaar_number}
                      onChange={handleInputChange}
                      placeholder="Enter Aadhaar number"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>

                  <div className="asc-field-group">
                    <label>PAN Number Optional</label>

                    <input
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleInputChange}
                      placeholder="Enter PAN number"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="asc-grid-two">
                  <div className="asc-field-group">
                    <label>Bank Name</label>

                    <input
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      placeholder="Enter bank name"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>

                  <div className="asc-field-group">
                    <label>IFSC Code</label>

                    <input
                      name="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={handleInputChange}
                      placeholder="Enter IFSC code"
                      autoComplete="off"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="asc-field-group">
                  <label>Bank Account Number</label>

                  <input
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleInputChange}
                    placeholder="Enter bank account number"
                    autoComplete="off"
                    disabled={saving}
                  />
                </div>

                <div className="asc-info-box">
                  <FiBriefcase />
                  <span>
                    Bank details are used for payout/redemption records. Aadhaar
                    number is masked in the customer list.
                  </span>
                </div>

                <div className="asc-modal-actions">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="asc-cancel-btn"
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="asc-submit-btn"
                  >
                    <FiSave />
                    {saving
                      ? "Saving..."
                      : editingCustomer
                      ? "Update Customer"
                      : "Register Customer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ icon, label, value, tone = "blue" }) {
  return (
    <div className="asc-summary-card">
      <div className={`asc-summary-icon ${tone}`}>{icon}</div>

      <div>
        <p className="asc-summary-label">{label}</p>
        <h3 className="asc-summary-value">{value}</h3>
      </div>
    </div>
  );
}

const customerDirectoryCss = `
  .asc-page {
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asc-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 14px 22px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 900;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.22);
    max-width: min(460px, calc(100vw - 28px));
    min-width: min(280px, calc(100vw - 28px));
    text-align: center;
    white-space: pre-line;
  }

  .asc-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .asc-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .asc-header-card,
  .asc-summary-card,
  .asc-toolbar-card,
  .asc-table-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asc-header-card {
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .asc-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asc-title-icon {
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

  .asc-title-wrap {
    min-width: 0;
  }

  .asc-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asc-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asc-header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asc-back-btn {
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

  .asc-back-btn:hover {
    background: #dbeafe;
  }

  .asc-add-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    height: 46px;
    padding: 0 18px;
    border-radius: 13px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    white-space: nowrap;
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
  }

  .asc-add-btn:disabled,
  .asc-cancel-btn:disabled,
  .asc-submit-btn:disabled,
  .asc-close-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .asc-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asc-summary-card {
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 0;
  }

  .asc-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asc-summary-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asc-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asc-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .asc-summary-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asc-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asc-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 26px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .asc-toolbar-card {
    border-radius: 18px;
    padding: 10px;
    margin-bottom: 18px;
    display: grid;
    grid-template-columns: minmax(320px, 1fr) 230px 160px 90px;
    gap: 10px;
    align-items: center;
  }

  .asc-search-wrapper,
  .asc-filter-wrapper {
    height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 13px;
    color: #94a3b8;
    min-width: 0;
  }

  .asc-search-icon,
  .asc-filter-icon {
    color: #94a3b8;
    flex: 0 0 auto;
  }

  .asc-search-input,
  .asc-filter-select {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    min-width: 0;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .asc-clear-btn {
    height: 44px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    border-radius: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .asc-table-card {
    border-radius: 20px;
    overflow: hidden;
    max-width: 100%;
  }

  .asc-table-header {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .asc-card-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asc-card-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asc-record-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #eff6ff;
    color: #2563eb;
    padding: 8px 13px;
    font-size: 13px;
    font-weight: 950;
    white-space: nowrap;
  }

  .asc-table-wrapper {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .asc-table {
    width: 100%;
    table-layout: fixed;
    text-align: left;
    border-collapse: separate;
    border-spacing: 0;
  }

  .asc-col-name {
    width: 16%;
  }

  .asc-col-phone {
    width: 12%;
  }

  .asc-col-address {
    width: 31%;
  }

  .asc-col-identity {
    width: 16%;
  }

  .asc-col-bank {
    width: 18%;
  }

  .asc-col-action {
    width: 7%;
  }

  .asc-table th {
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 950;
    padding: 14px 14px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .asc-table th.center,
  .asc-table td.center {
    text-align: center;
  }

  .asc-table td {
    padding: 16px 14px;
    font-size: 14px;
    color: #0f172a;
    vertical-align: middle;
    border-bottom: 1px solid #eef2f7;
    font-weight: 750;
    min-width: 0;
  }

  .asc-table tbody tr:hover {
    background: #f8fafc;
  }

  .asc-customer-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asc-customer-name-cell strong {
    color: #0f172a;
    font-weight: 950;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asc-avatar {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .asc-phone-text {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #334155;
    font-weight: 900;
    min-width: 0;
  }

  .asc-address-cell {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
    color: #334155;
    line-height: 1.45;
  }

  .asc-address-cell svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #64748b;
  }

  .asc-address-cell span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .asc-stack-cell {
    display: grid;
    gap: 7px;
    min-width: 0;
    color: #334155;
    line-height: 1.35;
  }

  .asc-stack-cell span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asc-stack-cell strong {
    color: #64748b;
    font-weight: 950;
  }

  .asc-pan-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    color: #334155;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 950;
    white-space: nowrap;
    max-width: 100%;
  }

  .asc-edit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 12px;
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 950;
    font-size: 13px;
    min-height: 38px;
    white-space: nowrap;
  }

  .asc-empty-cell {
    padding: 42px 16px !important;
    text-align: center;
    color: #64748b !important;
    font-size: 15px !important;
    font-weight: 850;
  }

  .asc-mobile-list {
    display: none;
  }

  .asc-mobile-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .asc-mobile-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .asc-mobile-customer {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asc-mobile-card h3 {
    margin: 0;
    font-size: 16px;
    color: #0f172a;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asc-mobile-card p {
    margin: 6px 0 0;
    display: flex;
    align-items: center;
    gap: 7px;
    color: #475569;
    font-size: 13px;
    font-weight: 800;
  }

  .asc-mobile-detail {
    margin-top: 12px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .asc-mobile-detail svg {
    margin-top: 2px;
    flex: 0 0 auto;
  }

  .asc-mobile-bank-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .asc-mobile-bank-grid div {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asc-mobile-bank-grid div.full {
    grid-column: 1 / -1;
  }

  .asc-mobile-bank-grid span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
  }

  .asc-mobile-bank-grid strong {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asc-mobile-empty {
    padding: 24px;
    text-align: center;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    color: #64748b;
    font-weight: 850;
  }

  .asc-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.48);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4000;
    padding: 20px;
    box-sizing: border-box;
  }

  .asc-modal {
    width: min(760px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 24px 55px rgba(15, 23, 42, 0.28);
    box-sizing: border-box;
    border: 1px solid #e2e8f0;
  }

  .asc-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .asc-modal-kicker {
    margin: 0 0 5px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .asc-modal-header h3 {
    margin: 0;
    font-size: 21px;
    font-weight: 950;
    color: #0f172a;
  }

  .asc-close-btn {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    cursor: pointer;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .asc-form {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .asc-grid-two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .asc-field-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }

  .asc-field-group label {
    color: #334155;
    font-size: 13px;
    font-weight: 950;
  }

  .asc-field-group input,
  .asc-field-group textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    font-size: 14px;
    background: #ffffff;
    color: #0f172a;
    outline: none;
    box-sizing: border-box;
    font-weight: 750;
  }

  .asc-field-group input {
    height: 44px;
    padding: 0 12px;
  }

  .asc-field-group textarea {
    min-height: 84px;
    padding: 12px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }

  .asc-field-group input:focus,
  .asc-field-group textarea:focus {
    border-color: #2563eb;
  }

  .asc-info-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
    padding: 13px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.45;
  }

  .asc-info-box svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }

  .asc-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .asc-cancel-btn,
  .asc-submit-btn {
    height: 44px;
    padding: 0 17px;
    border-radius: 13px;
    cursor: pointer;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .asc-cancel-btn {
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  .asc-submit-btn {
    background: #2563eb;
    color: #ffffff;
    border: none;
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
  }

  @media (max-width: 1300px) {
    .asc-toolbar-card {
      grid-template-columns: 1fr 220px 160px 90px;
    }

    .asc-col-address {
      width: 28%;
    }

    .asc-col-bank {
      width: 20%;
    }
  }

  @media (max-width: 1200px) {
    .asc-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asc-table-wrapper {
      display: none;
    }

    .asc-mobile-list {
      display: grid;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
    }
  }

  @media (max-width: 900px) {
    .asc-grid-two {
      grid-template-columns: 1fr;
    }

    .asc-toolbar-card {
      grid-template-columns: 1fr 1fr;
    }

    .asc-search-wrapper {
      grid-column: 1 / -1;
    }

    .asc-clear-btn {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 768px) {
    .asc-page {
      padding: 12px;
    }

    .asc-toast {
      top: 70px;
    }

    .asc-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asc-header-left {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .asc-header-actions {
      width: 100%;
      flex-direction: column;
    }

    .asc-back-btn,
    .asc-add-btn {
      width: 100%;
    }

    .asc-title-icon {
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    .asc-title {
      font-size: 23px;
    }

    .asc-summary-grid,
    .asc-toolbar-card {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asc-search-wrapper {
      grid-column: auto;
    }

    .asc-clear-btn {
      grid-column: auto;
    }

    .asc-summary-value {
      font-size: 23px;
    }

    .asc-table-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .asc-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .asc-modal {
      width: 100%;
      max-height: 92vh;
      border-radius: 20px 20px 0 0;
    }

    .asc-modal-actions {
      flex-direction: column;
    }

    .asc-cancel-btn,
    .asc-submit-btn {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .asc-page {
      padding: 10px;
    }

    .asc-header-left {
      flex-direction: column;
    }

    .asc-title {
      font-size: 22px;
    }

    .asc-mobile-card-top {
      flex-direction: column;
    }

    .asc-edit-btn.mobile {
      width: 100%;
    }

    .asc-mobile-bank-grid {
      grid-template-columns: 1fr;
    }

    .asc-form {
      padding: 16px;
    }

    .asc-modal-header h3 {
      font-size: 18px;
    }
  }
`;

export default CustomerDirectory;