import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const RECENT_ENTRY_LIMIT = 20;

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

  if (!detail) {
    return "Something went wrong. Please check backend Reward Entry API.";
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

const normalizeUnit = (unit) => {
  const cleanUnit = String(unit || "").trim().toLowerCase();

  if (!cleanUnit) return "pcs";
  if (cleanUnit === "liter") return "litre";
  if (cleanUnit === "qt") return "quintal";

  return cleanUnit;
};

const getUnitLabel = (unitValue) => {
  const normalized = normalizeUnit(unitValue);
  const foundUnit = unitOptions.find(
    (unit) => normalizeUnit(unit.value) === normalized
  );

  return foundUnit ? foundUnit.label : unitValue || "No / Pcs";
};

const getItemName = (item) => item?.item_name || item?.name || "";

const getItemUnit = (item) =>
  normalizeUnit(
    item?.unit ||
      item?.quantity_unit ||
      item?.uom ||
      item?.default_unit ||
      "pcs"
  );

const getItemPoints = (item) =>
  Number(
    item?.per_point_amount ??
      item?.points ??
      item?.points_value ??
      item?.points_required ??
      0
  );

const getCustomerName = (customer) =>
  customer?.name || customer?.customer_name || customer?.full_name || "-";

const getCustomerPhone = (customer) =>
  customer?.phone_number || customer?.phone || customer?.mobile || "-";

const getEntryCustomer = (entry) =>
  entry?.customer_name || entry?.customer_id || "-";

const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN");
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const getEntryItems = (entry) => {
  if (Array.isArray(entry?.items)) return entry.items;
  return [];
};

const getEntryId = (entry) =>
  entry?.reward_entry_id || entry?.transaction_group_id || entry?.id;

const getEntryTotalItems = (entry) =>
  Number(entry?.item_count || getEntryItems(entry).length || 0);

const getEntryTotalPoints = (entry) =>
  Number(entry?.total_points ?? entry?.points ?? 0);

const getItemPreviewNames = (entry) => {
  const items = getEntryItems(entry);

  if (!items.length) return [];

  return items.map((item) => item?.item_name || item?.loyalty_item_id || "-");
};

const getItemDetailLine = (item) => {
  const itemName = item?.item_name || item?.loyalty_item_id || "-";
  const quantity = item?.quantity ?? "-";
  const unit = getUnitLabel(item?.unit);
  const pointsPerUnit = formatPoints(item?.points_per_unit || 0);
  const totalPoints = formatPoints(item?.total_points || 0);

  return `${itemName} • ${quantity} ${unit} × ${pointsPerUnit} = ${totalPoints} pts`;
};

export default function RewardEntry({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [entries, setEntries] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [itemRows, setItemRows] = useState([{ ...emptyItemRow }]);
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

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const selectedCustomer = useMemo(() => {
    return customers.find(
      (customer) => Number(customer.id) === Number(customerId)
    );
  }, [customers, customerId]);

  const getSelectedItem = (itemId) => {
    return items.find((item) => Number(item.id) === Number(itemId));
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) =>
      getItemName(a).localeCompare(getItemName(b), "en", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }, [items]);

  const calculatedRows = useMemo(() => {
    return itemRows.map((row) => {
      const selectedItem = getSelectedItem(row.loyalty_item_id);
      const pointsPerUnit = selectedItem ? getItemPoints(selectedItem) : 0;
      const itemUnit = selectedItem ? getItemUnit(selectedItem) : "";
      const finalUnit = row.unit || itemUnit;
      const quantity = row.quantity === "" ? 0 : Number(row.quantity || 0);

      const totalPoints =
        pointsPerUnit > 0 && quantity > 0
          ? roundToTwo(pointsPerUnit * quantity)
          : 0;

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
    return roundToTwo(
      calculatedRows.reduce(
        (sum, row) => sum + Number(row.total_points || 0),
        0
      )
    );
  }, [calculatedRows]);

  const selectedAddItem = useMemo(() => {
    return getSelectedItem(addItemForm.loyalty_item_id);
  }, [addItemForm.loyalty_item_id, items]);

  const addItemCalculated = useMemo(() => {
    const pointsPerUnit = selectedAddItem ? getItemPoints(selectedAddItem) : 0;
    const itemUnit = selectedAddItem ? getItemUnit(selectedAddItem) : "";
    const finalUnit = addItemForm.unit || itemUnit;
    const quantity =
      addItemForm.quantity === "" ? 0 : Number(addItemForm.quantity || 0);

    const totalPoints =
      pointsPerUnit > 0 && quantity > 0
        ? roundToTwo(pointsPerUnit * quantity)
        : 0;

    return {
      unit: finalUnit,
      unit_label: finalUnit ? getUnitLabel(finalUnit) : "-",
      points_per_unit: pointsPerUnit,
      quantity_number: quantity,
      total_points: totalPoints,
    };
  }, [addItemForm, selectedAddItem]);

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
          : customersRes.value.data?.customers ||
            customersRes.value.data?.data ||
            [];

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
      } else {
        console.warn("Grouped reward entries API not ready yet.");
      }
    } catch (error) {
      console.error("Reward Entry load error:", error);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleItemRowChange = (index, field, value) => {
    setItemRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        if (field === "loyalty_item_id") {
          const selectedItem = getSelectedItem(value);

          return {
            ...row,
            loyalty_item_id: value,
            unit: selectedItem ? getItemUnit(selectedItem) : "",
            quantity: row.quantity,
          };
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  };

  const addItemRow = () => {
    setItemRows((prev) => [...prev, { ...emptyItemRow }]);
  };

  const removeItemRow = (index) => {
    setItemRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const resetForm = () => {
    setCustomerId("");
    setEntryDate("");
    setItemRows([{ ...emptyItemRow }]);
    setNote("");
  };

  const validateForm = () => {
    if (!customerId) {
      showToast("Please select customer.", "error");
      return false;
    }

    for (let index = 0; index < calculatedRows.length; index++) {
      const row = calculatedRows[index];

      if (!row.loyalty_item_id) {
        showToast(`Please select item in row ${index + 1}.`, "error");
        return false;
      }

      if (!row.unit) {
        showToast(
          `Unit not found for selected item in row ${index + 1}. Please edit item in Item Master and save unit.`,
          "error"
        );
        return false;
      }

      if (!row.quantity || Number(row.quantity) <= 0) {
        showToast(
          `Quantity must be greater than 0 in row ${index + 1}.`,
          "error"
        );
        return false;
      }
    }

    if (grandTotalPoints <= 0) {
      showToast("Grand total points must be greater than 0.", "error");
      return false;
    }

    return true;
  };

  const openQuickItemModal = () => {
    setQuickItemForm({ ...emptyQuickItemForm });
    setQuickItemModalOpen(true);
  };

  const closeQuickItemModal = () => {
    if (creatingQuickItem) return;

    setQuickItemModalOpen(false);
    setQuickItemForm({ ...emptyQuickItemForm });
  };

  const handleQuickItemChange = (field, value) => {
    setQuickItemForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getResponseItem = (data) => {
    if (!data) return null;

    if (data.id) return data;
    if (data.item?.id) return data.item;
    if (data.data?.id) return data.data;
    if (data.loyalty_item?.id) return data.loyalty_item;

    return null;
  };

  const selectNewItemInForm = (newItem) => {
    if (!newItem?.id) return;

    const newUnit = getItemUnit(newItem);

    setItemRows((prev) => {
      const emptyRowIndex = prev.findIndex((row) => !row.loyalty_item_id);

      if (emptyRowIndex === -1) {
        return [
          ...prev,
          {
            loyalty_item_id: String(newItem.id),
            unit: newUnit,
            quantity: "",
          },
        ];
      }

      return prev.map((row, index) => {
        if (index !== emptyRowIndex) return row;

        return {
          ...row,
          loyalty_item_id: String(newItem.id),
          unit: newUnit,
        };
      });
    });
  };

  const handleQuickItemSubmit = async (e) => {
    e.preventDefault();

    const itemName = quickItemForm.item_name.trim();
    const sku = quickItemForm.sku.trim();
    const unit = normalizeUnit(quickItemForm.unit || "pcs");
    const points = Number(quickItemForm.points || 0);

    if (!itemName) {
      showToast("Please enter item name.", "error");
      return;
    }

    if (!unit) {
      showToast("Please select unit.", "error");
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
        (responseItem?.id &&
          latestItems.find((item) => Number(item.id) === Number(responseItem.id))) ||
        latestItems.find((item) => {
          const sameName =
            String(item?.item_name || item?.name || "").trim().toLowerCase() ===
            itemName.toLowerCase();

          const sameSku = sku
            ? String(item?.sku || "").trim().toLowerCase() === sku.toLowerCase()
            : true;

          const sameUnit = normalizeUnit(getItemUnit(item)) === unit;
          const samePoints = Number(getItemPoints(item)) === points;

          return sameName && sameSku && sameUnit && samePoints;
        }) ||
        latestItems[latestItems.length - 1];

      if (createdItem?.id) {
        selectNewItemInForm(createdItem);
      }

      showToast("Item added to Item Master successfully.", "success");
      closeQuickItemModal();
    } catch (error) {
      console.error("Quick item create error:", error);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setCreatingQuickItem(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const rewardItems = calculatedRows.map((row) => ({
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
      console.error("Reward Entry save error:", error);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setSaving(false);
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

        return {
          ...prev,
          loyalty_item_id: value,
          unit: selectedItem ? getItemUnit(selectedItem) : "",
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const validateAddItemForm = () => {
    if (!addItemEntry) {
      showToast("Please select a reward transaction.", "error");
      return false;
    }

    if (!addItemForm.loyalty_item_id) {
      showToast("Please select item to add.", "error");
      return false;
    }

    if (!addItemCalculated.unit) {
      showToast("Unit not found for selected item.", "error");
      return false;
    }

    if (!addItemForm.quantity || Number(addItemForm.quantity) <= 0) {
      showToast("Quantity must be greater than 0.", "error");
      return false;
    }

    if (addItemCalculated.total_points <= 0) {
      showToast("Total points must be greater than 0.", "error");
      return false;
    }

    return true;
  };

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();

    if (!validateAddItemForm()) return;

    const rewardEntryId = getEntryId(addItemEntry);

    if (!rewardEntryId) {
      showToast("Reward entry id not found.", "error");
      return;
    }

    const payload = {
      loyalty_item_id: Number(addItemForm.loyalty_item_id),
      unit: addItemCalculated.unit || "pcs",
      quantity: Number(addItemCalculated.quantity_number),
      points_per_unit: Number(addItemCalculated.points_per_unit),
      total_points: roundToTwo(addItemCalculated.total_points),
      note: addItemForm.note.trim() || null,
    };

    try {
      setAddingItem(true);

      await api.post(`/reward-entries/${rewardEntryId}/items`, payload);

      showToast("Item added to existing transaction.", "success");

      closeAddItemModal();
      fetchData();
    } catch (error) {
      console.error("Add item to reward entry error:", error);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setAddingItem(false);
    }
  };

  return (
    <>
      <style>{rewardEntryCss}</style>

      <div className="asr-reward-page">
        {toast && (
          <div
            className={`asr-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
            {toast.message}
          </div>
        )}

        {selectedDetailEntry && (
          <div
            className="asr-modal-overlay"
            onClick={() => setSelectedDetailEntry(null)}
          >
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
                  ×
                </button>
              </div>

              <div className="asr-details-summary-grid">
                <div>
                  <span>Date / Time</span>
                  <strong>{formatDateTime(selectedDetailEntry.created_at)}</strong>
                </div>

                <div>
                  <span>Total Items</span>
                  <strong>{getEntryTotalItems(selectedDetailEntry)}</strong>
                </div>

                <div>
                  <span>Total Points</span>
                  <strong>
                    {formatPoints(getEntryTotalPoints(selectedDetailEntry))} pts
                  </strong>
                </div>

                <div>
                  <span>Transaction ID</span>
                  <strong>#{getEntryId(selectedDetailEntry)}</strong>
                </div>
              </div>

              {selectedDetailEntry.note && (
                <div className="asr-detail-note">
                  <span>Note</span>
                  <strong>{selectedDetailEntry.note}</strong>
                </div>
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
                  className="asr-cancel-btn"
                  onClick={() => setSelectedDetailEntry(null)}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="asr-primary-btn"
                  onClick={() => {
                    const entry = selectedDetailEntry;
                    setSelectedDetailEntry(null);
                    openAddItemModal(entry);
                  }}
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>
        )}

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
                  ×
                </button>
              </div>

              <form onSubmit={handleQuickItemSubmit}>
                <div className="asr-quick-item-grid">
                  <div className="asr-form-group">
                    <label className="asr-label">Item Name *</label>

                    <input
                      className="asr-input"
                      type="text"
                      value={quickItemForm.item_name}
                      onChange={(e) =>
                        handleQuickItemChange("item_name", e.target.value)
                      }
                      placeholder="Example: Putty, Tarpin"
                      disabled={creatingQuickItem}
                      autoFocus
                    />
                  </div>

                  <div className="asr-form-group">
                    <label className="asr-label">SKU Optional</label>

                    <input
                      className="asr-input"
                      type="text"
                      value={quickItemForm.sku}
                      onChange={(e) =>
                        handleQuickItemChange("sku", e.target.value)
                      }
                      placeholder="Optional SKU"
                      disabled={creatingQuickItem}
                    />
                  </div>

                  <div className="asr-form-group">
                    <label className="asr-label">Unit *</label>

                    <select
                      className="asr-input"
                      value={quickItemForm.unit}
                      onChange={(e) =>
                        handleQuickItemChange("unit", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleQuickItemChange("points", e.target.value)
                      }
                      placeholder="Enter points"
                      min="0"
                      step="0.01"
                      disabled={creatingQuickItem}
                    />
                  </div>
                </div>

                <div className="asr-quick-note">
                  This item will be saved in Item Master and automatically
                  selected in the first empty reward entry row.
                </div>

                <div className="asr-modal-actions">
                  <button
                    type="button"
                    className="asr-cancel-btn"
                    onClick={closeQuickItemModal}
                    disabled={creatingQuickItem}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="asr-primary-btn"
                    disabled={creatingQuickItem}
                  >
                    {creatingQuickItem ? "Saving..." : "Save Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                  ×
                </button>
              </div>

              <form onSubmit={handleAddItemSubmit}>
                <div className="asr-add-modal-grid">
                  <div className="asr-form-group">
                    <label className="asr-label">Item *</label>

                    <select
                      className="asr-input"
                      value={addItemForm.loyalty_item_id}
                      onChange={(e) =>
                        handleAddItemFormChange(
                          "loyalty_item_id",
                          e.target.value
                        )
                      }
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
                      {addItemForm.loyalty_item_id
                        ? addItemCalculated.unit_label
                        : "Select item"}
                    </div>
                  </div>

                  <div className="asr-form-group">
                    <label className="asr-label">Quantity *</label>

                    <input
                      className="asr-input"
                      type="number"
                      value={addItemForm.quantity}
                      onChange={(e) =>
                        handleAddItemFormChange("quantity", e.target.value)
                      }
                      placeholder="Enter quantity"
                      min="0"
                      step="0.01"
                      disabled={addingItem}
                    />
                  </div>

                  <div className="asr-points-box">
                    <p className="asr-summary-label">Points / Unit</p>
                    <h3 className="asr-summary-value">
                      {formatPoints(addItemCalculated.points_per_unit)} pts
                    </h3>
                  </div>

                  <div className="asr-points-box">
                    <p className="asr-summary-label">Total Points</p>
                    <h3 className="asr-row-total-points">
                      {formatPoints(addItemCalculated.total_points)} pts
                    </h3>
                  </div>
                </div>

                <div className="asr-form-group full">
                  <label className="asr-label">Note Optional</label>

                  <textarea
                    className="asr-textarea"
                    value={addItemForm.note}
                    onChange={(e) =>
                      handleAddItemFormChange("note", e.target.value)
                    }
                    placeholder="Enter note if needed"
                    rows="3"
                    disabled={addingItem}
                  />
                </div>

                <div className="asr-modal-actions">
                  <button
                    type="button"
                    className="asr-cancel-btn"
                    onClick={closeAddItemModal}
                    disabled={addingItem}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="asr-primary-btn"
                    disabled={addingItem}
                  >
                    {addingItem ? "Adding..." : "Add Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="asr-page-header">
          <div className="asr-header-left">
            {onBack && (
              <button type="button" className="asr-back-btn" onClick={onBack}>
                ← Back
              </button>
            )}

            <div>
              <h1 className="asr-title">Reward Entry</h1>
              <p className="asr-subtitle">
                Select customer, select item, enter quantity, and reward points
                will auto-calculate.
              </p>
            </div>
          </div>
        </div>

        <div className="asr-form-card">
          <div className="asr-form-header">
            <h2 className="asr-form-title">Create Reward Entry</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="asr-customer-block">
              <div className="asr-form-group">
                <label className="asr-label">Customer *</label>

                <select
                  className="asr-input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={saving || loading}
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {getCustomerName(customer)} - {getCustomerPhone(customer)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="asr-info-box">
                <p className="asr-summary-label">Selected Customer</p>

                <h3 className="asr-summary-value">
                  {selectedCustomer
                    ? `${getCustomerName(selectedCustomer)} (${getCustomerPhone(
                        selectedCustomer
                      )})`
                    : "-"}
                </h3>
              </div>
            </div>

            <div className="asr-date-block">
              <div className="asr-form-group">
                <label className="asr-label">Entry Date Optional</label>

                <input
                  className="asr-input"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="asr-info-box">
                <p className="asr-summary-label">Entry Date</p>
                <h3 className="asr-summary-value">
                  {entryDate
                    ? new Date(`${entryDate}T12:00:00`).toLocaleDateString(
                        "en-IN"
                      )
                    : "Today / Auto"}
                </h3>
              </div>
            </div>

            <div className="asr-items-section">
              <div className="asr-items-header">
                <h3 className="asr-items-title">Items</h3>

                <div className="asr-items-header-actions">
                  <button
                    type="button"
                    className="asr-quick-item-btn"
                    onClick={openQuickItemModal}
                    disabled={saving || loading}
                  >
                    + Add Item Master
                  </button>

                  <button
                    type="button"
                    className="asr-add-row-btn"
                    onClick={addItemRow}
                    disabled={saving}
                  >
                    + Add Another Item
                  </button>
                </div>
              </div>

              {calculatedRows.map((row, index) => (
                <div key={index} className="asr-item-row-card">
                  <div className="asr-row-number">{index + 1}</div>

                  <div className="asr-item-grid">
                    <div className="asr-form-group">
                      <label className="asr-label">Item *</label>

                      <select
                        className="asr-input"
                        value={row.loyalty_item_id}
                        onChange={(e) =>
                          handleItemRowChange(
                            index,
                            "loyalty_item_id",
                            e.target.value
                          )
                        }
                        disabled={saving || loading}
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
                        {row.loyalty_item_id ? row.unit_label : "Select item"}
                      </div>
                    </div>

                    <div className="asr-form-group">
                      <label className="asr-label">Quantity *</label>

                      <input
                        className="asr-input"
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          handleItemRowChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        placeholder="Enter quantity"
                        min="0"
                        step="0.01"
                        disabled={saving}
                      />
                    </div>

                    <div className="asr-points-box">
                      <p className="asr-summary-label">Points / Unit</p>
                      <h3 className="asr-summary-value">
                        {formatPoints(row.points_per_unit)} pts
                      </h3>
                    </div>

                    <div className="asr-points-box">
                      <p className="asr-summary-label">Total Points</p>
                      <h3 className="asr-row-total-points">
                        {formatPoints(row.total_points)} pts
                      </h3>
                    </div>

                    <div className="asr-remove-box">
                      <button
                        type="button"
                        className="asr-remove-btn"
                        onClick={() => removeItemRow(index)}
                        disabled={saving || itemRows.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="asr-form-group full">
              <label className="asr-label">Note Optional</label>

              <textarea
                className="asr-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter note if needed"
                rows="3"
                disabled={saving}
              />
            </div>

            <div className="asr-grand-summary">
              <div>
                <p className="asr-summary-label">Total Items</p>
                <h3 className="asr-summary-value">{itemRows.length}</h3>
              </div>

              <div>
                <p className="asr-summary-label">Customer</p>
                <h3 className="asr-summary-value">
                  {selectedCustomer ? getCustomerName(selectedCustomer) : "-"}
                </h3>
              </div>

              <div>
                <p className="asr-summary-label">Grand Total Points</p>
                <h3 className="asr-grand-total">{formatPoints(grandTotalPoints)} pts</h3>
              </div>
            </div>

            <div className="asr-form-actions">
              <button
                type="button"
                className="asr-cancel-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Clear
              </button>

              <button
                type="submit"
                className="asr-primary-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Submit Reward Entry"}
              </button>
            </div>
          </form>
        </div>

        <div className="asr-table-card">
          <div className="asr-table-header">
            <div>
              <h2 className="asr-table-title">Recent Reward Entries</h2>
              <p className="asr-table-subtitle">
                Showing last {RECENT_ENTRY_LIMIT} transactions. Click any tile to
                view full details.
              </p>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="asr-mobile-empty">No reward entries found.</div>
          ) : (
            <div className="asr-entry-tiles-grid">
              {entries.map((entry) => {
                const itemNames = getItemPreviewNames(entry);
                const hiddenCount = Math.max(itemNames.length - 4, 0);

                return (
                  <button
                    type="button"
                    key={getEntryId(entry)}
                    className="asr-entry-tile"
                    onClick={() => setSelectedDetailEntry(entry)}
                    title="Click to view complete details"
                  >
                    <div className="asr-entry-tile-top">
                      <div>
                        <p className="asr-entry-date">{formatDate(entry.created_at)}</p>
                        <h3 className="asr-entry-customer">{getEntryCustomer(entry)}</h3>
                      </div>

                      <span className="asr-entry-points">
                        {formatPoints(getEntryTotalPoints(entry))} pts
                      </span>
                    </div>

                    <div className="asr-entry-item-chips">
                      {itemNames.slice(0, 4).map((name, index) => (
                        <span key={`${name}-${index}`} className="asr-item-name-chip">
                          {name}
                        </span>
                      ))}

                      {hiddenCount > 0 && (
                        <span className="asr-item-name-chip more">
                          +{hiddenCount} more
                        </span>
                      )}
                    </div>

                    <div className="asr-entry-tile-bottom">
                      <span>{getEntryTotalItems(entry)} item{getEntryTotalItems(entry) === 1 ? "" : "s"}</span>

                      <div className="asr-entry-actions">
                        <span className="asr-view-link">View</span>

                        <span
                          role="button"
                          tabIndex={0}
                          className="asr-add-item-link"
                          onClick={(e) => openAddItemModal(entry, e)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              openAddItemModal(entry, e);
                            }
                          }}
                        >
                          + Add Item
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const rewardEntryCss = `
  .asr-reward-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #111827;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .asr-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 14px 22px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 800;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.22);
    max-width: min(420px, calc(100vw - 28px));
    min-width: min(280px, calc(100vw - 28px));
    text-align: center;
    white-space: pre-line;
  }

  .asr-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .asr-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .asr-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }

  .asr-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .asr-title {
    margin: 0;
    font-size: 28px;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.03em;
  }

  .asr-subtitle,
  .asr-table-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.5;
  }

  .asr-back-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    padding: 10px 16px;
    border-radius: 10px;
    font-weight: 800;
    cursor: pointer;
    min-height: 40px;
  }

  .asr-form-card,
  .asr-table-card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    max-width: 100%;
  }

  .asr-form-card {
    padding: 22px;
    margin-bottom: 24px;
  }

  .asr-form-header {
    margin-bottom: 18px;
  }

  .asr-form-title {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    color: #111827;
  }

  .asr-customer-block,
  .asr-date-block {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 16px;
    margin-bottom: 22px;
  }

  .asr-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .asr-form-group.full {
    margin-top: 18px;
  }

  .asr-label {
    font-size: 14px;
    font-weight: 800;
    color: #334155;
  }

  .asr-input,
  .asr-textarea {
    width: 100%;
    max-width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 12px 13px;
    font-size: 14px;
    outline: none;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
  }

  .asr-textarea {
    resize: vertical;
    font-family: inherit;
  }

  .asr-readonly-unit {
    width: 100%;
    min-height: 43px;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 12px 13px;
    font-size: 14px;
    background: #f8fafc;
    color: #111827;
    box-sizing: border-box;
    font-weight: 900;
    display: flex;
    align-items: center;
  }

  .asr-info-box,
  .asr-points-box,
  .asr-grand-summary {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
  }

  .asr-info-box {
    border-radius: 12px;
    padding: 14px;
    min-width: 0;
  }

  .asr-summary-label {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 800;
  }

  .asr-summary-value {
    margin: 6px 0 0;
    font-size: 15px;
    color: #111827;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asr-items-section {
    margin-top: 8px;
  }

  .asr-items-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .asr-items-header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asr-items-title {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: #111827;
  }

  .asr-add-row-btn,
  .asr-quick-item-btn {
    border: none;
    padding: 9px 14px;
    border-radius: 9px;
    font-weight: 800;
    cursor: pointer;
    min-height: 40px;
  }

  .asr-add-row-btn {
    background: #2563eb;
    color: #ffffff;
  }

  .asr-quick-item-btn {
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
  }

  .asr-item-row-card {
    position: relative;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 14px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  }

  .asr-row-number {
    position: absolute;
    top: -10px;
    left: 16px;
    background: #2563eb;
    color: #ffffff;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 900;
  }

  .asr-item-grid {
    display: grid;
    grid-template-columns: minmax(180px, 2fr) minmax(110px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(130px, 1fr) auto;
    gap: 14px;
    align-items: end;
  }

  .asr-points-box {
    border-radius: 10px;
    padding: 10px;
    min-height: 46px;
    min-width: 0;
  }

  .asr-row-total-points {
    margin: 6px 0 0;
    font-size: 16px;
    color: #2563eb;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asr-remove-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .asr-remove-btn {
    border: none;
    background: #fee2e2;
    color: #b91c1c;
    padding: 10px 12px;
    border-radius: 9px;
    font-weight: 900;
    cursor: pointer;
    min-height: 42px;
  }

  .asr-remove-btn:disabled,
  .asr-primary-btn:disabled,
  .asr-cancel-btn:disabled,
  .asr-add-row-btn:disabled,
  .asr-quick-item-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .asr-grand-summary {
    margin-top: 20px;
    border-radius: 14px;
    padding: 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .asr-grand-total {
    margin: 6px 0 0;
    font-size: 24px;
    color: #2563eb;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asr-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
  }

  .asr-primary-btn,
  .asr-cancel-btn {
    padding: 10px 18px;
    border-radius: 9px;
    font-weight: 800;
    cursor: pointer;
    min-height: 42px;
  }

  .asr-primary-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.22);
  }

  .asr-cancel-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
  }

  .asr-table-card {
    overflow: hidden;
  }

  .asr-table-header {
    padding: 18px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .asr-table-title {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: #111827;
  }

  .asr-entry-tiles-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    padding: 16px;
    background: #f8fafc;
  }

  .asr-entry-tile {
    border: 1px solid #e5e7eb;
    background: #ffffff;
    border-radius: 16px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    min-width: 0;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  }

  .asr-entry-tile:hover {
    transform: translateY(-2px);
    border-color: #bfdbfe;
    box-shadow: 0 12px 26px rgba(37, 99, 235, 0.11);
  }

  .asr-entry-tile-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .asr-entry-date {
    margin: 0 0 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
  }

  .asr-entry-customer {
    margin: 0;
    font-size: 17px;
    color: #111827;
    font-weight: 900;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asr-entry-points {
    background: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .asr-entry-item-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    min-height: 31px;
    margin-bottom: 14px;
  }

  .asr-item-name-chip {
    max-width: 112px;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #334155;
    padding: 6px 9px;
    font-size: 12px;
    font-weight: 900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asr-item-name-chip.more {
    color: #2563eb;
    background: #eff6ff;
    border-color: #dbeafe;
  }

  .asr-entry-tile-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asr-entry-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .asr-view-link,
  .asr-add-item-link {
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
  }

  .asr-view-link {
    color: #4338ca;
    background: #eef2ff;
  }

  .asr-add-item-link {
    color: #2563eb;
    background: #eff6ff;
  }

  .asr-add-item-link:hover {
    background: #dbeafe;
  }

  .asr-mobile-empty {
    padding: 24px;
    text-align: center;
    color: #64748b;
    font-weight: 800;
  }

  .asr-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, 0.48);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  .asr-details-modal,
  .asr-add-modal {
    width: min(760px, 100%);
    max-height: min(88vh, 820px);
    overflow-y: auto;
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 28px 80px rgba(15, 23, 42, 0.32);
    padding: 20px;
  }

  .asr-add-modal {
    width: min(860px, 100%);
  }

  .asr-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
  }

  .asr-modal-kicker {
    margin: 0 0 4px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .asr-modal-header h2 {
    margin: 0;
    color: #111827;
    font-size: 22px;
    font-weight: 900;
  }

  .asr-modal-close {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: #f1f5f9;
    color: #0f172a;
    cursor: pointer;
    font-size: 24px;
    line-height: 1;
    font-weight: 800;
  }

  .asr-details-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 14px;
  }

  .asr-details-summary-grid div,
  .asr-detail-note {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 12px;
    min-width: 0;
  }

  .asr-details-summary-grid span,
  .asr-detail-note span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 5px;
  }

  .asr-details-summary-grid strong,
  .asr-detail-note strong {
    display: block;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asr-detail-items-section {
    margin-top: 18px;
  }

  .asr-detail-items-section h3 {
    margin: 0 0 12px;
    font-size: 17px;
    font-weight: 900;
    color: #111827;
  }

  .asr-detail-items-list {
    display: grid;
    gap: 10px;
  }

  .asr-detail-item-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    border-radius: 14px;
    padding: 13px;
  }

  .asr-detail-item-card h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 900;
    color: #111827;
  }

  .asr-detail-item-card p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }

  .asr-detail-item-card strong {
    color: #2563eb;
    font-size: 15px;
    font-weight: 900;
    white-space: nowrap;
  }

  .asr-empty-detail {
    border: 1px dashed #cbd5e1;
    border-radius: 14px;
    padding: 18px;
    text-align: center;
    color: #64748b;
    font-weight: 900;
  }

  .asr-quick-item-grid {
    display: grid;
    grid-template-columns: minmax(180px, 1.5fr) minmax(140px, 1fr) minmax(130px, 1fr) minmax(130px, 1fr);
    gap: 14px;
    align-items: end;
  }

  .asr-quick-note {
    margin-top: 14px;
    padding: 12px;
    border-radius: 12px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.45;
  }

  .asr-add-modal-grid {
    display: grid;
    grid-template-columns: minmax(180px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(130px, 1fr) minmax(130px, 1fr);
    gap: 14px;
    align-items: end;
  }

  .asr-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 18px;
  }

  @media (max-width: 1500px) {
    .asr-entry-tiles-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 1250px) {
    .asr-entry-tiles-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 1300px) {
    .asr-item-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .asr-remove-box {
      justify-content: flex-start;
    }

    .asr-add-modal-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1024px) {
    .asr-reward-page {
      padding: 18px;
    }

    .asr-customer-block,
    .asr-date-block {
      grid-template-columns: 1fr;
    }

    .asr-grand-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asr-entry-tiles-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asr-details-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .asr-reward-page {
      padding: 12px;
    }

    .asr-toast {
      top: 70px;
    }

    .asr-header-left {
      width: 100%;
      align-items: flex-start;
      flex-direction: column;
    }

    .asr-back-btn {
      width: 100%;
    }

    .asr-title {
      font-size: 24px;
    }

    .asr-subtitle {
      font-size: 14px;
    }

    .asr-form-card {
      padding: 16px;
      border-radius: 14px;
    }

    .asr-items-header {
      align-items: stretch;
      flex-direction: column;
    }

    .asr-items-header-actions {
      width: 100%;
      flex-direction: column;
    }

    .asr-add-row-btn,
    .asr-quick-item-btn {
      width: 100%;
    }

    .asr-item-row-card {
      padding: 18px 14px 14px;
    }

    .asr-item-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asr-remove-box {
      justify-content: stretch;
    }

    .asr-remove-btn {
      width: 100%;
    }

    .asr-grand-summary {
      grid-template-columns: 1fr;
      padding: 14px;
    }

    .asr-form-actions,
    .asr-modal-actions {
      flex-direction: column;
    }

    .asr-primary-btn,
    .asr-cancel-btn {
      width: 100%;
    }

    .asr-table-header {
      flex-direction: column;
    }

    .asr-entry-tiles-grid {
      grid-template-columns: 1fr;
      padding: 12px;
    }

    .asr-details-summary-grid,
    .asr-add-modal-grid,
    .asr-quick-item-grid {
      grid-template-columns: 1fr;
    }

    .asr-detail-item-card {
      align-items: flex-start;
      flex-direction: column;
    }

    .asr-detail-item-card strong {
      white-space: normal;
    }
  }

  @media (max-width: 420px) {
    .asr-reward-page {
      padding: 10px;
    }

    .asr-form-card {
      padding: 14px;
    }

    .asr-title {
      font-size: 22px;
    }

    .asr-entry-tile-top,
    .asr-entry-tile-bottom {
      flex-direction: column;
      align-items: flex-start;
    }

    .asr-entry-actions {
      width: 100%;
      justify-content: space-between;
    }

    .asr-view-link,
    .asr-add-item-link {
      width: 100%;
      text-align: center;
    }
  }
`;
