import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiSearch,
  FiRefreshCw,
  FiDollarSign,
  FiUser,
  FiPhone,
  FiMapPin,
  FiCreditCard,
  FiShoppingBag,
  FiPackage,
  FiAward,
  FiX,
  FiSave,
} from "react-icons/fi";
import api from "../api/axios";

function RedemptionPortal({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [rewardEntries, setRewardEntries] = useState([]);
  const [payouts, setPayouts] = useState([]);

  const [pointValue, setPointValue] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ type: "", message: "" });

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    points_redeemed: "",
    note: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

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
    if (Array.isArray(data?.customers)) return data.customers;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.payouts)) return data.payouts;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const normalizePointValue = (data) => {
    return Number(
      data?.point_value_rupees ??
        data?.point_value ??
        data?.value ??
        data?.amount ??
        1
    );
  };

  const formatAmount = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

      const [customerRes, rewardRes, payoutRes, pointValueRes] =
        await Promise.allSettled([
          api.get("/customers/"),
          api.get("/reward-entries/"),
          api.get("/payouts"),
          api.get("/settings/point-value"),
        ]);

      const customerList =
        customerRes.status === "fulfilled"
          ? normalizeList(customerRes.value.data)
          : [];

      const rewardList =
        rewardRes.status === "fulfilled"
          ? normalizeList(rewardRes.value.data)
          : [];

      const payoutList =
        payoutRes.status === "fulfilled"
          ? normalizeList(payoutRes.value.data)
          : [];

      if (pointValueRes.status === "fulfilled") {
        const value = normalizePointValue(pointValueRes.value.data);

        if (value > 0) {
          setPointValue(value);
        }
      }

      setCustomers(customerList);
      setRewardEntries(rewardList);
      setPayouts(payoutList);

      setSelectedCustomer((prevSelected) => {
        if (!prevSelected) return null;

        return (
          customerList.find(
            (customer) => Number(customer.id) === Number(prevSelected.id)
          ) || null
        );
      });
    } catch (error) {
      console.error("Payout page fetch error:", error);
      showToast("error", getErrorMessage(error, "Unable to load payout page."));
    } finally {
      setLoading(false);
    }
  };

  const getCustomerStats = (customerId) => {
    const entries = rewardEntries.filter(
      (entry) => Number(entry.customer_id) === Number(customerId)
    );

    const uniqueEntryIds = new Set(
      entries.map((entry) => entry.reward_entry_id || entry.id)
    );

    const totalItemsBought = entries.reduce((sum, entry) => {
      return sum + Number(entry.quantity || 0);
    }, 0);

    const totalRewardPoints = entries.reduce((sum, entry) => {
      return sum + Number(entry.total_points || 0);
    }, 0);

    const customerPayouts = payouts.filter(
      (payout) => Number(payout.customer_id) === Number(customerId)
    );

    const totalRedeemed = customerPayouts.reduce((sum, payout) => {
      return sum + Number(payout.points_redeemed || 0);
    }, 0);

    return {
      timesBought: uniqueEntryIds.size,
      totalItemsBought,
      totalRewardPoints,
      totalRedeemed,
      payoutCount: customerPayouts.length,
    };
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      const name = String(customer.name || "").toLowerCase();
      const phone = String(
        customer.phone_number || customer.phone || ""
      ).toLowerCase();
      const address = String(customer.address || "").toLowerCase();
      const bankName = String(customer.bank_name || "").toLowerCase();

      if (!search) return true;

      return (
        name.includes(search) ||
        phone.includes(search) ||
        address.includes(search) ||
        bankName.includes(search)
      );
    });
  }, [customers, searchTerm]);

  const selectedStats = selectedCustomer
    ? getCustomerStats(selectedCustomer.id)
    : null;

  const availablePoints = Number(selectedCustomer?.points_balance || 0);
  const payoutPoints = Number(payoutForm.points_redeemed || 0);
  const payoutAmount = payoutPoints * Number(pointValue || 0);

  const openPayoutModal = () => {
    if (!selectedCustomer) {
      showToast("error", "Please select a customer first.");
      return;
    }

    if (availablePoints <= 0) {
      showToast("error", "This customer does not have enough points.");
      return;
    }

    setPayoutForm({
      points_redeemed: "",
      note: "",
    });

    setPayoutModalOpen(true);
  };

  const closePayoutModal = () => {
    setPayoutModalOpen(false);

    setPayoutForm({
      points_redeemed: "",
      note: "",
    });
  };

  const handlePayoutChange = (e) => {
    const { name, value } = e.target;

    if (name === "points_redeemed") {
      if (value === "") {
        setPayoutForm((prev) => ({
          ...prev,
          points_redeemed: "",
        }));
        return;
      }

      const enteredPoints = Number(value);
      const maxPoints = Number(selectedCustomer?.points_balance || 0);

      if (enteredPoints > maxPoints) {
        showToast(
          "error",
          `You cannot redeem more than ${maxPoints} available points.`
        );

        setPayoutForm((prev) => ({
          ...prev,
          points_redeemed: String(maxPoints),
        }));

        return;
      }

      if (enteredPoints < 0) {
        setPayoutForm((prev) => ({
          ...prev,
          points_redeemed: "",
        }));
        return;
      }
    }

    setPayoutForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitPayout = async (e) => {
    e.preventDefault();

    if (!selectedCustomer?.id) {
      showToast("error", "Please select customer.");
      return;
    }

    if (!payoutPoints || payoutPoints <= 0) {
      showToast("error", "Please enter valid redemption points.");
      return;
    }

    if (payoutPoints > availablePoints) {
      showToast(
        "error",
        `Redeem points cannot be greater than available points. Available: ${availablePoints}`
      );
      return;
    }

    try {
      setSaving(true);

      await api.post("/payouts", {
        customer_id: Number(selectedCustomer.id),
        points_redeemed: payoutPoints,
        payout_value: payoutAmount,
        point_value_rupees: Number(pointValue),
        note:
          payoutForm.note ||
          `Payout redemption: ${payoutPoints} points × ₹${pointValue} = ₹${formatAmount(
            payoutAmount
          )}`,
      });

      showToast("success", "Payout completed successfully.");
      closePayoutModal();
      fetchData();
    } catch (error) {
      console.error("Payout submit error:", error);
      showToast("error", getErrorMessage(error, "Unable to complete payout."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{redemptionCss}</style>

      <div className="asrp-page">
        {toast.message && (
          <div
            className={`asrp-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="asrp-header">
          <button type="button" onClick={handleBack} className="asrp-back-btn">
            <FiArrowLeft size={16} />
            Back
          </button>

          <div className="asrp-title-wrap">
            <h2 className="asrp-title">
              <FiDollarSign size={24} color="#16a34a" />
              Payout / Redemption
            </h2>

            <p className="asrp-subtitle">
              Payout amount uses your Amount Assignment setting.
            </p>
          </div>

          <div className="asrp-header-actions">
            <span className="asrp-conversion-pill">
              1 Point = ₹{formatAmount(pointValue)}
            </span>

            <button
              type="button"
              onClick={fetchData}
              className="asrp-refresh-btn"
              disabled={loading}
            >
              <FiRefreshCw size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="asrp-search-bar">
          <FiSearch size={17} className="asrp-search-icon" />

          <input
            type="text"
            placeholder="Search customer by name, phone, address or bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="asrp-search-input"
          />
        </div>

        <div className="asrp-content-grid">
          <section className="asrp-customer-section">
            <div className="asrp-section-header">
              <h3>Customers</h3>

              <span>{filteredCustomers.length} customers</span>
            </div>

            {loading ? (
              <div className="asrp-empty-box">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="asrp-empty-box">No customers found.</div>
            ) : (
              <div className="asrp-customer-grid">
                {filteredCustomers.map((customer) => {
                  const stats = getCustomerStats(customer.id);
                  const isSelected =
                    Number(selectedCustomer?.id) === Number(customer.id);

                  return (
                    <button
                      type="button"
                      key={customer.id}
                      className={`asrp-customer-tile ${
                        isSelected ? "active" : ""
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="asrp-tile-top">
                        <div className="asrp-avatar-box">
                          <FiUser size={20} />
                        </div>

                        <div className="asrp-tile-name-block">
                          <h4>{customer.name}</h4>

                          <p>
                            <FiPhone size={13} />
                            {customer.phone_number || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="asrp-tile-info">
                        <p>
                          <FiMapPin size={13} />
                          <span>{customer.address || "No address"}</span>
                        </p>

                        <p>
                          <FiCreditCard size={13} />
                          <span>{customer.bank_name || "No bank details"}</span>
                        </p>
                      </div>

                      <div className="asrp-tile-stats">
                        <div>
                          <span>Balance</span>
                          <strong>{customer.points_balance || 0}</strong>
                        </div>

                        <div>
                          <span>Buys</span>
                          <strong>{stats.timesBought}</strong>
                        </div>

                        <div>
                          <span>Items</span>
                          <strong>{stats.totalItemsBought}</strong>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="asrp-detail-panel">
            {!selectedCustomer ? (
              <div className="asrp-select-customer-box">
                <FiUser size={34} color="#2563eb" />
                <h3>Select Customer</h3>
                <p>Click any customer tile to view points and payout details.</p>
              </div>
            ) : (
              <>
                <div className="asrp-detail-header">
                  <div className="asrp-detail-name-block">
                    <div className="asrp-detail-name-row">
                      <h3>{selectedCustomer.name}</h3>

                      <span>{availablePoints} pts</span>
                    </div>

                    <p>{selectedCustomer.phone_number || "-"}</p>
                  </div>

                  <button
                    type="button"
                    className="asrp-payout-btn"
                    onClick={openPayoutModal}
                  >
                    <FiDollarSign size={16} />
                    Payout
                  </button>
                </div>

                <div className="asrp-balance-card">
                  <p>Available Points</p>

                  <h2>{availablePoints}</h2>

                  <span>
                    Approx Amount: ₹{formatAmount(availablePoints * pointValue)}
                  </span>

                  <small>Using 1 Point = ₹{formatAmount(pointValue)}</small>
                </div>

                <div className="asrp-detail-stats-grid">
                  <div className="asrp-detail-stat-card">
                    <FiShoppingBag size={20} color="#2563eb" />
                    <p>No. of Times Product Bought</p>
                    <strong>{selectedStats?.timesBought || 0}</strong>
                  </div>

                  <div className="asrp-detail-stat-card">
                    <FiPackage size={20} color="#059669" />
                    <p>Total No. of Items Bought</p>
                    <strong>{selectedStats?.totalItemsBought || 0}</strong>
                  </div>

                  <div className="asrp-detail-stat-card">
                    <FiAward size={20} color="#d97706" />
                    <p>Total Reward Points Earned</p>
                    <strong>{selectedStats?.totalRewardPoints || 0}</strong>
                  </div>

                  <div className="asrp-detail-stat-card">
                    <FiDollarSign size={20} color="#dc2626" />
                    <p>Total Points Redeemed</p>
                    <strong>{selectedStats?.totalRedeemed || 0}</strong>
                  </div>
                </div>

                <div className="asrp-bank-box">
                  <h4>Bank Details</h4>

                  <p>
                    <strong>Bank:</strong> {selectedCustomer.bank_name || "-"}
                  </p>

                  <p>
                    <strong>Account:</strong>{" "}
                    {selectedCustomer.bank_account_number || "-"}
                  </p>

                  <p>
                    <strong>IFSC:</strong> {selectedCustomer.ifsc_code || "-"}
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>

        {payoutModalOpen && selectedCustomer && (
          <div className="asrp-modal-overlay">
            <div className="asrp-modal-box">
              <div className="asrp-modal-header">
                <h3>Redeem Points</h3>

                <button
                  type="button"
                  className="asrp-close-btn"
                  onClick={closePayoutModal}
                >
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={submitPayout}>
                <div className="asrp-customer-mini-box">
                  <strong>{selectedCustomer.name}</strong>

                  <span>Available: {availablePoints} points</span>
                </div>

                <div className="asrp-form-group">
                  <label>Redeem Points</label>

                  <input
                    type="number"
                    name="points_redeemed"
                    value={payoutForm.points_redeemed}
                    onChange={handlePayoutChange}
                    min="1"
                    max={availablePoints}
                    step="1"
                    required
                  />

                  <small className="asrp-input-help">
                    Maximum redeemable points: {availablePoints}
                  </small>
                </div>

                <div className="asrp-amount-box">
                  <p>Calculated Amount</p>

                  <h2>₹{formatAmount(payoutAmount)}</h2>

                  <span>
                    {payoutPoints || 0} points × ₹{formatAmount(pointValue)}
                  </span>
                </div>

                <div className="asrp-form-group">
                  <label>Note</label>

                  <textarea
                    name="note"
                    value={payoutForm.note}
                    onChange={handlePayoutChange}
                    placeholder="Optional payout note..."
                  />
                </div>

                <div className="asrp-modal-actions">
                  <button
                    type="button"
                    className="asrp-cancel-btn"
                    onClick={closePayoutModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="asrp-save-btn"
                    disabled={saving}
                  >
                    <FiSave size={15} />
                    {saving ? "Processing..." : "Confirm Payout"}
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

const redemptionCss = `
  .asrp-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    padding: 20px 24px 40px;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asrp-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    padding: 12px 22px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    max-width: min(420px, calc(100vw - 28px));
    text-align: center;
  }

  .asrp-toast.success {
    background-color: #16a34a;
  }

  .asrp-toast.error {
    background-color: #dc2626;
  }

  .asrp-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .asrp-back-btn,
  .asrp-refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 15px;
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 800;
    font-size: 14px;
    min-height: 40px;
  }

  .asrp-refresh-btn {
    background-color: #f9fafb;
  }

  .asrp-refresh-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .asrp-title-wrap {
    flex: 1;
    min-width: 0;
  }

  .asrp-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 24px;
    font-weight: 900;
    color: #111827;
  }

  .asrp-subtitle {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.5;
  }

  .asrp-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asrp-conversion-pill {
    background-color: #ecfdf5;
    color: #047857;
    border: 1px solid #bbf7d0;
    padding: 8px 13px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 900;
    white-space: nowrap;
  }

  .asrp-search-bar {
    position: relative;
    max-width: 540px;
    margin-bottom: 22px;
  }

  .asrp-search-icon {
    position: absolute;
    top: 50%;
    left: 13px;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .asrp-search-input {
    width: 100%;
    padding: 11px 14px 11px 40px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    background-color: #ffffff;
    color: #111827;
    min-height: 44px;
  }

  .asrp-content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(330px, 0.9fr);
    gap: 22px;
    align-items: start;
  }

  .asrp-customer-section {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 18px;
    background-color: #ffffff;
    min-width: 0;
  }

  .asrp-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asrp-section-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
  }

  .asrp-section-header span {
    background-color: #eff6ff;
    color: #2563eb;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 900;
  }

  .asrp-customer-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .asrp-customer-tile {
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px;
    background-color: #ffffff;
    cursor: pointer;
    text-align: left;
    color: #111827;
    min-width: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .asrp-customer-tile.active {
    border-color: #2563eb;
    background-color: #eff6ff;
    box-shadow: 0 8px 20px rgba(37,99,235,0.12);
  }

  .asrp-tile-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    min-width: 0;
  }

  .asrp-avatar-box {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background-color: #f3f4f6;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .asrp-tile-name-block {
    min-width: 0;
  }

  .asrp-tile-name-block h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    color: #111827;
    overflow-wrap: anywhere;
  }

  .asrp-tile-name-block p {
    margin: 4px 0 0;
    display: flex;
    align-items: center;
    gap: 5px;
    color: #6b7280;
    font-size: 13px;
    font-weight: 700;
  }

  .asrp-tile-info {
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
  }

  .asrp-tile-info p {
    margin: 0;
    display: flex;
    align-items: flex-start;
    gap: 7px;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.4;
  }

  .asrp-tile-info svg {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .asrp-tile-info span {
    overflow-wrap: anywhere;
  }

  .asrp-tile-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
  }

  .asrp-tile-stats div {
    min-width: 0;
  }

  .asrp-tile-stats span {
    display: block;
    font-size: 11px;
    color: #6b7280;
    font-weight: 900;
    margin-bottom: 4px;
  }

  .asrp-tile-stats strong {
    font-size: 17px;
    color: #111827;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asrp-detail-panel {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 20px;
    background-color: #ffffff;
    position: sticky;
    top: 16px;
    min-width: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .asrp-select-customer-box {
    min-height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    text-align: center;
  }

  .asrp-select-customer-box h3 {
    margin: 12px 0 6px;
    color: #111827;
    font-weight: 900;
  }

  .asrp-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .asrp-detail-name-block {
    min-width: 0;
  }

  .asrp-detail-name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asrp-detail-name-row h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asrp-detail-name-row span {
    background-color: #ecfdf5;
    color: #047857;
    border: 1px solid #bbf7d0;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 900;
  }

  .asrp-detail-name-block p {
    margin: 5px 0 0;
    color: #6b7280;
    font-weight: 800;
  }

  .asrp-payout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 9px;
    border: 1px solid #16a34a;
    background-color: #16a34a;
    color: #ffffff;
    cursor: pointer;
    font-weight: 900;
    flex-shrink: 0;
  }

  .asrp-balance-card {
    padding: 18px;
    border-radius: 14px;
    background-color: #ecfdf5;
    border: 1px solid #bbf7d0;
    margin-bottom: 16px;
  }

  .asrp-balance-card p {
    margin: 0;
    color: #047857;
    font-weight: 900;
    font-size: 13px;
  }

  .asrp-balance-card h2 {
    margin: 6px 0;
    color: #065f46;
    font-size: 34px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asrp-balance-card span {
    display: block;
    color: #047857;
    font-weight: 800;
    font-size: 13px;
  }

  .asrp-balance-card small {
    display: block;
    margin-top: 6px;
    color: #047857;
    font-weight: 800;
  }

  .asrp-detail-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .asrp-detail-stat-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 14px;
    background-color: #ffffff;
    min-width: 0;
  }

  .asrp-detail-stat-card p {
    margin: 8px 0 6px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.35;
  }

  .asrp-detail-stat-card strong {
    color: #111827;
    font-size: 20px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asrp-bank-box {
    border-top: 1px solid #e5e7eb;
    padding-top: 14px;
    color: #374151;
    font-size: 14px;
  }

  .asrp-bank-box h4 {
    margin: 0 0 10px;
    font-size: 16px;
    font-weight: 900;
    color: #111827;
  }

  .asrp-bank-box p {
    margin: 7px 0;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .asrp-empty-box {
    padding: 40px;
    text-align: center;
    color: #6b7280;
    font-weight: 800;
  }

  .asrp-modal-overlay {
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

  .asrp-modal-box {
    width: min(520px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background-color: #ffffff;
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 20px 45px rgba(0,0,0,0.25);
    box-sizing: border-box;
  }

  .asrp-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }

  .asrp-modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
  }

  .asrp-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .asrp-customer-mini-box {
    padding: 12px;
    background-color: #f9fafb;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asrp-form-group {
    margin-bottom: 14px;
  }

  .asrp-form-group label {
    display: block;
    margin-bottom: 7px;
    font-size: 14px;
    font-weight: 900;
    color: #374151;
  }

  .asrp-form-group input,
  .asrp-form-group textarea {
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

  .asrp-input-help {
    display: block;
    margin-top: 7px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .asrp-form-group textarea {
    min-height: 80px;
    resize: vertical;
    font-family: inherit;
  }

  .asrp-amount-box {
    padding: 16px;
    border-radius: 12px;
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    margin-bottom: 14px;
  }

  .asrp-amount-box p {
    margin: 0;
    color: #2563eb;
    font-size: 13px;
    font-weight: 900;
  }

  .asrp-amount-box h2 {
    margin: 6px 0;
    color: #1d4ed8;
    font-size: 30px;
    font-weight: 900;
  }

  .asrp-amount-box span {
    color: #2563eb;
    font-size: 13px;
    font-weight: 800;
  }

  .asrp-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .asrp-cancel-btn,
  .asrp-save-btn {
    padding: 10px 16px;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 900;
    min-height: 42px;
  }

  .asrp-cancel-btn {
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #374151;
  }

  .asrp-save-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #16a34a;
    background-color: #16a34a;
    color: #ffffff;
  }

  .asrp-cancel-btn:disabled,
  .asrp-save-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: 1100px) {
    .asrp-content-grid {
      grid-template-columns: 1fr;
    }

    .asrp-detail-panel {
      position: static;
      order: -1;
    }
  }

  @media (max-width: 900px) {
    .asrp-page {
      padding: 16px;
    }

    .asrp-header {
      align-items: flex-start;
    }

    .asrp-search-bar {
      max-width: none;
      width: 100%;
    }

    .asrp-header-actions {
      width: 100%;
    }

    .asrp-conversion-pill,
    .asrp-refresh-btn {
      flex: 1;
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    .asrp-page {
      padding: 12px;
    }

    .asrp-toast {
      top: 70px;
    }

    .asrp-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .asrp-back-btn,
    .asrp-refresh-btn,
    .asrp-conversion-pill {
      width: 100%;
    }

    .asrp-title {
      font-size: 23px;
    }

    .asrp-customer-section,
    .asrp-detail-panel {
      padding: 14px;
    }

    .asrp-customer-grid {
      grid-template-columns: 1fr;
    }

    .asrp-tile-stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .asrp-detail-header {
      flex-direction: column;
    }

    .asrp-payout-btn {
      width: 100%;
    }

    .asrp-detail-stats-grid {
      grid-template-columns: 1fr;
    }

    .asrp-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .asrp-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 18px 18px 0 0;
      padding: 20px;
    }

    .asrp-modal-actions {
      flex-direction: column;
    }

    .asrp-cancel-btn,
    .asrp-save-btn {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .asrp-page {
      padding: 10px;
    }

    .asrp-title {
      font-size: 21px;
    }

    .asrp-tile-top {
      align-items: flex-start;
      flex-direction: column;
    }

    .asrp-tile-stats {
      grid-template-columns: 1fr;
    }

    .asrp-detail-name-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .asrp-detail-name-row span {
      width: 100%;
      text-align: center;
    }

    .asrp-modal-box {
      padding: 16px;
    }
  }
`;

export default RedemptionPortal;