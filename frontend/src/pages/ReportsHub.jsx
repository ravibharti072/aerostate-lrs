import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCalendar,
  FiCreditCard,
  FiDownload,
  FiFileText,
  FiGrid,
  FiPackage,
  FiPieChart,
  FiPrinter,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import api from "../api/axios";

const styles = `
.reports-page {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
  overflow-x: hidden;
}

.reports-header-card {
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

.reports-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.report-back-btn {
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

.report-back-btn:hover {
  background: #dbeafe;
}

.reports-title-icon {
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

.reports-title {
  margin: 0;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.reports-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
}

.reports-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.report-action-btn {
  border: none;
  background: #2563eb;
  color: #ffffff;
  height: 46px;
  padding: 0 18px;
  border-radius: 13px;
  font-weight: 950;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
}

.report-action-btn.secondary {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  box-shadow: none;
}

.report-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.report-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 13px 16px;
  border-radius: 14px;
  margin-bottom: 18px;
  font-weight: 800;
}

.report-section-title {
  margin: 0;
  font-size: 19px;
  font-weight: 950;
}

.report-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.report-summary-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  gap: 15px;
  align-items: center;
  min-width: 0;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.report-summary-icon {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-size: 21px;
}

.report-summary-label {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.report-summary-value {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.03em;
  color: #0f172a;
  line-height: 1;
  word-break: break-word;
}

.report-charts-grid {
  display: grid;
  grid-template-columns: 1.3fr 0.85fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}

.report-chart-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 18px;
  min-height: 260px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.report-chart-title {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 950;
  color: #0f172a;
}

.simple-bar-row {
  margin-bottom: 14px;
}

.simple-bar-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  font-weight: 850;
  margin-bottom: 7px;
  color: #334155;
}

.simple-bar-track {
  width: 100%;
  height: 11px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.simple-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #22c55e);
  border-radius: 999px;
}

.donut-wrap {
  display: grid;
  place-items: center;
  gap: 13px;
}

.donut-chart {
  width: 145px;
  height: 145px;
  border-radius: 50%;
  position: relative;
}

.donut-chart::after {
  content: "";
  position: absolute;
  inset: 28px;
  background: #ffffff;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
}

.donut-center {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  text-align: center;
  font-weight: 950;
  color: #0f172a;
  font-size: 13px;
  padding: 35px;
  word-break: break-word;
}

.donut-legend {
  display: grid;
  gap: 8px;
  width: 100%;
}

.legend-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 850;
  color: #334155;
}

.legend-left {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot.blue {
  background: #2563eb;
}

.legend-dot.orange {
  background: #f97316;
}

.reports-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  margin-bottom: 18px;
}

.reports-card-head {
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  background: #ffffff;
}

.reports-card-title {
  margin: 0;
  color: #0f172a;
  font-size: 19px;
  font-weight: 950;
}

.reports-card-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
}

.report-record-badge {
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

.report-tiles-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
}

.report-tile {
  min-height: 118px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  cursor: pointer;
  transition: 0.2s ease;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.report-tile:hover {
  transform: translateY(-2px);
  border-color: #bfdbfe;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.08);
}

.report-tile-icon {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  font-size: 21px;
  flex: 0 0 auto;
  background: #eff6ff;
  color: #2563eb;
}

.report-tile-title {
  margin: 0;
  font-size: 15px;
  font-weight: 950;
  color: #0f172a;
}

.report-tile-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
  font-weight: 650;
}

.report-tile-badge {
  display: inline-flex;
  margin-top: 10px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.report-filters {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(280px, 1.5fr) 1fr 1fr;
  gap: 12px;
  margin-bottom: 18px;
  align-items: end;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.report-filter-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: flex-end;
}

.report-filter-group label {
  font-size: 12px;
  font-weight: 950;
  color: #64748b;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.report-search-box {
  position: relative;
  width: 100%;
}

.report-search-box svg {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.report-input {
  width: 100%;
  height: 44px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  color: #0f172a;
  font-weight: 750;
}

.report-search-box .report-input {
  padding-left: 39px;
}

.report-input:focus {
  border-color: #2563eb;
  background: #ffffff;
}

.report-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.report-section-head {
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
}

.report-section-head h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 950;
  color: #0f172a;
}

.report-section-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
}

.report-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.report-table {
  width: 100%;
  min-width: 980px;
  border-collapse: separate;
  border-spacing: 0;
}

.report-table th {
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  text-align: left;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 950;
}

.report-table td {
  padding: 16px;
  border-bottom: 1px solid #eef2f7;
  font-size: 14px;
  vertical-align: middle;
  font-weight: 750;
  color: #0f172a;
}

.report-table tbody tr:hover {
  background: #f8fafc;
}

.report-table tr:last-child td {
  border-bottom: none;
}

.report-mobile-cards {
  display: none;
  padding: 14px;
  gap: 12px;
  background: #f8fafc;
}

.report-mobile-card {
  border: 1px solid #e2e8f0;
  border-radius: 17px;
  padding: 14px;
  background: #ffffff;
}

.report-mobile-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.report-mobile-title {
  font-weight: 950;
  margin: 0;
  color: #0f172a;
}

.report-mobile-subtitle {
  color: #64748b;
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 800;
}

.report-mobile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.report-mobile-item {
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px;
}

.report-mobile-label {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.report-mobile-data {
  font-size: 13px;
  font-weight: 850;
  color: #0f172a;
  word-break: break-word;
}

.report-empty {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
  font-weight: 800;
}

@media (max-width: 1200px) {
  .report-tiles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-charts-grid {
    grid-template-columns: 1fr 1fr;
  }

  .report-chart-card:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1024px) {
  .report-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-filters {
    grid-template-columns: 1fr 1fr;
  }

  .report-filter-group:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .reports-page {
    padding: 12px;
  }

  .reports-header-card {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }

  .reports-header-left {
    flex-wrap: wrap;
  }

  .reports-actions {
    width: 100%;
    justify-content: stretch;
  }

  .report-action-btn {
    flex: 1;
    justify-content: center;
  }

  .reports-title {
    font-size: 23px;
  }

  .reports-title-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .report-tiles-grid {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .report-tile {
    min-height: 96px;
  }

  .report-summary-grid,
  .report-charts-grid,
  .report-filters {
    grid-template-columns: 1fr;
  }

  .report-filter-group:first-child {
    grid-column: auto;
  }

  .report-summary-value {
    font-size: 22px;
  }

  .report-table-wrap {
    display: none;
  }

  .report-mobile-cards {
    display: grid;
  }

  .report-mobile-grid {
    grid-template-columns: 1fr;
  }

  .reports-card-head,
  .report-section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media print {
  .report-back-btn,
  .reports-actions,
  .report-filters,
  .report-tiles-grid,
  .report-charts-grid {
    display: none !important;
  }

  .reports-page {
    background: #ffffff;
    padding: 0;
  }

  .reports-header-card,
  .report-section,
  .report-summary-card {
    border-color: #cbd5e1;
    box-shadow: none;
  }

  .report-table-wrap {
    display: block !important;
    overflow: visible;
  }

  .report-table {
    min-width: 100%;
  }

  .report-mobile-cards {
    display: none !important;
  }
}
`;

const REPORTS = [
  {
    key: "payout",
    title: "Payout Report",
    description: "Redeemed points, payout amount and bank details.",
    icon: <FiCreditCard />,
    badge: "Main Report",
  },
  {
    key: "customerBalance",
    title: "Customer Balance Report",
    description: "Earned, redeemed and available point balance.",
    icon: <FiUsers />,
    badge: "Useful",
  },
  {
    key: "monthlyPayout",
    title: "Monthly Payout Report",
    description: "Month wise redeemed points and payout amount.",
    icon: <FiCalendar />,
    badge: "Chart",
  },
  {
    key: "monthlyReward",
    title: "Monthly Reward Summary",
    description: "Monthly rewards, redemption and net points.",
    icon: <FiBarChart2 />,
    badge: "Summary",
  },
  {
    key: "itemPerformance",
    title: "Item Reward Performance",
    description: "Item wise quantity sold and points given.",
    icon: <FiPackage />,
    badge: "Item",
  },
  {
    key: "dailyReward",
    title: "Daily Reward Report",
    description: "Today’s points given and redeemed activity.",
    icon: <FiFileText />,
    badge: "Today",
  },
];

function normalizeList(payload, possibleKeys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of possibleKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.transactions)) return payload.transactions;

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

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function getDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toISOString().slice(0, 10);
}

function getTodayInputValue() {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(value) {
  if (!value) return "-";

  const [year, month] = String(value).split("-");
  if (!year || !month) return value;

  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function escapeCsv(value) {
  const text = safeText(value, "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, columns, rows) {
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((column) => escapeCsv(column.value(row))).join(",")
    )
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

async function fetchFirstAvailable(urls, keys = []) {
  for (const url of urls) {
    try {
      const response = await api.get(url);
      return normalizeList(response.data, keys);
    } catch {
      // Try next possible endpoint.
    }
  }

  return [];
}

function ReportsHub({ onBack }) {
  const [activeReport, setActiveReport] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [pointValue, setPointValue] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        customersData,
        payoutsData,
        transactionsData,
        itemsData,
        pointValueResponse,
      ] = await Promise.allSettled([
        fetchFirstAvailable(["/customers/", "/customers"], ["customers"]),
        fetchFirstAvailable(["/payouts", "/payouts/"], ["payouts"]),
        fetchFirstAvailable(
          [
            "/transactions/",
            "/transactions",
            "/transaction-history/",
            "/transaction-history",
          ],
          ["transactions"]
        ),
        fetchFirstAvailable(["/items/", "/items", "/products/", "/products"], [
          "items",
          "products",
        ]),
        api.get("/settings/point-value"),
      ]);

      if (customersData.status === "fulfilled") {
        setCustomers(customersData.value);
      }

      if (payoutsData.status === "fulfilled") {
        setPayouts(payoutsData.value);
      }

      if (transactionsData.status === "fulfilled") {
        setTransactions(transactionsData.value);
      }

      if (itemsData.status === "fulfilled") {
        setItems(itemsData.value);
      }

      if (pointValueResponse.status === "fulfilled") {
        const data = pointValueResponse.value.data || {};
        setPointValue(
          toNumber(
            data.point_value_rupees ??
              data.pointValue ??
              data.value ??
              data.point_value
          )
        );
      }
    } catch (err) {
      console.error("Reports load error:", err);
      setError("Unable to load reports data. Please check backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const payoutRows = useMemo(() => {
    return payouts.map((payout, index) => {
      const customer = payout.customer || {};

      const customerName =
        payout.customer_name ||
        payout.customerName ||
        customer.customer_name ||
        customer.name ||
        customer.full_name ||
        payout.name ||
        "-";

      const phone =
        payout.phone ||
        payout.customer_phone ||
        payout.customerPhone ||
        customer.phone ||
        customer.phone_number ||
        customer.mobile ||
        "-";

      const pointsRedeemed = toNumber(
        payout.points_redeemed ??
          payout.pointsRedeemed ??
          payout.redeem_points ??
          payout.redeemed_points
      );

      const pointValueUsed = toNumber(
        payout.point_value_used ??
          payout.pointValueUsed ??
          payout.point_value_rupees ??
          payout.point_value ??
          pointValue
      );

      const payoutAmount = toNumber(
        payout.payout_amount ??
          payout.payoutAmount ??
          payout.amount ??
          pointsRedeemed * pointValueUsed
      );

      return {
        id: payout.id || payout._id || index + 1,
        date:
          payout.created_at ||
          payout.createdAt ||
          payout.payout_date ||
          payout.date ||
          payout.updated_at ||
          "",
        customerId: payout.customer_id || payout.customerId || customer.id || "",
        customerName,
        phone,
        normalizedPhone: normalizePhone(phone),
        pointsRedeemed,
        pointValueUsed,
        payoutAmount,
        bankName:
          payout.bank_name ||
          payout.bankName ||
          customer.bank_name ||
          customer.bankName ||
          "-",
        accountNumber:
          payout.account_number ||
          payout.accountNumber ||
          customer.account_number ||
          customer.accountNumber ||
          "-",
        ifsc:
          payout.ifsc_code ||
          payout.ifsc ||
          payout.ifscCode ||
          customer.ifsc_code ||
          customer.ifsc ||
          customer.ifscCode ||
          "-",
        note: payout.note || payout.notes || payout.remark || payout.remarks || "-",
      };
    });
  }, [payouts, pointValue]);

  const payoutRedeemedByCustomer = useMemo(() => {
    const map = new Map();

    payoutRows.forEach((payout) => {
      const keys = [];

      if (payout.customerId) keys.push(`id:${payout.customerId}`);
      if (payout.normalizedPhone) keys.push(`phone:${payout.normalizedPhone}`);
      if (payout.customerName && payout.customerName !== "-") {
        keys.push(`name:${payout.customerName.toLowerCase().trim()}`);
      }

      keys.forEach((key) => {
        map.set(key, toNumber(map.get(key)) + payout.pointsRedeemed);
      });
    });

    return map;
  }, [payoutRows]);

  const customerRows = useMemo(() => {
    return customers.map((customer, index) => {
      const customerName =
        customer.customer_name ||
        customer.customerName ||
        customer.name ||
        customer.full_name ||
        "-";

      const phone =
        customer.phone ||
        customer.phone_number ||
        customer.mobile ||
        customer.customer_phone ||
        "-";

      const normalizedPhone = normalizePhone(phone);
      const customerId = customer.id || customer.customer_id || customer._id || "";

      const payoutKeys = [
        customerId ? `id:${customerId}` : "",
        normalizedPhone ? `phone:${normalizedPhone}` : "",
        customerName !== "-" ? `name:${customerName.toLowerCase().trim()}` : "",
      ].filter(Boolean);

      const redeemedFromPayouts = Math.max(
        0,
        ...payoutKeys.map((key) => toNumber(payoutRedeemedByCustomer.get(key)))
      );

      const availablePoints = toNumber(
        customer.points_balance ??
          customer.point_balance ??
          customer.available_points ??
          customer.availablePoints ??
          customer.balance_points
      );

      const savedTotalRedeemed = toNumber(
        customer.total_points_redeemed ??
          customer.totalRedeemed ??
          customer.total_redeemed ??
          customer.points_redeemed
      );

      const totalPointsRedeemed = savedTotalRedeemed || redeemedFromPayouts;

      const savedTotalEarned = toNumber(
        customer.total_points_earned ??
          customer.totalRewardPoints ??
          customer.total_reward_points ??
          customer.reward_points ??
          customer.points_earned
      );

      const totalPointsEarned =
        savedTotalEarned || availablePoints + totalPointsRedeemed;

      return {
        id: customerId || index + 1,
        customerName,
        phone,
        totalPointsEarned,
        totalPointsRedeemed,
        availablePoints,
        approxPayoutValue: availablePoints * pointValue,
        bankName: customer.bank_name || customer.bankName || "-",
        accountNumber: customer.account_number || customer.accountNumber || "-",
        ifsc:
          customer.ifsc_code ||
          customer.ifsc ||
          customer.ifscCode ||
          "-",
        lastActivity:
          customer.last_activity ||
          customer.last_purchase_date ||
          customer.updated_at ||
          customer.created_at ||
          "",
      };
    });
  }, [customers, payoutRedeemedByCustomer, pointValue]);

  const monthlyPayoutRows = useMemo(() => {
    const map = new Map();

    payoutRows.forEach((row) => {
      const monthKey = getDateInputValue(row.date).slice(0, 7) || "Unknown";

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          id: monthKey,
          month: monthKey,
          payoutEntries: 0,
          pointsRedeemed: 0,
          payoutAmount: 0,
        });
      }

      const item = map.get(monthKey);
      item.payoutEntries += 1;
      item.pointsRedeemed += row.pointsRedeemed;
      item.payoutAmount += row.payoutAmount;
    });

    return Array.from(map.values()).sort((a, b) =>
      b.month.localeCompare(a.month)
    );
  }, [payoutRows]);

  const transactionRows = useMemo(() => {
    return transactions.map((transaction, index) => {
      const itemObject =
        transaction.item ||
        transaction.product ||
        transaction.item_master ||
        transaction.product_master ||
        {};

      const type = String(
        transaction.type ||
          transaction.transaction_type ||
          transaction.entry_type ||
          transaction.status ||
          ""
      ).toLowerCase();

      const isRedeem =
        type.includes("redeem") ||
        type.includes("payout") ||
        type.includes("debit");

      const points = toNumber(
        transaction.points ??
          transaction.reward_points ??
          transaction.points_earned ??
          transaction.points_redeemed ??
          transaction.total_points ??
          transaction.total_reward_points ??
          transaction.point
      );

      const itemId =
        transaction.item_id ||
        transaction.itemId ||
        transaction.product_id ||
        transaction.productId ||
        itemObject.id ||
        itemObject._id ||
        "";

      const itemName =
        transaction.item_name ||
        transaction.itemName ||
        transaction.product_name ||
        transaction.productName ||
        itemObject.item_name ||
        itemObject.itemName ||
        itemObject.product_name ||
        itemObject.productName ||
        itemObject.name ||
        itemObject.title ||
        "-";

      const sku =
        transaction.sku ||
        transaction.item_sku ||
        transaction.product_sku ||
        transaction.item_code ||
        transaction.product_code ||
        itemObject.sku ||
        itemObject.item_sku ||
        itemObject.product_sku ||
        itemObject.item_code ||
        itemObject.product_code ||
        itemObject.code ||
        "-";

      return {
        id: transaction.id || transaction._id || index + 1,
        date:
          transaction.created_at ||
          transaction.createdAt ||
          transaction.date ||
          transaction.transaction_date ||
          "",
        customerName:
          transaction.customer_name ||
          transaction.customerName ||
          transaction.customer?.name ||
          transaction.customer?.customer_name ||
          "-",
        itemId,
        itemName,
        sku,
        quantity: toNumber(
          transaction.quantity ||
            transaction.qty ||
            transaction.total_quantity ||
            transaction.total_qty
        ),
        pointsEarned: isRedeem ? 0 : points,
        pointsRedeemed: isRedeem ? points : 0,
      };
    });
  }, [transactions]);

  const monthlyRewardRows = useMemo(() => {
    const map = new Map();

    transactionRows.forEach((row) => {
      const monthKey = getDateInputValue(row.date).slice(0, 7) || "Unknown";

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          id: monthKey,
          month: monthKey,
          rewardEntries: 0,
          pointsGiven: 0,
          pointsRedeemed: 0,
          payoutAmount: 0,
          netAvailablePoints: 0,
        });
      }

      const item = map.get(monthKey);
      item.rewardEntries += row.pointsEarned > 0 ? 1 : 0;
      item.pointsGiven += row.pointsEarned;
      item.pointsRedeemed += row.pointsRedeemed;
    });

    monthlyPayoutRows.forEach((row) => {
      const monthKey = row.month;

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          id: monthKey,
          month: monthKey,
          rewardEntries: 0,
          pointsGiven: 0,
          pointsRedeemed: 0,
          payoutAmount: 0,
          netAvailablePoints: 0,
        });
      }

      const item = map.get(monthKey);
      item.pointsRedeemed += row.pointsRedeemed;
      item.payoutAmount += row.payoutAmount;
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        netAvailablePoints: row.pointsGiven - row.pointsRedeemed,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [transactionRows, monthlyPayoutRows]);

  const itemPerformanceRows = useMemo(() => {
    const map = new Map();
    const itemLookupById = new Map();
    const itemLookupByName = new Map();

    const getItemName = (item) =>
      item.item_name ||
      item.itemName ||
      item.product_name ||
      item.productName ||
      item.name ||
      item.title ||
      "-";

    const getItemSku = (item) =>
      item.sku ||
      item.item_sku ||
      item.product_sku ||
      item.item_code ||
      item.product_code ||
      item.code ||
      "-";

    const getItemPoints = (item) =>
      toNumber(
        item.points_per_unit ??
          item.pointsPerUnit ??
          item.point_value ??
          item.pointValue ??
          item.reward_points ??
          item.rewardPoints ??
          item.points ??
          item.item_point_value
      );

    items.forEach((item, index) => {
      const itemId = item.id || item._id || item.item_id || item.product_id || "";
      const itemName = getItemName(item);
      const sku = getItemSku(item);
      const pointsPerUnit = getItemPoints(item);

      const normalizedName = itemName.toLowerCase().trim();
      const key = itemId ? `id:${itemId}` : `name:${normalizedName || index}`;

      const cleanItem = {
        id: key,
        rawId: itemId,
        itemName,
        sku,
        pointsPerUnit,
        totalQuantitySold: 0,
        totalPointsGiven: 0,
        numberOfCustomers: 0,
        customers: new Set(),
      };

      map.set(key, cleanItem);

      if (itemId) itemLookupById.set(String(itemId), cleanItem);
      if (normalizedName && itemName !== "-") {
        itemLookupByName.set(normalizedName, cleanItem);
      }
    });

    transactionRows.forEach((transaction) => {
      if (transaction.pointsEarned <= 0 && transaction.quantity <= 0) return;

      const transactionItemId = transaction.itemId
        ? String(transaction.itemId)
        : "";
      const transactionItemName = transaction.itemName || "-";
      const normalizedTransactionName = transactionItemName
        .toLowerCase()
        .trim();

      const matchedItem =
        (transactionItemId && itemLookupById.get(transactionItemId)) ||
        (normalizedTransactionName &&
          itemLookupByName.get(normalizedTransactionName)) ||
        null;

      const itemName =
        transactionItemName !== "-"
          ? transactionItemName
          : matchedItem?.itemName || "Unknown Item";

      const sku =
        transaction.sku !== "-" ? transaction.sku : matchedItem?.sku || "-";

      const pointsPerUnit =
        matchedItem?.pointsPerUnit ||
        toNumber(transaction.pointsEarned / Math.max(transaction.quantity, 1));

      let key = "";
      if (matchedItem?.id) {
        key = matchedItem.id;
      } else if (transactionItemId) {
        key = `id:${transactionItemId}`;
      } else {
        key = `name:${itemName.toLowerCase().trim()}`;
      }

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          rawId: transactionItemId,
          itemName,
          sku,
          pointsPerUnit,
          totalQuantitySold: 0,
          totalPointsGiven: 0,
          numberOfCustomers: 0,
          customers: new Set(),
        });
      }

      const row = map.get(key);

      if (row.itemName === "-" || row.itemName === "Unknown Item") {
        row.itemName = itemName;
      }

      if (row.sku === "-" && sku !== "-") {
        row.sku = sku;
      }

      if (!row.pointsPerUnit && pointsPerUnit) {
        row.pointsPerUnit = pointsPerUnit;
      }

      row.totalQuantitySold += transaction.quantity;
      row.totalPointsGiven += transaction.pointsEarned;

      if (transaction.customerName && transaction.customerName !== "-") {
        row.customers.add(transaction.customerName);
      }

      row.numberOfCustomers = row.customers.size;
    });

    return Array.from(map.values())
      .map((row) => {
        const { customers: customerSet, ...cleanRow } = row;
        return cleanRow;
      })
      .filter((row) => row.itemName !== "-" && row.itemName !== "Unknown Item")
      .sort((a, b) => b.totalPointsGiven - a.totalPointsGiven);
  }, [items, transactionRows]);

  const dailyRewardRows = useMemo(() => {
    const todayKey = getTodayInputValue();

    const todayTransactions = transactionRows.filter((row) => {
      return getDateInputValue(row.date) === todayKey;
    });

    const todaySummary = todayTransactions.reduce(
      (summary, row) => {
        summary.rewardEntries += row.pointsEarned > 0 ? 1 : 0;
        summary.pointsGiven += row.pointsEarned;
        summary.pointsRedeemed += row.pointsRedeemed;
        return summary;
      },
      {
        id: todayKey,
        date: todayKey,
        rewardEntries: 0,
        pointsGiven: 0,
        pointsRedeemed: 0,
      }
    );

    if (
      todaySummary.rewardEntries === 0 &&
      todaySummary.pointsGiven === 0 &&
      todaySummary.pointsRedeemed === 0
    ) {
      return [];
    }

    return [todaySummary];
  }, [transactionRows]);

  const dashboardSummary = useMemo(() => {
    return customerRows.reduce(
      (summary, row) => {
        summary.totalCustomers += 1;
        summary.totalEarned += row.totalPointsEarned;
        summary.totalRedeemed += row.totalPointsRedeemed;
        summary.totalAvailable += row.availablePoints;
        summary.pendingPayoutValue += row.approxPayoutValue;
        return summary;
      },
      {
        totalCustomers: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        totalAvailable: 0,
        pendingPayoutValue: 0,
      }
    );
  }, [customerRows]);

  const payoutSummary = useMemo(() => {
    const totalPaidPayoutAmount = payoutRows.reduce(
      (total, row) => total + row.payoutAmount,
      0
    );

    const pendingPayoutAmount = dashboardSummary.totalAvailable * pointValue;

    return {
      totalPaidPayoutAmount,
      pendingPayoutAmount,
    };
  }, [payoutRows, dashboardSummary.totalAvailable, pointValue]);

  const filteredRows = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    const filterBySearchAndDate = (rows, dateKey = "date") => {
      return rows.filter((row) => {
        const rowString = Object.values(row).join(" ").toLowerCase();
        const rowDate = dateKey ? getDateInputValue(row[dateKey]) : "";

        const matchesSearch = !search || rowString.includes(search);
        const matchesFromDate = !fromDate || !dateKey || rowDate >= fromDate;
        const matchesToDate = !toDate || !dateKey || rowDate <= toDate;

        return matchesSearch && matchesFromDate && matchesToDate;
      });
    };

    switch (activeReport) {
      case "payout":
        return filterBySearchAndDate(payoutRows, "date");
      case "customerBalance":
        return filterBySearchAndDate(customerRows, "lastActivity");
      case "monthlyPayout":
        return filterBySearchAndDate(monthlyPayoutRows, "month");
      case "monthlyReward":
        return filterBySearchAndDate(monthlyRewardRows, "month");
      case "itemPerformance":
        return filterBySearchAndDate(itemPerformanceRows, null);
      case "dailyReward":
        return filterBySearchAndDate(dailyRewardRows, "date");
      default:
        return [];
    }
  }, [
    activeReport,
    searchTerm,
    fromDate,
    toDate,
    payoutRows,
    customerRows,
    monthlyPayoutRows,
    monthlyRewardRows,
    itemPerformanceRows,
    dailyRewardRows,
  ]);

  const activeReportConfig = REPORTS.find(
    (report) => report.key === activeReport
  );
  const columns = getColumns(activeReport);

  const handleOpenReport = (reportKey) => {
    setActiveReport(reportKey);
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  };

  const handleBackToReports = () => {
    setActiveReport(null);
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  };

  const handleExportCsv = () => {
    if (!activeReportConfig) return;

    downloadCsv(
      `${activeReportConfig.title.toLowerCase().replaceAll(" ", "-")}.csv`,
      columns,
      filteredRows
    );
  };

  const chartBars = [
    { label: "Available Points", value: dashboardSummary.totalAvailable },
    { label: "Redeemed Points", value: dashboardSummary.totalRedeemed },
    {
      label: "Pending Payout Amount",
      value: payoutSummary.pendingPayoutAmount,
      currency: true,
    },
    {
      label: "Paid Payout Amount",
      value: payoutSummary.totalPaidPayoutAmount,
      currency: true,
    },
  ];

  const monthlyPayoutChart = monthlyPayoutRows
    .slice(0, 6)
    .reverse()
    .map((row) => ({
      label: formatMonth(row.month),
      value: row.payoutAmount,
      currency: true,
    }));

  const customerAvailableChart = customerRows.slice(0, 6).map((row) => ({
    label: row.customerName,
    value: row.availablePoints,
  }));

  const itemPerformanceChart = itemPerformanceRows.slice(0, 6).map((row) => ({
    label: row.itemName,
    value: row.totalPointsGiven,
  }));

  return (
    <div className="reports-page">
      <style>{styles}</style>

      <section className="reports-header-card">
        <div className="reports-header-left">
          {activeReport ? (
            <button
              type="button"
              className="report-back-btn"
              onClick={handleBackToReports}
            >
              <FiArrowLeft /> Back
            </button>
          ) : (
            onBack && (
              <button type="button" className="report-back-btn" onClick={onBack}>
                <FiArrowLeft /> Back
              </button>
            )
          )}

          <div className="reports-title-icon">
            {activeReportConfig?.icon || <FiBarChart2 />}
          </div>

          <div>
            <h1 className="reports-title">
              {activeReportConfig ? activeReportConfig.title : "Reports"}
            </h1>
            <p className="reports-subtitle">
              {activeReportConfig
                ? activeReportConfig.description
                : "All useful loyalty reward system reports with charts and visual summary."}
            </p>
          </div>
        </div>

        <div className="reports-actions">

          {activeReport && (
            <>
              <button
                type="button"
                className="report-action-btn secondary"
                onClick={() => window.print()}
                disabled={!filteredRows.length}
              >
                <FiPrinter />
                Print
              </button>

              <button
                type="button"
                className="report-action-btn"
                onClick={handleExportCsv}
                disabled={!filteredRows.length}
              >
                <FiDownload />
                Export CSV
              </button>
            </>
          )}
        </div>
      </section>

      {error && <div className="report-error">{error}</div>}

      {!activeReport ? (
        <>
          <section className="report-summary-grid">
            <SummaryCard
              icon={<FiUsers />}
              label="Total Customers"
              value={formatNumber(dashboardSummary.totalCustomers)}
            />
            <SummaryCard
              icon={<FiTrendingUp />}
              label="Total Points"
              value={formatNumber(dashboardSummary.totalEarned)}
            />
            <SummaryCard
              icon={<FiCreditCard />}
              label="Redeemed Points"
              value={formatNumber(dashboardSummary.totalRedeemed)}
            />
            <SummaryCard
              icon={<FiCreditCard />}
              label="Pending Payout"
              value={formatCurrency(payoutSummary.pendingPayoutAmount)}
            />
          </section>

          <section className="report-charts-grid">
            <SimpleBarChart title="Points Overview" data={chartBars} />

            <DonutChart
              title="Points Status"
              available={dashboardSummary.totalAvailable}
              redeemed={dashboardSummary.totalRedeemed}
            />

            <DonutChart
              title="Payout Liability"
              available={payoutSummary.pendingPayoutAmount}
              redeemed={payoutSummary.totalPaidPayoutAmount}
              availableLabel="Pending Payout"
              redeemedLabel="Paid Payout"
              currency
            />
          </section>

          <section className="reports-card">
            <div className="reports-card-head">
              <div>
                <h2 className="reports-card-title">All Reports</h2>
                <p className="reports-card-subtitle">
                  Open payout, customer balance, monthly, item and daily reward
                  reports.
                </p>
              </div>

              <span className="report-record-badge">
                {REPORTS.length} reports
              </span>
            </div>

            <div className="report-tiles-grid">
              {REPORTS.map((report) => (
                <button
                  type="button"
                  key={report.key}
                  className="report-tile"
                  onClick={() => handleOpenReport(report.key)}
                >
                  <div className="report-tile-icon">{report.icon}</div>
                  <div>
                    <h3 className="report-tile-title">{report.title}</h3>
                    <p className="report-tile-desc">{report.description}</p>
                    <span className="report-tile-badge">{report.badge}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="report-charts-grid">
            <SimpleBarChart
              title="Monthly Payout Trend"
              data={monthlyPayoutChart}
            />
            <SimpleBarChart
              title="Customer Available Points"
              data={customerAvailableChart}
            />
            <SimpleBarChart
              title="Item Reward Performance"
              data={itemPerformanceChart}
            />
          </section>
        </>
      ) : (
        <>
          <section className="report-filters">
            <div className="report-filter-group">
              <label>Search</label>
              <div className="report-search-box">
                <FiSearch />
                <input
                  className="report-input"
                  type="text"
                  placeholder="Search report data..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <div className="report-filter-group">
              <label>From Date</label>
              <input
                className="report-input"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="report-filter-group">
              <label>To Date</label>
              <input
                className="report-input"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </section>

          <ReportVisualSummary rows={filteredRows} pointValue={pointValue} />

          <GenericReportTable
            title={activeReportConfig?.title || "Report"}
            description={activeReportConfig?.description || ""}
            rows={filteredRows}
            columns={columns}
          />
        </>
      )}
    </div>
  );
}

function getColumns(activeReport) {
  const columnsMap = {
    payout: [
      { label: "Date", value: (row) => formatDate(row.date) },
      { label: "Customer Name", value: (row) => row.customerName },
      { label: "Phone", value: (row) => row.phone },
      {
        label: "Points Redeemed",
        value: (row) => formatNumber(row.pointsRedeemed),
      },
      {
        label: "Point Value Used",
        value: (row) => `₹${formatNumber(row.pointValueUsed)}`,
      },
      {
        label: "Payout Amount",
        value: (row) => formatCurrency(row.payoutAmount),
      },
      { label: "Bank Name", value: (row) => row.bankName },
      { label: "Account Number", value: (row) => row.accountNumber },
      { label: "IFSC", value: (row) => row.ifsc },
      { label: "Note", value: (row) => row.note },
    ],
    customerBalance: [
      { label: "Customer Name", value: (row) => row.customerName },
      { label: "Phone", value: (row) => row.phone },
      {
        label: "Total Points Earned",
        value: (row) => formatNumber(row.totalPointsEarned),
      },
      {
        label: "Total Points Redeemed",
        value: (row) => formatNumber(row.totalPointsRedeemed),
      },
      {
        label: "Available Points",
        value: (row) => formatNumber(row.availablePoints),
      },
      {
        label: "Approx Payout Value",
        value: (row) => formatCurrency(row.approxPayoutValue),
      },
      { label: "Bank Name", value: (row) => row.bankName },
      { label: "Account Number", value: (row) => row.accountNumber },
      { label: "IFSC", value: (row) => row.ifsc },
    ],
    monthlyPayout: [
      { label: "Month", value: (row) => formatMonth(row.month) },
      {
        label: "Payout Entries",
        value: (row) => formatNumber(row.payoutEntries),
      },
      {
        label: "Points Redeemed",
        value: (row) => formatNumber(row.pointsRedeemed),
      },
      {
        label: "Payout Amount",
        value: (row) => formatCurrency(row.payoutAmount),
      },
    ],
    monthlyReward: [
      { label: "Month", value: (row) => formatMonth(row.month) },
      {
        label: "Reward Entries",
        value: (row) => formatNumber(row.rewardEntries),
      },
      {
        label: "Points Given",
        value: (row) => formatNumber(row.pointsGiven),
      },
      {
        label: "Points Redeemed",
        value: (row) => formatNumber(row.pointsRedeemed),
      },
      {
        label: "Payout Amount",
        value: (row) => formatCurrency(row.payoutAmount),
      },
      {
        label: "Net Available Points",
        value: (row) => formatNumber(row.netAvailablePoints),
      },
    ],
    itemPerformance: [
      { label: "Item Name", value: (row) => row.itemName },
      { label: "SKU", value: (row) => row.sku },
      {
        label: "Points Per Unit",
        value: (row) => formatNumber(row.pointsPerUnit),
      },
      {
        label: "Total Quantity Sold",
        value: (row) => formatNumber(row.totalQuantitySold),
      },
      {
        label: "Total Points Given",
        value: (row) => formatNumber(row.totalPointsGiven),
      },
      {
        label: "Number of Customers",
        value: (row) => formatNumber(row.numberOfCustomers),
      },
    ],
    dailyReward: [
      { label: "Date", value: (row) => formatDate(row.date) },
      {
        label: "Reward Entries",
        value: (row) => formatNumber(row.rewardEntries),
      },
      {
        label: "Points Given",
        value: (row) => formatNumber(row.pointsGiven),
      },
      {
        label: "Points Redeemed",
        value: (row) => formatNumber(row.pointsRedeemed),
      },
    ],
  };

  return columnsMap[activeReport] || [];
}

function ReportVisualSummary({ rows, pointValue }) {
  const totalRows = rows.length;

  const pointsTotal = rows.reduce((total, row) => {
    return (
      total +
      toNumber(
        row.pointsRedeemed ??
          row.totalPointsEarned ??
          row.availablePoints ??
          row.pointsGiven ??
          row.totalPointsGiven
      )
    );
  }, 0);

  const amountTotal = rows.reduce((total, row) => {
    return total + toNumber(row.payoutAmount ?? row.approxPayoutValue);
  }, 0);

  const chartData = rows.slice(0, 6).map((row) => ({
    label:
      row.customerName ||
      row.itemName ||
      formatMonth(row.month) ||
      formatDate(row.date) ||
      "-",
    value: toNumber(
      row.payoutAmount ||
        row.approxPayoutValue ||
        row.totalPointsEarned ||
        row.pointsRedeemed ||
        row.pointsGiven ||
        row.totalPointsGiven
    ),
    currency: Boolean(row.payoutAmount || row.approxPayoutValue),
  }));

  return (
    <>
      <section className="report-summary-grid">
        <SummaryCard
          icon={<FiGrid />}
          label="Total Records"
          value={formatNumber(totalRows)}
        />
        <SummaryCard
          icon={<FiTrendingUp />}
          label="Total Points"
          value={formatNumber(pointsTotal)}
        />
        <SummaryCard
          icon={<FiCreditCard />}
          label="Total Amount"
          value={formatCurrency(amountTotal)}
        />
        <SummaryCard
          icon={<FiPieChart />}
          label="Point Value"
          value={`₹${formatNumber(pointValue)}`}
        />
      </section>

      <section className="report-charts-grid">
        <SimpleBarChart title="Report Visual Chart" data={chartData} />

        <DonutChart
          title="Report Split"
          available={pointsTotal}
          redeemed={amountTotal}
          availableLabel="Points"
          redeemedLabel="Amount"
        />

        <SimpleBarChart title="Top Values" data={chartData.slice(0, 5)} />
      </section>
    </>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="report-summary-card">
      <div className="report-summary-icon">{icon}</div>
      <div>
        <p className="report-summary-label">{label}</p>
        <p className="report-summary-value">{value}</p>
      </div>
    </div>
  );
}

function SimpleBarChart({ title, data }) {
  const maxValue = Math.max(...data.map((item) => toNumber(item.value)), 1);

  return (
    <div className="report-chart-card">
      <h3 className="report-chart-title">{title}</h3>

      {data.length === 0 ? (
        <div className="report-empty">No chart data found.</div>
      ) : (
        data.map((item, index) => {
          const percent = Math.max((toNumber(item.value) / maxValue) * 100, 4);
          const displayValue = item.currency
            ? formatCurrency(item.value)
            : formatNumber(item.value);

          return (
            <div className="simple-bar-row" key={`${item.label}-${index}`}>
              <div className="simple-bar-head">
                <span>{item.label}</span>
                <span>{displayValue}</span>
              </div>

              <div className="simple-bar-track">
                <div
                  className="simple-bar-fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function DonutChart({
  title,
  available,
  redeemed,
  availableLabel = "Available",
  redeemedLabel = "Redeemed",
  currency = false,
}) {
  const first = toNumber(available);
  const second = toNumber(redeemed);
  const total = first + second;
  const firstPercent = total > 0 ? (first / total) * 100 : 50;

  const formatValue = currency ? formatCurrency : formatNumber;

  return (
    <div className="report-chart-card">
      <h3 className="report-chart-title">{title}</h3>

      <div className="donut-wrap">
        <div
          className="donut-chart"
          style={{
            background: `conic-gradient(#2563eb 0 ${firstPercent}%, #f97316 ${firstPercent}% 100%)`,
          }}
        >
          <div className="donut-center">{formatValue(total)}</div>
        </div>

        <div className="donut-legend">
          <div className="legend-item">
            <span className="legend-left">
              <span className="legend-dot blue" />
              {availableLabel}
            </span>
            <span>{formatValue(first)}</span>
          </div>

          <div className="legend-item">
            <span className="legend-left">
              <span className="legend-dot orange" />
              {redeemedLabel}
            </span>
            <span>{formatValue(second)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericReportTable({ title, description, rows, columns }) {
  return (
    <section className="report-section">
      <div className="report-section-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <span className="report-record-badge">{rows.length} records</span>
      </div>

      {rows.length === 0 ? (
        <div className="report-empty">
          No data found. If this report needs backend data, update or create the
          related API.
        </div>
      ) : (
        <>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.label}>{column.label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id || rowIndex}>
                    {columns.map((column) => (
                      <td key={column.label}>{column.value(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-mobile-cards">
            {rows.map((row, rowIndex) => (
              <div className="report-mobile-card" key={row.id || rowIndex}>
                <div className="report-mobile-card-head">
                  <div>
                    <p className="report-mobile-title">
                      {row.customerName ||
                        row.itemName ||
                        formatMonth(row.month) ||
                        formatDate(row.date)}
                    </p>
                    <p className="report-mobile-subtitle">{title}</p>
                  </div>
                </div>

                <div className="report-mobile-grid">
                  {columns.map((column) => (
                    <MobileItem
                      key={column.label}
                      label={column.label}
                      value={column.value(row)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function MobileItem({ label, value }) {
  return (
    <div className="report-mobile-item">
      <span className="report-mobile-label">{label}</span>
      <span className="report-mobile-data">{safeText(value)}</span>
    </div>
  );
}

export default ReportsHub;