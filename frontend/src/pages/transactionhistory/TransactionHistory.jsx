import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiClock,
  FiSearch,
  FiAward,
  FiUser,
  FiPlusCircle,
  FiMinusCircle,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiShield,
  FiLock,
  FiEye,
} from "react-icons/fi";
import api from "../../api/axios";

import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./transactionHistory.css";

const unitOptions = [
  { value: "pcs", label: "No / Pcs" },
  { value: "kg", label: "Kg" },
  { value: "gram", label: "Gram" },
  { value: "litre", label: "Litre" },
  { value: "liter", label: "Liter" },
  { value: "ml", label: "ML" },
  { value: "quintal", label: "Quintal / Qt" },
  { value: "qt", label: "Quintal / Qt" },
  { value: "ton", label: "Ton" },
  { value: "packet", label: "Packet" },
  { value: "box", label: "Box" },
];

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeUnit = (unit) => {
  const cleanUnit = String(unit || "").trim().toLowerCase();
  if (!cleanUnit) return "pcs";
  if (cleanUnit === "liter") return "litre";
  if (cleanUnit === "qt") return "quintal";
  return cleanUnit;
};

const getUnitLabelFromValue = (unitValue) => {
  const normalized = normalizeUnit(unitValue);
  const foundUnit = unitOptions.find((unit) => normalizeUnit(unit.value) === normalized);
  return foundUnit ? foundUnit.label : unitValue || "No / Pcs";
};

const roundToTwo = (value) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(numberValue * 100) / 100;
};

const formatPoints = (value) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return "0";
  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(2).replace(/\.?0+$/, "");
};

const sanitizeDecimalInput = (value) => {
  const cleanValue = String(value || "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleanValue.split(".");
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join("")}`;
};

export default function TransactionHistory() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [selectedDetailsTxn, setSelectedDetailsTxn] = useState(null);
  const [editingTxn, setEditingTxn] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    loyalty_item_id: "",
    unit: "",
    quantity: "",
    entry_date: "",
    note: "",
  });

  // Admin Password Delete Modal
  const [deletingTxn, setDeletingTxn] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeTxnType = (txn) => {
    const rawType = String(
      txn.type || txn.transaction_type || txn.entry_type || ""
    )
      .trim()
      .toUpperCase();
    if (["POINTS_CREDIT", "CREDIT", "EARN", "EARNED", "MANUAL_ADD"].includes(rawType))
      return "POINTS_CREDIT";
    if (["POINTS_DEBIT", "DEBIT", "REDEEM", "USED", "REDEEMED", "MANUAL_DEDUCT"].includes(rawType))
      return "POINTS_DEBIT";
    return rawType || "POINTS_CREDIT";
  };

  const isPointCredit = (txn) => normalizeTxnType(txn) === "POINTS_CREDIT";
  const isPointDebit = (txn) => normalizeTxnType(txn) === "POINTS_DEBIT";

  const getCustomer = (customerId) => customers.find((c) => Number(c.id) === Number(customerId));
  const getCustomerName = (txn) =>
    txn.customer_name || getCustomer(txn.customer_id)?.name || `Customer #${txn.customer_id || "-"}`;

  const getItemById = (itemId) => items.find((item) => Number(item.id) === Number(itemId));
  const getItemName = (txn) => {
    if (txn.item_name) return txn.item_name;
    const item = getItemById(txn.loyalty_item_id || txn.item_id);
    return item?.item_name || item?.name || "-";
  };

  const getItemUnit = (itemId) => normalizeUnit(getItemById(itemId)?.unit || "pcs");
  const getTxnUnit = (txn) =>
    normalizeUnit(txn.unit || getItemUnit(txn.loyalty_item_id || txn.item_id) || "pcs");

  const getItemPoints = (itemId) => {
    const item = getItemById(itemId);
    return Number(
      item?.per_point_amount || item?.points || item?.points_value || item?.points_required || 0
    );
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toDateInputValue = (dateValue) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  const getTxnId = (txn) => txn?.transaction_id || txn?.point_transaction_id || txn?.id || "";
  const getRewardEntryId = (txn) => txn?.reward_entry_id || txn?.transaction_group_id || txn?.id || "";

  const getGroupedItems = (txn) => {
    if (Array.isArray(txn?.items) && txn.items.length > 0) return txn.items;
    if (txn?.loyalty_item_id || txn?.item_name) {
      return [
        {
          id: txn.reward_entry_item_id || txn.id,
          reward_entry_item_id: txn.reward_entry_item_id,
          transaction_id: getTxnId(txn),
          point_transaction_id: getTxnId(txn),
          loyalty_item_id: txn.loyalty_item_id || txn.item_id,
          item_id: txn.loyalty_item_id || txn.item_id,
          item_name: getItemName(txn),
          unit: getTxnUnit(txn),
          quantity: txn.quantity || 1,
          points_per_unit: txn.points_per_unit || 0,
          total_points: txn.points ?? txn.total_points ?? 0,
          created_at: txn.created_at,
        },
      ];
    }
    return [];
  };

  const getItemTotalPoints = (item) => {
    const q = Number(item?.quantity || 0);
    const p = Number(item?.points_per_unit || 0);
    if (Number.isFinite(q) && Number.isFinite(p) && q > 0 && p > 0) return roundToTwo(q * p);
    return roundToTwo(item?.total_points ?? item?.points ?? 0);
  };

  const getGroupedTransactionTotalPoints = (txn) => {
    const groupedItems = getGroupedItems(txn);
    if (groupedItems.length > 0) {
      return roundToTwo(groupedItems.reduce((sum, item) => sum + getItemTotalPoints(item), 0));
    }
    return roundToTwo(txn?.points ?? txn?.total_points ?? 0);
  };

  const getItemPreviewNames = (txn) => {
    const itemsList = getGroupedItems(txn);
    if (!itemsList.length) return "-";
    const names = itemsList.map((item) => item.item_name || getItemName(item) || "-");
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  };

  const getTotalItemsCount = (txn) => Number(txn.item_count || getGroupedItems(txn).length || 1);
  const getTxnPoints = (txn) => getGroupedTransactionTotalPoints(txn);

  // FETCH ALL DATA WITHOUT ACCIDENTAL EXCLUSION
  const fetchData = async () => {
    try {
      setLoading(true);
      const [txnRes, rewardEntryRes, customerRes, itemRes] = await Promise.allSettled([
        api.get("/transactions/"),
        api.get(`/reward-entries/grouped?limit=1000`),
        api.get("/customers/"),
        api.get("/loyalty/items"),
      ]);

      const rawTransactions = txnRes.status === "fulfilled" ? normalizeList(txnRes.value.data) : [];
      const groupedRewardEntries =
        rewardEntryRes.status === "fulfilled" ? normalizeList(rewardEntryRes.value.data) : [];
      const customerList = customerRes.status === "fulfilled" ? normalizeList(customerRes.value.data) : [];
      const itemList = itemRes.status === "fulfilled" ? normalizeList(itemRes.value.data) : [];

      // Unified mapping ensuring all entries show
      const mappedGrouped = groupedRewardEntries.map((entry) => ({
        ...entry,
        id: entry.reward_entry_id || entry.transaction_group_id || entry.id,
        is_grouped_reward: true,
        type: "POINTS_CREDIT",
        points: getGroupedTransactionTotalPoints(entry),
      }));

      // Combine grouped reward records with standard debit/manual records
      const existingGroupIds = new Set(mappedGrouped.map((g) => String(g.id)));
      const filteredRaw = rawTransactions.filter(
        (txn) => !existingGroupIds.has(String(txn.reward_entry_id || txn.transaction_group_id))
      );

      setTransactions([...mappedGrouped, ...filteredRaw]);
      setCustomers(customerList);
      setItems(itemList);
    } catch (error) {
      showToast("Unable to load transactions.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return transactions.filter((txn) => {
      const name = getCustomerName(txn).toLowerCase();
      const itemNames = getGroupedItems(txn)
        .map((item) => String(item.item_name || ""))
        .join(" ")
        .toLowerCase();
      const type = normalizeTxnType(txn);

      const matchesSearch = search ? name.includes(search) || itemNames.includes(search) : true;
      const matchesCustomer =
        selectedCustomerId === "all" || Number(txn.customer_id) === Number(selectedCustomerId);
      const matchesType = entryType === "all" || type === entryType;

      const txnDate = txn.created_at ? new Date(txn.created_at) : null;
      let matchesDate = true;
      if (startDate && txnDate && txnDate < new Date(startDate)) matchesDate = false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (txnDate && txnDate > end) matchesDate = false;
      }

      return matchesSearch && matchesCustomer && matchesType && matchesDate;
    });
  }, [transactions, customers, items, searchTerm, selectedCustomerId, entryType, startDate, endDate]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [filteredTransactions]);

  const totalEarned = useMemo(
    () => transactions.filter(isPointCredit).reduce((sum, txn) => sum + getTxnPoints(txn), 0),
    [transactions]
  );
  const totalUsed = useMemo(
    () => transactions.filter(isPointDebit).reduce((sum, txn) => sum + getTxnPoints(txn), 0),
    [transactions]
  );
  const netPoints = roundToTwo(totalEarned - totalUsed);

  // Edit Handlers
  const openEditModal = (txn, parentGroup = null) => {
    const targetItem = txn;
    setEditingTxn({ ...targetItem, parentGroupId: parentGroup ? getRewardEntryId(parentGroup) : null });
    setEditForm({
      loyalty_item_id: targetItem.loyalty_item_id || targetItem.item_id || "",
      unit: targetItem.unit || "pcs",
      quantity: targetItem.quantity || "1",
      entry_date: toDateInputValue(targetItem.created_at),
      note: targetItem.note || "",
    });
    setIsEditing(false);
  };

  const closeEditModal = () => {
    setEditingTxn(null);
    setIsEditing(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    if (name === "loyalty_item_id") {
      setEditForm((prev) => ({ ...prev, loyalty_item_id: value, unit: getItemUnit(value) }));
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "quantity" ? sanitizeDecimalInput(value) : value,
    }));
  };

  const selectedItemPoints = useMemo(
    () => getItemPoints(editForm.loyalty_item_id),
    [editForm.loyalty_item_id, items]
  );

  const calculatedTotalPoints = useMemo(
    () => roundToTwo(Number(editForm.quantity || 0) * Number(selectedItemPoints || 0)),
    [editForm.quantity, selectedItemPoints]
  );

  const updateTransaction = async (event) => {
    event.preventDefault();
    if (!editForm.loyalty_item_id) {
      showToast("Please select product/item.", "error");
      return;
    }
    const quantityValue = Number(editForm.quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      showToast("Quantity must be greater than 0.", "error");
      return;
    }

    try {
      setSaving(true);
      const itemId = editingTxn.reward_entry_item_id || editingTxn.id;
      await api.put(`/transactions/reward-entry-items/${itemId}`, {
        loyalty_item_id: Number(editForm.loyalty_item_id),
        unit: editForm.unit,
        quantity: quantityValue,
        entry_date: editForm.entry_date ? `${editForm.entry_date}T12:00:00` : null,
        note: editForm.note,
      });
      showToast("Transaction item updated.", "success");
      closeEditModal();
      setSelectedDetailsTxn(null);
      fetchData();
    } catch (error) {
      showToast("Unable to update transaction.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Handlers with Admin Password
  const openDeleteConfirmation = (txn) => {
    setDeletingTxn(txn);
    setAdminPassword("");
  };

  const closeDeleteConfirmation = () => {
    if (deleting) return;
    setDeletingTxn(null);
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
      const idToDelete = getTxnId(deletingTxn) || getRewardEntryId(deletingTxn);
      await api.delete(`/transactions/${idToDelete}`, {
        data: { admin_password: adminPassword, password: adminPassword },
      });
      showToast("Transaction deleted successfully.", "success");
      closeDeleteConfirmation();
      setSelectedDetailsTxn(null);
      fetchData();
    } catch (error) {
      showToast("Invalid admin password or delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="directory-page">
      {toast && (
        <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      {/* PORTAL HEADER */}
      <PortalHeader
        title="Transaction History"
        kicker="LOYALTY MANAGEMENT"
        description="All reward transactions and point activity. Inspect details or modify entries."
        icon={FiClock}
        backPath="/dashboard"
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard title="Points Earned" value={formatPoints(totalEarned)} Icon={FiPlusCircle} colorTheme="green" />
        <StatCard title="Points Used" value={formatPoints(totalUsed)} Icon={FiMinusCircle} colorTheme="red" />
        <StatCard title="Net Points" value={formatPoints(netPoints)} Icon={FiAward} colorTheme="blue" />
        <StatCard title="Total Transactions" value={transactions.length} Icon={FiUser} colorTheme="purple" />
      </div>

      <section className="dir-modules-section">
        <ModuleWriternHeader
          title="Transaction Roster"
          description="View and filter all customer loyalty point activities in real-time."
          badgeCount={filteredTransactions.length}
          badgeLabel="records"
        />

        {/* CONTROLS */}
        <div className="dir-controls">
          <div className="dir-search-box" style={{ flex: 1.5 }}>
            <FiSearch size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search customer or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="date"
              className="dir-filter-select"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="dir-filter-select"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <select
              className="dir-filter-select"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed Customer"}
                </option>
              ))}
            </select>

            <select
              className="dir-filter-select"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="POINTS_CREDIT">Earned Points</option>
              <option value="POINTS_DEBIT">Used Points</option>
            </select>
          </div>
        </div>

        {/* UNIFIED TRANSACTION TABLE */}
        <div className="dir-table-container">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="th-txn-customer">Customer</th>
                <th className="th-txn-date">Date & Time</th>
                <th className="th-txn-items">Items Included</th>
                <th className="th-txn-count">Total Items</th>
                <th className="th-txn-type">Type</th>
                <th className="th-txn-points">Points</th>
                <th className="th-txn-action"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((txn, index) => {
                  const credit = isPointCredit(txn);
                  const custName = getCustomerName(txn);
                  const initials = String(custName || "C").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={txn.id || index}
                      className="dir-table-row"
                      onClick={() => setSelectedDetailsTxn(txn)}
                    >
                      {/* Customer: 1-line Avatar + Name */}
                      <td className="th-txn-customer">
                        <div className="customer-cell">
                          <div className="staff-avatar">{initials}</div>
                          <span className="customer-name">{custName}</span>
                        </div>
                      </td>

                      {/* Date & Time: 1-line */}
                      <td className="th-txn-date">
                        <span className="single-line-text">{formatDate(txn.created_at)}</span>
                      </td>

                      {/* Items Preview: 1-line Truncated */}
                      <td className="th-txn-items">
                        <span className="truncate-cell text-muted" title={getItemPreviewNames(txn)}>
                          {getItemPreviewNames(txn)}
                        </span>
                      </td>

                      {/* Total Items count */}
                      <td className="th-txn-count">
                        <span className="count-pill">{getTotalItemsCount(txn)}</span>
                      </td>

                      {/* Type Badge */}
                      <td className="th-txn-type">
                        <span className={`txn-status-badge ${credit ? "credit" : "debit"}`}>
                          {credit ? "Earned" : "Used"}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="th-txn-points">
                        <span className={`points-val ${credit ? "credit" : "debit"}`}>
                          {credit ? "+" : "-"}{formatPoints(getTxnPoints(txn))} pts
                        </span>
                      </td>

                      {/* Action View */}
                      <td className="th-txn-action" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="dir-row-edit-btn"
                          onClick={() => setSelectedDetailsTxn(txn)}
                          title="Inspect Details"
                        >
                          <FiEye size={14} />
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

      {/* TRANSACTION DETAILS MODAL */}
      {selectedDetailsTxn && (
        <div className="modal-overlay" onClick={() => setSelectedDetailsTxn(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Transaction Details</h2>
                <p className="modal-kicker">#{getTxnId(selectedDetailsTxn) || getRewardEntryId(selectedDetailsTxn)}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedDetailsTxn(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ gap: "16px" }}>
              <div className="txn-summary-pills">
                <div>
                  <span>Customer</span>
                  <strong>{getCustomerName(selectedDetailsTxn)}</strong>
                </div>
                <div>
                  <span>Date & Time</span>
                  <strong>{formatDate(selectedDetailsTxn.created_at)}</strong>
                </div>
                <div>
                  <span>Total Items</span>
                  <strong>{getTotalItemsCount(selectedDetailsTxn)}</strong>
                </div>
                <div>
                  <span>Net Points</span>
                  <strong style={{ color: isPointCredit(selectedDetailsTxn) ? "#166962" : "#dc2626" }}>
                    {isPointCredit(selectedDetailsTxn) ? "+" : "-"}{formatPoints(getTxnPoints(selectedDetailsTxn))} pts
                  </strong>
                </div>
              </div>

              <div className="items-breakdown-heading">Items Breakdown</div>
              <div className="modal-items-list">
                {getGroupedItems(selectedDetailsTxn).map((item, idx) => (
                  <div className="modal-item-card" key={item.reward_entry_item_id || item.id || idx}>
                    <div>
                      <h4>{item.item_name || getItemName(item)}</h4>
                      <p>
                        {item.quantity ?? 1} {getUnitLabelFromValue(item.unit)} × {formatPoints(item.points_per_unit || 0)} pts/unit
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <strong className="item-subtotal">{formatPoints(getItemTotalPoints(item))} pts</strong>
                      <div className="modal-item-actions">
                        <button
                          type="button"
                          className="item-micro-btn edit"
                          onClick={() => openEditModal(item, selectedDetailsTxn)}
                          title="Edit Item"
                        >
                          <FiEdit2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <div className="footer-left">
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDeleteConfirmation(selectedDetailsTxn);
                  }}
                >
                  <FiTrash2 size={14} /> Delete Entire Txn
                </button>
              </div>
              <div className="footer-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setSelectedDetailsTxn(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingTxn && (
        <div className="modal-overlay nested-modal" onClick={closeEditModal}>
          <div
            className="modal-content"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{isEditing ? "Edit Item Record" : "Item Record Details"}</h2>
                {!isEditing && <p className="modal-kicker">Read-Only Mode • Click 'Edit Details' to make changes</p>}
              </div>
              <button type="button" className="modal-close" onClick={closeEditModal} disabled={saving}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={updateTransaction}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Product / Item *</label>
                  <select
                    name="loyalty_item_id"
                    value={editForm.loyalty_item_id}
                    onChange={handleEditChange}
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                    required
                  >
                    <option value="">Select Item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name || item.name} - {formatPoints(item.per_point_amount || item.points || 0)} pts / {getUnitLabelFromValue(item.unit)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="text"
                      name="quantity"
                      value={editForm.quantity}
                      onChange={handleEditChange}
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Calculated Points</label>
                    <div className="points-locked-preview">{formatPoints(calculatedTotalPoints)} pts</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Transaction Date (Optional)</label>
                  <input
                    type="date"
                    name="entry_date"
                    value={editForm.entry_date}
                    onChange={handleEditChange}
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                  />
                </div>

                <div className="form-group">
                  <label>Note</label>
                  <textarea
                    name="note"
                    value={editForm.note}
                    onChange={handleEditChange}
                    disabled={!isEditing || saving}
                    className={`asr-modal-textarea ${!isEditing ? "input-locked" : ""}`}
                    placeholder="Transaction note..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <div className="footer-left">
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDeleteConfirmation(editingTxn);
                    }}
                    disabled={saving}
                  >
                    <FiTrash2 size={14} /> Delete Row
                  </button>
                </div>

                <div className="footer-right">
                  {!isEditing ? (
                    <>
                      <button type="button" className="btn-cancel" onClick={closeEditModal}>
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
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-submit" disabled={saving}>
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

      {/* ADMIN PASSWORD CONFIRMATION MODAL */}
      {deletingTxn && (
        <div className="modal-overlay nested-modal" onClick={closeDeleteConfirmation}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
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
                  Permanently delete transaction record for <strong>{getCustomerName(deletingTxn)}</strong>? This will adjust all point balances.
                </p>

                <div className="form-group" style={{ marginTop: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#0f172a" }}>Enter Admin Password to proceed *</label>
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
                  <FiTrash2 size={14} /> {deleting ? "Deleting..." : "Delete Txn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}