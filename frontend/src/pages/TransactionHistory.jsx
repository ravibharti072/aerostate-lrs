import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiClock,
  FiSearch,
  FiRefreshCw,
  FiAward,
  FiUser,
  FiPlusCircle,
  FiMinusCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiX,
  FiSave,
  FiPackage,
} from "react-icons/fi";
import api from "../api/axios";

const ITEMS_PER_PAGE = 20;

const UNITS = ["No / Pcs", "Kg", "Gram", "Liter", "ML"];

function TransactionHistory({ onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [entryType, setEntryType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: "", message: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const [editingTxn, setEditingTxn] = useState(null);
  const [editForm, setEditForm] = useState({
    loyalty_item_id: "",
    unit: "No / Pcs",
    quantity: "",
    note: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCustomerId, entryType]);

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.location.href = "/dashboard";
  };

  const showToast = (type, message) => {
    setToast({ type, message });

    setTimeout(() => {
      setToast({ type: "", message: "" });
    }, 3000);
  };

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.transactions)) return data.transactions;
    if (Array.isArray(data?.customers)) return data.customers;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const getErrorMessage = (error, fallback) => {
    const detail = error.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    if (typeof detail === "string") return detail;

    return fallback;
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [txnRes, customerRes, itemRes] = await Promise.all([
        api.get("/transactions/"),
        api.get("/customers/"),
        api.get("/loyalty/items"),
      ]);

      setTransactions(normalizeList(txnRes.data));
      setCustomers(normalizeList(customerRes.data));
      setItems(normalizeList(itemRes.data));
    } catch (error) {
      console.error("Transaction history fetch error:", error);
      setTransactions([]);
      setCustomers([]);
      setItems([]);

      showToast(
        "error",
        getErrorMessage(error, "Unable to load transaction history.")
      );
    } finally {
      setLoading(false);
    }
  };

  const normalizeTxnType = (txn) => {
    const rawType = String(
      txn.type || txn.transaction_type || txn.entry_type || ""
    )
      .trim()
      .toUpperCase();

    if (
      rawType === "POINTS_CREDIT" ||
      rawType === "CREDIT" ||
      rawType === "EARN" ||
      rawType === "EARNED" ||
      rawType === "MANUAL_ADD"
    ) {
      return "POINTS_CREDIT";
    }

    if (
      rawType === "POINTS_DEBIT" ||
      rawType === "DEBIT" ||
      rawType === "REDEEM" ||
      rawType === "USED" ||
      rawType === "REDEEMED" ||
      rawType === "MANUAL_DEDUCT"
    ) {
      return "POINTS_DEBIT";
    }

    return rawType;
  };

  const isPointCredit = (txn) => normalizeTxnType(txn) === "POINTS_CREDIT";
  const isPointDebit = (txn) => normalizeTxnType(txn) === "POINTS_DEBIT";

  const getCustomer = (customerId) =>
    customers.find((customer) => Number(customer.id) === Number(customerId));

  const getCustomerName = (txn) =>
    txn.customer_name ||
    getCustomer(txn.customer_id)?.name ||
    `Customer #${txn.customer_id}`;

  const getCustomerPhone = (txn) =>
    txn.phone_number ||
    getCustomer(txn.customer_id)?.phone_number ||
    getCustomer(txn.customer_id)?.phone ||
    "-";

  const getItemById = (itemId) =>
    items.find((item) => Number(item.id) === Number(itemId));

  const getItemName = (txn) => {
    if (txn.item_name) return txn.item_name;

    const itemId = txn.loyalty_item_id || txn.item_id;
    const item = getItemById(itemId);

    return item?.item_name || item?.name || "-";
  };

  const getItemPoints = (itemId) => {
    const item = getItemById(itemId);

    return Number(
      item?.points ||
        item?.per_point_amount ||
        item?.points_value ||
        item?.points_required ||
        0
    );
  };

  const formatDate = (dateValue) =>
    dateValue
      ? new Date(dateValue).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const transactionRecords = useMemo(() => {
    return transactions.filter((txn) => {
      const points = Number(txn.points || txn.total_points || 0);
      return points > 0 && (isPointCredit(txn) || isPointDebit(txn));
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return transactionRecords.filter((txn) => {
      const name = getCustomerName(txn).toLowerCase();
      const phone = String(getCustomerPhone(txn)).toLowerCase();
      const itemName = String(getItemName(txn)).toLowerCase();
      const type = normalizeTxnType(txn);

      const matchesSearch = search
        ? name.includes(search) ||
          phone.includes(search) ||
          itemName.includes(search)
        : true;

      const matchesCustomer =
        selectedCustomerId === "all" ||
        Number(txn.customer_id) === Number(selectedCustomerId);

      const matchesType = entryType === "all" || type === entryType;

      return matchesSearch && matchesCustomer && matchesType;
    });
  }, [
    transactionRecords,
    customers,
    items,
    searchTerm,
    selectedCustomerId,
    entryType,
  ]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [filteredTransactions]);

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;

  const paginatedTransactions = sortedTransactions.slice(
    startIdx,
    startIdx + ITEMS_PER_PAGE
  );

  const totalEarned = useMemo(
    () =>
      transactionRecords
        .filter(isPointCredit)
        .reduce(
          (sum, txn) => sum + Number(txn.points || txn.total_points || 0),
          0
        ),
    [transactionRecords]
  );

  const totalUsed = useMemo(
    () =>
      transactionRecords
        .filter(isPointDebit)
        .reduce(
          (sum, txn) => sum + Number(txn.points || txn.total_points || 0),
          0
        ),
    [transactionRecords]
  );

  const netPoints = totalEarned - totalUsed;

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages || 1));
  };

  const canEditRewardItem = (txn) => {
    return Boolean(txn.reward_entry_item_id);
  };

  const openEditModal = (txn) => {
    if (!canEditRewardItem(txn)) {
      showToast(
        "error",
        "Only Reward Entry transactions can be edited by product and quantity."
      );
      return;
    }

    setEditingTxn(txn);

    setEditForm({
      loyalty_item_id: txn.loyalty_item_id || txn.item_id || "",
      unit: txn.unit || "No / Pcs",
      quantity: txn.quantity || "",
      note: txn.description || txn.note || "",
    });
  };

  const closeEditModal = () => {
    setEditingTxn(null);

    setEditForm({
      loyalty_item_id: "",
      unit: "No / Pcs",
      quantity: "",
      note: "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectedItemPoints = useMemo(() => {
    return getItemPoints(editForm.loyalty_item_id);
  }, [editForm.loyalty_item_id, items]);

  const calculatedTotalPoints = useMemo(() => {
    const quantity = Number(editForm.quantity || 0);
    const points = Number(selectedItemPoints || 0);

    return Math.round(quantity * points);
  }, [editForm.quantity, selectedItemPoints]);

  const updateTransaction = async (e) => {
    e.preventDefault();

    if (!editingTxn?.reward_entry_item_id) {
      showToast("error", "Invalid reward transaction selected.");
      return;
    }

    if (!editForm.loyalty_item_id) {
      showToast("error", "Please select product/item.");
      return;
    }

    if (!editForm.unit) {
      showToast("error", "Please select unit.");
      return;
    }

    if (!editForm.quantity || Number(editForm.quantity) <= 0) {
      showToast("error", "Quantity must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      await api.put(
        `/transactions/reward-entry-items/${editingTxn.reward_entry_item_id}`,
        {
          loyalty_item_id: Number(editForm.loyalty_item_id),
          unit: editForm.unit,
          quantity: Number(editForm.quantity),
          note: editForm.note,
        }
      );

      showToast("success", "Transaction updated successfully.");
      closeEditModal();
      fetchData();
    } catch (error) {
      console.error("Update transaction error:", error);

      showToast(
        "error",
        getErrorMessage(error, "Unable to update transaction.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{transactionHistoryCss}</style>

      <div className="ast-page">
        {toast.message && (
          <div className={`ast-toast ${toast.type === "error" ? "error" : "success"}`}>
            {toast.message}
          </div>
        )}

        <div className="ast-header">
          <button type="button" onClick={handleBack} className="ast-back-btn">
            <FiArrowLeft size={16} />
            Back
          </button>

          <div className="ast-title-wrap">
            <h2 className="ast-title">
              <FiClock size={24} color="#2563eb" />
              Transaction History
            </h2>

            <p className="ast-subtitle">
              View earned and used points with customer, item, unit, and quantity details.
            </p>
          </div>
        </div>

        <div className="ast-summary-grid">
          <SummaryCard
            icon={<FiPlusCircle size={20} color="#059669" />}
            iconClass="green"
            label="Points Earned"
            value={totalEarned}
            valueClass="green"
          />

          <SummaryCard
            icon={<FiMinusCircle size={20} color="#dc2626" />}
            iconClass="red"
            label="Points Used"
            value={totalUsed}
            valueClass="red"
          />

          <SummaryCard
            icon={<FiAward size={20} color="#2563eb" />}
            iconClass="blue"
            label="Net Points"
            value={netPoints}
            valueClass="blue"
          />

          <SummaryCard
            icon={<FiUser size={20} color="#7c3aed" />}
            iconClass="purple"
            label="Transactions"
            value={transactionRecords.length}
            valueClass="purple"
          />
        </div>

        <div className="ast-toolbar">
          <div className="ast-search-wrapper">
            <FiSearch size={16} className="ast-search-icon" />

            <input
              type="text"
              placeholder="Search customer, phone or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ast-search-input"
            />
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="ast-filter-select"
          >
            <option value="all">All Customers</option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name || "Unnamed Customer"}
              </option>
            ))}
          </select>

          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            className="ast-filter-select"
          >
            <option value="all">All Transaction Types</option>
            <option value="POINTS_CREDIT">Earned Points</option>
            <option value="POINTS_DEBIT">Used Points</option>
          </select>

          <button
            type="button"
            onClick={fetchData}
            className="ast-refresh-btn"
            disabled={loading}
          >
            <FiRefreshCw size={16} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="ast-table-card">
          <div className="ast-table-header">
            <h3 className="ast-table-title">Transaction History</h3>

            <span className="ast-table-count">
              {filteredTransactions.length} records
            </span>
          </div>

          <div className="ast-table-scroll">
            <table className="ast-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Item</th>
                  <th>Unit</th>
                  <th className="right">Qty</th>
                  <th>Type</th>
                  <th className="right">Points</th>
                  <th className="center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="ast-empty-cell">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="ast-empty-cell">
                      No transaction records found.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((txn, index) => {
                    const credit = isPointCredit(txn);
                    const points = Number(txn.points || txn.total_points || 0);
                    const editable = canEditRewardItem(txn);

                    return (
                      <tr key={txn.id || index}>
                        <td>{formatDate(txn.created_at)}</td>
                        <td className="customer">{getCustomerName(txn)}</td>
                        <td>{getCustomerPhone(txn)}</td>
                        <td>{getItemName(txn)}</td>
                        <td>{txn.unit || "-"}</td>
                        <td className="right">{txn.quantity || "-"}</td>

                        <td>
                          <span className={`ast-type-badge ${credit ? "credit" : "debit"}`}>
                            {credit ? "Earned" : "Used"}
                          </span>
                        </td>

                        <td className={`points right ${credit ? "credit" : "debit"}`}>
                          {credit ? "+" : "-"}
                          {points}
                        </td>

                        <td className="center">
                          {editable ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(txn)}
                              className="ast-edit-btn"
                            >
                              <FiEdit2 size={14} />
                              Edit
                            </button>
                          ) : (
                            <span className="ast-not-editable">
                              No item edit
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="ast-mobile-list">
            {loading ? (
              <div className="ast-mobile-empty">Loading...</div>
            ) : paginatedTransactions.length === 0 ? (
              <div className="ast-mobile-empty">
                No transaction records found.
              </div>
            ) : (
              paginatedTransactions.map((txn, index) => {
                const credit = isPointCredit(txn);
                const points = Number(txn.points || txn.total_points || 0);
                const editable = canEditRewardItem(txn);

                return (
                  <div key={txn.id || index} className="ast-mobile-card">
                    <div className="ast-mobile-card-top">
                      <div>
                        <p className="ast-mobile-date">
                          {formatDate(txn.created_at)}
                        </p>

                        <h3>{getCustomerName(txn)}</h3>

                        <p className="ast-mobile-phone">
                          {getCustomerPhone(txn)}
                        </p>
                      </div>

                      <span className={`ast-type-badge ${credit ? "credit" : "debit"}`}>
                        {credit ? "Earned" : "Used"}
                      </span>
                    </div>

                    <div className="ast-mobile-detail-grid">
                      <div>
                        <span>Item</span>
                        <strong>{getItemName(txn)}</strong>
                      </div>

                      <div>
                        <span>Unit</span>
                        <strong>{txn.unit || "-"}</strong>
                      </div>

                      <div>
                        <span>Quantity</span>
                        <strong>{txn.quantity || "-"}</strong>
                      </div>

                      <div>
                        <span>Points</span>
                        <strong className={credit ? "credit-text" : "debit-text"}>
                          {credit ? "+" : "-"}
                          {points}
                        </strong>
                      </div>
                    </div>

                    <div className="ast-mobile-actions">
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(txn)}
                          className="ast-edit-btn"
                        >
                          <FiEdit2 size={14} />
                          Edit Transaction
                        </button>
                      ) : (
                        <span className="ast-not-editable mobile">
                          No item edit available
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="ast-pagination">
            <span className="ast-pagination-info">
              Page {safePage} of {totalPages} ({startIdx + 1}–
              {Math.min(startIdx + ITEMS_PER_PAGE, filteredTransactions.length)}{" "}
              of {filteredTransactions.length} records)
            </span>

            <div className="ast-pagination-buttons">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className="ast-page-btn"
              >
                <FiChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="ast-page-btn"
              >
                Next
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {editingTxn && (
          <div className="ast-modal-overlay">
            <div className="ast-modal-box">
              <div className="ast-modal-header">
                <h3>Edit Transaction Item</h3>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="ast-close-btn"
                >
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={updateTransaction}>
                <div className="ast-info-box">
                  <FiPackage size={18} color="#2563eb" />

                  <div>
                    <strong>{getCustomerName(editingTxn)}</strong>

                    <p>
                      Edit product, unit and quantity. Points will update
                      automatically.
                    </p>
                  </div>
                </div>

                <div className="ast-form-group">
                  <label>Product / Item</label>

                  <select
                    name="loyalty_item_id"
                    value={editForm.loyalty_item_id}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">Select Item</option>

                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name || item.name} -{" "}
                        {item.points || item.per_point_amount || 0} pts/unit
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ast-form-row">
                  <div className="ast-form-group">
                    <label>Unit</label>

                    <select
                      name="unit"
                      value={editForm.unit}
                      onChange={handleEditChange}
                      required
                    >
                      {UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ast-form-group">
                    <label>Quantity</label>

                    <input
                      type="number"
                      name="quantity"
                      value={editForm.quantity}
                      onChange={handleEditChange}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="ast-calculation-box">
                  <div>
                    <p>Points Per Unit</p>
                    <h4>{selectedItemPoints}</h4>
                  </div>

                  <div>
                    <p>Total Points</p>
                    <h4>{calculatedTotalPoints}</h4>
                  </div>
                </div>

                <div className="ast-form-group">
                  <label>Note</label>

                  <textarea
                    name="note"
                    value={editForm.note}
                    onChange={handleEditChange}
                    placeholder="Optional note..."
                  />
                </div>

                <div className="ast-modal-actions">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="ast-cancel-btn"
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="ast-save-btn" disabled={saving}>
                    <FiSave size={15} />
                    {saving ? "Saving..." : "Save Changes"}
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

const SummaryCard = ({ icon, iconClass, label, value, valueClass }) => (
  <div className="ast-summary-card">
    <div className={`ast-summary-icon ${iconClass}`}>{icon}</div>

    <div>
      <p className="ast-summary-label">{label}</p>
      <h3 className={`ast-summary-value ${valueClass}`}>{value}</h3>
    </div>
  </div>
);

const transactionHistoryCss = `
  .ast-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    padding: 20px 24px 40px;
    color: #111827;
    background-color: #ffffff;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .ast-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    padding: 12px 22px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    max-width: min(420px, calc(100vw - 28px));
    text-align: center;
  }

  .ast-toast.success {
    background-color: #16a34a;
  }

  .ast-toast.error {
    background-color: #dc2626;
  }

  .ast-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .ast-back-btn {
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

  .ast-title-wrap {
    flex: 1;
    min-width: 0;
  }

  .ast-title {
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ast-subtitle {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.5;
  }

  .ast-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 28px;
  }

  .ast-summary-card {
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    min-width: 0;
  }

  .ast-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ast-summary-icon.green {
    background-color: #ecfdf5;
  }

  .ast-summary-icon.red {
    background-color: #fef2f2;
  }

  .ast-summary-icon.blue {
    background-color: #eff6ff;
  }

  .ast-summary-icon.purple {
    background-color: #f5f3ff;
  }

  .ast-summary-label {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
    font-weight: 700;
  }

  .ast-summary-value {
    margin: 6px 0 0;
    font-size: 28px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ast-summary-value.green {
    color: #059669;
  }

  .ast-summary-value.red {
    color: #dc2626;
  }

  .ast-summary-value.blue {
    color: #2563eb;
  }

  .ast-summary-value.purple {
    color: #7c3aed;
  }

  .ast-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    align-items: center;
  }

  .ast-search-wrapper {
    position: relative;
    flex: 1;
    min-width: 240px;
    max-width: 360px;
  }

  .ast-search-icon {
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .ast-search-input {
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

  .ast-filter-select {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #111827;
    font-weight: 700;
    font-size: 14px;
    outline: none;
    min-height: 42px;
  }

  .ast-refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: #f9fafb;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 14px;
    min-height: 42px;
  }

  .ast-refresh-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .ast-table-card {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    overflow: hidden;
    border: 1px solid #e5e7eb;
    max-width: 100%;
  }

  .ast-table-header {
    padding: 16px 18px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .ast-table-title {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    color: #111827;
  }

  .ast-table-count {
    background-color: #eff6ff;
    color: #2563eb;
    padding: 4px 12px;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
  }

  .ast-table-scroll {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ast-table {
    width: 100%;
    min-width: 1120px;
    text-align: left;
    border-collapse: collapse;
  }

  .ast-table thead tr {
    background-color: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  .ast-table th {
    padding: 14px 16px;
    color: #374151;
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }

  .ast-table th.right,
  .ast-table td.right {
    text-align: right;
  }

  .ast-table th.center,
  .ast-table td.center {
    text-align: center;
  }

  .ast-table tbody tr {
    border-bottom: 1px solid #f3f4f6;
  }

  .ast-table td {
    padding: 14px 16px;
    font-size: 14px;
    color: #4b5563;
    vertical-align: middle;
    white-space: nowrap;
  }

  .ast-table td.customer {
    font-weight: 800;
    color: #111827;
  }

  .ast-type-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    border: 1px solid;
    white-space: nowrap;
  }

  .ast-type-badge.credit {
    background-color: #dcfce7;
    color: #166534;
    border-color: #bbf7d0;
  }

  .ast-type-badge.debit {
    background-color: #fee2e2;
    color: #991b1b;
    border-color: #fecaca;
  }

  .ast-table td.points {
    font-size: 15px;
    font-weight: 900;
  }

  .ast-table td.points.credit,
  .credit-text {
    color: #16a34a;
  }

  .ast-table td.points.debit,
  .debit-text {
    color: #dc2626;
  }

  .ast-edit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 12px;
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 800;
    font-size: 13px;
    min-height: 36px;
  }

  .ast-not-editable {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 700;
  }

  .ast-empty-cell {
    padding: 40px !important;
    text-align: center;
    color: #6b7280 !important;
    font-size: 15px !important;
    font-weight: 800;
  }

  .ast-mobile-list {
    display: none;
  }

  .ast-mobile-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .ast-mobile-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .ast-mobile-date {
    margin: 0 0 5px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .ast-mobile-card h3 {
    margin: 0;
    color: #111827;
    font-size: 16px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ast-mobile-phone {
    margin: 5px 0 0;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
  }

  .ast-mobile-detail-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .ast-mobile-detail-grid div {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .ast-mobile-detail-grid span {
    display: block;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .ast-mobile-detail-grid strong {
    display: block;
    margin-top: 5px;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ast-mobile-actions {
    margin-top: 14px;
  }

  .ast-mobile-actions .ast-edit-btn {
    width: 100%;
  }

  .ast-not-editable.mobile {
    display: block;
    text-align: center;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px;
  }

  .ast-mobile-empty {
    padding: 24px;
    text-align: center;
    color: #6b7280;
    font-weight: 800;
  }

  .ast-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ast-pagination-info {
    font-size: 14px;
    color: #6b7280;
    font-weight: 700;
  }

  .ast-pagination-buttons {
    display: flex;
    gap: 8px;
  }

  .ast-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    min-height: 38px;
  }

  .ast-page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ast-modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.48);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4000;
    padding: 20px;
    box-sizing: border-box;
  }

  .ast-modal-box {
    width: min(560px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background-color: #ffffff;
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 20px 45px rgba(0,0,0,0.25);
    box-sizing: border-box;
  }

  .ast-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }

  .ast-modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    color: #111827;
  }

  .ast-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ast-info-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: 10px;
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    margin-bottom: 16px;
  }

  .ast-info-box strong {
    color: #111827;
  }

  .ast-info-box p {
    margin: 4px 0 0;
    color: #4b5563;
    font-size: 13px;
    line-height: 1.4;
  }

  .ast-form-group {
    margin-bottom: 14px;
    flex: 1;
    min-width: 0;
  }

  .ast-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .ast-form-group label {
    display: block;
    margin-bottom: 7px;
    font-size: 14px;
    font-weight: 800;
    color: #374151;
  }

  .ast-form-group input,
  .ast-form-group select,
  .ast-form-group textarea {
    width: 100%;
    padding: 11px 12px;
    border-radius: 9px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    background-color: #ffffff;
    color: #111827;
  }

  .ast-form-group textarea {
    min-height: 80px;
    resize: vertical;
  }

  .ast-calculation-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }

  .ast-calculation-box div {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px;
  }

  .ast-calculation-box p {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
    font-weight: 800;
  }

  .ast-calculation-box h4 {
    margin: 6px 0 0;
    color: #111827;
    font-size: 22px;
    font-weight: 900;
  }

  .ast-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .ast-cancel-btn,
  .ast-save-btn {
    padding: 10px 16px;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 800;
    min-height: 42px;
  }

  .ast-cancel-btn {
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #374151;
  }

  .ast-save-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #2563eb;
    background-color: #2563eb;
    color: #ffffff;
  }

  .ast-cancel-btn:disabled,
  .ast-save-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: 1100px) {
    .ast-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .ast-page {
      padding: 16px;
    }

    .ast-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .ast-search-wrapper {
      max-width: none;
      min-width: 0;
      width: 100%;
    }

    .ast-filter-select,
    .ast-refresh-btn {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .ast-page {
      padding: 12px;
    }

    .ast-toast {
      top: 70px;
    }

    .ast-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .ast-back-btn {
      width: 100%;
    }

    .ast-title {
      font-size: 23px;
      align-items: flex-start;
    }

    .ast-summary-grid {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 22px;
    }

    .ast-summary-card {
      padding: 18px;
    }

    .ast-summary-value {
      font-size: 25px;
    }

    .ast-table-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .ast-table-scroll {
      display: none;
    }

    .ast-mobile-list {
      display: grid;
      gap: 12px;
      padding: 14px;
      background: #f9fafb;
    }

    .ast-pagination {
      align-items: stretch;
      flex-direction: column;
    }

    .ast-pagination-info {
      text-align: center;
    }

    .ast-pagination-buttons {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .ast-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .ast-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 18px 18px 0 0;
      padding: 20px;
    }

    .ast-form-row {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .ast-modal-actions {
      flex-direction: column;
    }

    .ast-cancel-btn,
    .ast-save-btn {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .ast-page {
      padding: 10px;
    }

    .ast-title {
      font-size: 21px;
    }

    .ast-mobile-card-top {
      flex-direction: column;
    }

    .ast-type-badge {
      width: 100%;
      text-align: center;
    }

    .ast-mobile-detail-grid {
      grid-template-columns: 1fr;
    }

    .ast-pagination-buttons {
      grid-template-columns: 1fr;
    }

    .ast-calculation-box {
      grid-template-columns: 1fr;
    }

    .ast-modal-box {
      padding: 16px;
    }
  }
`;

export default TransactionHistory;