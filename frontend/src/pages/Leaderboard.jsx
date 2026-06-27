import React, { useEffect, useMemo, useState } from "react";
import {
  FiAward,
  FiSearch,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiPhone,
  FiStar,
  FiTrendingUp,
  FiDollarSign,
  FiArrowLeft,
  FiMapPin,
} from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

const getToken = () =>
  localStorage.getItem("aerostate_loyalty_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("aerostate_token") ||
  "";

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getCustomerId = (item) =>
  item.customer_id || item.id || item.customerId || item.customer?.id;

const normalizeCustomers = (data) => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.customers)
    ? data.customers
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return list.map((customer) => ({
    id: customer.id,
    name:
      customer.name ||
      customer.customer_name ||
      customer.full_name ||
      "Unknown Customer",
    phone: customer.phone || customer.phone_number || "-",
    address: customer.address || "-",
    pointsBalance: Number(
      customer.points_balance ??
        customer.point_balance ??
        customer.balance ??
        customer.total_points ??
        0
    ),
  }));
};

const normalizeTransactions = (data) => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.transactions)
    ? data.transactions
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return list.map((tx) => {
    const type = String(tx.type || tx.transaction_type || "").toLowerCase();
    const points = Number(tx.points ?? tx.total_points ?? 0);

    const isRedeem =
      type.includes("redeem") ||
      type.includes("payout") ||
      type.includes("debit") ||
      points < 0;

    return {
      customerId: getCustomerId(tx),
      customerName: tx.customer_name || tx.name || "Unknown Customer",
      phone: tx.phone_number || tx.phone || "-",
      points: Math.abs(points),
      rawPoints: points,
      isRedeem,
      createdAt: tx.created_at || tx.date || null,
    };
  });
};

export default function Leaderboard({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("pointsBalance");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 20;

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.location.href = "/dashboard";
  };

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [customersData, transactionsData] = await Promise.all([
        apiRequest("/customers/"),
        apiRequest("/transactions/").catch(() => []),
      ]);

      setCustomers(normalizeCustomers(customersData));
      setTransactions(normalizeTransactions(transactionsData));
    } catch (err) {
      setError(err.message || "Unable to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const leaderboardData = useMemo(() => {
    const statsMap = new Map();

    customers.forEach((customer) => {
      statsMap.set(customer.id, {
        ...customer,
        totalEarned: 0,
        totalRedeemed: 0,
        rewardEntries: 0,
        lastActivity: null,
      });
    });

    transactions.forEach((tx) => {
      if (!tx.customerId) return;

      const existing = statsMap.get(tx.customerId) || {
        id: tx.customerId,
        name: tx.customerName,
        phone: tx.phone,
        address: "-",
        pointsBalance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        rewardEntries: 0,
        lastActivity: null,
      };

      if (tx.isRedeem) {
        existing.totalRedeemed += tx.points;
      } else {
        existing.totalEarned += tx.points;
        existing.rewardEntries += 1;
      }

      if (tx.createdAt) {
        const txDate = new Date(tx.createdAt);
        const oldDate = existing.lastActivity
          ? new Date(existing.lastActivity)
          : null;

        if (!oldDate || txDate > oldDate) {
          existing.lastActivity = tx.createdAt;
        }
      }

      statsMap.set(tx.customerId, existing);
    });

    let list = Array.from(statsMap.values());

    const query = search.trim().toLowerCase();

    if (query) {
      list = list.filter((item) => {
        return (
          String(item.name).toLowerCase().includes(query) ||
          String(item.phone).toLowerCase().includes(query) ||
          String(item.address).toLowerCase().includes(query)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name).localeCompare(String(b.name));
      }

      if (sortBy === "totalEarned") {
        return Number(b.totalEarned || 0) - Number(a.totalEarned || 0);
      }

      if (sortBy === "totalRedeemed") {
        return Number(b.totalRedeemed || 0) - Number(a.totalRedeemed || 0);
      }

      if (sortBy === "rewardEntries") {
        return Number(b.rewardEntries || 0) - Number(a.rewardEntries || 0);
      }

      return Number(b.pointsBalance || 0) - Number(a.pointsBalance || 0);
    });

    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [customers, transactions, search, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(leaderboardData.length / rowsPerPage)
  );

  const paginatedRows = leaderboardData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const summary = useMemo(() => {
    return {
      totalCustomers: leaderboardData.length,
      totalBalance: leaderboardData.reduce(
        (sum, item) => sum + Number(item.pointsBalance || 0),
        0
      ),
      totalEarned: leaderboardData.reduce(
        (sum, item) => sum + Number(item.totalEarned || 0),
        0
      ),
      totalRedeemed: leaderboardData.reduce(
        (sum, item) => sum + Number(item.totalRedeemed || 0),
        0
      ),
    };
  }, [leaderboardData]);

  const getRankClass = (rank) => {
    if (rank === 1) return "asl-rank-badge gold";
    if (rank === 2) return "asl-rank-badge silver";
    if (rank === 3) return "asl-rank-badge bronze";
    return "asl-rank-badge";
  };

  return (
    <>
      <style>{leaderboardCss}</style>

      <div className="asl-leaderboard-page">
        <div className="asl-leaderboard-header">
          <div className="asl-leaderboard-header-left">
            <button
              type="button"
              className="asl-back-button"
              onClick={handleBack}
            >
              <FiArrowLeft />
              Back
            </button>

            <div className="asl-title-row">
              <div className="asl-title-icon">
                <FiAward />
              </div>

              <div>
                <h1 className="asl-page-title">Leaderboard</h1>
                <p className="asl-page-subtitle">
                  Rank customers by points balance, earned points, redemption,
                  and reward activity.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchLeaderboardData}
            className="asl-refresh-button"
            disabled={loading}
          >
            <FiRefreshCw />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && <div className="asl-error-box">{error}</div>}

        <div className="asl-summary-grid">
          <SummaryCard
            icon={<FiUser />}
            iconClass="blue"
            label="Total Customers"
            value={formatNumber(summary.totalCustomers)}
          />

          <SummaryCard
            icon={<FiStar />}
            iconClass="green"
            label="Current Point Balance"
            value={formatNumber(summary.totalBalance)}
          />

          <SummaryCard
            icon={<FiTrendingUp />}
            iconClass="purple"
            label="Total Earned Points"
            value={formatNumber(summary.totalEarned)}
          />

          <SummaryCard
            icon={<FiDollarSign />}
            iconClass="orange"
            label="Redeemed Points"
            value={formatNumber(summary.totalRedeemed)}
          />
        </div>

        <div className="asl-toolbar">
          <div className="asl-search-box">
            <FiSearch className="asl-search-icon" />

            <input
              type="text"
              placeholder="Search by customer name, phone, or address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="asl-search-input"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="asl-select"
          >
            <option value="pointsBalance">Sort by Point Balance</option>
            <option value="totalEarned">Sort by Earned Points</option>
            <option value="totalRedeemed">Sort by Redeemed Points</option>
            <option value="rewardEntries">Sort by Reward Entries</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="asl-table-card">
          <div className="asl-table-header">
            <h2 className="asl-section-title">Customer Rankings</h2>

            <span className="asl-count-badge">
              {leaderboardData.length} customers
            </span>
          </div>

          <div className="asl-table-wrap">
            <table className="asl-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="right">Point Balance</th>
                  <th className="right">Earned</th>
                  <th className="right">Redeemed</th>
                  <th className="right">Reward Entries</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="asl-empty-cell">
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="asl-empty-cell">
                      No leaderboard data found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={getRankClass(item.rank)}>
                          #{item.rank}
                        </span>
                      </td>

                      <td>
                        <div className="asl-customer-cell">
                          <div className="asl-avatar">
                            {String(item.name || "C").charAt(0).toUpperCase()}
                          </div>

                          <div className="asl-customer-text">
                            <div className="asl-customer-name">
                              {item.name}
                            </div>

                            <div className="asl-customer-address">
                              {item.address}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="asl-phone-text">
                          <FiPhone />
                          {item.phone}
                        </span>
                      </td>

                      <td className="right">
                        <span className="asl-points-pill">
                          {formatNumber(item.pointsBalance)}
                        </span>
                      </td>

                      <td className="right">
                        {formatNumber(item.totalEarned)}
                      </td>

                      <td className="right">
                        {formatNumber(item.totalRedeemed)}
                      </td>

                      <td className="right">
                        {formatNumber(item.rewardEntries)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="asl-mobile-list">
            {loading ? (
              <div className="asl-mobile-empty">Loading leaderboard...</div>
            ) : paginatedRows.length === 0 ? (
              <div className="asl-mobile-empty">No leaderboard data found.</div>
            ) : (
              paginatedRows.map((item) => (
                <MobileRankCard
                  key={item.id}
                  item={item}
                  getRankClass={getRankClass}
                />
              ))
            )}
          </div>

          <div className="asl-pagination">
            <button
              type="button"
              className="asl-page-button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <FiChevronLeft />
              Previous
            </button>

            <span className="asl-page-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="asl-page-button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              Next
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const SummaryCard = ({ icon, iconClass, label, value }) => (
  <div className="asl-summary-card">
    <div className={`asl-summary-icon ${iconClass}`}>{icon}</div>

    <div className="asl-summary-text">
      <p className="asl-summary-label">{label}</p>
      <h2 className="asl-summary-value">{value}</h2>
    </div>
  </div>
);

const MobileRankCard = ({ item, getRankClass }) => (
  <div className="asl-mobile-rank-card">
    <div className="asl-mobile-card-top">
      <div className="asl-mobile-customer">
        <div className="asl-avatar">
          {String(item.name || "C").charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="asl-customer-name">{item.name}</div>

          <div className="asl-phone-text mobile">
            <FiPhone />
            {item.phone}
          </div>
        </div>
      </div>

      <span className={getRankClass(item.rank)}>#{item.rank}</span>
    </div>

    <div className="asl-mobile-address">
      <FiMapPin />
      <span>{item.address}</span>
    </div>

    <div className="asl-mobile-stats">
      <div className="asl-mobile-stat balance">
        <span>Balance</span>
        <strong>{formatNumber(item.pointsBalance)}</strong>
      </div>

      <div className="asl-mobile-stat">
        <span>Earned</span>
        <strong>{formatNumber(item.totalEarned)}</strong>
      </div>

      <div className="asl-mobile-stat">
        <span>Redeemed</span>
        <strong>{formatNumber(item.totalRedeemed)}</strong>
      </div>

      <div className="asl-mobile-stat">
        <span>Entries</span>
        <strong>{formatNumber(item.rewardEntries)}</strong>
      </div>
    </div>
  </div>
);

const leaderboardCss = `
  .asl-leaderboard-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    color: #0f172a;
    padding: 18px 22px 28px;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asl-leaderboard-header {
    background-color: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 18px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
  }

  .asl-leaderboard-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .asl-back-button {
    height: 40px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid #dbeafe;
    background-color: #eff6ff;
    color: #2563eb;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    flex-shrink: 0;
  }

  .asl-title-row {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asl-title-icon {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background-color: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .asl-page-title {
    margin: 0;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #0f172a;
  }

  .asl-page-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.45;
  }

  .asl-refresh-button {
    height: 42px;
    padding: 0 16px;
    border-radius: 12px;
    border: none;
    background-color: #2563eb;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22);
    flex-shrink: 0;
  }

  .asl-error-box {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 14px 16px;
    border-radius: 14px;
    margin-bottom: 18px;
    font-weight: 700;
  }

  .asl-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .asl-summary-card {
    background-color: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 16px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
    min-width: 0;
  }

  .asl-summary-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .asl-summary-icon.blue {
    background-color: #eff6ff;
    color: #2563eb;
  }

  .asl-summary-icon.green {
    background-color: #ecfdf5;
    color: #059669;
  }

  .asl-summary-icon.purple {
    background-color: #f5f3ff;
    color: #7c3aed;
  }

  .asl-summary-icon.orange {
    background-color: #fff7ed;
    color: #ea580c;
  }

  .asl-summary-text {
    min-width: 0;
  }

  .asl-summary-label {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 800;
    line-height: 1.35;
  }

  .asl-summary-value {
    margin: 6px 0 0;
    font-size: 25px;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #0f172a;
    overflow-wrap: anywhere;
  }

  .asl-toolbar {
    display: flex;
    gap: 14px;
    margin-bottom: 16px;
    max-width: 100%;
  }

  .asl-search-box {
    flex: 1;
    min-width: 0;
    height: 46px;
    background-color: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 14px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 10px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.03);
  }

  .asl-search-icon {
    color: #64748b;
    flex-shrink: 0;
  }

  .asl-search-input {
    width: 100%;
    min-width: 0;
    border: none;
    outline: none;
    font-size: 14px;
    font-weight: 650;
    color: #0f172a;
    background-color: #ffffff;
  }

  .asl-select {
    height: 46px;
    min-width: 230px;
    border: 1px solid #dbe3ee;
    border-radius: 14px;
    background-color: #ffffff;
    padding: 0 14px;
    font-weight: 800;
    color: #0f172a;
    outline: none;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.03);
  }

  .asl-table-card {
    background-color: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
    max-width: 100%;
  }

  .asl-table-header {
    padding: 20px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #dbe3ee;
  }

  .asl-section-title {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
  }

  .asl-count-badge {
    background-color: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 13px;
    font-weight: 900;
    white-space: nowrap;
  }

  .asl-table-wrap {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .asl-table {
    width: 100%;
    min-width: 920px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .asl-table th {
    text-align: left;
    padding: 14px 18px;
    font-size: 12px;
    color: #64748b;
    background-color: #f8fafc;
    border-bottom: 1px solid #dbe3ee;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .asl-table th.right {
    text-align: right;
  }

  .asl-table td {
    padding: 15px 18px;
    vertical-align: middle;
    font-size: 14px;
    font-weight: 650;
    border-bottom: 1px solid #eef2f7;
    color: #0f172a;
  }

  .asl-table td.right {
    text-align: right;
    font-weight: 800;
  }

  .asl-empty-cell {
    padding: 40px !important;
    text-align: center;
    color: #64748b;
    font-weight: 800;
  }

  .asl-rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 46px;
    height: 30px;
    border-radius: 999px;
    background-color: #f1f5f9;
    color: #475569;
    font-weight: 900;
    font-size: 13px;
  }

  .asl-rank-badge.gold {
    background-color: #fef3c7;
    color: #b45309;
  }

  .asl-rank-badge.silver {
    background-color: #f1f5f9;
    color: #334155;
  }

  .asl-rank-badge.bronze {
    background-color: #ffedd5;
    color: #c2410c;
  }

  .asl-customer-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asl-avatar {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    background-color: #eef2ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    flex-shrink: 0;
  }

  .asl-customer-text {
    min-width: 0;
  }

  .asl-customer-name {
    font-weight: 900;
    color: #0f172a;
    overflow-wrap: anywhere;
  }

  .asl-customer-address {
    margin-top: 3px;
    font-size: 12px;
    color: #64748b;
    max-width: 280px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .asl-phone-text {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #334155;
    white-space: nowrap;
  }

  .asl-points-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 7px 12px;
    border-radius: 999px;
    background-color: #ecfdf5;
    color: #047857;
    font-weight: 900;
    white-space: nowrap;
  }

  .asl-mobile-list {
    display: none;
  }

  .asl-pagination {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid #dbe3ee;
    background-color: #ffffff;
  }

  .asl-page-button {
    height: 38px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid #dbe3ee;
    background-color: #ffffff;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 900;
    cursor: pointer;
  }

  .asl-page-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .asl-page-info {
    font-weight: 900;
    color: #64748b;
    text-align: center;
  }

  .asl-mobile-rank-card {
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  }

  .asl-mobile-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .asl-mobile-customer {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asl-phone-text.mobile {
    margin-top: 4px;
    font-size: 13px;
    white-space: normal;
  }

  .asl-mobile-address {
    margin-top: 12px;
    color: #64748b;
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 13px;
    line-height: 1.4;
  }

  .asl-mobile-address svg {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .asl-mobile-stats {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .asl-mobile-stat {
    background-color: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asl-mobile-stat.balance {
    background-color: #ecfdf5;
    border-color: #bbf7d0;
  }

  .asl-mobile-stat span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .asl-mobile-stat strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 15px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asl-mobile-empty {
    padding: 24px;
    text-align: center;
    color: #64748b;
    font-weight: 800;
  }

  @media (max-width: 1200px) {
    .asl-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .asl-leaderboard-page {
      padding: 14px 14px 28px;
    }

    .asl-leaderboard-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 18px;
    }

    .asl-leaderboard-header-left {
      width: 100%;
      align-items: flex-start;
    }

    .asl-refresh-button {
      width: 100%;
    }

    .asl-toolbar {
      flex-direction: column;
    }

    .asl-select {
      width: 100%;
      min-width: 0;
    }
  }

  @media (max-width: 768px) {
    .asl-leaderboard-page {
      padding: 12px 12px 26px;
    }

    .asl-leaderboard-header {
      border-radius: 16px;
      gap: 16px;
    }

    .asl-leaderboard-header-left {
      flex-direction: column;
      gap: 14px;
    }

    .asl-title-row {
      width: 100%;
      align-items: flex-start;
    }

    .asl-title-icon {
      width: 42px;
      height: 42px;
      border-radius: 13px;
    }

    .asl-page-title {
      font-size: 24px;
    }

    .asl-page-subtitle {
      font-size: 14px;
    }

    .asl-back-button {
      width: 100%;
    }

    .asl-summary-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asl-summary-card {
      padding: 16px;
    }

    .asl-summary-value {
      font-size: 23px;
    }

    .asl-search-box {
      height: auto;
      min-height: 46px;
    }

    .asl-table-header {
      padding: 16px;
      align-items: flex-start;
      flex-direction: column;
    }

    .asl-section-title {
      font-size: 18px;
    }

    .asl-table-wrap {
      display: none;
    }

    .asl-mobile-list {
      display: grid;
      gap: 12px;
      padding: 14px;
      background-color: #f8fafc;
    }

    .asl-pagination {
      padding: 14px;
      flex-wrap: wrap;
    }

    .asl-page-button {
      flex: 1;
      min-width: 130px;
    }

    .asl-page-info {
      width: 100%;
      order: -1;
    }
  }

  @media (max-width: 420px) {
    .asl-leaderboard-page {
      padding: 10px 10px 24px;
    }

    .asl-title-row {
      gap: 10px;
    }

    .asl-page-title {
      font-size: 22px;
    }

    .asl-summary-card {
      align-items: flex-start;
    }

    .asl-mobile-stats {
      grid-template-columns: 1fr;
    }

    .asl-pagination {
      flex-direction: column;
    }

    .asl-page-button {
      width: 100%;
    }
  }
`;