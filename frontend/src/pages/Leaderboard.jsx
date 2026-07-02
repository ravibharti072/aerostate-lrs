import React, { useEffect, useMemo, useState } from "react";
import {
  FiAward,
  FiSearch,
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
        <section className="asl-header-card">
          <div className="asl-header-left">
            <button
              type="button"
              className="asl-back-button"
              onClick={handleBack}
            >
              <FiArrowLeft />
              Back
            </button>

            <div className="asl-title-icon">
              <FiAward />
            </div>

            <div>
              <h1 className="asl-page-title">Leaderboard</h1>
              <p className="asl-page-subtitle">
                Rank customers by points balance, earned points, redemption, and
                reward activity.
              </p>
            </div>
          </div>
        </section>

        {error && <div className="asl-error-box">{error}</div>}

        <section className="asl-summary-grid">
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
        </section>

        <section className="asl-toolbar-card">
          <div className="asl-search-box">
            <FiSearch className="asl-search-icon" />

            <input
              type="text"
              placeholder="Search by customer name, phone, or address..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              className="asl-search-input"
            />
          </div>

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
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
        </section>

        <section className="asl-table-card">
          <div className="asl-table-header">
            <div>
              <h2 className="asl-section-title">Customer Rankings</h2>
              <p className="asl-section-subtitle">
                Customers ranked by selected sorting method.
              </p>
            </div>

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
                            <div className="asl-customer-name">{item.name}</div>
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
        </section>
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
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asl-header-card {
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

  .asl-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asl-back-button {
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

  .asl-back-button:hover {
    background: #dbeafe;
  }

  .asl-title-icon {
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

  .asl-page-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asl-page-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asl-page-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .asl-error-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 13px 16px;
    border-radius: 14px;
    margin-bottom: 18px;
    font-weight: 800;
  }

  .asl-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asl-summary-card {
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

  .asl-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asl-summary-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asl-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asl-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .asl-summary-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asl-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asl-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 26px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .asl-toolbar-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 10px;
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 240px;
    gap: 12px;
    margin-bottom: 18px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .asl-search-box {
    height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 13px;
    color: #94a3b8;
  }

  .asl-search-icon {
    color: #94a3b8;
    flex-shrink: 0;
  }

  .asl-search-input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    min-width: 0;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .asl-select {
    height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    padding: 0 12px;
    font-weight: 900;
    outline: none;
  }

  .asl-table-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
    max-width: 100%;
  }

  .asl-table-header {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .asl-section-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asl-section-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
  }

  .asl-count-badge {
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

  .asl-table-wrap {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .asl-table {
    width: 100%;
    min-width: 980px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .asl-table th {
    background: #f8fafc;
    color: #64748b;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 950;
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  .asl-table th.right {
    text-align: right;
  }

  .asl-table td {
    padding: 16px;
    border-bottom: 1px solid #eef2f7;
    vertical-align: middle;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .asl-table td.right {
    text-align: right;
    font-weight: 900;
  }

  .asl-table tbody tr:hover {
    background: #f8fafc;
  }

  .asl-empty-cell {
    padding: 40px !important;
    text-align: center;
    color: #64748b;
    font-weight: 850;
  }

  .asl-rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 46px;
    height: 30px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-weight: 950;
    font-size: 13px;
  }

  .asl-rank-badge.gold {
    background: #fef3c7;
    color: #b45309;
  }

  .asl-rank-badge.silver {
    background: #f1f5f9;
    color: #334155;
  }

  .asl-rank-badge.bronze {
    background: #ffedd5;
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
    border-radius: 12px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-weight: 950;
    flex-shrink: 0;
  }

  .asl-customer-text {
    min-width: 0;
  }

  .asl-customer-name {
    font-weight: 950;
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
    font-weight: 750;
  }

  .asl-phone-text {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #334155;
    white-space: nowrap;
    font-weight: 900;
  }

  .asl-points-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 7px 12px;
    border-radius: 999px;
    background: #ecfdf5;
    color: #047857;
    font-weight: 950;
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
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .asl-page-button {
    height: 40px;
    padding: 0 15px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 950;
    cursor: pointer;
  }

  .asl-page-info {
    font-weight: 950;
    color: #64748b;
    text-align: center;
  }

  .asl-mobile-rank-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px;
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
    font-weight: 750;
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
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }

  .asl-mobile-stat.balance {
    background: #ecfdf5;
    border-color: #bbf7d0;
  }

  .asl-mobile-stat span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
  }

  .asl-mobile-stat strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asl-mobile-empty {
    padding: 24px;
    text-align: center;
    color: #64748b;
    font-weight: 850;
  }

  @media (max-width: 1200px) {
    .asl-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asl-toolbar-card {
      grid-template-columns: 1fr;
    }

    .asl-select {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .asl-leaderboard-page {
      padding: 12px;
    }

    .asl-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asl-header-left {
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .asl-title-icon {
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    .asl-page-title {
      font-size: 23px;
    }

    .asl-summary-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asl-summary-value {
      font-size: 23px;
    }

    .asl-table-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .asl-table-wrap {
      display: none;
    }

    .asl-mobile-list {
      display: grid;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
    }

    .asl-pagination {
      padding: 14px;
      flex-wrap: wrap;
    }

    .asl-page-info {
      width: 100%;
      order: -1;
    }

    .asl-page-button {
      flex: 1;
      min-width: 130px;
    }
  }

  @media (max-width: 420px) {
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