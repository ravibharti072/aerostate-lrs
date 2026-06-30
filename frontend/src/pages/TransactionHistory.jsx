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
  FiTrash2,
  FiX,
  FiSave,
  FiPackage,
  FiLock,
} from "react-icons/fi";
import api from "../api/axios";

const ITEMS_PER_PAGE = 20;
const GROUPED_REWARD_LIMIT = 500;

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
  if (cleanUnit === "no / pcs") return "pcs";
  if (cleanUnit === "no/pcs") return "pcs";

  return cleanUnit;
};

const getUnitLabelFromValue = (unitValue) => {
  const normalized = normalizeUnit(unitValue);
  const foundUnit = unitOptions.find(
    (unit) => normalizeUnit(unit.value) === normalized
  );

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

function TransactionHistory({ onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [entryType, setEntryType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ type: "", message: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedDetailsTxn, setSelectedDetailsTxn] = useState(null);

  const [editingTxn, setEditingTxn] = useState(null);
  const [editForm, setEditForm] = useState({
    loyalty_item_id: "",
    unit: "",
    quantity: "",
    entry_date: "",
    note: "",
  });

  const [deletingTxn, setDeletingTxn] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

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

  const getErrorMessage = (error, fallback) => {
    const detail = error.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    if (typeof detail === "string") return detail;

    return fallback;
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

  const isGroupedRewardTxn = (txn) =>
    Boolean(txn?.is_grouped_reward || Array.isArray(txn?.items));

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

  const getItemNameFromItem = (item) => item?.item_name || item?.name || "-";

  const getItemName = (txn) => {
    if (txn.item_name) return txn.item_name;

    const itemId = txn.loyalty_item_id || txn.item_id;
    const item = getItemById(itemId);

    return getItemNameFromItem(item);
  };

  const getItemUnit = (itemId) => {
    const item = getItemById(itemId);

    return normalizeUnit(
      item?.unit ||
        item?.quantity_unit ||
        item?.uom ||
        item?.default_unit ||
        "pcs"
    );
  };

  const getTxnUnit = (txn) => {
    const itemId = txn.loyalty_item_id || txn.item_id;
    return normalizeUnit(txn.unit || getItemUnit(itemId) || "pcs");
  };

  const getUnitLabel = (unitValue) => getUnitLabelFromValue(unitValue);

  const getItemPoints = (itemId) => {
    const item = getItemById(itemId);

    return Number(
      item?.per_point_amount ||
        item?.points ||
        item?.points_value ||
        item?.points_required ||
        0
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

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getTxnId = (txn) =>
    txn?.transaction_id || txn?.point_transaction_id || txn?.id || "";

  const getRewardEntryId = (txn) =>
    txn?.reward_entry_id || txn?.transaction_group_id || txn?.id || "";

  const getTxnKey = (txn, index) => {
    if (isGroupedRewardTxn(txn)) {
      return `reward-entry-${getRewardEntryId(txn) || index}`;
    }

    return `transaction-${getTxnId(txn) || index}`;
  };

  const getGroupedItems = (txn) => {
    if (Array.isArray(txn?.items)) return txn.items;

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
          quantity: txn.quantity,
          points_per_unit: txn.points_per_unit,
          total_points: txn.points || txn.total_points || 0,
          created_at: txn.created_at,
        },
      ];
    }

    return [];
  };

  const getItemPreviewNames = (txn) => {
    const names = getGroupedItems(txn).map((item) => item.item_name || "-");

    if (!names.length) return "-";

    if (names.length <= 3) return names.join(", ");

    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  };

  const getTotalItems = (txn) =>
    Number(txn.item_count || getGroupedItems(txn).length || 0);

  const getTxnPoints = (txn) => Number(txn.points || txn.total_points || 0);

  const buildItemTxnFromGroupedItem = (groupTxn, item) => ({
    ...item,
    id: item.transaction_id || item.point_transaction_id || item.id,
    transaction_id: item.transaction_id || item.point_transaction_id || "",
    point_transaction_id: item.point_transaction_id || item.transaction_id || "",
    reward_entry_id: getRewardEntryId(groupTxn),
    reward_entry_item_id: item.reward_entry_item_id || item.id,
    customer_id: groupTxn.customer_id,
    customer_name: getCustomerName(groupTxn),
    phone_number: getCustomerPhone(groupTxn),
    type: "POINTS_CREDIT",
    transaction_type: "EARN",
    points: Number(item.total_points || 0),
    total_points: Number(item.total_points || 0),
    unit: item.unit,
    quantity: item.quantity,
    points_per_unit: item.points_per_unit,
    created_at: item.created_at || groupTxn.created_at,
    note: groupTxn.note || item.note || "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const [txnRes, rewardEntryRes, customerRes, itemRes] =
        await Promise.allSettled([
          api.get("/transactions/"),
          api.get(`/reward-entries/grouped?limit=${GROUPED_REWARD_LIMIT}`),
          api.get("/customers/"),
          api.get("/loyalty/items"),
        ]);

      const rawTransactions =
        txnRes.status === "fulfilled" ? normalizeList(txnRes.value.data) : [];

      const groupedRewardEntries =
        rewardEntryRes.status === "fulfilled"
          ? normalizeList(rewardEntryRes.value.data)
          : [];

      const customerList =
        customerRes.status === "fulfilled"
          ? normalizeList(customerRes.value.data)
          : [];

      const itemList =
        itemRes.status === "fulfilled" ? normalizeList(itemRes.value.data) : [];

      const groupedRewardRecords = groupedRewardEntries.map((entry) => ({
        ...entry,
        id: entry.reward_entry_id || entry.transaction_group_id || entry.id,
        is_grouped_reward: true,
        type: "POINTS_CREDIT",
        transaction_type: "EARN",
        points: Number(entry.total_points || entry.points || 0),
      }));

      const otherTransactions = rawTransactions.filter((txn) => {
        const isRewardItemTransaction = Boolean(
          txn.reward_entry_item_id || txn.reward_entry_id
        );

        const isEarnTxn = normalizeTxnType(txn) === "POINTS_CREDIT";

        // Reward-entry item transactions are displayed through grouped records above.
        return !(isRewardItemTransaction && isEarnTxn);
      });

      setTransactions([...groupedRewardRecords, ...otherTransactions]);
      setCustomers(customerList);
      setItems(itemList);
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
      const itemNames = getGroupedItems(txn)
        .map((item) => String(item.item_name || ""))
        .join(" ")
        .toLowerCase();
      const unitNames = getGroupedItems(txn)
        .map((item) => String(getUnitLabel(item.unit)))
        .join(" ")
        .toLowerCase();
      const date = String(formatDate(txn.created_at)).toLowerCase();
      const type = normalizeTxnType(txn);

      const matchesSearch = search
        ? name.includes(search) ||
          phone.includes(search) ||
          itemNames.includes(search) ||
          unitNames.includes(search) ||
          date.includes(search)
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
        .reduce((sum, txn) => sum + getTxnPoints(txn), 0),
    [transactionRecords]
  );

  const totalUsed = useMemo(
    () =>
      transactionRecords
        .filter(isPointDebit)
        .reduce((sum, txn) => sum + getTxnPoints(txn), 0),
    [transactionRecords]
  );

  const netPoints = roundToTwo(totalEarned - totalUsed);

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
        "Open transaction details and edit individual item rows."
      );
      return;
    }

    const itemId = txn.loyalty_item_id || txn.item_id || "";
    const autoUnit = getItemUnit(itemId) || getTxnUnit(txn) || "pcs";

    setEditingTxn(txn);

    setEditForm({
      loyalty_item_id: itemId,
      unit: autoUnit,
      quantity: txn.quantity || "",
      entry_date: toDateInputValue(txn.created_at),
      note: txn.description || txn.note || "",
    });
  };

  const closeEditModal = () => {
    setEditingTxn(null);

    setEditForm({
      loyalty_item_id: "",
      unit: "",
      quantity: "",
      entry_date: "",
      note: "",
    });
  };

  const openDeleteModal = (txn) => {
    setDeletingTxn(txn);
    setDeletePassword("");
  };

  const closeDeleteModal = () => {
    setDeletingTxn(null);
    setDeletePassword("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name === "loyalty_item_id") {
      setEditForm((prev) => ({
        ...prev,
        loyalty_item_id: value,
        unit: getItemUnit(value),
      }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectedItemPoints = useMemo(() => {
    return getItemPoints(editForm.loyalty_item_id);
  }, [editForm.loyalty_item_id, items]);

  const selectedItemUnitLabel = useMemo(() => {
    return getUnitLabel(editForm.unit || getItemUnit(editForm.loyalty_item_id));
  }, [editForm.unit, editForm.loyalty_item_id, items]);

  const calculatedTotalPoints = useMemo(() => {
    const quantity = Number(editForm.quantity || 0);
    const points = Number(selectedItemPoints || 0);

    return roundToTwo(quantity * points);
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

    const autoUnit = editForm.unit || getItemUnit(editForm.loyalty_item_id);

    if (!autoUnit) {
      showToast(
        "error",
        "Unit not found. Please update this item in Item Master."
      );
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
          unit: autoUnit,
          quantity: Number(editForm.quantity),
          entry_date: editForm.entry_date
            ? `${editForm.entry_date}T12:00:00`
            : null,
          created_at: editForm.entry_date
            ? `${editForm.entry_date}T12:00:00`
            : null,
          note: editForm.note,
        }
      );

      showToast("success", "Transaction item updated successfully.");
      closeEditModal();
      setSelectedDetailsTxn(null);
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

  const deleteTransaction = async (e) => {
    e.preventDefault();

    const transactionId = getTxnId(deletingTxn);

    if (!transactionId) {
      showToast("error", "Invalid transaction selected.");
      return;
    }

    if (!deletePassword.trim()) {
      showToast("error", "Please enter your password.");
      return;
    }

    try {
      setDeleting(true);

      await api.delete(`/transactions/${transactionId}`, {
        data: {
          password: deletePassword,
        },
      });

      showToast("success", "Transaction item deleted successfully.");
      closeDeleteModal();
      setSelectedDetailsTxn(null);
      fetchData();
    } catch (error) {
      console.error("Delete transaction error:", error);

      showToast(
        "error",
        getErrorMessage(error, "Unable to delete transaction.")
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <style>{transactionHistoryCss}</style>

      <div className="ast-page">
        {toast.message && (
          <div
            className={`ast-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
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
              Reward entries are grouped as one transaction. Click View Details
              to edit or delete individual item rows.
            </p>
          </div>
        </div>

        <div className="ast-summary-grid">
          <SummaryCard
            icon={<FiPlusCircle size={20} color="#059669" />}
            iconClass="green"
            label="Points Earned"
            value={roundToTwo(totalEarned)}
            valueClass="green"
          />

          <SummaryCard
            icon={<FiMinusCircle size={20} color="#dc2626" />}
            iconClass="red"
            label="Points Used"
            value={roundToTwo(totalUsed)}
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
            plain
          />
        </div>

        <div className="ast-toolbar">
          <div className="ast-search-wrapper">
            <FiSearch size={16} className="ast-search-icon" />

            <input
              type="text"
              placeholder="Search date, customer, phone, item or unit..."
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
                  <th>Items</th>
                  <th className="right">Total Items</th>
                  <th>Type</th>
                  <th className="right">Points</th>
                  <th className="center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="ast-empty-cell">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="ast-empty-cell">
                      No transaction records found.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((txn, index) => {
                    const credit = isPointCredit(txn);
                    const points = getTxnPoints(txn);

                    return (
                      <tr key={getTxnKey(txn, index)}>
                        <td>{formatDate(txn.created_at)}</td>
                        <td className="customer">{getCustomerName(txn)}</td>
                        <td>{getCustomerPhone(txn)}</td>
                        <td>
                          <span className="ast-items-preview">
                            {getItemPreviewNames(txn)}
                          </span>
                        </td>
                        <td className="right">{getTotalItems(txn) || "-"}</td>

                        <td>
                          <span
                            className={`ast-type-badge ${
                              credit ? "credit" : "debit"
                            }`}
                          >
                            {credit ? "Earned" : "Used"}
                          </span>
                        </td>

                        <td
                          className={`points right ${
                            credit ? "credit" : "debit"
                          }`}
                        >
                          {credit ? "+" : "-"}
                          {formatPoints(points)}
                        </td>

                        <td className="center">
                          <div className="ast-action-buttons">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailsTxn(txn)}
                              className="ast-view-btn"
                            >
                              View Details
                            </button>

                            {!isGroupedRewardTxn(txn) && canEditRewardItem(txn) && (
                              <button
                                type="button"
                                onClick={() => openEditModal(txn)}
                                className="ast-edit-btn"
                              >
                                <FiEdit2 size={14} />
                                Edit
                              </button>
                            )}

                            {!isGroupedRewardTxn(txn) && (
                              <button
                                type="button"
                                onClick={() => openDeleteModal(txn)}
                                className="ast-delete-btn"
                              >
                                <FiTrash2 size={14} />
                                Delete
                              </button>
                            )}
                          </div>
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
                const points = getTxnPoints(txn);

                return (
                  <div key={getTxnKey(txn, index)} className="ast-mobile-card">
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

                      <span
                        className={`ast-type-badge ${
                          credit ? "credit" : "debit"
                        }`}
                      >
                        {credit ? "Earned" : "Used"}
                      </span>
                    </div>

                    <div className="ast-mobile-detail-grid">
                      <div>
                        <span>Items</span>
                        <strong>{getItemPreviewNames(txn)}</strong>
                      </div>

                      <div>
                        <span>Total Items</span>
                        <strong>{getTotalItems(txn) || "-"}</strong>
                      </div>

                      <div>
                        <span>Points</span>
                        <strong
                          className={credit ? "credit-text" : "debit-text"}
                        >
                          {credit ? "+" : "-"}
                          {formatPoints(points)}
                        </strong>
                      </div>
                    </div>

                    <div className="ast-mobile-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailsTxn(txn)}
                        className="ast-view-btn mobile"
                      >
                        View Details
                      </button>

                      {!isGroupedRewardTxn(txn) && canEditRewardItem(txn) && (
                        <button
                          type="button"
                          onClick={() => openEditModal(txn)}
                          className="ast-edit-btn"
                        >
                          <FiEdit2 size={14} />
                          Edit Transaction
                        </button>
                      )}

                      {!isGroupedRewardTxn(txn) && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(txn)}
                          className="ast-delete-btn mobile"
                        >
                          <FiTrash2 size={14} />
                          Delete Transaction
                        </button>
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

        {selectedDetailsTxn && (
          <div className="ast-modal-overlay">
            <div className="ast-details-modal-box">
              <div className="ast-modal-header">
                <h3>Transaction Details</h3>

                <button
                  type="button"
                  onClick={() => setSelectedDetailsTxn(null)}
                  className="ast-close-btn"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="ast-detail-summary">
                <div>
                  <span>Date</span>
                  <strong>{formatDate(selectedDetailsTxn.created_at)}</strong>
                </div>

                <div>
                  <span>Customer</span>
                  <strong>{getCustomerName(selectedDetailsTxn)}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{getCustomerPhone(selectedDetailsTxn)}</strong>
                </div>

                <div>
                  <span>Total Points</span>
                  <strong>
                    {formatPoints(getTxnPoints(selectedDetailsTxn))} pts
                  </strong>
                </div>
              </div>

              {selectedDetailsTxn.note && (
                <div className="ast-detail-note">
                  <span>Note</span>
                  <strong>{selectedDetailsTxn.note}</strong>
                </div>
              )}

              <div className="ast-detail-items-title">
                Items in this transaction
              </div>

              <div className="ast-detail-items-list">
                {getGroupedItems(selectedDetailsTxn).length === 0 ? (
                  <div className="ast-mobile-empty">No items found.</div>
                ) : (
                  getGroupedItems(selectedDetailsTxn).map((item, index) => {
                    const itemTxn = buildItemTxnFromGroupedItem(
                      selectedDetailsTxn,
                      item
                    );

                    return (
                      <div
                        className="ast-detail-item-card"
                        key={item.reward_entry_item_id || item.id || index}
                      >
                        <div className="ast-detail-item-main">
                          <h4>{item.item_name || "-"}</h4>
                          <p>
                            {item.quantity ?? "-"} {getUnitLabel(item.unit)} ×{" "}
                            {formatPoints(item.points_per_unit || 0)} pts / unit
                          </p>
                        </div>

                        <strong className="ast-detail-item-points">
                          {formatPoints(item.total_points || 0)} pts
                        </strong>

                        {itemTxn.reward_entry_item_id && (
                          <div className="ast-detail-item-actions">
                            <button
                              type="button"
                              className="ast-edit-btn"
                              onClick={() => openEditModal(itemTxn)}
                            >
                              <FiEdit2 size={14} />
                              Edit
                            </button>

                            {itemTxn.transaction_id && (
                              <button
                                type="button"
                                className="ast-delete-btn"
                                onClick={() => openDeleteModal(itemTxn)}
                              >
                                <FiTrash2 size={14} />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="ast-modal-actions">
                <button
                  type="button"
                  className="ast-cancel-btn"
                  onClick={() => setSelectedDetailsTxn(null)}
                >
                  Close
                </button>
              </div>
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
                      Edit date, item and quantity. Unit is automatically taken
                      from Item Master.
                    </p>
                  </div>
                </div>

                <div className="ast-form-group">
                  <label>Transaction Date</label>

                  <input
                    type="date"
                    name="entry_date"
                    value={editForm.entry_date}
                    onChange={handleEditChange}
                  />
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
                        {getItemNameFromItem(item)} -{" "}
                        {formatPoints(item.per_point_amount || item.points || 0)} pts /{" "}
                        {getUnitLabel(getItemUnit(item.id))}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ast-form-row">
                  <div className="ast-form-group">
                    <label>Unit</label>

                    <div className="ast-readonly-unit">
                      {editForm.loyalty_item_id
                        ? selectedItemUnitLabel
                        : "Select item"}
                    </div>
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
                    <h4>{formatPoints(selectedItemPoints)}</h4>
                  </div>

                  <div>
                    <p>Total Points</p>
                    <h4>{formatPoints(calculatedTotalPoints)}</h4>
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

                  <button
                    type="submit"
                    className="ast-save-btn"
                    disabled={saving}
                  >
                    <FiSave size={15} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deletingTxn && (
          <div className="ast-modal-overlay">
            <div className="ast-modal-box">
              <div className="ast-modal-header">
                <h3>Delete Transaction Item</h3>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="ast-close-btn"
                  disabled={deleting}
                >
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={deleteTransaction}>
                <div className="ast-delete-warning">
                  <FiTrash2 size={20} />

                  <div>
                    <strong>Confirm transaction item delete</strong>
                    <p>
                      This will delete the selected item transaction and adjust
                      the customer point balance. Enter your password to continue.
                    </p>
                  </div>
                </div>

                <div className="ast-delete-summary">
                  <div>
                    <span>Customer</span>
                    <strong>{getCustomerName(deletingTxn)}</strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>{formatDate(deletingTxn.created_at)}</strong>
                  </div>

                  <div>
                    <span>Item</span>
                    <strong>{getItemName(deletingTxn)}</strong>
                  </div>

                  <div>
                    <span>Points</span>
                    <strong>
                      {isPointCredit(deletingTxn) ? "+" : "-"}
                      {formatPoints(
                        deletingTxn.points || deletingTxn.total_points || 0
                      )}
                    </strong>
                  </div>
                </div>

                <div className="ast-form-group">
                  <label>Password</label>

                  <div className="ast-password-box">
                    <FiLock size={16} />

                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <div className="ast-modal-actions">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="ast-cancel-btn"
                    disabled={deleting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="ast-confirm-delete-btn"
                    disabled={deleting}
                  >
                    <FiTrash2 size={15} />
                    {deleting ? "Deleting..." : "Delete Item"}
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

const SummaryCard = ({ icon, iconClass, label, value, valueClass, plain }) => (
  <div className="ast-summary-card">
    <div className={`ast-summary-icon ${iconClass}`}>{icon}</div>

    <div>
      <p className="ast-summary-label">{label}</p>
      <h3 className={`ast-summary-value ${valueClass}`}>
        {plain ? value : formatPoints(value)}
      </h3>
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
    max-width: 420px;
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
    min-width: 1080px;
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

  .ast-items-preview {
    display: inline-block;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #111827;
    font-weight: 800;
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

  .ast-action-buttons {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .ast-view-btn,
  .ast-edit-btn,
  .ast-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 800;
    font-size: 13px;
    min-height: 36px;
  }

  .ast-view-btn {
    background-color: #eef2ff;
    color: #4338ca;
    border: 1px solid #c7d2fe;
  }

  .ast-view-btn.mobile {
    width: 100%;
  }

  .ast-edit-btn {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .ast-delete-btn {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .ast-delete-btn.mobile {
    width: 100%;
    margin-top: 10px;
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
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }

  .ast-mobile-actions .ast-edit-btn {
    width: 100%;
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

  .ast-modal-box,
  .ast-details-modal-box {
    width: min(560px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background-color: #ffffff;
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 20px 45px rgba(0,0,0,0.25);
    box-sizing: border-box;
  }

  .ast-details-modal-box {
    width: min(860px, 100%);
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

  .ast-detail-summary,
  .ast-delete-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  .ast-detail-summary div,
  .ast-delete-summary div,
  .ast-detail-note {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px;
    min-width: 0;
  }

  .ast-detail-summary span,
  .ast-delete-summary span,
  .ast-detail-note span {
    display: block;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .ast-detail-summary strong,
  .ast-delete-summary strong,
  .ast-detail-note strong {
    display: block;
    margin-top: 4px;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ast-detail-items-title {
    margin: 16px 0 10px;
    color: #111827;
    font-size: 16px;
    font-weight: 900;
  }

  .ast-detail-items-list {
    display: grid;
    gap: 10px;
  }

  .ast-detail-item-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 12px;
    background: #ffffff;
  }

  .ast-detail-item-main h4 {
    margin: 0;
    color: #111827;
    font-size: 15px;
    font-weight: 900;
  }

  .ast-detail-item-main p {
    margin: 5px 0 0;
    color: #6b7280;
    font-size: 13px;
    font-weight: 800;
  }

  .ast-detail-item-points {
    color: #2563eb;
    font-size: 15px;
    font-weight: 900;
    white-space: nowrap;
  }

  .ast-detail-item-actions {
    display: inline-flex;
    gap: 8px;
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

  .ast-delete-warning {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: 10px;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    margin-bottom: 16px;
    color: #991b1b;
  }

  .ast-delete-warning strong {
    color: #991b1b;
  }

  .ast-delete-warning p {
    margin: 4px 0 0;
    color: #7f1d1d;
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

  .ast-password-box {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #d1d5db;
    border-radius: 9px;
    padding: 0 11px;
    background: #ffffff;
  }

  .ast-password-box svg {
    color: #6b7280;
    flex-shrink: 0;
  }

  .ast-password-box input {
    border: none;
    padding-left: 0;
  }

  .ast-readonly-unit {
    width: 100%;
    min-height: 43px;
    padding: 11px 12px;
    border-radius: 9px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    box-sizing: border-box;
    background: #f9fafb;
    color: #111827;
    font-weight: 900;
    display: flex;
    align-items: center;
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
  .ast-save-btn,
  .ast-confirm-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
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
    border: 1px solid #2563eb;
    background-color: #2563eb;
    color: #ffffff;
  }

  .ast-confirm-delete-btn {
    border: 1px solid #dc2626;
    background-color: #dc2626;
    color: #ffffff;
  }

  .ast-cancel-btn:disabled,
  .ast-save-btn:disabled,
  .ast-confirm-delete-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: 1100px) {
    .ast-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ast-detail-item-card {
      grid-template-columns: 1fr;
      align-items: flex-start;
    }

    .ast-detail-item-actions {
      width: 100%;
    }

    .ast-detail-item-actions .ast-edit-btn,
    .ast-detail-item-actions .ast-delete-btn {
      flex: 1;
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

    .ast-modal-box,
    .ast-details-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 18px 18px 0 0;
      padding: 20px;
    }

    .ast-form-row,
    .ast-delete-summary,
    .ast-detail-summary {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .ast-modal-actions {
      flex-direction: column;
    }

    .ast-cancel-btn,
    .ast-save-btn,
    .ast-confirm-delete-btn {
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

    .ast-modal-box,
    .ast-details-modal-box {
      padding: 16px;
    }
  }
`;

export default TransactionHistory;
