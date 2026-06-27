import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const emptyForm = {
  name: "",
  sku: "",
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
  item?.per_point_amount ??
  item?.points ??
  item?.points_value ??
  item?.points_required ??
  0;

export default function ItemMaster({ onBack }) {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState("");
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

    if (!search) return items;

    return items.filter((item) => {
      const name = String(getItemName(item)).toLowerCase();
      const sku = String(item?.sku || "").toLowerCase();
      const points = String(getItemPoints(item)).toLowerCase();

      return (
        name.includes(search) ||
        sku.includes(search) ||
        points.includes(search)
      );
    });
  }, [items, searchText]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      points: getItemPoints(item),
    });

    setShowModal(true);
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;

    setEditingItem(null);
    setFormData(emptyForm);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Item name is required.", "error");
      return;
    }

    if (formData.points === "" || Number(formData.points) <= 0) {
      showToast("Points must be greater than 0.", "error");
      return;
    }

    const pointsValue = Number(formData.points);

    const payload = {
      item_name: formData.name.trim(),
      sku: formData.sku.trim() || null,

      category: "item",
      per_point_amount: pointsValue,

      name: formData.name.trim(),
      points: pointsValue,
      points_value: pointsValue,
      points_required: pointsValue,
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

        <div className="asi-header">
          <div className="asi-header-left">
            {onBack && (
              <button type="button" className="asi-back-btn" onClick={onBack}>
                ← Back
              </button>
            )}

            <div className="asi-title-wrap">
              <h1 className="asi-title">Item Master</h1>
              <p className="asi-subtitle">
                Create items and assign loyalty points to each item.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="asi-primary-btn"
            onClick={openCreateModal}
          >
            + Add Item
          </button>
        </div>

        <div className="asi-top-bar">
          <input
            className="asi-search-input"
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search item name, SKU, points..."
          />
        </div>

        <div className="asi-table-card">
          <div className="asi-table-wrapper">
            <table className="asi-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Points</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="asi-empty-cell" colSpan="4">
                      Loading items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td className="asi-empty-cell" colSpan="4">
                      No items found. Add your first item.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const itemName = getItemName(item) || "-";
                    const itemSku = item?.sku || "-";
                    const itemPoints = getItemPoints(item);

                    return (
                      <tr key={item.id}>
                        <td className="name">{itemName}</td>
                        <td>{itemSku}</td>
                        <td className="points">{itemPoints} pts</td>
                        <td>
                          <div className="asi-action-group">
                            <button
                              type="button"
                              className="asi-edit-btn"
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="asi-delete-btn"
                              onClick={() => handleDelete(item)}
                            >
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
                const itemPoints = getItemPoints(item);

                return (
                  <div key={item.id} className="asi-mobile-card">
                    <div className="asi-mobile-card-top">
                      <div>
                        <p className="asi-mobile-label">Item Name</p>
                        <h3>{itemName}</h3>
                      </div>

                      <span className="asi-points-pill">{itemPoints} pts</span>
                    </div>

                    <div className="asi-mobile-detail-grid">
                      <div>
                        <span>SKU</span>
                        <strong>{itemSku}</strong>
                      </div>

                      <div>
                        <span>Points</span>
                        <strong>{itemPoints} pts</strong>
                      </div>
                    </div>

                    <div className="asi-mobile-actions">
                      <button
                        type="button"
                        className="asi-edit-btn"
                        onClick={() => openEditModal(item)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="asi-delete-btn"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {showModal && (
          <div className="asi-modal-overlay">
            <div className="asi-modal-box">
              <div className="asi-modal-header">
                <h2>{editingItem ? "Edit Item" : "Add New Item"}</h2>

                <button
                  type="button"
                  className="asi-modal-close"
                  onClick={() => closeModal()}
                  disabled={saving}
                >
                  ×
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

                <div className="asi-two-column-grid">
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
                    <label>Points *</label>

                    <input
                      type="number"
                      name="points"
                      value={formData.points}
                      onChange={handleChange}
                      placeholder="Enter points"
                      min="1"
                      disabled={saving}
                    />
                  </div>
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

const itemMasterCss = `
  .asi-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #111827;
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
    font-weight: 800;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.22);
    max-width: min(420px, calc(100vw - 28px));
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

  .asi-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }

  .asi-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .asi-title-wrap {
    min-width: 0;
  }

  .asi-title {
    margin: 0;
    font-size: 28px;
    font-weight: 900;
    color: #111827;
    letter-spacing: -0.03em;
  }

  .asi-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.5;
  }

  .asi-back-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    padding: 10px 16px;
    border-radius: 10px;
    font-weight: 800;
    cursor: pointer;
    min-height: 40px;
  }

  .asi-primary-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    padding: 10px 18px;
    border-radius: 9px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.22);
    min-height: 42px;
  }

  .asi-primary-btn:disabled,
  .asi-cancel-btn:disabled,
  .asi-modal-close:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .asi-top-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    max-width: 100%;
  }

  .asi-search-input {
    width: 360px;
    max-width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 14px;
    outline: none;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
  }

  .asi-table-card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    max-width: 100%;
  }

  .asi-table-wrapper {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .asi-table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
  }

  .asi-table th {
    background: #f8fafc;
    color: #334155;
    font-size: 13px;
    font-weight: 900;
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  .asi-table tr {
    border-bottom: 1px solid #e5e7eb;
  }

  .asi-table td {
    padding: 16px;
    color: #334155;
    font-size: 14px;
    vertical-align: middle;
  }

  .asi-table td.name {
    color: #111827;
    font-weight: 900;
  }

  .asi-table td.points {
    color: #2563eb;
    font-weight: 900;
  }

  .asi-action-group {
    display: flex;
    gap: 8px;
  }

  .asi-edit-btn,
  .asi-delete-btn {
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    font-weight: 800;
    cursor: pointer;
    min-height: 36px;
  }

  .asi-edit-btn {
    background: #e0f2fe;
    color: #0369a1;
  }

  .asi-delete-btn {
    background: #fee2e2;
    color: #b91c1c;
  }

  .asi-empty-cell {
    padding: 30px !important;
    text-align: center;
    color: #64748b !important;
    font-size: 16px !important;
    font-weight: 800;
  }

  .asi-mobile-list {
    display: none;
  }

  .asi-mobile-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .asi-mobile-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .asi-mobile-label {
    margin: 0 0 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .asi-mobile-card h3 {
    margin: 0;
    font-size: 16px;
    color: #111827;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asi-points-pill {
    background: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .asi-mobile-detail-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .asi-mobile-detail-grid div {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asi-mobile-detail-grid span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .asi-mobile-detail-grid strong {
    display: block;
    margin-top: 5px;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
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
    font-weight: 800;
  }

  .asi-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4000;
    padding: 20px;
    box-sizing: border-box;
  }

  .asi-modal-box {
    width: min(620px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 25px 70px rgba(15, 23, 42, 0.35);
    box-sizing: border-box;
  }

  .asi-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
  }

  .asi-modal-header h2 {
    margin: 0;
    font-size: 21px;
    color: #111827;
    font-weight: 900;
  }

  .asi-modal-close {
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 28px;
    cursor: pointer;
    line-height: 1;
    flex-shrink: 0;
  }

  .asi-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
    min-width: 0;
  }

  .asi-two-column-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .asi-form-group label {
    font-size: 14px;
    font-weight: 800;
    color: #334155;
  }

  .asi-form-group input {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 12px 13px;
    font-size: 14px;
    outline: none;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
  }

  .asi-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  .asi-cancel-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    padding: 10px 18px;
    border-radius: 9px;
    font-weight: 800;
    cursor: pointer;
    min-height: 42px;
  }

  @media (max-width: 900px) {
    .asi-page {
      padding: 16px;
    }

    .asi-header {
      align-items: flex-start;
    }

    .asi-header-left {
      align-items: flex-start;
    }

    .asi-search-input {
      width: 100%;
    }

    .asi-top-bar {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .asi-page {
      padding: 12px;
    }

    .asi-toast {
      top: 70px;
    }

    .asi-header {
      flex-direction: column;
      align-items: stretch;
    }

    .asi-header-left {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }

    .asi-back-btn,
    .asi-primary-btn {
      width: 100%;
    }

    .asi-title {
      font-size: 24px;
    }

    .asi-subtitle {
      font-size: 14px;
    }

    .asi-table-wrapper {
      display: none;
    }

    .asi-mobile-list {
      display: grid;
      gap: 12px;
      padding: 14px;
      background: #f8fafc;
    }

    .asi-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .asi-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 18px 18px 0 0;
      padding: 20px;
    }

    .asi-two-column-grid {
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

    .asi-title {
      font-size: 22px;
    }

    .asi-mobile-card-top {
      flex-direction: column;
    }

    .asi-points-pill {
      width: 100%;
      text-align: center;
    }

    .asi-mobile-actions {
      grid-template-columns: 1fr;
    }

    .asi-mobile-detail-grid {
      grid-template-columns: 1fr;
    }

    .asi-modal-box {
      padding: 16px;
    }
  }
`;