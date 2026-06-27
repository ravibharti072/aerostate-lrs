import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const unitOptions = [
  { value: "pcs", label: "No / Pcs" },
  { value: "kg", label: "Kg" },
  { value: "gram", label: "Gram" },
  { value: "liter", label: "Liter" },
  { value: "ml", label: "ML" },
];

const emptyItemRow = {
  loyalty_item_id: "",
  unit: "pcs",
  quantity: "",
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

const getItemName = (item) => item?.item_name || item?.name || "";

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

const getEntryItem = (entry) =>
  entry?.item_name || entry?.loyalty_item_id || "-";

export default function RewardEntry({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [entries, setEntries] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [itemRows, setItemRows] = useState([{ ...emptyItemRow }]);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const calculatedRows = useMemo(() => {
    return itemRows.map((row) => {
      const selectedItem = getSelectedItem(row.loyalty_item_id);
      const pointsPerUnit = selectedItem ? getItemPoints(selectedItem) : 0;
      const quantity = row.quantity === "" ? 0 : Number(row.quantity || 0);

      const totalPoints =
        pointsPerUnit > 0 && quantity > 0
          ? Math.round(pointsPerUnit * quantity)
          : 0;

      return {
        ...row,
        item_name: selectedItem ? getItemName(selectedItem) : "",
        points_per_unit: pointsPerUnit,
        quantity_number: quantity,
        total_points: totalPoints,
      };
    });
  }, [itemRows, items]);

  const grandTotalPoints = useMemo(() => {
    return calculatedRows.reduce(
      (sum, row) => sum + Number(row.total_points || 0),
      0
    );
  }, [calculatedRows]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [customersRes, itemsRes, entriesRes] = await Promise.allSettled([
        api.get("/customers/"),
        api.get("/loyalty/items"),
        api.get("/reward-entries/"),
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
        console.warn("Reward entries API not ready yet.");
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
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
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
    setItemRows([{ ...emptyItemRow }]);
    setNote("");
  };

  const validateForm = () => {
    if (!customerId) {
      showToast("Please select customer.", "error");
      return false;
    }

    for (let index = 0; index < itemRows.length; index++) {
      const row = itemRows[index];

      if (!row.loyalty_item_id) {
        showToast(`Please select item in row ${index + 1}.`, "error");
        return false;
      }

      if (!row.unit) {
        showToast(`Please select unit in row ${index + 1}.`, "error");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const rewardItems = calculatedRows.map((row) => ({
      loyalty_item_id: Number(row.loyalty_item_id),
      unit: row.unit,
      quantity: Number(row.quantity_number),
      points_per_unit: Number(row.points_per_unit),
      total_points: Number(row.total_points),
    }));

    const payload = {
      customer_id: Number(customerId),
      items: rewardItems,
      total_points: Number(grandTotalPoints),
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
                Select one customer, add multiple items, and auto-calculate
                reward points.
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

            <div className="asr-items-section">
              <div className="asr-items-header">
                <h3 className="asr-items-title">Items</h3>

                <button
                  type="button"
                  className="asr-add-row-btn"
                  onClick={addItemRow}
                  disabled={saving}
                >
                  + Add Another Item
                </button>
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

                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {getItemName(item)} - {getItemPoints(item)} pts
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="asr-form-group">
                      <label className="asr-label">Unit *</label>

                      <select
                        className="asr-input"
                        value={row.unit}
                        onChange={(e) =>
                          handleItemRowChange(index, "unit", e.target.value)
                        }
                        disabled={saving}
                      >
                        {unitOptions.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
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
                        {row.points_per_unit} pts
                      </h3>
                    </div>

                    <div className="asr-points-box">
                      <p className="asr-summary-label">Total Points</p>
                      <h3 className="asr-row-total-points">
                        {row.total_points} pts
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
                <h3 className="asr-grand-total">{grandTotalPoints} pts</h3>
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
            <h2 className="asr-table-title">Recent Reward Entries</h2>
          </div>

          <div className="asr-table-wrapper">
            <table className="asr-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Points / Unit</th>
                  <th>Total Points</th>
                </tr>
              </thead>

              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td className="asr-empty-cell" colSpan="6">
                      No reward entries found.
                    </td>
                  </tr>
                ) : (
                  entries.slice(0, 10).map((entry) => (
                    <tr key={entry.id}>
                      <td>{getEntryCustomer(entry)}</td>
                      <td>{getEntryItem(entry)}</td>
                      <td>{entry.unit || "-"}</td>
                      <td>{entry.quantity || "-"}</td>
                      <td>{entry.points_per_unit ?? "-"} pts</td>
                      <td className="points">
                        {entry.total_points ?? entry.points ?? 0} pts
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="asr-mobile-entry-list">
            {entries.length === 0 ? (
              <div className="asr-mobile-empty">No reward entries found.</div>
            ) : (
              entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="asr-mobile-entry-card">
                  <div className="asr-mobile-entry-top">
                    <div>
                      <p className="asr-mobile-entry-label">Customer</p>
                      <h3>{getEntryCustomer(entry)}</h3>
                    </div>

                    <span className="asr-mobile-points-pill">
                      {entry.total_points ?? entry.points ?? 0} pts
                    </span>
                  </div>

                  <div className="asr-mobile-entry-grid">
                    <div>
                      <span>Item</span>
                      <strong>{getEntryItem(entry)}</strong>
                    </div>

                    <div>
                      <span>Unit</span>
                      <strong>{entry.unit || "-"}</strong>
                    </div>

                    <div>
                      <span>Quantity</span>
                      <strong>{entry.quantity || "-"}</strong>
                    </div>

                    <div>
                      <span>Points / Unit</span>
                      <strong>{entry.points_per_unit ?? "-"} pts</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

  .asr-subtitle {
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

  .asr-customer-block {
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

  .asr-items-title {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: #111827;
  }

  .asr-add-row-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    padding: 9px 14px;
    border-radius: 9px;
    font-weight: 800;
    cursor: pointer;
    min-height: 40px;
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
  .asr-add-row-btn:disabled {
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
  }

  .asr-table-title {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: #111827;
  }

  .asr-table-wrapper {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .asr-table {
    width: 100%;
    min-width: 900px;
    border-collapse: collapse;
  }

  .asr-table th {
    background: #f8fafc;
    color: #334155;
    font-size: 13px;
    font-weight: 900;
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  .asr-table td {
    padding: 16px;
    color: #334155;
    font-size: 14px;
    vertical-align: middle;
    border-bottom: 1px solid #e5e7eb;
  }

  .asr-table td.points {
    color: #2563eb;
    font-weight: 900;
  }

  .asr-empty-cell {
    padding: 30px !important;
    text-align: center;
    color: #64748b !important;
    font-size: 16px !important;
    font-weight: 800;
  }

  .asr-mobile-entry-list {
    display: none;
  }

  .asr-mobile-entry-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .asr-mobile-entry-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .asr-mobile-entry-label {
    margin: 0 0 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .asr-mobile-entry-top h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 900;
    color: #111827;
    overflow-wrap: anywhere;
  }

  .asr-mobile-points-pill {
    background: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .asr-mobile-entry-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .asr-mobile-entry-grid div {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asr-mobile-entry-grid span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .asr-mobile-entry-grid strong {
    display: block;
    margin-top: 5px;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asr-mobile-empty {
    padding: 24px;
    text-align: center;
    color: #64748b;
    font-weight: 800;
  }

  @media (max-width: 1300px) {
    .asr-item-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .asr-remove-box {
      justify-content: flex-start;
    }
  }

  @media (max-width: 1024px) {
    .asr-reward-page {
      padding: 18px;
    }

    .asr-customer-block {
      grid-template-columns: 1fr;
    }

    .asr-grand-summary {
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

    .asr-add-row-btn {
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

    .asr-form-actions {
      flex-direction: column;
    }

    .asr-primary-btn,
    .asr-cancel-btn {
      width: 100%;
    }

    .asr-table-wrapper {
      display: none;
    }

    .asr-mobile-entry-list {
      display: grid;
      gap: 12px;
      padding: 14px;
      background: #f8fafc;
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

    .asr-mobile-entry-grid {
      grid-template-columns: 1fr;
    }

    .asr-mobile-entry-top {
      flex-direction: column;
    }

    .asr-mobile-points-pill {
      width: 100%;
      text-align: center;
    }
  }
`;