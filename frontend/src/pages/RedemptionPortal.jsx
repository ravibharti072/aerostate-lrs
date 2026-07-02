import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiSearch,
  FiDollarSign,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiShoppingBag,
  FiPackage,
  FiAward,
  FiX,
  FiSave,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiHash,
} from "react-icons/fi";
import api from "../api/axios";

const CUSTOMERS_PER_PAGE = 30;

function RedemptionPortal({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [rewardEntries, setRewardEntries] = useState([]);
  const [payouts, setPayouts] = useState([]);

  const [pointValue, setPointValue] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("balance_desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ type: "", message: "" });

  const [payoutForm, setPayoutForm] = useState({
    points_redeemed: "",
    note: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, balanceFilter, sortBy]);

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

  const formatPoints = (value) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  };

  const maskAccountNumber = (value) => {
    const clean = String(value || "").replace(/\D/g, "");

    if (!clean) return "No account details";
    if (clean.length <= 4) return `A/C ${clean}`;

    return `A/C XXXX ${clean.slice(-4)}`;
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

    const totalPayoutValue = customerPayouts.reduce((sum, payout) => {
      return sum + Number(payout.payout_value || 0);
    }, 0);

    return {
      timesBought: uniqueEntryIds.size,
      totalItemsBought,
      totalRewardPoints,
      totalRedeemed,
      totalPayoutValue,
      payoutCount: customerPayouts.length,
    };
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    let list = customers.filter((customer) => {
      const name = String(customer.name || "").toLowerCase();
      const phone = String(
        customer.phone_number || customer.phone || ""
      ).toLowerCase();
      const address = String(customer.address || "").toLowerCase();
      const bankName = String(customer.bank_name || "").toLowerCase();
      const account = String(customer.bank_account_number || "").toLowerCase();
      const ifsc = String(customer.ifsc_code || "").toLowerCase();

      if (!search) return true;

      return (
        name.includes(search) ||
        phone.includes(search) ||
        address.includes(search) ||
        bankName.includes(search) ||
        account.includes(search) ||
        ifsc.includes(search)
      );
    });

    list = list.filter((customer) => {
      const points = Number(customer.points_balance || 0);
      const stats = getCustomerStats(customer.id);

      if (balanceFilter === "with_points") return points > 0;
      if (balanceFilter === "no_points") return points <= 0;
      if (balanceFilter === "redeemed") return stats.totalRedeemed > 0;

      return true;
    });

    list.sort((a, b) => {
      const aStats = getCustomerStats(a.id);
      const bStats = getCustomerStats(b.id);

      if (sortBy === "name_asc") {
        return String(a.name || "").localeCompare(String(b.name || ""), "en", {
          sensitivity: "base",
        });
      }

      if (sortBy === "name_desc") {
        return String(b.name || "").localeCompare(String(a.name || ""), "en", {
          sensitivity: "base",
        });
      }

      if (sortBy === "balance_asc") {
        return Number(a.points_balance || 0) - Number(b.points_balance || 0);
      }

      if (sortBy === "redeemed_desc") {
        return (
          Number(bStats.totalRedeemed || 0) -
          Number(aStats.totalRedeemed || 0)
        );
      }

      if (sortBy === "payout_desc") {
        return (
          Number(bStats.totalPayoutValue || 0) -
          Number(aStats.totalPayoutValue || 0)
        );
      }

      return Number(b.points_balance || 0) - Number(a.points_balance || 0);
    });

    return list;
  }, [customers, searchTerm, balanceFilter, sortBy, rewardEntries, payouts]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE)
  );

  const paginatedCustomers = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * CUSTOMERS_PER_PAGE;

    return filteredCustomers.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, currentPage, pageCount]);

  const selectedStats = selectedCustomer
    ? getCustomerStats(selectedCustomer.id)
    : null;

  const availablePoints = Number(selectedCustomer?.points_balance || 0);
  const payoutPoints = Number(payoutForm.points_redeemed || 0);
  const payoutAmount = payoutPoints * Number(pointValue || 0);

  const pageSummary = useMemo(() => {
    const totalAvailablePoints = customers.reduce((sum, customer) => {
      return sum + Number(customer.points_balance || 0);
    }, 0);

    const totalRedeemedPoints = payouts.reduce((sum, payout) => {
      return sum + Number(payout.points_redeemed || 0);
    }, 0);

    const totalPayoutValue = payouts.reduce((sum, payout) => {
      return sum + Number(payout.payout_value || 0);
    }, 0);

    return {
      totalCustomers: customers.length,
      totalAvailablePoints,
      totalRedeemedPoints,
      totalPayoutValue,
    };
  }, [customers, payouts]);

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setDetailModalOpen(true);
  };

  const closeCustomerDetails = () => {
    setDetailModalOpen(false);
  };

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

  const handlePayoutChange = (event) => {
    const { name, value } = event.target;

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
          `You cannot redeem more than ${formatPoints(
            maxPoints
          )} available points.`
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

  const submitPayout = async (event) => {
    event.preventDefault();

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
        `Redeem points cannot be greater than available points. Available: ${formatPoints(
          availablePoints
        )}`
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
      closeCustomerDetails();
      fetchData();
    } catch (error) {
      console.error("Payout submit error:", error);
      showToast("error", getErrorMessage(error, "Unable to complete payout."));
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setBalanceFilter("all");
    setSortBy("balance_desc");
    setCurrentPage(1);
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

        <section className="asrp-header-card">
          <div className="asrp-header-left">
            <button type="button" onClick={handleBack} className="asrp-back-btn">
              <FiArrowLeft />
              Back
            </button>

            <div className="asrp-title-icon">
              <FiDollarSign />
            </div>

            <div>
              <h1 className="asrp-title">Payout / Redemption</h1>
              <p className="asrp-subtitle">
                Redeem customer points and calculate payout amount using Amount
                Assignment setting.
              </p>
            </div>
          </div>

          <div className="asrp-header-actions">
            <span className="asrp-conversion-pill">
              1 Point = ₹{formatAmount(pointValue)}
            </span>
          </div>
        </section>

        <section className="asrp-summary-grid">
          <SummaryCard
            icon={<FiUser />}
            label="Total Customers"
            value={formatPoints(pageSummary.totalCustomers)}
            tone="blue"
          />

          <SummaryCard
            icon={<FiAward />}
            label="Available Points"
            value={formatPoints(pageSummary.totalAvailablePoints)}
            tone="green"
          />

          <SummaryCard
            icon={<FiDollarSign />}
            label="Redeemed Points"
            value={formatPoints(pageSummary.totalRedeemedPoints)}
            tone="orange"
          />

          <SummaryCard
            icon={<FiCreditCard />}
            label="Payout Value"
            value={`₹${formatAmount(pageSummary.totalPayoutValue)}`}
            tone="purple"
          />
        </section>

        <section className="asrp-toolbar-card">
          <div className="asrp-search-box">
            <FiSearch className="asrp-search-icon" />

            <input
              type="text"
              placeholder="Search customer by name, phone, address, bank, account or IFSC..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="asrp-search-input"
            />
          </div>

          <div className="asrp-filter-box">
            <FiFilter className="asrp-filter-icon" />

            <select
              value={balanceFilter}
              onChange={(event) => setBalanceFilter(event.target.value)}
              className="asrp-filter-select"
            >
              <option value="all">All Customers</option>
              <option value="with_points">With Points</option>
              <option value="no_points">No Points</option>
              <option value="redeemed">Redeemed Before</option>
            </select>
          </div>

          <div className="asrp-filter-box">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="asrp-filter-select"
            >
              <option value="balance_desc">High Balance First</option>
              <option value="balance_asc">Low Balance First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="redeemed_desc">Most Redeemed</option>
              <option value="payout_desc">Highest Payout</option>
            </select>
          </div>

          <button type="button" className="asrp-clear-btn" onClick={clearFilters}>
            Clear
          </button>
        </section>

        <section className="asrp-card asrp-customers-card">
          <div className="asrp-card-head">
            <div>
              <h2 className="asrp-card-title">Customers</h2>
              <p className="asrp-card-subtitle">
                Click any customer tile to open payout details in popup.
              </p>
            </div>

            <span className="asrp-record-badge">
              {filteredCustomers.length} customers
            </span>
          </div>

          <div className="asrp-card-body">
            {loading ? (
              <div className="asrp-empty-box">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="asrp-empty-box">No customers found.</div>
            ) : (
              <>
                <div className="asrp-customer-grid">
                  {paginatedCustomers.map((customer) => {
                    const stats = getCustomerStats(customer.id);

                    return (
                      <button
                        type="button"
                        key={customer.id}
                        className="asrp-customer-tile"
                        onClick={() => openCustomerDetails(customer)}
                      >
                        <div className="asrp-tile-top">
                          <div className="asrp-avatar-box">
                            <FiUser />
                          </div>

                          <div className="asrp-tile-name-block">
                            <h4>{customer.name || "Unnamed Customer"}</h4>

                            <p>
                              <FiPhone />
                              {customer.phone_number || "-"}
                            </p>
                          </div>

                          <span className="asrp-view-chip">
                            <FiEye />
                            View
                          </span>
                        </div>

                        <div className="asrp-tile-info">
                          <p>
                            <FiCreditCard />
                            <span title={customer.bank_name || ""}>
                              {customer.bank_name || "No bank details"}
                            </span>
                          </p>

                          <p>
                            <FiHash />
                            <span
                              title={`${customer.bank_account_number || ""} ${
                                customer.ifsc_code || ""
                              }`}
                            >
                              {maskAccountNumber(customer.bank_account_number)}
                              {customer.ifsc_code
                                ? ` • ${customer.ifsc_code}`
                                : ""}
                            </span>
                          </p>
                        </div>

                        <div className="asrp-tile-stats">
                          <div>
                            <span>Balance</span>
                            <strong>
                              {formatPoints(customer.points_balance || 0)}
                            </strong>
                          </div>

                          <div>
                            <span>Buys</span>
                            <strong>{formatPoints(stats.timesBought)}</strong>
                          </div>

                          <div>
                            <span>Redeemed</span>
                            <strong>{formatPoints(stats.totalRedeemed)}</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="asrp-pagination">
                  <button
                    type="button"
                    className="asrp-page-btn"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <FiChevronLeft />
                    Previous
                  </button>

                  <div className="asrp-page-info">
                    <strong>
                      Page {Math.min(currentPage, pageCount)} of {pageCount}
                    </strong>
                    <span>
                      Showing{" "}
                      {filteredCustomers.length === 0
                        ? 0
                        : (Math.min(currentPage, pageCount) - 1) *
                            CUSTOMERS_PER_PAGE +
                          1}
                      -
                      {Math.min(
                        Math.min(currentPage, pageCount) * CUSTOMERS_PER_PAGE,
                        filteredCustomers.length
                      )}{" "}
                      of {filteredCustomers.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="asrp-page-btn"
                    disabled={currentPage >= pageCount}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(pageCount, page + 1))
                    }
                  >
                    Next
                    <FiChevronRight />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {detailModalOpen && selectedCustomer && (
          <div className="asrp-modal-overlay" onClick={closeCustomerDetails}>
            <div
              className="asrp-detail-modal-box"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="asrp-modal-header">
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <p>{selectedCustomer.phone_number || "-"}</p>
                </div>

                <button
                  type="button"
                  className="asrp-close-btn"
                  onClick={closeCustomerDetails}
                >
                  <FiX />
                </button>
              </div>

              <div className="asrp-detail-modal-body">
                <div className="asrp-balance-card">
                  <p>Available Points</p>

                  <h2>{formatPoints(availablePoints)}</h2>

                  <span>
                    Approx Amount: ₹{formatAmount(availablePoints * pointValue)}
                  </span>

                  <small>Using 1 Point = ₹{formatAmount(pointValue)}</small>
                </div>

                <div className="asrp-detail-stats-grid">
                  <DetailStatCard
                    icon={<FiShoppingBag />}
                    label="No. of Times Product Bought"
                    value={formatPoints(selectedStats?.timesBought || 0)}
                    tone="blue"
                  />

                  <DetailStatCard
                    icon={<FiPackage />}
                    label="Total No. of Items Bought"
                    value={formatPoints(selectedStats?.totalItemsBought || 0)}
                    tone="green"
                  />

                  <DetailStatCard
                    icon={<FiAward />}
                    label="Total Reward Points Earned"
                    value={formatPoints(selectedStats?.totalRewardPoints || 0)}
                    tone="orange"
                  />

                  <DetailStatCard
                    icon={<FiDollarSign />}
                    label="Total Points Redeemed"
                    value={formatPoints(selectedStats?.totalRedeemed || 0)}
                    tone="red"
                  />
                </div>

                <div className="asrp-info-grid">
                  <div className="asrp-bank-box">
                    <h4>Customer Details</h4>

                    <p>
                      <strong>Name:</strong> {selectedCustomer.name || "-"}
                    </p>

                    <p>
                      <strong>Phone:</strong>{" "}
                      {selectedCustomer.phone_number || "-"}
                    </p>

                    <p>
                      <strong>Address:</strong>{" "}
                      {selectedCustomer.address || "-"}
                    </p>
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
                </div>
              </div>

              <div className="asrp-detail-modal-actions">
                <button
                  type="button"
                  className="asrp-cancel-btn"
                  onClick={closeCustomerDetails}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="asrp-payout-btn"
                  onClick={openPayoutModal}
                >
                  <FiDollarSign />
                  Payout / Redeem
                </button>
              </div>
            </div>
          </div>
        )}

        {payoutModalOpen && selectedCustomer && (
          <div className="asrp-modal-overlay">
            <div className="asrp-modal-box">
              <div className="asrp-modal-header">
                <div>
                  <h3>Redeem Points</h3>
                  <p>
                    Complete payout for {selectedCustomer.name || "customer"}.
                  </p>
                </div>

                <button
                  type="button"
                  className="asrp-close-btn"
                  onClick={closePayoutModal}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={submitPayout}>
                <div className="asrp-customer-mini-box">
                  <div>
                    <strong>{selectedCustomer.name}</strong>
                    <span>{selectedCustomer.phone_number || "-"}</span>
                  </div>

                  <span>Available: {formatPoints(availablePoints)} points</span>
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
                    step="0.01"
                    required
                  />

                  <small className="asrp-input-help">
                    Maximum redeemable points: {formatPoints(availablePoints)}
                  </small>
                </div>

                <div className="asrp-amount-box">
                  <p>Calculated Amount</p>

                  <h2>₹{formatAmount(payoutAmount)}</h2>

                  <span>
                    {formatPoints(payoutPoints || 0)} points × ₹
                    {formatAmount(pointValue)}
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
                    <FiSave />
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

const SummaryCard = ({ icon, label, value, tone = "blue" }) => (
  <div className="asrp-summary-card">
    <div className={`asrp-summary-icon ${tone}`}>{icon}</div>

    <div>
      <p className="asrp-summary-label">{label}</p>
      <h3 className="asrp-summary-value">{value}</h3>
    </div>
  </div>
);

const DetailStatCard = ({ icon, label, value, tone = "blue" }) => (
  <div className="asrp-detail-stat-card">
    <div className={`asrp-detail-stat-icon ${tone}`}>{icon}</div>
    <p>{label}</p>
    <strong>{value}</strong>
  </div>
);

const redemptionCss = `
  .asrp-page {
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asrp-toast {
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

  .asrp-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .asrp-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .asrp-header-card,
  .asrp-toolbar-card,
  .asrp-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asrp-header-card {
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .asrp-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asrp-back-btn {
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

  .asrp-back-btn:hover {
    background: #dbeafe;
  }

  .asrp-title-icon {
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

  .asrp-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asrp-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asrp-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .asrp-save-btn:disabled,
  .asrp-cancel-btn:disabled,
  .asrp-page-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .asrp-conversion-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #bbf7d0;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 950;
    white-space: nowrap;
    height: 46px;
    box-sizing: border-box;
  }

  .asrp-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asrp-summary-card {
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

  .asrp-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asrp-summary-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asrp-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asrp-summary-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asrp-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .asrp-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asrp-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 26px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .asrp-toolbar-card {
    border-radius: 18px;
    padding: 10px;
    margin-bottom: 18px;
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 190px 210px 90px;
    gap: 10px;
    align-items: center;
  }

  .asrp-search-box,
  .asrp-filter-box {
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

  .asrp-search-icon,
  .asrp-filter-icon {
    color: #94a3b8;
    flex: 0 0 auto;
  }

  .asrp-search-input,
  .asrp-filter-select {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    min-width: 0;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .asrp-clear-btn {
    height: 44px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    border-radius: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .asrp-card {
    border-radius: 20px;
    overflow: hidden;
    min-width: 0;
  }

  .asrp-card-head {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .asrp-card-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asrp-card-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
  }

  .asrp-record-badge {
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

  .asrp-card-body {
    padding: 16px;
    background: #f8fafc;
  }

  .asrp-customer-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(220px, 1fr));
    gap: 14px;
  }

  .asrp-customer-tile {
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 14px;
    background: #ffffff;
    cursor: pointer;
    text-align: left;
    color: #0f172a;
    min-width: 0;
    overflow: hidden;
    transition: 0.18s ease;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.03);
  }

  .asrp-customer-tile:hover {
    border-color: #bfdbfe;
    box-shadow: 0 12px 26px rgba(37, 99, 235, 0.08);
    transform: translateY(-1px);
  }

  .asrp-tile-top {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 34px;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    min-width: 0;
  }

  .asrp-avatar-box {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    font-size: 20px;
  }

  .asrp-tile-name-block {
    min-width: 0;
  }

  .asrp-tile-name-block h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 950;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asrp-tile-name-block p {
    margin: 5px 0 0;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
    min-width: 0;
  }

  .asrp-tile-name-block p svg {
    flex: 0 0 auto;
  }

  .asrp-view-chip {
    width: 32px;
    height: 32px;
    border-radius: 11px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-size: 15px;
  }

  .asrp-view-chip svg + * {
    display: none;
  }

  .asrp-tile-info {
    display: grid;
    gap: 7px;
    margin-bottom: 13px;
    min-width: 0;
  }

  .asrp-tile-info p {
    margin: 0;
    display: flex;
    align-items: flex-start;
    gap: 7px;
    color: #475569;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.4;
    min-width: 0;
  }

  .asrp-tile-info svg {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .asrp-tile-info span {
    display: block;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asrp-tile-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    border-top: 1px solid #e2e8f0;
    padding-top: 13px;
  }

  .asrp-tile-stats span {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 5px;
  }

  .asrp-tile-stats strong {
    display: block;
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asrp-pagination {
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    padding-top: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .asrp-page-btn {
    height: 42px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    border-radius: 12px;
    padding: 0 14px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .asrp-page-info {
    text-align: center;
    display: grid;
    gap: 4px;
  }

  .asrp-page-info strong {
    color: #0f172a;
    font-size: 14px;
    font-weight: 950;
  }

  .asrp-page-info span {
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
  }

  .asrp-empty-box {
    padding: 42px 16px;
    text-align: center;
    color: #64748b;
    font-weight: 850;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 16px;
  }

  .asrp-modal-overlay {
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

  .asrp-modal-box,
  .asrp-detail-modal-box {
    width: min(540px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 24px 55px rgba(15, 23, 42, 0.28);
    box-sizing: border-box;
    border: 1px solid #e2e8f0;
  }

  .asrp-detail-modal-box {
    width: min(900px, 100%);
  }

  .asrp-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .asrp-modal-header h3 {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
    font-weight: 950;
  }

  .asrp-modal-header p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
  }

  .asrp-close-btn {
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

  .asrp-detail-modal-body {
    padding: 20px;
    background: #f8fafc;
  }

  .asrp-balance-card {
    padding: 18px;
    border-radius: 18px;
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    margin-bottom: 16px;
  }

  .asrp-balance-card p {
    margin: 0;
    color: #047857;
    font-weight: 950;
    font-size: 13px;
  }

  .asrp-balance-card h2 {
    margin: 7px 0;
    color: #065f46;
    font-size: 34px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asrp-balance-card span {
    display: block;
    color: #047857;
    font-weight: 850;
    font-size: 13px;
  }

  .asrp-balance-card small {
    display: block;
    margin-top: 7px;
    color: #047857;
    font-weight: 850;
  }

  .asrp-detail-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .asrp-detail-stat-card {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px;
    background: #ffffff;
    min-width: 0;
  }

  .asrp-detail-stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    font-size: 18px;
  }

  .asrp-detail-stat-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asrp-detail-stat-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asrp-detail-stat-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asrp-detail-stat-icon.red {
    background: #fef2f2;
    color: #dc2626;
  }

  .asrp-detail-stat-card p {
    margin: 10px 0 6px;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
    line-height: 1.35;
  }

  .asrp-detail-stat-card strong {
    color: #0f172a;
    font-size: 20px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asrp-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .asrp-bank-box {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 15px;
    background: #ffffff;
    color: #334155;
    font-size: 14px;
  }

  .asrp-bank-box h4 {
    margin: 0 0 10px;
    color: #0f172a;
    font-size: 16px;
    font-weight: 950;
  }

  .asrp-bank-box p {
    margin: 8px 0;
    line-height: 1.45;
    overflow-wrap: anywhere;
    font-weight: 750;
  }

  .asrp-detail-modal-actions {
    padding: 16px 20px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid #e2e8f0;
  }

  .asrp-modal-box form {
    padding: 20px;
  }

  .asrp-customer-mini-box {
    padding: 13px;
    background: #f8fafc;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .asrp-customer-mini-box strong {
    display: block;
    color: #0f172a;
    font-weight: 950;
  }

  .asrp-customer-mini-box span {
    display: block;
    color: #64748b;
    font-size: 13px;
    font-weight: 850;
    margin-top: 3px;
  }

  .asrp-form-group {
    margin-bottom: 14px;
  }

  .asrp-form-group label {
    display: block;
    margin-bottom: 7px;
    font-size: 14px;
    font-weight: 950;
    color: #334155;
  }

  .asrp-form-group input,
  .asrp-form-group textarea {
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

  .asrp-form-group input {
    height: 44px;
    padding: 0 12px;
  }

  .asrp-form-group textarea {
    min-height: 84px;
    resize: vertical;
    font-family: inherit;
    padding: 12px;
    line-height: 1.5;
  }

  .asrp-form-group input:focus,
  .asrp-form-group textarea:focus {
    border-color: #2563eb;
  }

  .asrp-input-help {
    display: block;
    margin-top: 7px;
    color: #64748b;
    font-size: 12px;
    font-weight: 850;
  }

  .asrp-amount-box {
    padding: 16px;
    border-radius: 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    margin-bottom: 14px;
  }

  .asrp-amount-box p {
    margin: 0;
    color: #2563eb;
    font-size: 13px;
    font-weight: 950;
  }

  .asrp-amount-box h2 {
    margin: 7px 0;
    color: #1d4ed8;
    font-size: 30px;
    font-weight: 950;
  }

  .asrp-amount-box span {
    color: #2563eb;
    font-size: 13px;
    font-weight: 850;
  }

  .asrp-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .asrp-cancel-btn,
  .asrp-save-btn,
  .asrp-payout-btn {
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

  .asrp-cancel-btn {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
  }

  .asrp-save-btn,
  .asrp-payout-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
  }

  @media (max-width: 1550px) {
    .asrp-customer-grid {
      grid-template-columns: repeat(4, minmax(220px, 1fr));
    }
  }

  @media (max-width: 1250px) {
    .asrp-customer-grid {
      grid-template-columns: repeat(3, minmax(220px, 1fr));
    }

    .asrp-toolbar-card {
      grid-template-columns: 1fr 180px 200px 90px;
    }
  }

  @media (max-width: 1050px) {
    .asrp-customer-grid {
      grid-template-columns: repeat(2, minmax(220px, 1fr));
    }

    .asrp-detail-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asrp-toolbar-card {
      grid-template-columns: 1fr 1fr;
    }

    .asrp-clear-btn {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .asrp-page {
      padding: 12px;
    }

    .asrp-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asrp-header-left {
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .asrp-header-actions {
      width: 100%;
      justify-content: stretch;
    }

    .asrp-conversion-pill {
      flex: 1;
    }

    .asrp-title-icon {
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    .asrp-title {
      font-size: 23px;
    }

    .asrp-summary-grid,
    .asrp-customer-grid,
    .asrp-detail-stats-grid,
    .asrp-info-grid,
    .asrp-toolbar-card {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asrp-clear-btn {
      grid-column: auto;
    }

    .asrp-summary-value {
      font-size: 23px;
    }

    .asrp-card-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .asrp-card-body {
      padding: 12px;
    }

    .asrp-pagination {
      flex-direction: column;
      align-items: stretch;
    }

    .asrp-page-btn {
      width: 100%;
      justify-content: center;
    }

    .asrp-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .asrp-modal-box,
    .asrp-detail-modal-box {
      width: 100%;
      max-height: 92vh;
      border-radius: 20px 20px 0 0;
    }

    .asrp-modal-actions,
    .asrp-detail-modal-actions {
      flex-direction: column;
    }

    .asrp-cancel-btn,
    .asrp-save-btn,
    .asrp-payout-btn {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .asrp-header-left {
      flex-direction: column;
    }

    .asrp-back-btn {
      width: 100%;
    }

    .asrp-header-actions {
      flex-direction: column;
    }

    .asrp-conversion-pill {
      width: 100%;
    }

    .asrp-tile-stats {
      grid-template-columns: 1fr;
    }
  }
`;

export default RedemptionPortal;