import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAward,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiStar,
  FiTrendingUp,
  FiDollarSign,
  FiCheckCircle,
  FiTarget,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./leaderboard.css";

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
    name: customer.name || customer.customer_name || customer.full_name || "Unknown Customer",
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

const MILESTONES = [
  { name: "Bronze Club", target: 5000, key: "bronze" },
  { name: "Silver Elite", target: 10000, key: "silver" },
  { name: "Gold Member", target: 25000, key: "gold" },
  { name: "Platinum Tier", target: 50000, key: "platinum" },
];

export default function Leaderboard({ onBack }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("pointsBalance");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [customersRes, transactionsRes] = await Promise.allSettled([
        api.get("/customers/"),
        api.get("/transactions/"),
      ]);

      const customersData = customersRes.status === "fulfilled" ? customersRes.value.data : [];
      const transactionsData = transactionsRes.status === "fulfilled" ? transactionsRes.value.data : [];

      setCustomers(normalizeCustomers(customersData));
      setTransactions(normalizeTransactions(transactionsData));
    } catch (err) {
      setError("Unable to load leaderboard data.");
      console.error(err);
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
        const oldDate = existing.lastActivity ? new Date(existing.lastActivity) : null;

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
      if (sortBy === "name") return String(a.name).localeCompare(String(b.name));
      if (sortBy === "totalEarned") return Number(b.totalEarned || 0) - Number(a.totalEarned || 0);
      if (sortBy === "totalRedeemed") return Number(b.totalRedeemed || 0) - Number(a.totalRedeemed || 0);
      if (sortBy === "rewardEntries") return Number(b.rewardEntries || 0) - Number(a.rewardEntries || 0);
      return Number(b.pointsBalance || 0) - Number(a.pointsBalance || 0);
    });

    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [customers, transactions, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(leaderboardData.length / rowsPerPage));
  const paginatedRows = leaderboardData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const topLeader = useMemo(() => {
    return leaderboardData.length > 0 ? leaderboardData[0] : null;
  }, [leaderboardData]);

  const milestoneStats = useMemo(() => {
    return MILESTONES.map((m) => {
      const qualified = leaderboardData.filter((c) => (c.pointsBalance || 0) >= m.target);
      const nextInLine = leaderboardData
        .filter((c) => (c.pointsBalance || 0) < m.target)
        .sort((a, b) => (b.pointsBalance || 0) - (a.pointsBalance || 0))[0];

      return {
        ...m,
        count: qualified.length,
        nextCandidate: nextInLine ? nextInLine.name : "All achieved",
        ptsNeeded: nextInLine ? Math.max(0, m.target - (nextInLine.pointsBalance || 0)) : 0,
      };
    });
  }, [leaderboardData]);

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
    if (rank === 1) return "rank-badge gold";
    if (rank === 2) return "rank-badge silver";
    if (rank === 3) return "rank-badge bronze";
    return "rank-badge";
  };

  return (
    <div className="directory-page">
      {/* PORTAL HEADER */}
      <PortalHeader
        title="Leaderboard"
        kicker="LOYALTY MANAGEMENT"
        description="Rank customers by points balance, earned points, redemption, and reward activity."
        icon={FiAward}
        backPath="/dashboard"
      />

      {error && (
        <div className="toast-notification error" style={{ position: "relative", transform: "none", top: 0, left: 0, width: "100%", maxWidth: "100%", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* STATS GRID (4 EQUAL COLUMNS) */}
      <div className="dir-stats-grid">
        <StatCard title="Total Customers" value={formatNumber(summary.totalCustomers)} Icon={FiUser} colorTheme="blue" />
        <StatCard title="Current Point Balance" value={formatNumber(summary.totalBalance)} Icon={FiStar} colorTheme="green" />
        <StatCard title="Total Earned Points" value={formatNumber(summary.totalEarned)} Icon={FiTrendingUp} colorTheme="purple" />
        <StatCard title="Redeemed Points" value={formatNumber(summary.totalRedeemed)} Icon={FiDollarSign} colorTheme="orange" />
      </div>

      {/* 4-COLUMN WORKSPACE: TABLE (COLUMNS 1-3) & SIDE PANEL (COLUMN 4) */}
      <div className="leaderboard-workspace-grid">
        {/* LEFT COLUMN: UNDER FIRST 3 STAT CARDS */}
        <div className="leaderboard-table-section">
          <ModuleWriternHeader
            title="Customer Rankings"
            description="Customers ranked by your selected sorting criteria."
            badgeCount={leaderboardData.length}
            badgeLabel="customers"
          />

          <div className="dir-controls">
            <div className="dir-search-box" style={{ flex: 1 }}>
              <FiSearch size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by customer name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <select
                className="dir-filter-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="pointsBalance">Point Balance</option>
                <option value="totalEarned">Earned Points</option>
                <option value="totalRedeemed">Redeemed Points</option>
                <option value="rewardEntries">Reward Entries</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          <div className="dir-table-container">
            <table className="dir-table">
              <thead>
                <tr>
                  <th className="th-lead-rank">Rank</th>
                  <th className="th-lead-customer">Customer</th>
                  <th className="th-lead-balance">Balance</th>
                  <th className="th-lead-earned">Earned</th>
                  <th className="th-lead-redeemed">Redeemed</th>
                  <th className="th-lead-entries">Entries</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((item) => {
                    const initials = String(item.name || "C").charAt(0).toUpperCase();

                    return (
                      <tr key={item.id} className="dir-table-row">
                        <td className="th-lead-rank">
                          <span className={getRankClass(item.rank)}>
                            #{item.rank}
                          </span>
                        </td>

                        <td className="th-lead-customer">
                          <div className="customer-cell">
                            <div className="staff-avatar">{initials}</div>
                            <span className="customer-name">{item.name}</span>
                          </div>
                        </td>

                        <td className="th-lead-balance">
                          <strong className="lead-balance-val">
                            {formatNumber(item.pointsBalance)}
                          </strong>
                        </td>

                        <td className="th-lead-earned">
                          <span className="lead-earned-val">
                            +{formatNumber(item.totalEarned)}
                          </span>
                        </td>

                        <td className="th-lead-redeemed">
                          <span className="lead-redeemed-val">
                            {Number(item.totalRedeemed) > 0 ? `-${formatNumber(item.totalRedeemed)}` : "0"}
                          </span>
                        </td>

                        <td className="th-lead-entries">
                          <span className="count-pill">{formatNumber(item.rewardEntries)}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <FiChevronLeft /> Prev
                </button>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#878e99" }}>
                  {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DIRECTLY UNDER 4th STAT CARD */}
        <aside className="leaderboard-side-panel">
          {/* Top Customer Spotlight */}
          {topLeader && (
            <div className="side-card spotlight-card">
              <div className="side-card-header">
                <span className="badge-kicker">Top Performer</span>
                <span className="rank-lead-tag">#1 Rank</span>
              </div>
              <div className="spotlight-body">
                <div className="spotlight-avatar">
                  {String(topLeader.name || "C").charAt(0).toUpperCase()}
                </div>
                <h3 className="spotlight-name">{topLeader.name}</h3>
                <p className="spotlight-sub">Leading with {formatNumber(topLeader.pointsBalance)} balance pts</p>

                <div className="spotlight-metrics-row">
                  <div>
                    <span>Total Earned</span>
                    <strong>+{formatNumber(topLeader.totalEarned)}</strong>
                  </div>
                  <div className="divider-v"></div>
                  <div>
                    <span>Entries</span>
                    <strong>{formatNumber(topLeader.rewardEntries)}</strong>
                  </div>
                  <div className="divider-v"></div>
                  <div>
                    <span>Redeemed</span>
                    <strong style={{ color: "#dc2626" }}>{formatNumber(topLeader.totalRedeemed)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tier Milestones Progress starting at 5,000 pts */}
          <div className="side-card milestones-card">
            <div className="side-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FiTarget size={14} color="#166962" />
                <h4 className="side-card-title">Loyalty Milestones</h4>
              </div>
              <span className="milestone-sub-tag">Club Thresholds</span>
            </div>

            <div className="milestones-list">
              {milestoneStats.map((tier) => {
                const percent = Math.min(100, Math.round((tier.count / Math.max(1, leaderboardData.length)) * 100));
                return (
                  <div className="milestone-row" key={tier.name}>
                    <div className="milestone-row-top">
                      <div className="tier-meta">
                        <span className={`tier-bullet-dot ${tier.key}`}></span>
                        <div>
                          <strong>{tier.name}</strong>
                          <small>{formatNumber(tier.target)} pts goal</small>
                        </div>
                      </div>
                      <span className="tier-unlocked-count">
                        {tier.count} customer{tier.count === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="milestone-progress-track">
                      <div
                        className="milestone-progress-fill"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    {tier.ptsNeeded > 0 ? (
                      <div className="milestone-next-line">
                        <span>Closest: <strong>{tier.nextCandidate}</strong></span>
                        <span>{formatNumber(tier.ptsNeeded)} pts to go</span>
                      </div>
                    ) : (
                      <div className="milestone-next-line achieved">
                        <FiCheckCircle size={11} />
                        <span>Achieved by all qualified</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}