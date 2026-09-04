import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiDollarSign,
  FiUser,
  FiCreditCard,
  FiShoppingBag,
  FiPackage,
  FiAward,
  FiX,
  FiSearch,
  FiEye,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./payout.css";

export default function Payout({ onBack }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [rewardEntries, setRewardEntries] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);

  const [pointValue, setPointValue] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("balance_desc");

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
    if (Array.isArray(data?.transactions)) return data.transactions;
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

  const toNumber = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  };

  const sanitizeDecimalInput = (value) => {
    const cleanValue = String(value || "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");
    const parts = cleanValue.split(".");
    if (parts.length <= 1) return parts[0];
    return `${parts[0]}.${parts.slice(1).join("")}`;
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
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(", ");
    if (typeof detail === "string") return detail;
    return fallback;
  };

  const normalizeTransactionType = (transaction) => {
    return String(
      transaction?.transaction_type ||
        transaction?.type ||
        transaction?.entry_type ||
        transaction?.status ||
        ""
    )
      .trim()
      .toUpperCase();
  };

  const getTransactionPoints = (transaction) => {
    return toNumber(
      transaction?.points ??
        transaction?.total_points ??
        transaction?.points_redeemed ??
        transaction?.redeemed_points ??
        transaction?.redeem_points ??
        0
    );
  };

  const getTransactionAmount = (transaction) => {
    const amount = toNumber(
      transaction?.amount ??
        transaction?.payout_value ??
        transaction?.value ??
        transaction?.total_amount ??
        0
    );
    if (amount > 0) return amount;
    return Math.abs(getTransactionPoints(transaction)) * Number(pointValue || 0);
  };

  const isRedeemedTransaction = (transaction) => {
    const type = normalizeTransactionType(transaction);
    const points = getTransactionPoints(transaction);

    if (points < 0) return true;

    return (
      type === "POINTS_DEBIT" ||
      type === "DEBIT" ||
      type === "REDEEM" ||
      type === "REDEEMED" ||
      type === "USED" ||
      type === "MANUAL_DEDUCT" ||
      type === "PAYOUT" ||
      type.includes("REDEEM") ||
      type.includes("DEBIT") ||
      type.includes("USED") ||
      type.includes("PAYOUT")
    );
  };

  const getPayoutPoints = (payout) => {
    return Math.abs(
      toNumber(
        payout?.points_redeemed ??
          payout?.pointsRedeemed ??
          payout?.redeem_points ??
          payout?.redeemed_points ??
          payout?.points ??
          0
      )
    );
  };

  const getPayoutAmount = (payout) => {
    const amount = toNumber(payout?.payout_value ?? payout?.amount ?? 0);
    if (amount > 0) return amount;
    return getPayoutPoints(payout) * Number(pointValue || 0);
  };

  const getCustomerRedeemStatsFromTransactions = (customerId) => {
    const customerTransactions = transactions.filter((transaction) => {
      return (
        Number(transaction.customer_id) === Number(customerId) &&
        isRedeemedTransaction(transaction)
      );
    });

    const totalRedeemed = customerTransactions.reduce((sum, transaction) => {
      return sum + Math.abs(getTransactionPoints(transaction));
    }, 0);

    const totalPayoutValue = customerTransactions.reduce((sum, transaction) => {
      return sum + getTransactionAmount(transaction);
    }, 0);

    return {
      totalRedeemed,
      totalPayoutValue,
      payoutCount: customerTransactions.length,
    };
  };

  const getCustomerRedeemStatsFromPayouts = (customerId) => {
    const customerPayouts = payouts.filter(
      (payout) => Number(payout.customer_id) === Number(customerId)
    );

    const totalRedeemed = customerPayouts.reduce((sum, payout) => {
      return sum + getPayoutPoints(payout);
    }, 0);

    const totalPayoutValue = customerPayouts.reduce((sum, payout) => {
      return sum + getPayoutAmount(payout);
    }, 0);

    return {
      totalRedeemed,
      totalPayoutValue,
      payoutCount: customerPayouts.length,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [customerRes, rewardRes, payoutRes, transactionRes, pointValueRes] =
        await Promise.allSettled([
          api.get("/customers/"),
          api.get("/reward-entries/"),
          api.get("/payouts"),
          api.get("/transactions/"),
          api.get("/settings/point-value"),
        ]);

      const customerList = customerRes.status === "fulfilled" ? normalizeList(customerRes.value.data) : [];
      const rewardList = rewardRes.status === "fulfilled" ? normalizeList(rewardRes.value.data) : [];
      const payoutList = payoutRes.status === "fulfilled" ? normalizeList(payoutRes.value.data) : [];
      const transactionList = transactionRes.status === "fulfilled" ? normalizeList(transactionRes.value.data) : [];

      if (pointValueRes.status === "fulfilled") {
        const value = normalizePointValue(pointValueRes.value.data);
        if (value > 0) {
          setPointValue(value);
        }
      }

      setCustomers(customerList);
      setRewardEntries(rewardList);
      setPayouts(payoutList);
      setTransactions(transactionList);
      setTransactionsLoaded(transactionRes.status === "fulfilled");

      setSelectedCustomer((prevSelected) => {
        if (!prevSelected) return null;
        return customerList.find((customer) => Number(customer.id) === Number(prevSelected.id)) || null;
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
      const quantity = Number(entry.quantity || 0);
      const pointsPerUnit = Number(entry.points_per_unit || 0);

      if (quantity > 0 && pointsPerUnit > 0) {
        return sum + quantity * pointsPerUnit;
      }
      return sum + Number(entry.total_points || entry.points || 0);
    }, 0);

    const redeemStats = transactionsLoaded
      ? getCustomerRedeemStatsFromTransactions(customerId)
      : getCustomerRedeemStatsFromPayouts(customerId);

    return {
      timesBought: uniqueEntryIds.size,
      totalItemsBought,
      totalRewardPoints,
      totalRedeemed: redeemStats.totalRedeemed,
      totalPayoutValue: redeemStats.totalPayoutValue,
      payoutCount: redeemStats.payoutCount,
    };
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    let list = customers.filter((customer) => {
      const name = String(customer.name || "").toLowerCase();
      const phone = String(customer.phone_number || customer.phone || "").toLowerCase();
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

      if (sortBy === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
      if (sortBy === "name_desc") return String(b.name || "").localeCompare(String(a.name || ""), "en", { sensitivity: "base" });
      if (sortBy === "balance_asc") return Number(a.points_balance || 0) - Number(b.points_balance || 0);
      if (sortBy === "redeemed_desc") return Number(bStats.totalRedeemed || 0) - Number(aStats.totalRedeemed || 0);
      if (sortBy === "payout_desc") return Number(bStats.totalPayoutValue || 0) - Number(aStats.totalPayoutValue || 0);

      return Number(b.points_balance || 0) - Number(a.points_balance || 0);
    });

    return list;
  }, [customers, searchTerm, balanceFilter, sortBy, rewardEntries, payouts, transactions, transactionsLoaded, pointValue]);

  const selectedStats = selectedCustomer ? getCustomerStats(selectedCustomer.id) : null;

  const availablePoints = Number(selectedCustomer?.points_balance || 0);
  const payoutPoints = Number(payoutForm.points_redeemed || 0);
  const payoutAmount = payoutPoints * Number(pointValue || 0);

  const pageSummary = useMemo(() => {
    const totalAvailablePoints = customers.reduce((sum, customer) => sum + Number(customer.points_balance || 0), 0);
    let totalRedeemedPoints = 0;
    let totalPayoutValue = 0;

    if (transactionsLoaded) {
      const redeemedTransactions = transactions.filter(isRedeemedTransaction);
      totalRedeemedPoints = redeemedTransactions.reduce((sum, transaction) => sum + Math.abs(getTransactionPoints(transaction)), 0);
      totalPayoutValue = redeemedTransactions.reduce((sum, transaction) => sum + getTransactionAmount(transaction), 0);
    } else {
      totalRedeemedPoints = payouts.reduce((sum, payout) => sum + getPayoutPoints(payout), 0);
      totalPayoutValue = payouts.reduce((sum, payout) => sum + getPayoutAmount(payout), 0);
    }

    return {
      totalCustomers: customers.length,
      totalAvailablePoints,
      totalRedeemedPoints,
      totalPayoutValue,
    };
  }, [customers, payouts, transactions, transactionsLoaded, pointValue]);

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
    setPayoutForm({ points_redeemed: "", note: "" });
    setPayoutModalOpen(true);
  };

  const closePayoutModal = () => {
    setPayoutModalOpen(false);
    setPayoutForm({ points_redeemed: "", note: "" });
  };

  const handlePayoutChange = (event) => {
    const { name, value } = event.target;

    if (name === "points_redeemed") {
      const sanitizedValue = sanitizeDecimalInput(value);
      if (sanitizedValue === "") {
        setPayoutForm((prev) => ({ ...prev, points_redeemed: "" }));
        return;
      }

      const enteredPoints = Number(sanitizedValue);
      const maxPoints = Number(selectedCustomer?.points_balance || 0);

      if (!Number.isFinite(enteredPoints)) {
        setPayoutForm((prev) => ({ ...prev, points_redeemed: "" }));
        return;
      }

      if (enteredPoints > maxPoints) {
        showToast("error", `You cannot redeem more than ${formatPoints(maxPoints)} available points.`);
        setPayoutForm((prev) => ({ ...prev, points_redeemed: String(maxPoints) }));
        return;
      }

      setPayoutForm((prev) => ({ ...prev, points_redeemed: sanitizedValue }));
      return;
    }

    setPayoutForm((prev) => ({ ...prev, [name]: value }));
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
      showToast("error", `Redeem points cannot be greater than available points. Available: ${formatPoints(availablePoints)}`);
      return;
    }

    try {
      setSaving(true);
      await api.post("/payouts", {
        customer_id: Number(selectedCustomer.id),
        points_redeemed: payoutPoints,
        payout_value: payoutAmount,
        point_value_rupees: Number(pointValue),
        note: payoutForm.note || `Payout redemption: ${payoutPoints} points × ₹${pointValue} = ₹${formatAmount(payoutAmount)}`,
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
  };

  return (
    <div className="directory-page">
      {toast.message && (
        <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      {/* PORTAL HEADER */}
      <PortalHeader 
        title="Payout / Redemption" 
        kicker="LOYALTY MANAGEMENT"
        description="Redeem customer points and calculate payout amount using your configured point valuation."
        icon={FiDollarSign} 
        backPath="/dashboard" 
        rightAction={
          <span className="payout-conversion-badge">
            1 Point = ₹{formatAmount(pointValue)}
          </span>
        }
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard title="Total Customers" value={formatPoints(pageSummary.totalCustomers)} Icon={FiUser} colorTheme="blue" />
        <StatCard title="Available Points" value={formatPoints(pageSummary.totalAvailablePoints)} Icon={FiAward} colorTheme="green" />
        <StatCard title="Redeemed Points" value={formatPoints(pageSummary.totalRedeemedPoints)} Icon={FiDollarSign} colorTheme="orange" />
        <StatCard title="Payout Value" value={`₹${formatAmount(pageSummary.totalPayoutValue)}`} Icon={FiCreditCard} colorTheme="purple" />
      </div>

      <section className="dir-modules-section">
        <ModuleWriternHeader 
          title="Customer Payout Balances"
          description="View balances and click any row to inspect customer history or process payouts."
          badgeCount={filteredCustomers.length}
          badgeLabel="customers"
        />

        {/* CONTROLS */}
        <div className="dir-controls">
          <div className="dir-search-box" style={{ flex: 1.5 }}>
            <FiSearch size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search customer, bank, account, or IFSC..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select className="dir-filter-select" value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
              <option value="all">All Balances</option>
              <option value="with_points">With Balance</option>
              <option value="no_points">Zero Balance</option>
              <option value="redeemed">Redeemed Before</option>
            </select>

            <select className="dir-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="balance_desc">High Balance First</option>
              <option value="balance_asc">Low Balance First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="redeemed_desc">Most Redeemed</option>
              <option value="payout_desc">Highest Payout</option>
            </select>

            <button className="btn-cancel" style={{ height: '38px', padding: '0 16px' }} onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>

        {/* UNIFIED DESIGN TABLE */}
        <div className="dir-table-container">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="th-payout-customer">Customer</th>
                <th className="th-payout-bank">Bank Details</th>
                <th className="th-payout-buys">Buys</th>
                <th className="th-payout-redeemed">Redeemed</th>
                <th className="th-payout-balance">Available Balance</th>
                <th className="th-payout-action"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="empty-state">Loading customer records...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No matching customers found.</td></tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const stats = getCustomerStats(customer.id);
                  const initials = String(customer.name || "C").charAt(0).toUpperCase();
                  const hasBank = customer.bank_name || customer.bank_account_number;
                  const balance = Number(customer.points_balance || 0);

                  return (
                    <tr
                      key={customer.id}
                      className="dir-table-row"
                      onClick={() => openCustomerDetails(customer)}
                    >
                      {/* Customer (1-line: Avatar + Name) */}
                      <td className="th-payout-customer">
                        <div className="customer-cell">
                          <div className="staff-avatar">{initials}</div>
                          <span className="customer-name">{customer.name || "Unnamed Customer"}</span>
                        </div>
                      </td>

                      {/* Bank Details (1-line) */}
                      <td className="th-payout-bank">
                        {hasBank ? (
                          <span className="truncate-cell bank-line-text" title={`${customer.bank_name || "Bank"} • ${maskAccountNumber(customer.bank_account_number)}${customer.ifsc_code ? ` • ${customer.ifsc_code}` : ""}`}>
                            <strong>{customer.bank_name || "Bank"}</strong> • {maskAccountNumber(customer.bank_account_number)}
                            {customer.ifsc_code ? ` • ${customer.ifsc_code}` : ""}
                          </span>
                        ) : (
                          <span className="text-muted">Not added</span>
                        )}
                      </td>

                      {/* Times Bought (1-line) */}
                      <td className="th-payout-buys">
                        <span className="count-pill">{stats.timesBought}</span>
                      </td>

                      {/* Total Redeemed Points */}
                      <td className="th-payout-redeemed">
                        <span className="single-line-text">{formatPoints(stats.totalRedeemed)} pts</span>
                      </td>

                      {/* Available Balance (Highlighted) */}
                      <td className="th-payout-balance">
                        <div className="balance-column-val">
                          <strong className="balance-pts">{formatPoints(balance)} pts</strong>
                          <span className="balance-cash-sub">≈ ₹{formatAmount(balance * pointValue)}</span>
                        </div>
                      </td>

                      {/* Row Action */}
                      <td className="th-payout-action" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="dir-row-edit-btn"
                          onClick={() => openCustomerDetails(customer)}
                          title="View Payout Options"
                        >
                          <FiEye size={14} />
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

      {/* DETAIL INSPECTION MODAL */}
      {detailModalOpen && selectedCustomer && (
        <div className="modal-overlay" onClick={closeCustomerDetails}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedCustomer.name}</h2>
                <p className="modal-kicker">Redemption Overview</p>
              </div>
              <button className="modal-close" onClick={closeCustomerDetails}><FiX size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="payout-balance-banner">
                <p>Available Points</p>
                <h2>{formatPoints(availablePoints)} pts</h2>
                <span>Estimated Value: ₹{formatAmount(availablePoints * pointValue)}</span>
                <small>Conversion Rate: 1 Point = ₹{formatAmount(pointValue)}</small>
              </div>

              <div className="payout-detail-stats">
                <div className="detail-stat-box">
                  <div className="icon-wrapper blue"><FiShoppingBag /></div>
                  <p>Transactions</p>
                  <strong>{formatPoints(selectedStats?.timesBought || 0)}</strong>
                </div>
                <div className="detail-stat-box">
                  <div className="icon-wrapper green"><FiPackage /></div>
                  <p>Items Bought</p>
                  <strong>{formatPoints(selectedStats?.totalItemsBought || 0)}</strong>
                </div>
                <div className="detail-stat-box">
                  <div className="icon-wrapper orange"><FiAward /></div>
                  <p>Points Earned</p>
                  <strong>{formatPoints(selectedStats?.totalRewardPoints || 0)}</strong>
                </div>
                <div className="detail-stat-box">
                  <div className="icon-wrapper red"><FiDollarSign /></div>
                  <p>Redeemed</p>
                  <strong>{formatPoints(selectedStats?.totalRedeemed || 0)}</strong>
                </div>
              </div>

              <div className="payout-info-grid">
                <div className="info-box">
                  <span className="info-label">Customer Profile</span>
                  <div className="info-content">
                    <div><strong>Name:</strong> {selectedCustomer.name || "-"}</div>
                    <div><strong>Address:</strong> {selectedCustomer.address || "Not added"}</div>
                  </div>
                </div>
                <div className="info-box">
                  <span className="info-label">Bank Payout Info</span>
                  <div className="info-content">
                    <div><strong>Bank:</strong> {selectedCustomer.bank_name || "Not added"}</div>
                    <div><strong>A/C:</strong> {selectedCustomer.bank_account_number || "Not added"}</div>
                    <div><strong>IFSC:</strong> {selectedCustomer.ifsc_code || "Not added"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeCustomerDetails}>Close</button>
              <button
                type="button"
                className="btn-payout-action"
                disabled={availablePoints <= 0}
                onClick={openPayoutModal}
              >
                <FiDollarSign size={15} /> Redeem Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REDEEM / PAYOUT FORM MODAL */}
      {payoutModalOpen && selectedCustomer && (
        <div className="modal-overlay nested-modal" onClick={closePayoutModal}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Redeem Points</h2>
                <p className="modal-kicker">{selectedCustomer.name}</p>
              </div>
              <button className="modal-close" onClick={closePayoutModal} disabled={saving}><FiX size={20} /></button>
            </div>

            <form onSubmit={submitPayout}>
              <div className="modal-body">
                <div className="payout-mini-profile">
                  <div>
                    <strong>{selectedCustomer.name}</strong>
                    <span className="balance-hint">Max Redeemable: {formatPoints(availablePoints)} pts</span>
                  </div>
                  <div className="balance-tag">
                    {formatPoints(availablePoints)} pts
                  </div>
                </div>

                <div className="form-group">
                  <label>Redeem Points *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="points_redeemed"
                    value={payoutForm.points_redeemed}
                    onChange={handlePayoutChange}
                    placeholder={`Enter points (1 - ${formatPoints(availablePoints)})`}
                    required
                    autoFocus
                  />
                </div>

                <div className="payout-calculation-box">
                  <p>Calculated Payout Amount</p>
                  <h2>₹{formatAmount(payoutAmount)}</h2>
                  <span>{formatPoints(payoutPoints || 0)} points × ₹{formatAmount(pointValue)}</span>
                </div>

                <div className="form-group">
                  <label>Note (Optional)</label>
                  <textarea
                    name="note"
                    value={payoutForm.note}
                    onChange={handlePayoutChange}
                    placeholder="Add payment method, cheque number, or transaction ID..."
                    className="asr-modal-textarea"
                    rows={2}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closePayoutModal} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving || payoutPoints <= 0}>
                  {saving ? "Processing..." : "Confirm Redemption"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}