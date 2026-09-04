import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FiMessageCircle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSearch,
  FiPhone,
  FiUser,
  FiSend,
  FiRepeat,
  FiDollarSign,
  FiAward,
  FiHeart,
} from "react-icons/fi";

import api from "../../api/axios";
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./whatsapp.css";

// Meta Templates matching screenshots
const DEFAULT_TEMPLATES = {
  welcome: {
    name: "aerostate_welcome",
    language: "en",
    body: "Hello {{1}}, welcome to {{2}}! 🎉 Now you will get all your reward points and gift updates on this WhatsApp number. (App by AeroState Lab)",
  },
  reward: {
    name: "redemption_points_update",
    language: "en",
    body: "Dear {{1}}, {{2}} reward points have been added to your account at {{3}}. Your total balance is {{4}} points. Thank you.",
  },
  redemption: {
    name: "redemption_points_update",
    language: "en",
    body: "Dear {{1}}, {{2}} reward points have been redeemed from your account at {{3}}. Your total balance is {{4}} points. Payout amount is ₹{{5}}. Thank you.",
  },
};

const DEFAULT_SPEND_SUMMARY = {
  total_messages: 0,
  sent_messages: 0,
  failed_messages: 0,
  total_estimated_spend: 0,
  cost_currency: "INR",
};

const SEND_TYPES = {
  welcome: { key: "welcome", label: "Welcome Message", shortLabel: "Welcome" },
  reward: { key: "reward", label: "Reward Points", shortLabel: "Reward" },
  redemption: { key: "redemption", label: "Redemption Points", shortLabel: "Redemption" },
};

const normalizeLogs = (data) => Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
const normalizeEntries = (data) => Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
const normalizePayouts = (data) => Array.isArray(data) ? data : Array.isArray(data?.payouts) ? data.payouts : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
const normalizeCustomers = (data) => Array.isArray(data) ? data : Array.isArray(data?.customers) ? data.customers : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];

const normalizeSpendSummary = (data) => ({
  ...DEFAULT_SPEND_SUMMARY,
  ...(data && typeof data === "object" ? data : {}),
});

const getEntryId = (entry) => entry?.reward_entry_id || entry?.transaction_group_id || entry?.id;
const getPayoutId = (payout) => payout?.payout_id || payout?.redemption_id || payout?.id;

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

const formatPoints = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, "");
};

const formatMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatSpend = (value, currency = "INR") => {
  const symbol = String(currency || "INR").toUpperCase() === "INR" ? "₹" : "$";
  return `${symbol}${formatMoney(value)}`;
};

const getLogType = (log) => {
  const rawType = String(log?.message_type || log?.type || log?.template_type || "").toLowerCase();
  if (rawType.includes("welcome")) return "welcome";
  if (rawType.includes("redemption") || rawType.includes("redeem") || rawType.includes("payout") || log?.payout_id || log?.redemption_id) return "redemption";
  return "reward";
};

const getStatusIcon = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "sent" || normalized === "delivered" || normalized === "read") return <FiCheckCircle />;
  if (normalized === "failed") return <FiXCircle />;
  return <FiClock />;
};

const getStatusLabel = (status) => {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "sent") return "Sent";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "read") return "Read";
  if (normalized === "failed") return "Failed";
  return "Pending";
};

const getHistoryPointText = (log) => {
  const logType = getLogType(log);
  if (logType === "welcome") return "N/A";
  if (logType === "redemption") {
    return `-${formatPoints(log.redeemed_points || log.points_redeemed || log.points || 0)}`;
  }
  return `+${formatPoints(log.added_points || log.points || 0)}`;
};

const getHistoryRecordId = (log) => {
  const logType = getLogType(log);
  if (logType === "welcome") return log.customer_id;
  if (logType === "redemption") return log.payout_id || log.redemption_id;
  return log.reward_entry_id;
};

// Builder functions matching screenshots
const buildWelcomePreview = (templateBody, customer, storeName = "Naveen Hardware Store") => {
  const customerName = customer?.name || "Customer";
  return String(templateBody || DEFAULT_TEMPLATES.welcome.body)
    .replaceAll("{{1}}", customerName)
    .replaceAll("{{2}}", storeName);
};

const buildRewardPreview = (templateBody, entry, storeName = "Naveen Hardware Store") => {
  if (!entry) return "No reward transaction selected.";
  const customerName = entry.customer_name || "Customer";
  const addedPoints = formatPoints(entry.total_points || entry.points || 0);
  const totalPoints = formatPoints(entry.total_points_balance || entry.points_balance || 0);

  return String(templateBody || DEFAULT_TEMPLATES.reward.body)
    .replaceAll("{{1}}", customerName)
    .replaceAll("{{2}}", addedPoints)
    .replaceAll("{{3}}", storeName)
    .replaceAll("{{4}}", totalPoints);
};

const buildRedemptionPreview = (templateBody, payout, storeName = "AeroState Lab") => {
  if (!payout) return "No redemption transaction selected.";
  const customerName = payout.customer_name || payout.name || payout.customer?.name || "Customer";
  const redeemedPoints = formatPoints(payout.points_redeemed || payout.redeemed_points || payout.points || 0);
  const totalPoints = formatPoints(payout.total_points_balance || payout.points_balance_after || 0);
  const payoutAmount = formatMoney(payout.payout_value || payout.amount || 0);

  return String(templateBody || DEFAULT_TEMPLATES.redemption.body)
    .replaceAll("{{1}}", customerName)
    .replaceAll("{{2}}", redeemedPoints)
    .replaceAll("{{3}}", storeName)
    .replaceAll("{{4}}", totalPoints)
    .replaceAll("{{5}}", payoutAmount);
};

export default function WhatsApp() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "send");
  const [activeSendType, setActiveSendType] = useState("welcome");

  const [logs, setLogs] = useState([]);
  const [rewardEntries, setRewardEntries] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [spendSummary, setSpendSummary] = useState(DEFAULT_SPEND_SUMMARY);

  const [selectedRewardEntryId, setSelectedRewardEntryId] = useState("");
  const [selectedPayoutId, setSelectedPayoutId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [loadingSpend, setLoadingSpend] = useState(false);

  const [sendingId, setSendingId] = useState(null);
  const [sendingType, setSendingType] = useState("");
  const [toast, setToast] = useState(null);

  const templates = DEFAULT_TEMPLATES;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadSpendSummary = async () => {
    try {
      setLoadingSpend(true);
      const response = await api.get("/messages/spend-summary");
      setSpendSummary(normalizeSpendSummary(response.data));
    } catch {
      setSpendSummary(DEFAULT_SPEND_SUMMARY);
    } finally {
      setLoadingSpend(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (statusFilter !== "all") params.status = statusFilter;
      const response = await api.get("/messages/logs", { params });
      setLogs(normalizeLogs(response.data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadRewardEntries = async () => {
    try {
      setLoadingEntries(true);
      const response = await api.get("/reward-entries/grouped?limit=100");
      setRewardEntries(normalizeEntries(response.data));
    } catch (error) {
      showToast(error?.response?.data?.detail || "Unable to load reward entries.", "error");
    } finally {
      setLoadingEntries(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get("/customers/");
      setCustomers(normalizeCustomers(response.data));
    } catch {
      setCustomers([]);
    }
  };

  const loadPayouts = async () => {
    try {
      setLoadingPayouts(true);
      const response = await api.get("/payouts");
      setPayouts(normalizePayouts(response.data));
    } catch (error) {
      showToast(error?.response?.data?.detail || "Unable to load redemptions.", "error");
    } finally {
      setLoadingPayouts(false);
    }
  };

  const refreshAll = async () => {
    await Promise.allSettled([loadLogs(), loadSpendSummary(), loadRewardEntries(), loadCustomers(), loadPayouts()]);
  };

  useEffect(() => { loadLogs(); loadSpendSummary(); }, [statusFilter]);
  useEffect(() => { loadRewardEntries(); loadCustomers(); loadPayouts(); }, []);

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach((customer) => map.set(String(customer.id), customer));
    return map;
  }, [customers]);

  const enhancedPayouts = useMemo(() => {
    return payouts.map((payout) => {
      const customer = customerMap.get(String(payout.customer_id));
      return {
        ...payout,
        customer_name: payout.customer_name || payout.name || customer?.name || `Customer #${payout.customer_id}`,
        phone_number: payout.phone_number || customer?.phone_number || "",
        points_balance: payout.points_balance ?? payout.points_balance_after ?? customer?.points_balance ?? 0,
      };
    });
  }, [payouts, customerMap]);

  const filteredLogs = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return logs.filter((log) => {
      const logType = getLogType(log);
      if (historyTypeFilter !== "all" && logType !== historyTypeFilter) return false;
      if (!text) return true;
      const values = [logType, log.customer_name, log.phone_number, log.status, log.message_preview];
      return values.some((value) => String(value || "").toLowerCase().includes(text));
    });
  }, [logs, searchText, historyTypeFilter]);

  const totals = useMemo(() => ({
    total: Number(spendSummary.total_messages || 0) || logs.length || 0,
    sent: Number(spendSummary.sent_messages || 0) || logs.filter(l => ["sent", "delivered", "read"].includes(String(l.status).toLowerCase())).length,
    failed: Number(spendSummary.failed_messages || 0) || logs.filter(l => String(l.status).toLowerCase() === "failed").length,
    totalSpend: Number(spendSummary.total_estimated_spend || 0),
    currency: spendSummary.cost_currency || "INR",
  }), [logs, spendSummary]);

  const sentRewardEntryIds = useMemo(() => new Set(logs.filter(l => ["sent", "delivered", "read"].includes(String(l.status).toLowerCase()) && l.reward_entry_id).map(l => String(l.reward_entry_id))), [logs]);
  const sentPayoutIds = useMemo(() => new Set(logs.filter(l => ["sent", "delivered", "read"].includes(String(l.status).toLowerCase()) && getLogType(l) === "redemption" && (l.payout_id || l.redemption_id)).map(l => String(l.payout_id || l.redemption_id))), [logs]);

  const availableRewardEntries = useMemo(() => rewardEntries.filter(e => String(getEntryId(e)) && !sentRewardEntryIds.has(String(getEntryId(e)))), [rewardEntries, sentRewardEntryIds]);
  const availablePayouts = useMemo(() => enhancedPayouts.filter(p => String(getPayoutId(p)) && Number(p.points_redeemed || p.points || 0) > 0 && !sentPayoutIds.has(String(getPayoutId(p)))), [enhancedPayouts, sentPayoutIds]);

  useEffect(() => { if (availableRewardEntries.length > 0 && !selectedRewardEntryId) setSelectedRewardEntryId(String(getEntryId(availableRewardEntries[0]))); }, [availableRewardEntries, selectedRewardEntryId]);
  useEffect(() => { if (availablePayouts.length > 0 && !selectedPayoutId) setSelectedPayoutId(String(getPayoutId(availablePayouts[0]))); }, [availablePayouts, selectedPayoutId]);
  useEffect(() => { if (customers.length > 0 && !selectedCustomerId) setSelectedCustomerId(String(customers[0].id)); }, [customers, selectedCustomerId]);

  const selectedRewardEntry = useMemo(() => availableRewardEntries.find(e => String(getEntryId(e)) === String(selectedRewardEntryId)), [availableRewardEntries, selectedRewardEntryId]);
  const selectedPayout = useMemo(() => availablePayouts.find(p => String(getPayoutId(p)) === String(selectedPayoutId)), [availablePayouts, selectedPayoutId]);
  const selectedCustomer = useMemo(() => customers.find(c => String(c.id) === String(selectedCustomerId)), [customers, selectedCustomerId]);

  const activeRecipientPhone = useMemo(() => {
    if (activeSendType === "welcome") return selectedCustomer?.phone_number || selectedCustomer?.phone || "No phone";
    if (activeSendType === "redemption") return selectedPayout?.phone_number || "No phone";
    return selectedRewardEntry?.phone_number || customerMap.get(String(selectedRewardEntry?.customer_id))?.phone_number || "No phone";
  }, [activeSendType, selectedCustomer, selectedPayout, selectedRewardEntry, customerMap]);

  const previewMessage = useMemo(() => {
    if (activeSendType === "welcome") return buildWelcomePreview(templates.welcome.body, selectedCustomer);
    if (activeSendType === "redemption") return buildRedemptionPreview(templates.redemption.body, selectedPayout);
    return buildRewardPreview(templates.reward.body, selectedRewardEntry);
  }, [activeSendType, templates, selectedRewardEntry, selectedPayout, selectedCustomer]);

  const sendMessageByType = async (type, recordId, allowResend = false) => {
    if (!recordId) { showToast("Please select a valid record first.", "error"); return; }

    let url = type === "welcome" 
      ? `/messages/customer/${recordId}/whatsapp/welcome` 
      : type === "redemption" 
      ? `/messages/payout/${recordId}/whatsapp/send` 
      : `/messages/reward-entry/${recordId}/whatsapp/send`;

    try {
      setSendingId(String(recordId));
      setSendingType(type);
      const response = await api.post(url, { allow_resend: allowResend });

      if (response.data?.success) {
        showToast(`WhatsApp message sent successfully.`, "success");
        setActiveTab("history");
        await refreshAll();
      } else {
        showToast(response.data?.error_message || "WhatsApp message failed.", "error");
      }
    } catch (error) {
      if (error?.response?.status === 409 && typeof error?.response?.data?.detail === "string" && error.response.data.detail.toLowerCase().includes("already sent")) {
        if (window.confirm("WhatsApp message already sent for this transaction. Do you want to resend?")) {
          await sendMessageByType(type, recordId, true);
        }
        return;
      }
      showToast(error?.response?.data?.detail || "Unable to send WhatsApp message.", "error");
    } finally {
      setSendingId(null);
      setSendingType("");
    }
  };

  const sendSelectedWhatsApp = () => {
    if (activeSendType === "welcome") {
      sendMessageByType("welcome", selectedCustomerId, false);
      return;
    }
    if (activeSendType === "redemption") {
      sendMessageByType("redemption", selectedPayoutId, false);
      return;
    }
    sendMessageByType("reward", selectedRewardEntryId, false);
  };

  let activePendingCount = activeSendType === "welcome" ? customers.length : activeSendType === "redemption" ? availablePayouts.length : availableRewardEntries.length;
  let activeSelectedId = activeSendType === "welcome" ? selectedCustomerId : activeSendType === "redemption" ? selectedPayoutId : selectedRewardEntryId;
  const isActiveSending = sendingType === activeSendType && sendingId === String(activeSelectedId);

  return (
    <div className="directory-page">
      {toast && (
        <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      {/* PORTAL HEADER */}
      <PortalHeader 
        title="WhatsApp Messaging" 
        kicker="COMMUNICATION"
        description="Send customer welcome, reward, and redemption notifications via WhatsApp Cloud API."
        icon={FiMessageCircle} 
        backPath="/dashboard" 
      />

      <div className="dir-stats-grid">
        <StatCard title="Total Messages" value={totals.total} Icon={FiMessageCircle} colorTheme="blue" />
        <StatCard title="Sent Messages" value={totals.sent} Icon={FiCheckCircle} colorTheme="green" />
        <StatCard title="Failed Messages" value={totals.failed} Icon={FiXCircle} colorTheme="red" />
        <StatCard title="Estimated Spend" value={loadingSpend ? "..." : formatSpend(totals.totalSpend, totals.currency)} Icon={FiDollarSign} colorTheme="orange" />
      </div>

      {/* TABS NAVIGATION */}
      <div className="wa-tabs-container">
        <button className={`wa-tab-btn ${activeTab === "send" ? "active" : ""}`} onClick={() => setActiveTab("send")}>
          <FiSend size={15}/> Send Notification
        </button>
        <button className={`wa-tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          <FiClock size={15}/> Message Logs
        </button>
      </div>

      {/* SEND TAB */}
      {activeTab === "send" && (
        <section className="dir-modules-section">
          <ModuleWriternHeader 
            title="Dispatch Template Message" 
            description="Send approved Cloud API notifications directly to the customer's phone." 
            badgeCount={activePendingCount} 
            badgeLabel="available" 
          />
          
          <div className="wa-type-row">
            <button className={`wa-type-select-btn ${activeSendType === "welcome" ? "active" : ""}`} onClick={() => setActiveSendType("welcome")}>
              <FiHeart /> Welcome Message
            </button>
            <button className={`wa-type-select-btn ${activeSendType === "reward" ? "active" : ""}`} onClick={() => setActiveSendType("reward")}>
              <FiAward /> Reward Points
            </button>
            <button className={`wa-type-select-btn ${activeSendType === "redemption" ? "active" : ""}`} onClick={() => setActiveSendType("redemption")}>
              <FiDollarSign /> Redemption Points
            </button>
          </div>

          <div className="wa-split-grid">
            {/* LEFT PANEL: SELECT RECIPIENT */}
            <div className="wa-panel">
              <h3 className="wa-panel-title">Select Recipient</h3>
              
              {activeSendType === "welcome" && (
                <div className="form-group">
                  <label>Customer</label>
                  <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} disabled={customers.length === 0}>
                    <option value="">{customers.length === 0 ? "No customers found" : "Select customer"}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || "Customer"} — {c.phone_number || "No Phone"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeSendType === "reward" && (
                <div className="form-group">
                  <label>Pending Reward Transaction</label>
                  <select value={selectedRewardEntryId} onChange={(e) => setSelectedRewardEntryId(e.target.value)} disabled={loadingEntries || availableRewardEntries.length === 0}>
                    <option value="">{availableRewardEntries.length === 0 ? "No unsent reward transactions found" : "Select reward transaction"}</option>
                    {availableRewardEntries.map((entry) => (
                      <option key={getEntryId(entry)} value={getEntryId(entry)}>
                        #{getEntryId(entry)} • {entry.customer_name} • {formatPoints(entry.total_points || entry.points || 0)} pts
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeSendType === "redemption" && (
                <div className="form-group">
                  <label>Pending Redemption Transaction</label>
                  <select value={selectedPayoutId} onChange={(e) => setSelectedPayoutId(e.target.value)} disabled={loadingPayouts || availablePayouts.length === 0}>
                    <option value="">{availablePayouts.length === 0 ? "No unsent redemptions found" : "Select redemption transaction"}</option>
                    {availablePayouts.map((payout) => (
                      <option key={getPayoutId(payout)} value={getPayoutId(payout)}>
                        #{getPayoutId(payout)} • {payout.customer_name} • {formatPoints(payout.points_redeemed || payout.points || 0)} pts
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Phone Badge */}
              <div className="wa-number-badge-row">
                <div className="wa-meta-pill recipient">
                  <FiPhone size={13} color="#166962" />
                  <span>To: <strong>{activeRecipientPhone}</strong></span>
                </div>
              </div>

              <button 
                className="btn-submit" 
                style={{ width: '100%', marginTop: '16px', height: '42px' }} 
                disabled={!activeSelectedId || sendingId} 
                onClick={sendSelectedWhatsApp}
              >
                <FiSend size={14} /> {isActiveSending ? "Sending..." : "Send WhatsApp Message"}
              </button>
            </div>

            {/* RIGHT PANEL: LIVE PREVIEW */}
            <div className="wa-panel preview-panel">
              <div className="wa-preview-header">
                <h3 className="wa-panel-title" style={{ margin: 0 }}>
                  <FiMessageCircle size={15} color="#166962" /> Live Preview
                </h3>
                <span className="wa-preview-pill-type">
                  {SEND_TYPES[activeSendType].label}
                </span>
              </div>

              {/* Clean WhatsApp-styled bubble */}
              <div className="wa-preview-container">
                <div className="wa-preview-bubble">
                  {previewMessage}
                  <span className="wa-preview-time">Just now</span>
                </div>
              </div>

              <div className="wa-preview-footer-note">
                <span>Variables automatically sync with the customer's live profile and store configuration.</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <section className="dir-modules-section">
          <ModuleWriternHeader title="Message History" description="Real-time delivery status and billing logs from WhatsApp Cloud API." badgeCount={filteredLogs.length} badgeLabel="logs" />
          
          <div className="dir-controls">
            <div className="dir-search-box" style={{ flex: 1.5 }}>
              <FiSearch size={18} className="search-icon" />
              <input type="text" placeholder="Search customer, phone, message..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select className="dir-filter-select" value={historyTypeFilter} onChange={(e) => setHistoryTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="welcome">Welcome</option>
                <option value="reward">Reward</option>
                <option value="redemption">Redemption</option>
              </select>

              <select className="dir-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="dir-table-container">
            <table className="dir-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '20%' }}>Customer</th>
                  <th style={{ width: '13%' }}>Phone</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Points</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '14%' }}>Message Preview</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="empty-state">Loading message logs...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No WhatsApp logs found.</td></tr>
                ) : (
                  filteredLogs.map(log => {
                    const logType = getLogType(log);
                    const recordId = getHistoryRecordId(log);
                    const initials = String(log.customer_name || "C").charAt(0).toUpperCase();

                    return (
                      <tr key={log.id} className="dir-table-row">
                        <td>
                          <span className="wa-date-cell">{formatDateTime(log.sent_at || log.created_at)}</span>
                        </td>
                        <td>
                          <span className={`wa-status-badge wa-type-${logType}`}>
                            {SEND_TYPES[logType].shortLabel}
                          </span>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <div className="staff-avatar">{initials}</div>
                            <span className="customer-name">{log.customer_name || `Customer #${log.customer_id}`}</span>
                          </div>
                        </td>
                        <td>
                          <span className="single-line-text">{log.phone_number || "-"}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`points-val ${logType === 'redemption' ? 'debit' : logType === 'welcome' ? 'neutral' : 'credit'}`}>
                            {getHistoryPointText(log)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`wa-status-pill ${String(log.status).toLowerCase()}`}>
                            {getStatusIcon(log.status)} {getStatusLabel(log.status)}
                          </span>
                        </td>
                        <td>
                          <div className="truncate-cell text-muted" title={log.message_preview || "-"}>
                            {log.message_preview || "-"}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="dir-row-edit-btn" 
                            disabled={!recordId || sendingId} 
                            onClick={() => sendMessageByType(logType, recordId, true)}
                            title="Resend WhatsApp"
                          >
                            <FiRepeat size={14}/>
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
      )}
    </div>
  );
}