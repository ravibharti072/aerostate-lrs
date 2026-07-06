import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBox,
  FiPlusCircle,
  FiSearch,
  FiPackage,
  FiHash,
  FiAward,
  FiList,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiFilter,
} from "react-icons/fi";
import api from "../api/axios";

const unitOptions = [
  { value: "pcs", label: "No / Pcs" },
  { value: "kg", label: "Kg" },
  { value: "gram", label: "Gram" },
  { value: "litre", label: "Litre" },
  { value: "ml", label: "ML" },
  { value: "quintal", label: "Quintal / Qt" },
  { value: "ton", label: "Ton" },
  { value: "packet", label: "Packet" },
  { value: "box", label: "Box" },
];

const emptyForm = {
  name: "",
  sku: "",
  unit: "pcs",
  points: "",
};

const getApiErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;

  if (!detail) {
    return "Something went wrong. Please check backend API.";
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

const getItemName = (item) => item?.item_name || item?.name || "";

const getItemPoints = (item) =>
  Number(
    item?.per_point_amount ??
      item?.points ??
      item?.points_value ??
      item?.points_required ??
      0
  );

const getItemUnit = (item) =>
  item?.unit ||
  item?.quantity_unit ||
  item?.uom ||
  item?.default_unit ||
  "pcs";

const getUnitLabel = (value) => {
  const unit = unitOptions.find((option) => option.value === value);
  return unit ? unit.label : value || "No / Pcs";
};

const formatPoints = (value) => {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return "0";

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(2).replace(/\.?0+$/, "");
};

const sanitizeDecimalInput = (value) => {
  const cleanValue = String(value || "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  const parts = cleanValue.split(".");

  if (parts.length <= 1) {
    return parts[0];
  }

  return `${parts[0]}.${parts.slice(1).join("")}`;
};

export default function ItemMaster({ onBack }) {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const currentUser = useMemo(() => {
    try {
      const savedUser =
        localStorage.getItem("aerostate_loyalty_user") ||
        localStorage.getItem("user");

      if (!savedUser) return null;

      const parsed = JSON.parse(savedUser);

      if (typeof parsed === "string") return null;

      return parsed;
    } catch {
      return null;
    }
  }, []);

  const storeId =
    currentUser?.store_id ||
    currentUser?.shop_id ||
    currentUser?.store?.id ||
    currentUser?.client_id ||
    null;

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.location.href = "/dashboard";
  };

  const fetchItems = async () => {
    try {
      setLoading(true);

      const response = await api.get("/loyalty/items");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || response.data?.data || [];

      setItems(data);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    let list = items.filter((item) => {
      const name = String(getItemName(item)).toLowerCase();
      const sku = String(item?.sku || "").toLowerCase();
      const points = String(getItemPoints(item)).toLowerCase();
      const unit = String(getUnitLabel(getItemUnit(item))).toLowerCase();

      if (!search) return true;

      return (
        name.includes(search) ||
        sku.includes(search) ||
        points.includes(search) ||
        unit.includes(search)
      );
    });

    if (unitFilter !== "all") {
      list = list.filter((item) => getItemUnit(item) === unitFilter);
    }

    list.sort((a, b) => {
      const aName = String(getItemName(a) || "");
      const bName = String(getItemName(b) || "");
      const aPoints = Number(getItemPoints(a) || 0);
      const bPoints = Number(getItemPoints(b) || 0);
      const aUnit = String(getUnitLabel(getItemUnit(a)) || "");
      const bUnit = String(getUnitLabel(getItemUnit(b)) || "");

      if (sortBy === "name_desc") {
        return bName.localeCompare(aName, "en", { sensitivity: "base" });
      }

      if (sortBy === "points_high") {
        return bPoints - aPoints;
      }

      if (sortBy === "points_low") {
        return aPoints - bPoints;
      }

      if (sortBy === "unit_asc") {
        return aUnit.localeCompare(bUnit, "en", { sensitivity: "base" });
      }

      if (sortBy === "newest") {
        return Number(b?.id || 0) - Number(a?.id || 0);
      }

      return aName.localeCompare(bName, "en", { sensitivity: "base" });
    });

    return list;
  }, [items, searchText, unitFilter, sortBy]);

  const usedUnits = useMemo(() => {
    const units = new Set();

    items.forEach((item) => {
      units.add(getItemUnit(item));
    });

    return Array.from(units).sort((a, b) =>
      getUnitLabel(a).localeCompare(getUnitLabel(b), "en", {
        sensitivity: "base",
      })
    );
  }, [items]);

  const summary = useMemo(() => {
    const units = new Set(
      items.map((item) => String(getItemUnit(item) || "pcs").toLowerCase())
    );

    const totalPoints = items.reduce((sum, item) => {
      return sum + Number(getItemPoints(item) || 0);
    }, 0);

    const itemsWithSku = items.filter((item) => item?.sku).length;

    return {
      totalItems: items.length,
      totalUnits: units.size,
      totalPoints,
      itemsWithSku,
    };
  }, [items]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? sanitizeDecimalInput(value) : value,
    }));
  };

  const clearFilters = () => {
    setSearchText("");
    setUnitFilter("all");
    setSortBy("name_asc");
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);

    setFormData({
      name: getItemName(item),
      sku: item?.sku || "",
      unit: getItemUnit(item),
      points: String(getItemPoints(item) || ""),
    });

    setShowModal(true);
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;

    setEditingItem(null);
    setFormData(emptyForm);
    setShowModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      showToast("Item name is required.", "error");
      return;
    }

    if (!formData.unit) {
      showToast("Unit is required.", "error");
      return;
    }

    if (formData.points === "" || Number(formData.points) <= 0) {
      showToast("Points must be greater than 0.", "error");
      return;
    }

    const pointsValue = Number(formData.points);
    const unitValue = formData.unit;

    const payload = {
      item_name: formData.name.trim(),
      sku: formData.sku.trim() || null,

      category: "item",
      per_point_amount: pointsValue,

      name: formData.name.trim(),
      points: pointsValue,
      points_value: pointsValue,
      points_required: pointsValue,

      unit: unitValue,
      quantity_unit: unitValue,
      uom: unitValue,
      default_unit: unitValue,
    };

    if (storeId) {
      payload.store_id = Number(storeId);
    }

    try {
      setSaving(true);

      if (editingItem) {
        await api.put(`/loyalty/items/${editingItem.id}`, payload);
        showToast("Item updated successfully.", "success");
      } else {
        await api.post("/loyalty/items", payload);
        showToast("Item created successfully.", "success");
      }

      closeModal(true);
      fetchItems();
    } catch (error) {
      console.error("Save item failed:", error);
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const itemName = getItemName(item) || "this item";

    if (!window.confirm(`Delete ${itemName}?`)) return;

    try {
      await api.delete(`/loyalty/items/${item.id}`);
      showToast("Item deleted successfully.", "success");
      fetchItems();
    } catch (error) {
      console.error("Delete item failed:", error);
      showToast(getApiErrorMessage(error), "error");
    }
  };

  return (
    <>
      <style>{itemMasterCss}</style>

      <div className="asi-page">
        {toast && (
          <div
            className={`asi-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
            {toast.message}
          </div>
        )}

        <section className="asi-header-card">
          <div className="asi-header-left">
            <button type="button" className="asi-back-btn" onClick={handleBack}>
              <FiArrowLeft />
              Back
            </button>

            <div className="asi-title-icon">
              <FiBox />
            </div>

            <div className="asi-title-wrap">
              <h1 className="asi-title">Item Master</h1>
              <p className="asi-subtitle">
                Create items, select unit, and assign loyalty points to each
                item.
              </p>
            </div>
          </div>

          <div className="asi-header-actions">
            <button
              type="button"
              className="asi-primary-btn"
              onClick={openCreateModal}
            >
              <FiPlusCircle />
              Add Item
            </button>
          </div>
        </section>

        <section className="asi-summary-grid">
          <SummaryCard
            icon={<FiPackage />}
            label="Total Items"
            value={summary.totalItems}
            tone="blue"
          />

          <SummaryCard
            icon={<FiList />}
            label="Units Used"
            value={summary.totalUnits}
            tone="green"
          />

          <SummaryCard
            icon={<FiAward />}
            label="Total Point Value"
            value={formatPoints(summary.totalPoints)}
            tone="purple"
          />

          <SummaryCard
            icon={<FiHash />}
            label="Items With SKU"
            value={summary.itemsWithSku}
            tone="orange"
          />
        </section>

        <section className="asi-toolbar-card">
          <div className="asi-search-box">
            <FiSearch className="asi-search-icon" />

            <input
              className="asi-search-input"
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search item name, SKU, unit, points..."
            />
          </div>

          <div className="asi-filter-box">
            <FiFilter className="asi-filter-icon" />

            <select
              className="asi-filter-select"
              value={unitFilter}
              onChange={(event) => setUnitFilter(event.target.value)}
            >
              <option value="all">All Units</option>

              {usedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {getUnitLabel(unit)}
                </option>
              ))}
            </select>
          </div>

          <div className="asi-filter-box">
            <select
              className="asi-filter-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="points_high">High Points First</option>
              <option value="points_low">Low Points First</option>
              <option value="unit_asc">Unit A-Z</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          <button type="button" className="asi-clear-btn" onClick={clearFilters}>
            Clear
          </button>
        </section>

        <section className="asi-table-card">
          <div className="asi-table-header">
            <div>
              <h2 className="asi-card-title">Item Master List</h2>
              <p className="asi-card-subtitle">
                Manage item name, SKU, unit, and points per unit.
              </p>
            </div>

            <span className="asi-record-badge">
              {filteredItems.length} items
            </span>
          </div>

          <div className="asi-table-wrapper">
            <table className="asi-table">
              <colgroup>
                <col className="asi-col-name" />
                <col className="asi-col-small" />
                <col className="asi-col-small" />
                <col className="asi-col-small" />
                <col className="asi-col-action" />
              </colgroup>

              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Unit</th>
                  <th>Points</th>
                  <th className="center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="asi-empty-cell" colSpan="5">
                      Loading items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td className="asi-empty-cell" colSpan="5">
                      No items found. Add your first item.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const itemName = getItemName(item) || "-";
                    const itemSku = item?.sku || "-";
                    const itemUnit = getUnitLabel(getItemUnit(item));
                    const itemPoints = getItemPoints(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="asi-item-name-cell">
                            <div className="asi-item-avatar">
                              {String(itemName || "I")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <strong>{itemName}</strong>
                          </div>
                        </td>

                        <td>
                          <span className="asi-text-cell">{itemSku}</span>
                        </td>

                        <td>
                          <span className="asi-unit-pill">{itemUnit}</span>
                        </td>

                        <td>
                          <span className="asi-points-pill">
                            {formatPoints(itemPoints)} pts
                          </span>
                        </td>

                        <td className="center">
                          <div className="asi-action-group">
                            <button
                              type="button"
                              className="asi-edit-btn"
                              onClick={() => openEditModal(item)}
                            >
                              <FiEdit2 />
                              Edit
                            </button>

                            <button
                              type="button"
                              className="asi-delete-btn"
                              onClick={() => handleDelete(item)}
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="asi-mobile-list">
            {loading ? (
              <div className="asi-mobile-empty">Loading items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="asi-mobile-empty">
                No items found. Add your first item.
              </div>
            ) : (
              filteredItems.map((item) => {
                const itemName = getItemName(item) || "-";
                const itemSku = item?.sku || "-";
                const itemUnit = getUnitLabel(getItemUnit(item));
                const itemPoints = getItemPoints(item);

                return (
                  <div key={item.id} className="asi-mobile-card">
                    <div className="asi-mobile-card-top">
                      <div className="asi-mobile-name-wrap">
                        <div className="asi-item-avatar">
                          {String(itemName || "I").charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="asi-mobile-label">Item Name</p>
                          <h3>{itemName}</h3>
                        </div>
                      </div>

                      <span className="asi-points-pill">
                        {formatPoints(itemPoints)} pts
                      </span>
                    </div>

                    <div className="asi-mobile-detail-grid">
                      <div>
                        <span>SKU</span>
                        <strong>{itemSku}</strong>
                      </div>

                      <div>
                        <span>Unit</span>
                        <strong>{itemUnit}</strong>
                      </div>

                      <div>
                        <span>Points</span>
                        <strong>{formatPoints(itemPoints)} pts</strong>
                      </div>
                    </div>

                    <div className="asi-mobile-actions">
                      <button
                        type="button"
                        className="asi-edit-btn"
                        onClick={() => openEditModal(item)}
                      >
                        <FiEdit2 />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="asi-delete-btn"
                        onClick={() => handleDelete(item)}
                      >
                        <FiTrash2 />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {showModal && (
          <div className="asi-modal-overlay">
            <div className="asi-modal-box">
              <div className="asi-modal-header">
                <div>
                  <p className="asi-modal-kicker">
                    {editingItem ? "Update Item Master" : "Create Item Master"}
                  </p>

                  <h2>{editingItem ? "Edit Item" : "Add New Item"}</h2>
                </div>

                <button
                  type="button"
                  className="asi-modal-close"
                  onClick={() => closeModal()}
                  disabled={saving}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="asi-form-group">
                  <label>Item Name *</label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter item name"
                    disabled={saving}
                  />
                </div>

                <div className="asi-three-column-grid">
                  <div className="asi-form-group">
                    <label>SKU Optional</label>

                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="Enter SKU"
                      disabled={saving}
                    />
                  </div>

                  <div className="asi-form-group">
                    <label>Unit *</label>

                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="asi-form-group">
                    <label>Points *</label>

                    <input
                      className="asi-number-input"
                      type="text"
                      inputMode="decimal"
                      name="points"
                      value={formData.points}
                      onChange={handleChange}
                      placeholder="Enter points"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="asi-info-box">
                  <FiAward />
                  <span>
                    Points are used as reward points per selected unit. Example:
                    10 points per kg or 5 points per piece.
                  </span>
                </div>

                <div className="asi-modal-actions">
                  <button
                    type="button"
                    className="asi-cancel-btn"
                    onClick={() => closeModal()}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="asi-primary-btn"
                    disabled={saving}
                  >
                    <FiSave />
                    {saving
                      ? "Saving..."
                      : editingItem
                      ? "Update Item"
                      : "Save Item"}
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
    <div className="asi-summary-card">
      <div className={`asi-summary-icon ${tone}`}>{icon}</div>

      <div>
        <p className="asi-summary-label">{label}</p>
        <h3 className="asi-summary-value">{value}</h3>
      </div>
    </div>
  );
}

const itemMasterCss = `
  .asi-page {
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asi-toast {
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

  .asi-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .asi-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .asi-header-card {
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

  .asi-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asi-title-wrap {
    min-width: 0;
  }

  .asi-title-icon {
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

  .asi-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asi-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asi-header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asi-back-btn {
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

  .asi-back-btn:hover {
    background: #dbeafe;
  }

  .asi-primary-btn {
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

  .asi-primary-btn:disabled,
  .asi-cancel-btn:disabled,
  .asi-modal-close:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .asi-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asi-summary-card {
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

  .asi-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asi-summary-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asi-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asi-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .asi-summary-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asi-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asi-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 26px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .asi-toolbar-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 10px;
    margin-bottom: 18px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
    display: grid;
    grid-template-columns: minmax(320px, 1fr) 190px 210px 90px;
    gap: 10px;
    align-items: center;
  }

  .asi-search-box,
  .asi-filter-box {
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

  .asi-search-icon,
  .asi-filter-icon {
    color: #94a3b8;
    flex: 0 0 auto;
  }

  .asi-search-input,
  .asi-filter-select {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    min-width: 0;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .asi-clear-btn {
    height: 44px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    border-radius: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .asi-table-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
    max-width: 100%;
  }

  .asi-table-header {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .asi-card-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asi-card-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asi-record-badge {
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

  .asi-table-wrapper {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .asi-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
  }

  .asi-col-name {
    width: 45%;
  }

  .asi-col-small {
    width: 12%;
  }

  .asi-col-action {
    width: 19%;
  }

  .asi-table th {
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 950;
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .asi-table th.center,
  .asi-table td.center {
    text-align: center;
  }

  .asi-table td {
    padding: 12px 16px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
    vertical-align: middle;
    border-bottom: 1px solid #eef2f7;
  }

  .asi-table tbody tr:hover {
    background: #f8fafc;
  }

  .asi-item-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asi-item-name-cell strong {
    font-weight: 950;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asi-item-avatar {
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .asi-text-cell {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asi-unit-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    color: #334155;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
    max-width: 100%;
  }

  .asi-points-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .asi-action-group {
    display: inline-flex;
    justify-content: center;
    gap: 8px;
  }

  .asi-edit-btn,
  .asi-delete-btn {
    border: none;
    padding: 8px 11px;
    border-radius: 10px;
    font-weight: 950;
    cursor: pointer;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    white-space: nowrap;
  }

  .asi-edit-btn {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .asi-delete-btn {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .asi-empty-cell {
    padding: 42px 16px !important;
    text-align: center;
    color: #64748b !important;
    font-size: 15px !important;
    font-weight: 850;
  }

  .asi-mobile-list {
    display: none;
  }

  .asi-mobile-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .asi-mobile-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .asi-mobile-name-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asi-mobile-label {
    margin: 0 0 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
  }

  .asi-mobile-card h3 {
    margin: 0;
    font-size: 16px;
    color: #0f172a;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asi-mobile-detail-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .asi-mobile-detail-grid div {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asi-mobile-detail-grid span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
  }

  .asi-mobile-detail-grid strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asi-mobile-actions {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .asi-mobile-empty {
    padding: 24px;
    text-align: center;
    color: #64748b;
    font-weight: 850;
  }

  .asi-modal-overlay {
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

  .asi-modal-box {
    width: min(720px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 24px 55px rgba(15, 23, 42, 0.28);
    box-sizing: border-box;
    border: 1px solid #e2e8f0;
  }

  .asi-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .asi-modal-kicker {
    margin: 0 0 5px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .asi-modal-header h2 {
    margin: 0;
    font-size: 21px;
    color: #0f172a;
    font-weight: 950;
  }

  .asi-modal-close {
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

  .asi-modal-box form {
    padding: 20px;
  }

  .asi-form-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 15px;
    min-width: 0;
  }

  .asi-three-column-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
  }

  .asi-form-group label {
    color: #334155;
    font-size: 13px;
    font-weight: 950;
  }

  .asi-form-group input,
  .asi-form-group select {
    width: 100%;
    height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 0 12px;
    font-size: 14px;
    outline: none;
    background-color: #ffffff;
    color: #0f172a;
    box-sizing: border-box;
    font-weight: 750;
  }

  .asi-form-group input:focus,
  .asi-form-group select:focus {
    border-color: #2563eb;
  }

  .asi-number-input::-webkit-outer-spin-button,
  .asi-number-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .asi-number-input {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .asi-info-box {
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

  .asi-info-box svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }

  .asi-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
    flex-wrap: wrap;
  }

  .asi-cancel-btn {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    height: 44px;
    padding: 0 17px;
    border-radius: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  @media (max-width: 1200px) {
    .asi-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asi-toolbar-card {
      grid-template-columns: 1fr 180px 200px 90px;
    }

    .asi-table-wrapper {
      overflow-x: auto;
    }

    .asi-table {
      min-width: 900px;
    }

    .asi-three-column-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 900px) {
    .asi-toolbar-card {
      grid-template-columns: 1fr 1fr;
    }

    .asi-search-box {
      grid-column: 1 / -1;
    }

    .asi-clear-btn {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 768px) {
    .asi-page {
      padding: 12px;
    }

    .asi-toast {
      top: 70px;
    }

    .asi-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asi-header-left {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .asi-header-actions {
      width: 100%;
      flex-direction: column;
    }

    .asi-back-btn,
    .asi-primary-btn {
      width: 100%;
    }

    .asi-title-icon {
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    .asi-title {
      font-size: 23px;
    }

    .asi-summary-grid,
    .asi-toolbar-card {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asi-search-box,
    .asi-clear-btn {
      grid-column: auto;
    }

    .asi-summary-value {
      font-size: 23px;
    }

    .asi-table-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .asi-table-wrapper {
      display: none;
    }

    .asi-mobile-list {
      display: grid;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
    }

    .asi-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .asi-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 20px 20px 0 0;
    }

    .asi-three-column-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .asi-modal-actions {
      flex-direction: column;
    }

    .asi-cancel-btn,
    .asi-modal-actions .asi-primary-btn {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .asi-page {
      padding: 10px;
    }

    .asi-header-left {
      flex-direction: column;
    }

    .asi-title {
      font-size: 22px;
    }

    .asi-mobile-card-top {
      flex-direction: column;
    }

    .asi-points-pill {
      width: 100%;
    }

    .asi-mobile-actions {
      grid-template-columns: 1fr;
    }

    .asi-mobile-detail-grid {
      grid-template-columns: 1fr;
    }
  }
`;