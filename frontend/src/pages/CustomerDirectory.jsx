import React, { useEffect, useState } from "react";
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
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function CustomerDirectory({ onBack }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "pan_number" || name === "ifsc_code"
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
    setIsModalOpen(false);
    setEditingCustomer(null);
    setSaving(false);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      alert("Please enter customer name and phone number.");
      return;
    }

    try {
      setSaving(true);

      if (editingCustomer?.id) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post("/customers/", payload);
      }

      closeModal();
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);

      const backendMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Customer could not be saved.";

      alert(JSON.stringify(backendMessage, null, 2));
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();

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

  return (
    <>
      <style>{customerDirectoryCss}</style>

      <div className="asc-page">
        <div className="asc-header">
          <button type="button" onClick={handleBack} className="asc-back-btn">
            <FiArrowLeft size={16} />
            Back
          </button>

          <div className="asc-title-wrap">
            <h2 className="asc-title">Customer Directory</h2>
            <p className="asc-subtitle">
              Register customers, manage identity details, and maintain payout
              bank information.
            </p>
          </div>

          <span className="asc-badge">
            <FiUsers size={14} />
            {filteredCustomers.length}
          </span>
        </div>

        <div className="asc-toolbar">
          <div className="asc-search-wrapper">
            <FiSearch size={16} className="asc-search-icon" />

            <input
              type="text"
              placeholder="Search name, phone, Aadhaar, PAN, bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="asc-search-input"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="asc-add-btn"
          >
            <FiUserPlus size={16} />
            Register Customer
          </button>
        </div>

        {loading && <div className="asc-loading-box">Loading customers...</div>}

        <div className="asc-table-wrapper">
          <table className="asc-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Address</th>
                <th>Aadhaar No</th>
                <th>PAN No</th>
                <th>Bank Name</th>
                <th>Account Number</th>
                <th>IFSC Code</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="asc-empty-cell">
                    No registered customers yet.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={
                      customer.id || `${customer.name}-${customer.phone_number}`
                    }
                  >
                    <td className="name">
                      {customer.name || "Unnamed Customer"}
                    </td>

                    <td>{customer.phone_number || "N/A"}</td>

                    <td>{customer.address || "-"}</td>

                    <td>{maskAadhaar(customer.aadhaar_number)}</td>

                    <td>{formatPan(customer.pan_number) || "-"}</td>

                    <td>{customer.bank_name || "-"}</td>

                    <td>{customer.bank_account_number || "-"}</td>

                    <td>{customer.ifsc_code || "-"}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="asc-edit-btn"
                      >
                        <FiEdit2 size={14} />
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
          {!loading && filteredCustomers.length === 0 ? (
            <div className="asc-mobile-empty">No registered customers yet.</div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id || `${customer.name}-${customer.phone_number}`}
                className="asc-mobile-card"
              >
                <div className="asc-mobile-card-top">
                  <div>
                    <h3>{customer.name || "Unnamed Customer"}</h3>

                    <p>
                      <FiPhone size={14} />
                      {customer.phone_number || "N/A"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(customer)}
                    className="asc-edit-btn mobile"
                  >
                    <FiEdit2 size={14} />
                    Edit
                  </button>
                </div>

                <div className="asc-mobile-detail">
                  <FiMapPin size={14} />
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
                      <FiCreditCard size={14} />
                      {customer.bank_account_number || "-"}
                    </strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {isModalOpen && (
          <div className="asc-modal-overlay" onClick={closeModal}>
            <div className="asc-modal" onClick={(e) => e.stopPropagation()}>
              <div className="asc-modal-header">
                <h3>
                  {editingCustomer ? "Edit Customer" : "Register New Customer"}
                </h3>

                <button
                  type="button"
                  onClick={closeModal}
                  className="asc-close-btn"
                >
                  <FiX size={18} />
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
                  />
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

const customerDirectoryCss = `
  .asc-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    padding: 20px 24px 40px;
    color: #111827;
    background-color: #ffffff;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asc-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .asc-back-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 14px;
    min-height: 40px;
  }

  .asc-title-wrap {
    flex: 1;
    min-width: 0;
  }

  .asc-title {
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.03em;
  }

  .asc-subtitle {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.5;
  }

  .asc-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: #eff6ff;
    color: #2563eb;
    padding: 6px 14px;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid #bfdbfe;
    white-space: nowrap;
  }

  .asc-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    align-items: center;
  }

  .asc-search-wrapper {
    position: relative;
    flex: 1;
    min-width: 260px;
    max-width: 520px;
  }

  .asc-search-icon {
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .asc-search-input {
    width: 100%;
    padding: 10px 15px 10px 36px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
    min-height: 42px;
  }

  .asc-add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
    min-height: 42px;
  }

  .asc-loading-box {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-weight: 700;
    font-size: 14px;
  }

  .asc-table-wrapper {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border: 1px solid #e5e7eb;
    max-width: 100%;
  }

  .asc-table {
    width: 100%;
    min-width: 1320px;
    text-align: left;
    border-collapse: collapse;
  }

  .asc-table thead tr {
    background-color: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  .asc-table th {
    padding: 14px 16px;
    color: #374151;
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }

  .asc-table tbody tr {
    border-bottom: 1px solid #f3f4f6;
  }

  .asc-table td {
    padding: 14px 16px;
    font-size: 14px;
    color: #4b5563;
    white-space: nowrap;
    vertical-align: middle;
  }

  .asc-table td.name {
    font-weight: 800;
    color: #111827;
  }

  .asc-edit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background-color: #f9fafb;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 800;
    font-size: 13px;
    min-height: 36px;
  }

  .asc-empty-cell {
    padding: 40px !important;
    text-align: center;
    color: #6b7280 !important;
    font-size: 15px !important;
    font-weight: 700;
  }

  .asc-mobile-list {
    display: none;
  }

  .asc-mobile-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .asc-mobile-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .asc-mobile-card h3 {
    margin: 0;
    font-size: 16px;
    color: #111827;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asc-mobile-card p {
    margin: 6px 0 0;
    display: flex;
    align-items: center;
    gap: 7px;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
  }

  .asc-mobile-detail {
    margin-top: 12px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.45;
  }

  .asc-mobile-detail svg {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .asc-mobile-bank-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .asc-mobile-bank-grid div {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asc-mobile-bank-grid div.full {
    grid-column: 1 / -1;
  }

  .asc-mobile-bank-grid span {
    display: block;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .asc-mobile-bank-grid strong {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asc-mobile-empty {
    padding: 24px;
    text-align: center;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    color: #6b7280;
    font-weight: 800;
  }

  .asc-modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.48);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4000;
    backdrop-filter: blur(2px);
    padding: 18px;
  }

  .asc-modal {
    background-color: #ffffff;
    border-radius: 16px;
    padding: 28px;
    width: min(92vw, 760px);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    box-sizing: border-box;
  }

  .asc-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .asc-modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    color: #111827;
  }

  .asc-close-btn {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    color: #6b7280;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .asc-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .asc-grid-two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .asc-field-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .asc-field-group label {
    margin-bottom: 6px;
    color: #374151;
    font-weight: 800;
    font-size: 14px;
  }

  .asc-field-group input,
  .asc-field-group textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    background-color: #ffffff;
    color: #111827;
    outline: none;
    box-sizing: border-box;
  }

  .asc-field-group textarea {
    resize: vertical;
    font-family: inherit;
  }

  .asc-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  .asc-cancel-btn,
  .asc-submit-btn {
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 800;
    font-size: 14px;
    min-height: 42px;
  }

  .asc-cancel-btn {
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .asc-submit-btn {
    background-color: #2563eb;
    color: #ffffff;
    border: none;
  }

  .asc-cancel-btn:disabled,
  .asc-submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .asc-page {
      padding: 16px;
    }

    .asc-header {
      align-items: flex-start;
    }

    .asc-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .asc-search-wrapper {
      max-width: none;
      min-width: 0;
      width: 100%;
    }

    .asc-add-btn {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .asc-page {
      padding: 12px;
    }

    .asc-header {
      gap: 12px;
      margin-bottom: 20px;
    }

    .asc-back-btn {
      width: 100%;
    }

    .asc-title-wrap {
      width: 100%;
      flex: unset;
    }

    .asc-title {
      font-size: 23px;
    }

    .asc-badge {
      width: 100%;
      justify-content: center;
    }

    .asc-table-wrapper {
      display: none;
    }

    .asc-mobile-list {
      display: grid;
      gap: 12px;
    }

    .asc-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .asc-modal {
      width: 100%;
      max-height: 92vh;
      border-radius: 18px 18px 0 0;
      padding: 20px;
    }

    .asc-grid-two {
      grid-template-columns: 1fr;
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

    .asc-mobile-card-top {
      flex-direction: column;
    }

    .asc-edit-btn.mobile {
      width: 100%;
    }

    .asc-mobile-bank-grid {
      grid-template-columns: 1fr;
    }

    .asc-modal {
      padding: 16px;
    }

    .asc-modal-header h3 {
      font-size: 18px;
    }
  }
`;

export default CustomerDirectory;