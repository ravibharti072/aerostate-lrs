import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFileText,
  FiUsers,
  FiPackage,
  FiDollarSign,
  FiClock,
  FiAward,
  FiSliders,
  FiSearch,
  FiDownload,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiLayers,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./reports.css";

const REPORT_TABS = [
  { key: "rewardEntries", label: "Reward Entries", icon: FiFileText, hasDate: true },
  { key: "customers", label: "Customers", icon: FiUsers, hasDate: false },
  { key: "items", label: "Item Master", icon: FiPackage, hasDate: false },
  { key: "payouts", label: "Payout & Redemption", icon: FiDollarSign, hasDate: true },
  { key: "pointHistory", label: "Point History", icon: FiClock, hasDate: true },
  { key: "leaderboard", label: "Leaderboard", icon: FiAward, hasDate: false },
  { key: "amountAssignment", label: "Amount Assignment", icon: FiSliders, hasDate: false },
];

const ROWS_PER_PAGE = 25;

function normalizeList(payload, possibleKeys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of possibleKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.transactions)) return payload.transactions;
  if (Array.isArray(payload?.entries)) return payload.entries;
  return [];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPoints(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function escapeCsv(value) {
  const text = safeText(value, "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, columns, rows) {
  const header = columns.map((col) => escapeCsv(col.label)).join(",");
  const body = rows
    .map((row) => columns.map((col) => escapeCsv(col.value(row))).join(","))
    .join("\n");
  const csv = [header, body].filter(Boolean).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function fetchWithFallbacks(endpoints, keys = []) {
  for (const url of endpoints) {
    try {
      const res = await api.get(url);
      const list = normalizeList(res.data, keys);
      if (list && list.length > 0) return list;
      if (Array.isArray(res.data)) return res.data;
    } catch {
      // Try next endpoint
    }
  }
  return [];
}

export default function Reports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("rewardEntries");

  const [customers, setCustomers] = useState([]);
  const [rewardEntries, setRewardEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pointValue, setPointValue] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [custRes, entryRes, itemRes, payoutRes, txnRes, pointValRes] =
        await Promise.allSettled([
          fetchWithFallbacks(["/customers/", "/customers"], ["customers"]),
          fetchWithFallbacks(["/reward-entries/grouped?limit=150", "/reward-entries/", "/reward-entries"], ["entries"]),
          fetchWithFallbacks(["/loyalty/items", "/loyalty/items/", "/items/", "/items", "/products/"], ["items", "products"]),
          fetchWithFallbacks(["/payouts", "/payouts/"], ["payouts"]),
          fetchWithFallbacks(["/transactions/", "/transactions"], ["transactions"]),
          api.get("/settings/point-value"),
        ]);

      if (custRes.status === "fulfilled") setCustomers(custRes.value);
      if (entryRes.status === "fulfilled") setRewardEntries(entryRes.value);
      if (itemRes.status === "fulfilled") setItems(itemRes.value);
      if (payoutRes.status === "fulfilled") setPayouts(payoutRes.value);
      if (txnRes.status === "fulfilled") setTransactions(txnRes.value);

      if (pointValRes.status === "fulfilled") {
        const val = toNumber(
          pointValRes.value.data?.point_value_rupees ??
            pointValRes.value.data?.value ??
            pointValRes.value.data?.amount ??
            1
        );
        if (val > 0) setPointValue(val);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load reporting data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  }, [activeTab]);

  const auditSummary = useMemo(() => {
    const totalAvailablePoints = customers.reduce(
      (sum, c) => sum + toNumber(c.points_balance || 0),
      0
    );
    const pendingPayoutVal = totalAvailablePoints * pointValue;
    const totalRedemptionClaims = payouts.length;

    const totalRedeemedPoints = payouts.reduce(
      (sum, p) => sum + toNumber(p.points_redeemed || p.points || 0),
      0
    );
    const avgClaimPoints =
      totalRedemptionClaims > 0 ? totalRedeemedPoints / totalRedemptionClaims : 0;

    return {
      pendingPayoutVal,
      totalRedemptionClaims,
      avgClaimPoints,
      activeLedgersCount: 7,
    };
  }, [customers, payouts, pointValue]);

  const rewardEntryRows = useMemo(() => {
    return rewardEntries.map((entry, idx) => {
      const itemsPurchased =
        entry.item_names ||
        entry.items?.map((i) => `${i.name || i.item_name} (x${i.quantity || 1})`).join(", ") ||
        entry.item_name ||
        "Reward Purchase";

      return {
        id: entry.id || idx + 1,
        date: entry.created_at || entry.date || "",
        customerName: entry.customer_name || entry.customer?.name || "Customer",
        phone: entry.phone_number || entry.customer?.phone_number || "-",
        items: itemsPurchased,
        quantity: toNumber(entry.total_quantity || entry.quantity || 1),
        points: toNumber(entry.total_points || entry.points || 0),
        note: entry.note || entry.notes || "-",
      };
    });
  }, [rewardEntries]);

  const customerRows = useMemo(() => {
    return customers.map((c, idx) => {
      const balance = toNumber(c.points_balance || 0);
      const custPayouts = payouts.filter((p) => Number(p.customer_id) === Number(c.id));
      const totalRedeemed = custPayouts.reduce(
        (sum, p) => sum + toNumber(p.points_redeemed || p.points || 0),
        0
      );
      const totalEarned = balance + totalRedeemed;
      const hasBank = Boolean(c.bank_account_number || c.bank_name);

      return {
        id: c.id || idx + 1,
        name: c.name || "Unnamed Customer",
        phone: c.phone_number || c.phone || "-",
        earned: totalEarned,
        redeemed: totalRedeemed,
        balance,
        bankStatus: hasBank ? "Added" : "Missing",
      };
    });
  }, [customers, payouts]);

  const itemRows = useMemo(() => {
    return items.map((item, idx) => {
      const ptsUnit = toNumber(
        item.points_per_unit ??
          item.points ??
          item.point_value ??
          item.item_point_value ??
          0
      );
      const itemName = item.item_name || item.name || "Item";

      let totalQty = 0;
      rewardEntries.forEach((entry) => {
        if (entry.items && Array.isArray(entry.items)) {
          entry.items.forEach((subItem) => {
            if (
              Number(subItem.loyalty_item_id || subItem.item_id || subItem.id) === Number(item.id) ||
              String(subItem.item_name || subItem.name).toLowerCase() === String(itemName).toLowerCase()
            ) {
              totalQty += toNumber(subItem.quantity || 1);
            }
          });
        } else if (
          Number(entry.loyalty_item_id || entry.item_id) === Number(item.id) ||
          String(entry.item_name).toLowerCase() === String(itemName).toLowerCase()
        ) {
          totalQty += toNumber(entry.quantity || entry.total_quantity || 1);
        }
      });

      return {
        id: item.id || idx + 1,
        name: itemName,
        sku: item.sku || item.item_code || item.code || `ITM-${item.id || idx + 1}`,
        unit: item.unit || item.item_unit || "Unit",
        pointsPerUnit: ptsUnit,
        totalQuantity: totalQty,
        totalPointsGenerated: totalQty * ptsUnit,
      };
    });
  }, [items, rewardEntries]);

  const payoutReportRows = useMemo(() => {
    return payouts.map((p, idx) => {
      const pts = toNumber(p.points_redeemed || p.points || 0);
      const amount = toNumber(p.payout_value || p.amount || pts * pointValue);
      const statusRaw = String(p.status || "Paid").trim();

      return {
        id: p.id || idx + 1,
        customerName: p.customer_name || p.customer?.name || "Customer",
        amount,
        pointsRedeemed: pts,
        status: statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase(),
        dateRequested: p.created_at || p.date || "",
        datePaid: statusRaw.toLowerCase() === "paid" ? p.updated_at || p.created_at : "-",
      };
    });
  }, [payouts, pointValue]);

  const pointHistoryRows = useMemo(() => {
    return transactions.map((tx, idx) => {
      const pts = toNumber(tx.points || tx.total_points || 0);
      const type = String(tx.type || tx.transaction_type || "").toUpperCase();
      const isDebit = pts < 0 || type.includes("DEBIT") || type.includes("REDEEM");

      return {
        id: tx.id || idx + 1,
        date: tx.created_at || tx.date || "",
        customerName: tx.customer_name || tx.customer?.name || "Customer",
        points: Math.abs(pts),
        isDebit,
        runningBalance: toNumber(tx.balance_after || tx.current_balance || 0),
        source: isDebit ? "Redemption Claim" : "Reward Entry Purchase",
      };
    });
  }, [transactions]);

  const leaderboardRows = useMemo(() => {
    const list = [...customers].map((c) => {
      const balance = toNumber(c.points_balance || 0);
      const custPayouts = payouts.filter((p) => Number(p.customer_id) === Number(c.id));
      const totalRedeemed = custPayouts.reduce(
        (sum, p) => sum + toNumber(p.points_redeemed || p.points || 0),
        0
      );
      return {
        id: c.id,
        name: c.name || "Customer",
        phone: c.phone_number || "-",
        pointsBalance: balance,
        redeemedAmount: totalRedeemed * pointValue,
      };
    });

    list.sort((a, b) => b.pointsBalance - a.pointsBalance);
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [customers, payouts, pointValue]);

  const amountAssignmentRows = useMemo(() => {
    return [
      {
        rule: "Standard Loyalty Point Valuation",
        pointsUnit: "1 Point",
        rupeeEquivalent: `₹${formatAmount(pointValue)}`,
        effectiveDate: "Active Rate",
        status: "Enforced",
      },
      {
        rule: "Redemption Milestone (100 pts)",
        pointsUnit: "100 Points",
        rupeeEquivalent: `₹${formatAmount(100 * pointValue)}`,
        effectiveDate: "System Default",
        status: "Tier 1",
      },
      {
        rule: "Redemption Milestone (500 pts)",
        pointsUnit: "500 Points",
        rupeeEquivalent: `₹${formatAmount(500 * pointValue)}`,
        effectiveDate: "System Default",
        status: "Tier 2",
      },
    ];
  }, [pointValue]);

  const reportColumns = useMemo(() => {
    switch (activeTab) {
      case "rewardEntries":
        return [
          { label: "Date", value: (r) => formatDate(r.date) },
          { label: "Customer", value: (r) => r.customerName },
          { label: "Purchased Items", value: (r) => r.items },
          { label: "Qty", value: (r) => r.quantity, align: "center" },
          { label: "Points Earned", value: (r) => `+${formatPoints(r.points)}`, align: "right" },
          { label: "Note", value: (r) => r.note },
        ];
      case "customers":
        return [
          { label: "Customer Name", value: (r) => r.name },
          { label: "Phone", value: (r) => r.phone },
          { label: "Total Earned", value: (r) => formatPoints(r.earned), align: "right" },
          { label: "Total Redeemed", value: (r) => formatPoints(r.redeemed), align: "right" },
          { label: "Point Balance", value: (r) => formatPoints(r.balance), align: "right" },
          { label: "Bank Account", value: (r) => r.bankStatus, isBadge: true, align: "center" },
        ];
      case "items":
        return [
          { label: "Item Name", value: (r) => r.name },
          { label: "SKU / Code", value: (r) => r.sku },
          { label: "Unit", value: (r) => r.unit },
          { label: "Points / Unit", value: (r) => formatPoints(r.pointsPerUnit), align: "right" },
          { label: "Total Qty Sold", value: (r) => formatPoints(r.totalQuantity), align: "right" },
          { label: "Points Generated", value: (r) => formatPoints(r.totalPointsGenerated), align: "right" },
        ];
      case "payouts":
        return [
          { label: "Customer", value: (r) => r.customerName },
          { label: "Payout Amount", value: (r) => `₹${formatAmount(r.amount)}`, align: "right" },
          { label: "Points Redeemed", value: (r) => formatPoints(r.pointsRedeemed), align: "right" },
          { label: "Status", value: (r) => r.status, isStatusPill: true, align: "center" },
          { label: "Date Requested", value: (r) => formatDate(r.dateRequested) },
          { label: "Date Paid", value: (r) => (r.datePaid === "-" ? "-" : formatDate(r.datePaid)) },
        ];
      case "pointHistory":
        return [
          { label: "Timestamp", value: (r) => formatDate(r.date) },
          { label: "Customer", value: (r) => r.customerName },
          {
            label: "Points Transaction",
            value: (r) => `${r.isDebit ? "-" : "+"}${formatPoints(r.points)}`,
            align: "right",
            isDelta: true,
          },
          { label: "Balance After", value: (r) => formatPoints(r.runningBalance), align: "right" },
          { label: "Transaction Source", value: (r) => r.source },
        ];
      case "leaderboard":
        return [
          { label: "Rank", value: (r) => `#${r.rank}`, align: "center" },
          { label: "Customer Name", value: (r) => r.name },
          { label: "Phone", value: (r) => r.phone },
          { label: "Available Points", value: (r) => formatPoints(r.pointsBalance), align: "right" },
          { label: "Redeemed Value", value: (r) => `₹${formatAmount(r.redeemedAmount)}`, align: "right" },
        ];
      case "amountAssignment":
        return [
          { label: "Valuation Rule", value: (r) => r.rule },
          { label: "Points Base", value: (r) => r.pointsUnit },
          { label: "Rupee Value", value: (r) => r.rupeeEquivalent, align: "right" },
          { label: "Effective State", value: (r) => r.effectiveDate },
          { label: "Rule Status", value: (r) => r.status, isBadge: true, align: "center" },
        ];
      default:
        return [];
    }
  }, [activeTab]);

  const activeTabConfig = useMemo(
    () => REPORT_TABS.find((t) => t.key === activeTab) || REPORT_TABS[0],
    [activeTab]
  );

  const filteredRows = useMemo(() => {
    let list = [];
    switch (activeTab) {
      case "rewardEntries": list = rewardEntryRows; break;
      case "customers": list = customerRows; break;
      case "items": list = itemRows; break;
      case "payouts": list = payoutReportRows; break;
      case "pointHistory": list = pointHistoryRows; break;
      case "leaderboard": list = leaderboardRows; break;
      case "amountAssignment": list = amountAssignmentRows; break;
      default: list = [];
    }

    const search = searchTerm.trim().toLowerCase();
    return list.filter((row) => {
      const matchSearch =
        !search ||
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search)
        );

      let matchDate = true;
      if (activeTabConfig.hasDate && row.date) {
        const rowDate = new Date(row.date).toISOString().slice(0, 10);
        if (fromDate && rowDate < fromDate) matchDate = false;
        if (toDate && rowDate > toDate) matchDate = false;
      }
      return matchSearch && matchDate;
    });
  }, [
    activeTab,
    searchTerm,
    fromDate,
    toDate,
    activeTabConfig,
    rewardEntryRows,
    customerRows,
    itemRows,
    payoutReportRows,
    pointHistoryRows,
    leaderboardRows,
    amountAssignmentRows,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, currentPage]);

  const handleExportTabCsv = () => {
    const filename = `${activeTabConfig.label.toLowerCase().replace(/\s+/g, "_")}_report.csv`;
    downloadCsv(filename, reportColumns, filteredRows);
  };

  const handleExportAllReports = () => {
    const allLedgers = [
      { name: "Reward_Entries", cols: reportColumnsForTab("rewardEntries"), rows: rewardEntryRows },
      { name: "Customer_Directory", cols: reportColumnsForTab("customers"), rows: customerRows },
      { name: "Item_Master", cols: reportColumnsForTab("items"), rows: itemRows },
      { name: "Payout_Redemption", cols: reportColumnsForTab("payouts"), rows: payoutReportRows },
      { name: "Point_Ledger", cols: reportColumnsForTab("pointHistory"), rows: pointHistoryRows },
      { name: "Leaderboard", cols: reportColumnsForTab("leaderboard"), rows: leaderboardRows },
      { name: "Amount_Valuation", cols: reportColumnsForTab("amountAssignment"), rows: amountAssignmentRows },
    ];

    allLedgers.forEach((ledger) => {
      downloadCsv(`${ledger.name}_backup.csv`, ledger.cols, ledger.rows);
    });
  };

  return (
    <div className="directory-page">
      {error && (
        <div className="toast-notification error" style={{ position: "relative", transform: "none", top: 0, left: 0, width: "100%", maxWidth: "100%", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* PORTAL HEADER */}
      <PortalHeader
        title="Reports Hub"
        kicker="DATA EXPORT & AUDIT"
        description="Drill down and export audit-ready records across all loyalty management modules."
        icon={FiFileText}
        backPath="/dashboard"
        rightAction={
          <button type="button" className="btn-export-global" onClick={handleExportAllReports}>
            <FiLayers size={14} /> Export All Ledgers
          </button>
        }
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard
          title="Pending Payout Value"
          value={`₹${formatAmount(auditSummary.pendingPayoutVal)}`}
          Icon={FiDollarSign}
          colorTheme="purple"
        />
        <StatCard
          title="Redemption Claims"
          value={formatPoints(auditSummary.totalRedemptionClaims)}
          Icon={FiCheckCircle}
          colorTheme="blue"
        />
        <StatCard
          title="Avg Redemption Size"
          value={`${formatPoints(auditSummary.avgClaimPoints)} pts`}
          Icon={FiAward}
          colorTheme="orange"
        />
        <StatCard
          title="Auditable Ledgers"
          value="7 Modules"
          Icon={FiLayers}
          colorTheme="green"
        />
      </div>

      {/* TABS NAVIGATION */}
      <div className="reports-tab-nav">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              className={`report-tab-pill ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN MODULE SECTION */}
      <section className="dir-modules-section">
        <ModuleWriternHeader
          title={activeTabConfig.label}
          description={`Exportable ledger containing ${filteredRows.length} records.`}
          badgeCount={filteredRows.length}
          badgeLabel="records"
        />

        {/* UNIFIED CONTROLS BAR: SINGLE LINE LAYOUT WITH EXPORT BUTTON INLINE */}
        <div className="dir-controls">
          <div className="dir-search-box" style={{ flex: 1.5 }}>
            <FiSearch size={18} className="search-icon" />
            <input
              type="text"
              placeholder={`Search in ${activeTabConfig.label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="dir-controls-right">
            {activeTabConfig.hasDate && (
              <div className="date-filters-wrapper">
                <div className="date-input-group">
                  <span className="date-input-label">From</span>
                  <input
                    className="dir-filter-select"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="date-input-group">
                  <span className="date-input-label">To</span>
                  <input
                    className="dir-filter-select"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {(searchTerm || fromDate || toDate) && (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setSearchTerm("");
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear
              </button>
            )}

            <button
              type="button"
              className="btn-submit report-export-btn"
              onClick={handleExportTabCsv}
              disabled={filteredRows.length === 0}
            >
              <FiDownload size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="dir-table-container">
          <table className="dir-table">
            <thead>
              <tr>
                {reportColumns.map((col, i) => (
                  <th key={i} style={{ textAlign: col.align || "left" }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={reportColumns.length} className="empty-state">
                    Loading audit records...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={reportColumns.length} className="empty-state">
                    No matching records found for {activeTabConfig.label}.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIdx) => (
                  <tr key={row.id || rowIdx} className="dir-table-row">
                    {reportColumns.map((col, colIdx) => {
                      const val = col.value(row);

                      if (col.isStatusPill) {
                        const statusClass =
                          String(val).toLowerCase() === "paid"
                            ? "status-paid"
                            : String(val).toLowerCase() === "pending"
                            ? "status-pending"
                            : "status-unpaid";
                        return (
                          <td key={colIdx} style={{ textAlign: col.align || "left" }}>
                            <span className={`status-pill ${statusClass}`}>{val}</span>
                          </td>
                        );
                      }

                      if (col.isBadge) {
                        const isSuccess = val === "Added" || val === "Enforced";
                        return (
                          <td key={colIdx} style={{ textAlign: col.align || "left" }}>
                            <span className={`audit-badge ${isSuccess ? "green" : "gray"}`}>
                              {val}
                            </span>
                          </td>
                        );
                      }

                      if (col.isDelta) {
                        const isPositive = String(val).startsWith("+");
                        return (
                          <td key={colIdx} style={{ textAlign: col.align || "left" }}>
                            <span className={`tabular-delta ${isPositive ? "credit" : "debit"}`}>
                              {val}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={colIdx}
                          style={{ textAlign: col.align || "left" }}
                          className="tabular-cell"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))
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
                <FiChevronLeft /> Previous
              </button>
              <span className="pagination-text">
                Page {currentPage} of {totalPages}
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
      </section>
    </div>
  );
}

function reportColumnsForTab(tabKey) {
  switch (tabKey) {
    case "rewardEntries":
      return [
        { label: "Date", value: (r) => formatDate(r.date) },
        { label: "Customer", value: (r) => r.customerName },
        { label: "Purchased Items", value: (r) => r.items },
        { label: "Quantity", value: (r) => r.quantity },
        { label: "Points Earned", value: (r) => r.points },
        { label: "Note", value: (r) => r.note },
      ];
    case "customers":
      return [
        { label: "Customer Name", value: (r) => r.name },
        { label: "Phone", value: (r) => r.phone },
        { label: "Total Points Earned", value: (r) => r.earned },
        { label: "Total Points Redeemed", value: (r) => r.redeemed },
        { label: "Current Point Balance", value: (r) => r.balance },
        { label: "Bank Details Status", value: (r) => r.bankStatus },
      ];
    case "items":
      return [
        { label: "Item Name", value: (r) => r.name },
        { label: "SKU", value: (r) => r.sku },
        { label: "Unit", value: (r) => r.unit },
        { label: "Points Per Unit", value: (r) => r.pointsPerUnit },
        { label: "Total Sold Quantity", value: (r) => r.totalQuantity },
        { label: "Total Points Generated", value: (r) => r.totalPointsGenerated },
      ];
    case "payouts":
      return [
        { label: "Customer Name", value: (r) => r.customerName },
        { label: "Payout Amount (INR)", value: (r) => r.amount },
        { label: "Points Redeemed", value: (r) => r.pointsRedeemed },
        { label: "Status", value: (r) => r.status },
        { label: "Date Requested", value: (r) => formatDate(r.dateRequested) },
        { label: "Date Paid", value: (r) => r.datePaid },
      ];
    case "pointHistory":
      return [
        { label: "Timestamp", value: (r) => formatDate(r.date) },
        { label: "Customer Name", value: (r) => r.customerName },
        { label: "Points Delta", value: (r) => `${r.isDebit ? "-" : "+"}${r.points}` },
        { label: "Running Balance", value: (r) => r.runningBalance },
        { label: "Source", value: (r) => r.source },
      ];
    case "leaderboard":
      return [
        { label: "Rank", value: (r) => r.rank },
        { label: "Customer Name", value: (r) => r.name },
        { label: "Points Balance", value: (r) => r.pointsBalance },
        { label: "Redeemed Value (INR)", value: (r) => r.redeemedAmount },
      ];
    case "amountAssignment":
      return [
        { label: "Rule", value: (r) => r.rule },
        { label: "Points Base", value: (r) => r.pointsUnit },
        { label: "Rupee Valuation", value: (r) => r.rupeeEquivalent },
        { label: "Effective State", value: (r) => r.effectiveDate },
      ];
    default:
      return [];
  }
}