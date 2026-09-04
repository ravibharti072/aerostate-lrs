import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
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
  FiShield,
  FiLock,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./itemMaster.css";

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
  item?.unit || item?.quantity_unit || item?.uom || item?.default_unit || "pcs";

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
  const cleanValue = String(value || "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleanValue.split(".");
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join("")}`;
};

export default function ItemMaster({ onBack }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Admin Password Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const currentUser = useMemo(() => {
    try {
      const savedUser =
        localStorage.getItem("aerostate_loyalty_user") || localStorage.getItem("user");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return typeof parsed === "string" ? null : parsed;
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

  useEffect(() => {
    if (location.state?.autoEdit) {
      openDetailsModal(location.state.autoEdit);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

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

      if (sortBy === "name_desc") return bName.localeCompare(aName, "en", { sensitivity: "base" });
      if (sortBy === "points_high") return bPoints - aPoints;
      if (sortBy === "points_low") return aPoints - bPoints;
      if (sortBy === "unit_asc") return aUnit.localeCompare(bUnit, "en", { sensitivity: "base" });
      if (sortBy === "newest") return Number(b?.id || 0) - Number(a?.id || 0);
      return aName.localeCompare(bName, "en", { sensitivity: "base" });
    });

    return list;
  }, [items, searchText, unitFilter, sortBy]);

  const usedUnits = useMemo(() => {
    const units = new Set();
    items.forEach((item) => units.add(getItemUnit(item)));
    return Array.from(units).sort((a, b) =>
      getUnitLabel(a).localeCompare(getUnitLabel(b), "en", { sensitivity: "base" })
    );
  }, [items]);

  const summary = useMemo(() => {
    const units = new Set(items.map((item) => String(getItemUnit(item) || "pcs").toLowerCase()));
    const totalPoints = items.reduce((sum, item) => sum + Number(getItemPoints(item) || 0), 0);
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
    setIsEditing(true);
    setShowModal(true);
  };

  const openDetailsModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: getItemName(item),
      sku: item?.sku || "",
      unit: getItemUnit(item),
      points: String(getItemPoints(item) || ""),
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setEditingItem(null);
    setIsEditing(false);
    setFormData(emptyForm);
    setShowModal(false);
  };

  const handleCancelEdit = () => {
    if (editingItem) {
      setFormData({
        name: getItemName(editingItem),
        sku: editingItem?.sku || "",
        unit: getItemUnit(editingItem),
        points: String(getItemPoints(editingItem) || ""),
      });
      setIsEditing(false);
    } else {
      closeModal();
    }
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

    if (storeId) payload.store_id = Number(storeId);

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

  // Delete Handlers with Admin Password
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
      await api.delete(`/loyalty/items/${editingItem.id}`, {
        data: { admin_password: adminPassword },
      });
      showToast("Item deleted successfully.", "success");
      setIsDeleteModalOpen(false);
      closeModal(true);
      fetchItems();
    } catch (error) {
      console.error("Delete item failed:", error);
      showToast(getApiErrorMessage(error, "Invalid admin password or deletion failed."), "error");
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

      {/* REUSABLE PORTAL HEADER WITH COLOR #166962 */}
      <PortalHeader
        title="Item Master"
        kicker="LOYALTY MANAGEMENT"
        description="Create items, select units, and assign loyalty points to each item."
        icon={FiBox}
        backPath="/dashboard"
        rightAction={
          <button
            type="button"
            className="portal-action-btn"
            onClick={openCreateModal}
          >
            <FiPlusCircle size={18} /> Add New Item
          </button>
        }
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard title="Total Items" value={summary.totalItems} Icon={FiPackage} colorTheme="blue" />
        <StatCard title="Units Used" value={summary.totalUnits} Icon={FiList} colorTheme="green" />
        <StatCard title="Total Point Value" value={formatPoints(summary.totalPoints)} Icon={FiAward} colorTheme="purple" />
        <StatCard title="Items With SKU" value={summary.itemsWithSku} Icon={FiHash} colorTheme="orange" />
      </div>

      <section className="dir-modules-section">
        <ModuleWriternHeader
          title="Item Master List"
          description="Manage item name, SKU, unit, and points per unit."
          badgeCount={filteredItems.length}
          badgeLabel="items"
        />

        {/* CONTROLS */}
        <div className="dir-controls">
          <div className="dir-search-box" style={{ flex: 1.5 }}>
            <FiSearch size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search item name, SKU, unit, points..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              className="dir-filter-select"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="all">All Units</option>
              {usedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {getUnitLabel(unit)}
                </option>
              ))}
            </select>

            <select
              className="dir-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="points_high">High Points First</option>
              <option value="points_low">Low Points First</option>
              <option value="unit_asc">Unit A-Z</option>
              <option value="newest">Newest First</option>
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

        {/* UNIFIED DESIGN TABLE */}
        <div className="dir-table-container">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="th-item">Item Name</th>
                <th className="th-sku">SKU</th>
                <th className="th-unit">Unit</th>
                <th className="th-points">Points Per Unit</th>
                <th className="th-action"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Loading items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No items found. Add your first item.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const itemName = getItemName(item) || "-";
                  const initials = String(itemName || "I")
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      className="dir-table-row"
                      onClick={() => openDetailsModal(item)}
                    >
                      <td className="th-item">
                        <div className="item-cell">
                          <div className="staff-avatar">{initials}</div>
                          <span className="item-name">{itemName}</span>
                        </div>
                      </td>

                      <td className="th-sku">
                        <span className="sku-text">{item?.sku || "Not added"}</span>
                      </td>

                      <td className="th-unit">
                        <span className="unit-pill">
                          {getUnitLabel(getItemUnit(item))}
                        </span>
                      </td>

                      <td className="th-points">
                        <span className="points-highlight">
                          {formatPoints(getItemPoints(item))} pts
                        </span>
                      </td>

                      <td
                        className="th-action"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="dir-row-edit-btn"
                          onClick={() => openDetailsModal(item)}
                          title="View / Edit Item"
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

      {/* DETAILS & EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => closeModal()}>
          <div
            className="modal-content"
            style={{ maxWidth: "580px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {!editingItem
                    ? "Add New Item"
                    : isEditing
                    ? "Edit Item"
                    : "Item Details"}
                </h2>
                {editingItem && !isEditing && (
                  <p className="modal-kicker">Read-Only Mode • Click 'Edit Details' to make changes</p>
                )}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => closeModal()}
                disabled={saving}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter item name"
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>SKU (Optional)</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="Enter SKU"
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit *</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      disabled={!isEditing || saving}
                      className={!isEditing ? "input-locked" : ""}
                      required
                    >
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Points Value *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="points"
                    value={formData.points}
                    onChange={handleChange}
                    placeholder="Enter points per unit"
                    disabled={!isEditing || saving}
                    className={!isEditing ? "input-locked" : ""}
                    required
                  />
                </div>

                <div className="info-box-note">
                  <FiAward size={16} color="#2d5696" style={{ flexShrink: 0 }} />
                  <span>
                    Points are rewarded per selected unit. Example: 10 points per kg or 5 points per piece.
                  </span>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="modal-footer">
                {editingItem ? (
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
                        <FiTrash2 size={14} /> Delete Item
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
                      <FiSave size={14} /> {saving ? "Saving..." : "Save Item"}
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
                  Are you sure you want to permanently delete item{" "}
                  <strong>{getItemName(editingItem)}</strong>? This action cannot be undone.
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
                  <FiTrash2 size={14} /> {deleting ? "Deleting..." : "Delete Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}