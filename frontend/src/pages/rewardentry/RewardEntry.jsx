import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAward,
  FiUser,
  FiPackage,
  FiPlusCircle,
  FiSave,
  FiX,
  FiMessageCircle,
  FiEye,
  FiFileText,
  FiCheckCircle,
  FiCalendar,
  FiTrash2,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";

import "./rewardEntry.css";

const RECENT_ENTRY_LIMIT = 12;

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

const emptyItemRow = {
  id: Math.random().toString(36).substring(2, 9),
  loyalty_item_id: "",
  unit: "",
  quantity: "",
};

const emptyAddItemForm = {
  loyalty_item_id: "",
  unit: "",
  quantity: "",
  note: "",
};

const emptyQuickItemForm = {
  item_name: "",
  sku: "",
  unit: "pcs",
  points: "",
};

const getApiErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (!detail) return "Something went wrong. Please check backend API.";
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

const normalizeUnit = (unit) => {
  const cleanUnit = String(unit || "").trim().toLowerCase();
  if (!cleanUnit) return "pcs";
  if (cleanUnit === "liter") return "litre";
  if (cleanUnit === "qt") return "quintal";
  return cleanUnit;
};

const getUnitLabel = (unitValue) => {
  const normalized = normalizeUnit(unitValue);
  const foundUnit = unitOptions.find((unit) => normalizeUnit(unit.value) === normalized);
  return foundUnit ? foundUnit.label : unitValue || "No / Pcs";
};

const getItemName = (item) => item?.item_name || item?.name || "";
const getItemUnit = (item) => normalizeUnit(item?.unit || item?.quantity_unit || item?.uom || item?.default_unit || "pcs");
const getItemPoints = (item) => Number(item?.per_point_amount ?? item?.points ?? item?.points_value ?? item?.points_required ?? 0);

const getCustomerName = (customer) => customer?.name || customer?.customer_name || customer?.full_name || "-";
const getCustomerPhone = (customer) => customer?.phone_number || customer?.phone || customer?.mobile || "-";
const getCustomerLabel = (customer) => `${getCustomerName(customer)} - ${getCustomerPhone(customer)}`;

const sanitizeDecimalInput = (value) => {
  const cleanValue = String(value || "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleanValue.split(".");
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join("")}`;
};

const HighlightText = ({ text, search }) => {
  const value = String(text || "");
  const query = String(search || "").trim();
  if (!query) return value;
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerValue.indexOf(lowerQuery);
  if (matchIndex === -1) return value;
  return (
    <>
      {value.slice(0, matchIndex)}
      <mark className="asr-search-highlight">{value.slice(matchIndex, matchIndex + query.length)}</mark>
      {value.slice(matchIndex + query.length)}
    </>
  );
};

const getEntryCustomer = (entry) => entry?.customer_name || entry?.customer_id || "-";
const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN");
};
const formatDateTime = (dateValue) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};
const roundToTwo = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) / 100 : 0;
};
const formatPoints = (value) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return "0";
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2).replace(/\.?0+$/, "");
};
const getEntryItems = (entry) => (Array.isArray(entry?.items) ? entry.items : []);
const getEntryId = (entry) => entry?.reward_entry_id || entry?.transaction_group_id || entry?.id;
const getEntryTotalItems = (entry) => Number(entry?.item_count || getEntryItems(entry).length || 0);
const getEntryTotalPoints = (entry) => Number(entry?.total_points ?? entry?.points ?? 0);
const getItemPreviewNames = (entry) => {
  const items = getEntryItems(entry);
  if (!items.length) return [];
  return items.map((item) => item?.item_name || item?.loyalty_item_id || "-");
};

export default function RewardEntry({ onBack }) {
  const navigate = useNavigate();
  const dateInputRef = useRef(null);
  const noteTextareaRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [entries, setEntries] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const todayIso = new Date().toISOString().split("T")[0];
  const [entryDate, setEntryDate] = useState(todayIso);

  const [itemRows, setItemRows] = useState([{ ...emptyItemRow, id: "init_1" }]);
  const [removingRowId, setRemovingRowId] = useState(null);
  const [note, setNote] = useState("");

  const [selectedDetailEntry, setSelectedDetailEntry] = useState(null);
  const [addItemEntry, setAddItemEntry] = useState(null);
  const [addItemForm, setAddItemForm] = useState({ ...emptyAddItemForm });

  const [quickItemModalOpen, setQuickItemModalOpen] = useState(false);
  const [quickItemForm, setQuickItemForm] = useState({ ...emptyQuickItemForm });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [creatingQuickItem, setCreatingQuickItem] = useState(false);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const selectedCustomer = useMemo(
    () => customers.find((c) => Number(c.id) === Number(customerId)),
    [customers, customerId]
  );

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) =>
      getCustomerName(a).localeCompare(getCustomerName(b), "en", { sensitivity: "base", numeric: true })
    );
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase().replace(/-/g, " ");
    if (!query) return sortedCustomers.slice(0, 25);
    const queryWords = query.split(/\s+/).filter(Boolean);
    return sortedCustomers
      .filter((customer) => {
        const searchText = `${getCustomerName(customer)} ${getCustomerPhone(customer)}`.toLowerCase().replace(/-/g, " ");
        return queryWords.every((word) => searchText.includes(word));
      })
      .slice(0, 25);
  }, [customerSearch, sortedCustomers]);

  const handleCustomerSearchChange = (value) => {
    setCustomerSearch(value);
    setCustomerId("");
    setCustomerDropdownOpen(true);
  };

  const handleCustomerSelect = (customer) => {
    setCustomerId(String(customer.id));
    setCustomerSearch(getCustomerLabel(customer));
    setCustomerDropdownOpen(false);
  };

  const handleClearCustomer = () => {
    setCustomerId("");
    setCustomerSearch("");
  };

  const getCustomerInitials = (name) => {
    if (!name || name === "-") return "CU";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getSelectedItem = (itemId) => items.find((item) => Number(item.id) === Number(itemId));

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) =>
      getItemName(a).localeCompare(getItemName(b), "en", { sensitivity: "base", numeric: true })
    );
  }, [items]);

  const calculatedRows = useMemo(() => {
    return itemRows.map((row) => {
      const selectedItem = getSelectedItem(row.loyalty_item_id);
      const pointsPerUnit = selectedItem ? getItemPoints(selectedItem) : 0;
      const itemUnit = selectedItem ? getItemUnit(selectedItem) : "";
      const finalUnit = row.unit || itemUnit;
      const rawQuantity = row.quantity === "" ? 0 : Number(row.quantity || 0);
      const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 0;
      const totalPoints = pointsPerUnit > 0 && quantity > 0 ? roundToTwo(pointsPerUnit * quantity) : 0;

      return {
        ...row,
        unit: finalUnit,
        unit_label: finalUnit ? getUnitLabel(finalUnit) : "-",
        item_name: selectedItem ? getItemName(selectedItem) : "",
        points_per_unit: pointsPerUnit,
        quantity_number: quantity,
        total_points: totalPoints,
      };
    });
  }, [itemRows, items]);

  const grandTotalPoints = useMemo(() => {
    return roundToTwo(calculatedRows.reduce((sum, row) => sum + Number(row.total_points || 0), 0));
  }, [calculatedRows]);

  const displayedEntries = useMemo(() => {
    return entries.slice(0, RECENT_ENTRY_LIMIT);
  }, [entries]);

  const pageSummary = useMemo(() => {
    const recentPoints = displayedEntries.reduce((sum, entry) => sum + Number(getEntryTotalPoints(entry) || 0), 0);
    const recentItems = displayedEntries.reduce((sum, entry) => sum + Number(getEntryTotalItems(entry) || 0), 0);
    return {
      customers: customers.length,
      itemMaster: items.length,
      recentEntries: displayedEntries.length,
      recentItems,
      recentPoints,
    };
  }, [customers, items, displayedEntries]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, itemsRes, entriesRes] = await Promise.allSettled([
        api.get("/customers/"),
        api.get("/loyalty/items"),
        api.get(`/reward-entries/grouped?limit=${RECENT_ENTRY_LIMIT}`),
      ]);

      if (customersRes.status === "fulfilled") {
        const data = Array.isArray(customersRes.value.data)
          ? customersRes.value.data
          : customersRes.value.data?.customers || customersRes.value.data?.data || [];
        setCustomers(data);
      }
      if (itemsRes.status === "fulfilled") {
        const data = Array.isArray(itemsRes.value.data)
          ? itemsRes.value.data
          : itemsRes.value.data?.items || itemsRes.value.data?.data || [];
        setItems(data);
      }
      if (entriesRes.status === "fulfilled") {
        const data = Array.isArray(entriesRes.value.data)
          ? entriesRes.value.data
          : entriesRes.value.data?.entries || entriesRes.value.data?.data || [];
        setEntries(data);
      }
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleItemRowChange = (id, field, value) => {
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "loyalty_item_id") {
          const selectedItem = getSelectedItem(value);
          return {
            ...row,
            loyalty_item_id: value,
            unit: selectedItem ? getItemUnit(selectedItem) : "",
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const addItemRow = () => {
    setItemRows((prev) => [
      ...prev,
      { ...emptyItemRow, id: Math.random().toString(36).substring(2, 9) },
    ]);
  };

  const removeItemRow = (id) => {
    if (itemRows.length <= 1) {
      setItemRows([{ ...emptyItemRow, id: Math.random().toString(36).substring(2, 9) }]);
      return;
    }
    setRemovingRowId(id);
    setTimeout(() => {
      setItemRows((prev) => prev.filter((r) => r.id !== id));
      setRemovingRowId(null);
    }, 180);
  };

  const resetForm = () => {
    setCustomerId("");
    setCustomerSearch("");
    setCustomerDropdownOpen(false);
    setEntryDate(todayIso);
    setItemRows([{ ...emptyItemRow, id: Math.random().toString(36).substring(2, 9) }]);
    setNote("");
    if (noteTextareaRef.current) noteTextareaRef.current.style.height = "auto";
  };

  const handleNoteChange = (e) => {
    setNote(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const validateForm = () => {
    if (!customerId) {
      showToast("Please select a customer.", "error");
      return false;
    }
    const hasItems = calculatedRows.some((r) => r.loyalty_item_id);
    if (!hasItems) {
      showToast("Please select at least one item.", "error");
      return false;
    }
    for (let i = 0; i < calculatedRows.length; i++) {
      const row = calculatedRows[i];
      if (row.loyalty_item_id) {
        const q = Number(row.quantity);
        if (!Number.isFinite(q) || q <= 0) {
          showToast(`Quantity must be greater than 0 in row ${i + 1}.`, "error");
          return false;
        }
      }
    }
    if (grandTotalPoints <= 0) {
      showToast("Grand total points must be greater than 0.", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const rewardItems = calculatedRows
      .filter((row) => row.loyalty_item_id)
      .map((row) => ({
        loyalty_item_id: Number(row.loyalty_item_id),
        unit: row.unit || "pcs",
        quantity: Number(row.quantity_number),
        points_per_unit: Number(row.points_per_unit),
        total_points: roundToTwo(row.total_points),
      }));

    const payload = {
      customer_id: Number(customerId),
      items: rewardItems,
      total_points: roundToTwo(grandTotalPoints),
      entry_date: entryDate ? `${entryDate}T12:00:00` : null,
      created_at: entryDate ? `${entryDate}T12:00:00` : null,
      note: note.trim() || null,
    };

    try {
      setSaving(true);
      await api.post("/reward-entries/bulk", payload);
      showToast("Reward entry saved successfully.", "success");
      resetForm();
      fetchData();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const formattedDateLabel = useMemo(() => {
    if (!entryDate) return "Today";
    const dateObj = new Date(`${entryDate}T00:00:00`);
    const isToday = entryDate === todayIso;
    const formatted = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return isToday ? `Today, ${formatted}` : formatted;
  }, [entryDate, todayIso]);

  const openQuickItemModal = () => {
    setQuickItemForm({ ...emptyQuickItemForm });
    setQuickItemModalOpen(true);
  };
  const closeQuickItemModal = () => {
    if (!creatingQuickItem) setQuickItemModalOpen(false);
  };
  const handleQuickItemChange = (field, value) =>
    setQuickItemForm((prev) => ({ ...prev, [field]: value }));

  const getResponseItem = (data) =>
    data?.id
      ? data
      : data?.item?.id
      ? data.item
      : data?.data?.id
      ? data.data
      : data?.loyalty_item?.id
      ? data.loyalty_item
      : null;

  const selectNewItemInForm = (newItem) => {
    if (!newItem?.id) return;
    const newUnit = getItemUnit(newItem);
    setItemRows((prev) => {
      const emptyRowIndex = prev.findIndex((row) => !row.loyalty_item_id);
      if (emptyRowIndex === -1)
        return [
          ...prev,
          {
            ...emptyItemRow,
            id: Math.random().toString(36).substring(2, 9),
            loyalty_item_id: String(newItem.id),
            unit: newUnit,
            quantity: "",
          },
        ];
      return prev.map((row, index) =>
        index === emptyRowIndex
          ? { ...row, loyalty_item_id: String(newItem.id), unit: newUnit }
          : row
      );
    });
  };

  const handleQuickItemSubmit = async (event) => {
    event.preventDefault();
    const itemName = quickItemForm.item_name.trim();
    const sku = quickItemForm.sku.trim();
    const unit = normalizeUnit(quickItemForm.unit || "pcs");
    const points = Number(quickItemForm.points || 0);

    if (!itemName) {
      showToast("Please enter item name.", "error");
      return;
    }
    if (!points || points <= 0) {
      showToast("Points per unit must be greater than 0.", "error");
      return;
    }

    const payload = {
      item_name: itemName,
      sku: sku || null,
      unit,
      points,
      per_point_amount: points,
      category: "item",
      is_active: true,
    };

    try {
      setCreatingQuickItem(true);
      const createRes = await api.post("/loyalty/items", payload);
      const itemsRes = await api.get("/loyalty/items");
      const latestItems = Array.isArray(itemsRes.data)
        ? itemsRes.data
        : itemsRes.data?.items || itemsRes.data?.data || [];
      setItems(latestItems);

      const responseItem = getResponseItem(createRes.data);
      const createdItem =
        (responseItem?.id && latestItems.find((item) => Number(item.id) === Number(responseItem.id))) ||
        latestItems[latestItems.length - 1];

      if (createdItem?.id) selectNewItemInForm(createdItem);
      showToast("Item added successfully.", "success");
      closeQuickItemModal();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setCreatingQuickItem(false);
    }
  };

  const openAddItemModal = (entry, event) => {
    if (event) event.stopPropagation();
    setAddItemEntry(entry);
    setAddItemForm({ ...emptyAddItemForm });
  };
  const closeAddItemModal = () => {
    setAddItemEntry(null);
    setAddItemForm({ ...emptyAddItemForm });
  };

  const handleAddItemFormChange = (field, value) => {
    setAddItemForm((prev) => {
      if (field === "loyalty_item_id") {
        const selectedItem = getSelectedItem(value);
        return { ...prev, loyalty_item_id: value, unit: selectedItem ? getItemUnit(selectedItem) : "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleAddItemSubmit = async (event) => {
    event.preventDefault();
    const q = Number(addItemForm.quantity);
    if (!addItemEntry || !addItemForm.loyalty_item_id || !Number.isFinite(q) || q <= 0) {
      showToast("Please fill out all required item fields.", "error");
      return;
    }

    const rewardEntryId = getEntryId(addItemEntry);
    const selectedItem = getSelectedItem(addItemForm.loyalty_item_id);
    const pts = selectedItem ? getItemPoints(selectedItem) : 0;
    const totalPts = roundToTwo(pts * q);

    const payload = {
      loyalty_item_id: Number(addItemForm.loyalty_item_id),
      unit: addItemForm.unit || getItemUnit(selectedItem) || "pcs",
      quantity: q,
      points_per_unit: pts,
      total_points: totalPts,
      note: addItemForm.note.trim() || null,
    };

    try {
      setAddingItem(true);
      await api.post(`/reward-entries/${rewardEntryId}/items`, payload);
      showToast("Item added to existing transaction.", "success");
      closeAddItemModal();
      fetchData();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setAddingItem(false);
    }
  };

  const sendWhatsAppForEntry = async (entry, event, allowResend = false) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const rewardEntryId = getEntryId(entry);
    if (!rewardEntryId) return;

    try {
      setSendingWhatsAppId(rewardEntryId);
      const response = await api.post(`/messages/reward-entry/${rewardEntryId}/whatsapp/send`, {
        allow_resend: allowResend,
      });
      if (response.data?.success) {
        showToast("WhatsApp message sent successfully.", "success");
        fetchData();
      } else {
        showToast(response.data?.error_message || "WhatsApp message failed.", "error");
      }
    } catch (error) {
      if (
        error?.response?.status === 409 &&
        String(error?.response?.data?.detail).toLowerCase().includes("already sent")
      ) {
        if (window.confirm("WhatsApp message already sent for this transaction. Do you want to resend?")) {
          await sendWhatsAppForEntry(entry, event, true);
        }
        return;
      }
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setSendingWhatsAppId(null);
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
        title="Reward Entry"
        kicker="LOYALTY MANAGEMENT"
        description="Select customer, add items, calculate reward points, and send WhatsApp notifications."
        icon={FiAward}
        backPath="/dashboard"
        rightAction={
          <button
            type="button"
            className="portal-action-btn"
            onClick={openQuickItemModal}
            disabled={saving || loading}
          >
            <FiPlusCircle size={16} /> Add Item Master
          </button>
        }
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard title="Customers" value={pageSummary.customers} Icon={FiUser} colorTheme="blue" />
        <StatCard title="Item Master" value={pageSummary.itemMaster} Icon={FiPackage} colorTheme="green" />
        <StatCard title="Recent Entries" value={pageSummary.recentEntries} Icon={FiFileText} colorTheme="purple" />
        <StatCard title="Recent Points" value={formatPoints(pageSummary.recentPoints)} Icon={FiAward} colorTheme="orange" />
      </div>

      {/* UNIFIED CREATE REWARD ENTRY CARD */}
      <section className="asr-unified-card">
        <div className="asr-unified-header">
          <div>
            <h2 className="asr-unified-title">Create Reward Entry</h2>
            <p className="asr-unified-subtitle">
              One reward entry is one transaction or bill. Add multiple item rows inside the same transaction.
            </p>
          </div>
          <span className="asr-row-counter-badge">
            {calculatedRows.filter((r) => r.loyalty_item_id).length} items
          </span>
        </div>

        <form onSubmit={handleSubmit} className="asr-unified-form">
          {/* Customer + Date */}
          <div className="asr-meta-row">
            <div className="asr-field-group">
              <label className="asr-field-label">Customer *</label>
              {selectedCustomer ? (
                <div className="asr-customer-resolved-pill">
                  <div className="asr-avatar-badge">
                    {getCustomerInitials(getCustomerName(selectedCustomer))}
                  </div>
                  <div className="asr-resolved-info">
                    <span className="asr-resolved-name">{getCustomerName(selectedCustomer)}</span>
                    <span className="asr-resolved-phone">{getCustomerPhone(selectedCustomer)}</span>
                  </div>
                  <button
                    type="button"
                    className="asr-pill-clear-btn"
                    onClick={handleClearCustomer}
                    aria-label="Remove selected customer"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="asr-customer-search-wrap"
                  onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 200)}
                >
                  <input
                    className="asr-input"
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearchChange(e.target.value)}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Search customer by name or phone"
                    disabled={saving || loading}
                    autoComplete="off"
                  />
                  {customerDropdownOpen && (
                    <div className="asr-customer-results">
                      {filteredCustomers.length === 0 ? (
                        <div className="asr-customer-empty">No customer found.</div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="asr-customer-option"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <span className="asr-customer-option-name">
                              <HighlightText text={getCustomerName(customer)} search={customerSearch} />
                            </span>
                            <span className="asr-customer-option-phone">
                              <HighlightText text={getCustomerPhone(customer)} search={customerSearch} />
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="asr-field-group">
              <label className="asr-field-label">Entry date (optional)</label>
              <div
                className="asr-date-resolved-box"
                onClick={() => dateInputRef.current && dateInputRef.current.showPicker()}
              >
                <div className="asr-date-resolved-inner">
                  <FiCalendar size={15} className="asr-date-icon" />
                  <span>{formattedDateLabel}</span>
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="asr-hidden-date-picker"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="asr-table-block">
            <div className="asr-table-bar">
              <span className="asr-table-title">Transaction items</span>
              <button
                type="button"
                className="asr-add-item-btn-compact"
                onClick={addItemRow}
                disabled={saving}
              >
                <FiPlusCircle size={14} /> Add item
              </button>
            </div>

            <div className="asr-table-scroll-container">
              <table className="asr-items-table">
                <thead>
                  <tr>
                    <th className="col-item">Item</th>
                    <th className="col-qty">Qty</th>
                    <th className="col-unit">Unit</th>
                    <th className="col-rate">Points / unit</th>
                    <th className="col-total">Total</th>
                    <th className="col-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="asr-empty-row-td">
                        No items added — click 'Add item' to start
                      </td>
                    </tr>
                  ) : (
                    calculatedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`asr-item-table-row ${removingRowId === row.id ? "row-animating-out" : ""}`}
                      >
                        <td className="col-item">
                          <select
                            className="asr-table-select"
                            value={row.loyalty_item_id}
                            onChange={(e) => handleItemRowChange(row.id, "loyalty_item_id", e.target.value)}
                            disabled={saving || loading}
                          >
                            <option value="">Select item...</option>
                            {sortedItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {getItemName(item)} ({formatPoints(getItemPoints(item))} pts/{getUnitLabel(getItemUnit(item))})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="col-qty">
                          <input
                            className="asr-table-input qty-input"
                            type="text"
                            inputMode="decimal"
                            value={row.quantity}
                            onChange={(e) =>
                              handleItemRowChange(row.id, "quantity", sanitizeDecimalInput(e.target.value))
                            }
                            placeholder="0"
                            disabled={saving}
                          />
                        </td>
                        <td className="col-unit">
                          <span className="asr-unit-text">{row.unit_label || "-"}</span>
                        </td>
                        <td className="col-rate">
                          <span className="asr-num-tabular">{formatPoints(row.points_per_unit)} pts</span>
                        </td>
                        <td className="col-total">
                          <span className="asr-num-tabular asr-bold-total">
                            {formatPoints(row.total_points)} pts
                          </span>
                        </td>
                        <td className="col-action">
                          <button
                            type="button"
                            className="asr-table-remove-btn"
                            onClick={() => removeItemRow(row.id)}
                            disabled={saving}
                            title="Remove row"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note Field */}
          <div className="asr-note-wrapper">
            <label className="asr-field-label">Note (optional)</label>
            <textarea
              ref={noteTextareaRef}
              className="asr-compact-textarea"
              value={note}
              onChange={handleNoteChange}
              placeholder="Add payment method, invoice number, or order details..."
              rows={1}
              disabled={saving}
            />
          </div>

          {/* Combined Summary Bar */}
          <div className="asr-summary-cta-bar">
            <div className="asr-summary-metrics">
              <div className="asr-metric-item">
                <span className="asr-metric-label">Items</span>
                <strong className="asr-metric-val">
                  {calculatedRows.filter((r) => r.loyalty_item_id).length}
                </strong>
              </div>
              <div className="asr-metric-divider"></div>
              <div className="asr-metric-item">
                <span className="asr-metric-label">Customer</span>
                <strong className="asr-metric-val">
                  {selectedCustomer ? getCustomerName(selectedCustomer) : "None selected"}
                </strong>
              </div>
              <div className="asr-metric-divider"></div>
              <div className="asr-metric-item">
                <span className="asr-metric-label">Grand total</span>
                <strong className="asr-metric-grand">{formatPoints(grandTotalPoints)} pts</strong>
              </div>
            </div>

            <div className="asr-summary-buttons">
              <button
                type="button"
                className="asr-ghost-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Clear
              </button>
              <button
                type="submit"
                className="asr-primary-submit-btn"
                disabled={saving}
              >
                <FiSave size={15} /> {saving ? "Saving..." : "Submit entry"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* RECENT REWARD ENTRIES SECTION (STRICTLY 12 ITEMS) */}
      <section className="asr-recent-section">
        <div className="asr-recent-header">
          <div>
            <h3 className="asr-recent-title">Recent Reward Entries</h3>
            <p className="asr-recent-subtitle">
              Showing last {RECENT_ENTRY_LIMIT} transactions. Click any card to inspect or edit.
            </p>
          </div>
          <span className="asr-row-counter-badge">{displayedEntries.length} entries</span>
        </div>

        {displayedEntries.length === 0 ? (
          <div className="asr-empty-state">No recent reward entries found.</div>
        ) : (
          <div className="asr-entry-tiles-grid">
            {displayedEntries.map((entry) => {
              const itemNames = getItemPreviewNames(entry);
              const hiddenCount = Math.max(itemNames.length - 3, 0);
              const rewardEntryId = getEntryId(entry);

              return (
                <div
                  key={rewardEntryId}
                  className="asr-entry-tile"
                  onClick={() => setSelectedDetailEntry(entry)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="asr-entry-tile-top">
                    <div className="asr-entry-customer-block">
                      <h4 className="asr-entry-customer">{getEntryCustomer(entry)}</h4>
                      <span className="asr-entry-date">{formatDate(entry.created_at)}</span>
                    </div>
                    <span className="asr-entry-points">
                      {formatPoints(getEntryTotalPoints(entry))} <small>pts</small>
                    </span>
                  </div>

                  <div className="asr-entry-item-chips">
                    {itemNames.slice(0, 3).map((name, i) => (
                      <span key={`${name}-${i}`} className="asr-item-name-chip">
                        {name}
                      </span>
                    ))}
                    {hiddenCount > 0 && (
                      <span className="asr-item-name-chip more">+{hiddenCount} more</span>
                    )}
                  </div>

                  <div className="asr-entry-tile-bottom" onClick={(e) => e.stopPropagation()}>
                    <span className="asr-entry-count">
                      {getEntryTotalItems(entry)} item{getEntryTotalItems(entry) === 1 ? "" : "s"}
                    </span>
                    <div className="asr-entry-actions">
                      <button
                        type="button"
                        className="asr-action-btn view"
                        onClick={() => setSelectedDetailEntry(entry)}
                        title="View Details"
                      >
                        <FiEye size={13} /> View
                      </button>
                      <button
                        type="button"
                        className="asr-action-btn whatsapp"
                        onClick={(e) => sendWhatsAppForEntry(entry, e)}
                        title="Send WhatsApp"
                      >
                        <FiMessageCircle size={13} />
                        {sendingWhatsAppId === rewardEntryId ? "..." : "WhatsApp"}
                      </button>
                      <button
                        type="button"
                        className="asr-action-btn add"
                        onClick={(e) => openAddItemModal(entry, e)}
                        title="Add Item"
                      >
                        <FiPlusCircle size={13} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* DETAIL MODAL */}
      {selectedDetailEntry && (
        <div className="asr-modal-overlay" onClick={() => setSelectedDetailEntry(null)}>
          <div className="asr-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asr-modal-header">
              <div>
                <p className="asr-modal-kicker">Reward Transaction</p>
                <h2>{getEntryCustomer(selectedDetailEntry)}</h2>
              </div>
              <button
                type="button"
                className="asr-modal-close"
                onClick={() => setSelectedDetailEntry(null)}
              >
                <FiX />
              </button>
            </div>

            <div className="asr-details-summary-grid">
              <div><span>Date / Time</span><strong>{formatDateTime(selectedDetailEntry.created_at)}</strong></div>
              <div><span>Total Items</span><strong>{getEntryTotalItems(selectedDetailEntry)}</strong></div>
              <div><span>Total Points</span><strong>{formatPoints(getEntryTotalPoints(selectedDetailEntry))} pts</strong></div>
              <div><span>Txn ID</span><strong>#{getEntryId(selectedDetailEntry)}</strong></div>
            </div>

            {selectedDetailEntry.note && (
              <div className="asr-detail-note"><span>Note</span><strong>{selectedDetailEntry.note}</strong></div>
            )}

            <div className="asr-detail-items-section">
              <h3>Item Details</h3>
              {getEntryItems(selectedDetailEntry).length === 0 ? (
                <div className="asr-empty-detail">No items found.</div>
              ) : (
                <div className="asr-detail-items-list">
                  {getEntryItems(selectedDetailEntry).map((item) => (
                    <div
                      key={item.reward_entry_item_id || item.id}
                      className="asr-detail-item-card"
                    >
                      <div>
                        <h4>{item?.item_name || "-"}</h4>
                        <p>
                          {item?.quantity ?? "-"} {getUnitLabel(item?.unit)} ×{" "}
                          {formatPoints(item?.points_per_unit || 0)} pts / unit
                        </p>
                      </div>
                      <strong>{formatPoints(item?.total_points || 0)} pts</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="asr-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedDetailEntry(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="asr-whatsapp-btn"
                disabled={sendingWhatsAppId === getEntryId(selectedDetailEntry)}
                onClick={(e) => sendWhatsAppForEntry(selectedDetailEntry, e)}
              >
                <FiMessageCircle /> {sendingWhatsAppId === getEntryId(selectedDetailEntry) ? "Sending..." : "Send WhatsApp"}
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => {
                  const entry = selectedDetailEntry;
                  setSelectedDetailEntry(null);
                  openAddItemModal(entry);
                }}
              >
                <FiPlusCircle /> Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ITEM MASTER MODAL */}
      {quickItemModalOpen && (
        <div className="asr-modal-overlay" onClick={closeQuickItemModal}>
          <div className="asr-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asr-modal-header">
              <div>
                <p className="asr-modal-kicker">Quick Item Master</p>
                <h2>Add New Item</h2>
              </div>
              <button
                type="button"
                className="asr-modal-close"
                onClick={closeQuickItemModal}
                disabled={creatingQuickItem}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleQuickItemSubmit} style={{ padding: "0 20px" }}>
              <div className="asr-quick-item-grid">
                <div className="asr-form-group">
                  <label className="asr-label">Item Name *</label>
                  <input
                    className="asr-input"
                    type="text"
                    value={quickItemForm.item_name}
                    onChange={(e) => handleQuickItemChange("item_name", e.target.value)}
                    placeholder="Example: Putty"
                    disabled={creatingQuickItem}
                    autoFocus
                  />
                </div>
                <div className="asr-form-group">
                  <label className="asr-label">SKU (Optional)</label>
                  <input
                    className="asr-input"
                    type="text"
                    value={quickItemForm.sku}
                    onChange={(e) => handleQuickItemChange("sku", e.target.value)}
                    placeholder="SKU"
                    disabled={creatingQuickItem}
                  />
                </div>
                <div className="asr-form-group">
                  <label className="asr-label">Unit *</label>
                  <select
                    className="asr-input"
                    value={quickItemForm.unit}
                    onChange={(e) => handleQuickItemChange("unit", e.target.value)}
                    disabled={creatingQuickItem}
                  >
                    {unitOptions.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="asr-form-group">
                  <label className="asr-label">Points / Unit *</label>
                  <input
                    className="asr-input"
                    type="number"
                    value={quickItemForm.points}
                    onChange={(e) => handleQuickItemChange("points", e.target.value)}
                    placeholder="Points"
                    min="0"
                    step="0.01"
                    disabled={creatingQuickItem}
                  />
                </div>
              </div>

              <div className="asr-quick-note">
                <FiCheckCircle />
                <span>
                  This item will be saved in Item Master and automatically selected in the first empty reward entry row.
                </span>
              </div>

              <div className="asr-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeQuickItemModal}
                  disabled={creatingQuickItem}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creatingQuickItem}>
                  <FiSave /> {creatingQuickItem ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ITEM TO OLD TRANSACTION MODAL */}
      {addItemEntry && (
        <div className="asr-modal-overlay" onClick={closeAddItemModal}>
          <div className="asr-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asr-modal-header">
              <div>
                <p className="asr-modal-kicker">Add Item To Old Transaction</p>
                <h2>{getEntryCustomer(addItemEntry)}</h2>
              </div>
              <button
                type="button"
                className="asr-modal-close"
                onClick={closeAddItemModal}
                disabled={addingItem}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} style={{ padding: "0 20px" }}>
              <div className="asr-add-modal-grid">
                <div className="asr-form-group">
                  <label className="asr-label">Item *</label>
                  <select
                    className="asr-input"
                    value={addItemForm.loyalty_item_id}
                    onChange={(e) => handleAddItemFormChange("loyalty_item_id", e.target.value)}
                    disabled={addingItem}
                  >
                    <option value="">Select item</option>
                    {sortedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getItemName(item)} - {formatPoints(getItemPoints(item))} pts /{" "}
                        {getUnitLabel(getItemUnit(item))}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="asr-form-group">
                  <label className="asr-label">Unit</label>
                  <div className="asr-readonly-unit">
                    {addItemForm.loyalty_item_id ? getUnitLabel(addItemForm.unit) : "Select item"}
                  </div>
                </div>
                <div className="asr-form-group">
                  <label className="asr-label">Quantity *</label>
                  <input
                    className="asr-input asr-quantity-input"
                    type="text"
                    inputMode="decimal"
                    value={addItemForm.quantity}
                    onChange={(e) =>
                      handleAddItemFormChange("quantity", sanitizeDecimalInput(e.target.value))
                    }
                    placeholder="Quantity"
                    disabled={addingItem}
                  />
                </div>
                <div className="asr-points-box">
                  <p>Points / Unit</p>
                  <h3>
                    {formatPoints(
                      getSelectedItem(addItemForm.loyalty_item_id)
                        ? getItemPoints(getSelectedItem(addItemForm.loyalty_item_id))
                        : 0
                    )}{" "}
                    pts
                  </h3>
                </div>
                <div className="asr-points-box total">
                  <p>Total Points</p>
                  <h3>
                    {formatPoints(
                      roundToTwo(
                        (getSelectedItem(addItemForm.loyalty_item_id)
                          ? getItemPoints(getSelectedItem(addItemForm.loyalty_item_id))
                          : 0) * Number(addItemForm.quantity || 0)
                      )
                    )}{" "}
                    pts
                  </h3>
                </div>
              </div>

              <div className="asr-form-group full">
                <label className="asr-label">Note (Optional)</label>
                <textarea
                  className="asr-textarea"
                  value={addItemForm.note}
                  onChange={(e) => handleAddItemFormChange("note", e.target.value)}
                  placeholder="Enter note..."
                  rows={2}
                  disabled={addingItem}
                />
              </div>

              <div className="asr-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeAddItemModal}
                  disabled={addingItem}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={addingItem}>
                  <FiSave /> {addingItem ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}