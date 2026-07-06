import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiClock,
  FiSearch,
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
          total_points: txn.points ?? txn.total_points ?? 0,
          created_at: txn.created_at,
        },
      ];
    }

    return [];
  };

  const getItemTotalPoints = (item) => {
    const quantity = Number(item?.quantity || 0);
    const pointsPerUnit = Number(item?.points_per_unit || 0);

    if (
      Number.isFinite(quantity) &&
      Number.isFinite(pointsPerUnit) &&
      quantity > 0 &&
      pointsPerUnit > 0
    ) {
      return roundToTwo(quantity * pointsPerUnit);
    }

    return roundToTwo(item?.total_points ?? item?.points ?? 0);
  };

  const getGroupedTransactionTotalPoints = (txn) => {
    const groupedItems = getGroupedItems(txn);

    if (isGroupedRewardTxn(txn) && groupedItems.length > 0) {
      return roundToTwo(
        groupedItems.reduce((sum, item) => {
          return sum + getItemTotalPoints(item);
        }, 0)
      );
    }

    return roundToTwo(txn?.points ?? txn?.total_points ?? 0);
  };

  const getItemPreviewNames = (txn) => {
    const names = getGroupedItems(txn).map((item) => item.item_name || "-");

    if (!names.length) return "-";

    if (names.length <= 3) return names.join(", ");

    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  };

  const getTotalItems = (txn) =>
    Number(txn.item_count || getGroupedItems(txn).length || 0);

  const getTxnPoints = (txn) => getGroupedTransactionTotalPoints(txn);

  const buildItemTxnFromGroupedItem = (groupTxn, item) => {
    const itemTotalPoints = getItemTotalPoints(item);

    return {
      ...item,
      id: item.transaction_id || item.point_transaction_id || item.id,
      transaction_id: item.transaction_id || item.point_transaction_id || "",
      point_transaction_id:
        item.point_transaction_id || item.transaction_id || "",
      reward_entry_id: getRewardEntryId(groupTxn),
      reward_entry_item_id: item.reward_entry_item_id || item.id,
      customer_id: groupTxn.customer_id,
      customer_name: getCustomerName(groupTxn),
      phone_number: getCustomerPhone(groupTxn),
      type: "POINTS_CREDIT",
      transaction_type: "EARN",
      points: itemTotalPoints,
      total_points: itemTotalPoints,
      unit: item.unit,
      quantity: item.quantity,
      points_per_unit: item.points_per_unit,
      created_at: item.created_at || groupTxn.created_at,
      note: groupTxn.note || item.note || "",
    };
  };

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
        points: getGroupedTransactionTotalPoints({
          ...entry,
          is_grouped_reward: true,
        }),
      }));

      const otherTransactions = rawTransactions.filter((txn) => {
        const isRewardItemTransaction = Boolean(
          txn.reward_entry_item_id || txn.reward_entry_id
        );

        const isEarnTxn = normalizeTxnType(txn) === "POINTS_CREDIT";

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

  const handleEditChange = (event) => {
    const { name, value } = event.target;

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

  const updateTransaction = async (event) => {
    event.preventDefault();

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

  const deleteTransaction = async (event) => {
    event.preventDefault();

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

        <section className="ast-header-card">
          <div className="ast-header-left">
            <button type="button" onClick={handleBack} className="ast-back-btn">
              <FiArrowLeft />
              Back
            </button>

            <div className="ast-title-icon">
              <FiClock />
            </div>

            <div>
              <h1 className="ast-title">Transaction History</h1>
              <p className="ast-subtitle">
                Reward entries are grouped as one transaction. Click View
                Details to edit or delete individual item rows.
              </p>
            </div>
          </div>
        </section>

        <section className="ast-summary-grid">
          <SummaryCard
            icon={<FiPlusCircle />}
            iconClass="green"
            label="Points Earned"
            value={roundToTwo(totalEarned)}
            valueClass="green"
          />

          <SummaryCard
            icon={<FiMinusCircle />}
            iconClass="red"
            label="Points Used"
            value={roundToTwo(totalUsed)}
            valueClass="red"
          />

          <SummaryCard
            icon={<FiAward />}
            iconClass="blue"
            label="Net Points"
            value={netPoints}
            valueClass="blue"
          />

          <SummaryCard
            icon={<FiUser />}
            iconClass="purple"
            label="Transactions"
            value={transactionRecords.length}
            valueClass="purple"
            plain
          />
        </section>

        <section className="ast-toolbar-card">
          <div className="ast-search-wrapper">
            <FiSearch className="ast-search-icon" />

            <input
              type="text"
              placeholder="Search date, customer, phone, item or unit..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="ast-search-input"
            />
          </div>

          <select
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
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
            onChange={(event) => setEntryType(event.target.value)}
            className="ast-filter-select"
          >
            <option value="all">All Transaction Types</option>
            <option value="POINTS_CREDIT">Earned Points</option>
            <option value="POINTS_DEBIT">Used Points</option>
          </select>
        </section>

        <section className="ast-table-card">
          <div className="ast-table-header">
            <div>
              <h2 className="ast-table-title">Transaction History</h2>
              <p className="ast-table-subtitle">
                Grouped reward transactions and point activity.
              </p>
            </div>

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
                      Loading transaction history...
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

                            {!isGroupedRewardTxn(txn) &&
                              canEditRewardItem(txn) && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(txn)}
                                  className="ast-edit-btn"
                                >
                                  <FiEdit2 />
                                  Edit
                                </button>
                              )}

                            {!isGroupedRewardTxn(txn) && (
                              <button
                                type="button"
                                onClick={() => openDeleteModal(txn)}
                                className="ast-delete-btn"
                              >
                                <FiTrash2 />
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
              <div className="ast-mobile-empty">
                Loading transaction history...
              </div>
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
                          className="ast-edit-btn mobile"
                        >
                          <FiEdit2 />
                          Edit Transaction
                        </button>
                      )}

                      {!isGroupedRewardTxn(txn) && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(txn)}
                          className="ast-delete-btn mobile"
                        >
                          <FiTrash2 />
                          Delete Transaction
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="ast-pagination">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className="ast-page-btn"
              >
                <FiChevronLeft />
                Previous
              </button>

              <span className="ast-pagination-info">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="ast-page-btn"
              >
                Next
                <FiChevronRight />
              </button>
            </div>
          )}
        </section>

        {selectedDetailsTxn && (
          <div className="ast-modal-overlay">
            <div className="ast-details-modal-box">
              <div className="ast-modal-header">
                <div>
                  <h3>Transaction Details</h3>
                  <p>View and edit item rows inside this transaction.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailsTxn(null)}
                  className="ast-close-btn"
                >
                  <FiX />
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
                          {formatPoints(getItemTotalPoints(item))} pts
                        </strong>

                        {itemTxn.reward_entry_item_id && (
                          <div className="ast-detail-item-actions">
                            <button
                              type="button"
                              className="ast-edit-btn"
                              onClick={() => openEditModal(itemTxn)}
                            >
                              <FiEdit2 />
                              Edit
                            </button>

                            {itemTxn.transaction_id && (
                              <button
                                type="button"
                                className="ast-delete-btn"
                                onClick={() => openDeleteModal(itemTxn)}
                              >
                                <FiTrash2 />
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
                <div>
                  <h3>Edit Transaction Item</h3>
                  <p>Edit date, item and quantity safely.</p>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="ast-close-btn"
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={updateTransaction}>
                <div className="ast-info-box">
                  <FiPackage />

                  <div>
                    <strong>{getCustomerName(editingTxn)}</strong>

                    <p>
                      Unit is automatically taken from Item Master after item
                      selection.
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
                        {formatPoints(item.per_point_amount || item.points || 0)}{" "}
                        pts / {getUnitLabel(getItemUnit(item.id))}
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
                    <FiSave />
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
                <div>
                  <h3>Delete Transaction Item</h3>
                  <p>This action needs password confirmation.</p>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="ast-close-btn"
                  disabled={deleting}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={deleteTransaction}>
                <div className="ast-delete-warning">
                  <FiTrash2 />

                  <div>
                    <strong>Confirm transaction item delete</strong>
                    <p>
                      This will delete the selected item transaction and adjust
                      customer point balance.
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
                    <FiLock />

                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(event) =>
                        setDeletePassword(event.target.value)
                      }
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
                    <FiTrash2 />
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
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .ast-toast {
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
  }

  .ast-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .ast-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .ast-header-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .ast-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .ast-back-btn {
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

  .ast-back-btn:hover {
    background: #dbeafe;
  }

  .ast-title-icon {
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

  .ast-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .ast-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .ast-save-btn:disabled,
  .ast-cancel-btn:disabled,
  .ast-confirm-delete-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .ast-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .ast-summary-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 0;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .ast-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .ast-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .ast-summary-icon.red {
    background: #fef2f2;
    color: #dc2626;
  }

  .ast-summary-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .ast-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .ast-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .ast-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 26px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
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

  .ast-toolbar-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 10px;
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 220px 240px;
    gap: 12px;
    margin-bottom: 18px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .ast-search-wrapper {
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

  .ast-search-icon {
    color: #94a3b8;
    flex: 0 0 auto;
  }

  .ast-search-input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    min-width: 0;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .ast-filter-select {
    height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    padding: 0 12px;
    font-weight: 900;
    outline: none;
    min-width: 0;
  }

  .ast-table-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
    max-width: 100%;
  }

  .ast-table-header {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .ast-table-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .ast-table-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
  }

  .ast-table-count {
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

  .ast-table-scroll {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ast-table {
    width: 100%;
    min-width: 1080px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .ast-table th {
    background: #f8fafc;
    color: #64748b;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 950;
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
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

  .ast-table td {
    padding: 16px;
    border-bottom: 1px solid #eef2f7;
    vertical-align: middle;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
    white-space: nowrap;
  }

  .ast-table tbody tr:hover {
    background: #f8fafc;
  }

  .ast-table td.customer {
    font-weight: 950;
    color: #0f172a;
  }

  .ast-items-preview {
    display: inline-block;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #0f172a;
    font-weight: 900;
  }

  .ast-type-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }

  .ast-type-badge.credit {
    background: #dcfce7;
    color: #059669;
  }

  .ast-type-badge.debit {
    background: #fee2e2;
    color: #dc2626;
  }

  .ast-table td.points {
    font-size: 15px;
    font-weight: 950;
  }

  .ast-table td.points.credit,
  .credit-text {
    color: #059669;
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
    gap: 7px;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
  }

  .ast-view-btn {
    background: #eef2ff;
    color: #4f46e5;
    border: 1px solid #c7d2fe;
  }

  .ast-edit-btn {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .ast-delete-btn {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .ast-empty-cell {
    padding: 42px 16px !important;
    text-align: center;
    color: #64748b !important;
    font-size: 15px !important;
    font-weight: 850;
  }

  .ast-mobile-list {
    display: none;
  }

  .ast-pagination {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .ast-pagination-info {
    font-weight: 950;
    color: #64748b;
    text-align: center;
  }

  .ast-page-btn {
    height: 40px;
    padding: 0 15px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 950;
    cursor: pointer;
  }

  .ast-page-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ast-modal-overlay {
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

  .ast-modal-box,
  .ast-details-modal-box {
    width: min(560px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 24px 55px rgba(15, 23, 42, 0.28);
    box-sizing: border-box;
    border: 1px solid #e2e8f0;
  }

  .ast-details-modal-box {
    width: min(860px, 100%);
  }

  .ast-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .ast-modal-header h3 {
    margin: 0;
    color: #0f172a;
    font-size: 20px;
    font-weight: 950;
  }

  .ast-modal-header p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
  }

  .ast-close-btn {
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

  .ast-modal-box form,
  .ast-details-modal-box > .ast-detail-summary,
  .ast-details-modal-box > .ast-detail-note,
  .ast-details-modal-box > .ast-detail-items-title,
  .ast-details-modal-box > .ast-detail-items-list,
  .ast-details-modal-box > .ast-modal-actions {
    margin-left: 20px;
    margin-right: 20px;
  }

  .ast-modal-box form {
    padding: 20px 0;
  }

  .ast-detail-summary,
  .ast-delete-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 20px;
    margin-bottom: 16px;
  }

  .ast-detail-summary div,
  .ast-delete-summary div,
  .ast-detail-note {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
    min-width: 0;
  }

  .ast-detail-summary span,
  .ast-delete-summary span,
  .ast-detail-note span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .ast-detail-summary strong,
  .ast-delete-summary strong,
  .ast-detail-note strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .ast-detail-items-title {
    margin-top: 16px;
    margin-bottom: 10px;
    color: #0f172a;
    font-size: 16px;
    font-weight: 950;
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
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px;
    background: #ffffff;
  }

  .ast-detail-item-main h4 {
    margin: 0;
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
  }

  .ast-detail-item-main p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }

  .ast-detail-item-points {
    color: #2563eb;
    font-size: 15px;
    font-weight: 950;
    white-space: nowrap;
  }

  .ast-detail-item-actions {
    display: inline-flex;
    gap: 8px;
  }

  .ast-info-box,
  .ast-delete-warning {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 13px;
    border-radius: 14px;
    margin-bottom: 16px;
  }

  .ast-info-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
  }

  .ast-delete-warning {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .ast-info-box strong,
  .ast-delete-warning strong {
    color: #0f172a;
    font-weight: 950;
  }

  .ast-info-box p,
  .ast-delete-warning p {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
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
    font-weight: 950;
    color: #334155;
  }

  .ast-form-group input,
  .ast-form-group select,
  .ast-form-group textarea {
    width: 100%;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    background: #ffffff;
    color: #0f172a;
    font-weight: 750;
  }

  .ast-form-group input,
  .ast-form-group select {
    height: 44px;
    padding: 0 12px;
  }

  .ast-form-group textarea {
    min-height: 84px;
    resize: vertical;
    font-family: inherit;
    padding: 12px;
    line-height: 1.5;
  }

  .ast-form-group input:focus,
  .ast-form-group select:focus,
  .ast-form-group textarea:focus {
    border-color: #2563eb;
  }

  .ast-password-box {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 0 11px;
    background: #ffffff;
  }

  .ast-password-box svg {
    color: #64748b;
    flex-shrink: 0;
  }

  .ast-password-box input {
    border: none;
    padding-left: 0;
    height: 42px;
  }

  .ast-readonly-unit {
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    font-size: 14px;
    box-sizing: border-box;
    background: #f8fafc;
    color: #0f172a;
    font-weight: 950;
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
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 13px;
  }

  .ast-calculation-box p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .ast-calculation-box h4 {
    margin: 7px 0 0;
    color: #0f172a;
    font-size: 22px;
    font-weight: 950;
  }

  .ast-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .ast-cancel-btn,
  .ast-save-btn,
  .ast-confirm-delete-btn {
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

  .ast-cancel-btn {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
  }

  .ast-save-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
  }

  .ast-confirm-delete-btn {
    border: none;
    background: #dc2626;
    color: #ffffff;
    box-shadow: 0 10px 22px rgba(220, 38, 38, 0.18);
  }

  @media (max-width: 1200px) {
    .ast-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ast-toolbar-card {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
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

  @media (max-width: 768px) {
    .ast-page {
      padding: 12px;
    }

    .ast-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .ast-header-left {
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .ast-title-icon {
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    .ast-title {
      font-size: 23px;
    }

    .ast-summary-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .ast-summary-value {
      font-size: 23px;
    }

    .ast-table-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .ast-table-scroll {
      display: none;
    }

    .ast-mobile-list {
      display: grid;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
    }

    .ast-mobile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px;
    }

    .ast-mobile-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .ast-mobile-date {
      margin: 0 0 5px;
      color: #64748b;
      font-size: 12px;
      font-weight: 850;
    }

    .ast-mobile-card h3 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 950;
      overflow-wrap: anywhere;
    }

    .ast-mobile-phone {
      margin: 6px 0 0;
      color: #475569;
      font-size: 13px;
      font-weight: 800;
    }

    .ast-mobile-detail-grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .ast-mobile-detail-grid div {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      min-width: 0;
    }

    .ast-mobile-detail-grid span {
      display: block;
      color: #64748b;
      font-size: 12px;
      font-weight: 900;
    }

    .ast-mobile-detail-grid strong {
      display: block;
      margin-top: 5px;
      color: #0f172a;
      font-size: 14px;
      font-weight: 950;
      overflow-wrap: anywhere;
    }

    .ast-mobile-actions {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .ast-view-btn.mobile,
    .ast-edit-btn.mobile,
    .ast-delete-btn.mobile {
      width: 100%;
    }

    .ast-mobile-empty {
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-weight: 850;
    }

    .ast-pagination {
      flex-wrap: wrap;
      padding: 14px;
    }

    .ast-pagination-info {
      width: 100%;
      order: -1;
    }

    .ast-page-btn {
      flex: 1;
      min-width: 130px;
    }

    .ast-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .ast-modal-box,
    .ast-details-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 20px 20px 0 0;
    }

    .ast-form-row,
    .ast-delete-summary,
    .ast-detail-summary,
    .ast-calculation-box {
      grid-template-columns: 1fr;
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
    .ast-header-left {
      flex-direction: column;
    }

    .ast-back-btn {
      width: 100%;
    }

    .ast-mobile-card-top {
      flex-direction: column;
    }

    .ast-type-badge {
      width: 100%;
    }

    .ast-pagination {
      flex-direction: column;
    }

    .ast-page-btn {
      width: 100%;
    }
  }
`;

export default TransactionHistory;