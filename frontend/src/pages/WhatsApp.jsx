import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiMessageCircle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSearch,
  FiPhone,
  FiUser,
  FiSend,
  FiFileText,
  FiSettings,
  FiRepeat,
  FiEdit3,
  FiSave,
  FiX,
  FiDollarSign,
  FiAward,
  FiCreditCard,
} from "react-icons/fi";

import api from "../api/axios";

const TEMPLATE_STORAGE_KEY = "aerostate_whatsapp_templates";

const DEFAULT_TEMPLATES = {
  reward: {
    name: "reward_points_update",
    language: "en",
    body:
      "Dear {{1}}, {{2}} reward points have been added to your account at {{3}}. Your total balance is {{4}} points. Thank you.",
  },
  redemption: {
    name: "redemption_points_update",
    language: "en",
    body:
      "Dear {{1}}, {{2}} reward points have been redeemed from your account at {{3}}. Your total balance is {{4}} points. Payout amount is ₹{{5}}. Thank you.",
  },
};

const SEND_TYPES = {
  reward: {
    key: "reward",
    label: "Reward Points",
    shortLabel: "Reward",
  },
  redemption: {
    key: "redemption",
    label: "Redemption Points",
    shortLabel: "Redemption",
  },
};

const normalizeLogs = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeEntries = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizePayouts = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.payouts)) return data.payouts;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeCustomers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getEntryId = (entry) =>
  entry?.reward_entry_id || entry?.transaction_group_id || entry?.id;

const getPayoutId = (payout) =>
  payout?.payout_id || payout?.redemption_id || payout?.id;

const formatDateTime = (value) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

const formatPoints = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0";

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2).replace(/\.?0+$/, "");
};

const formatMoney = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0.00";

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getStatusIcon = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized === "sent" ||
    normalized === "delivered" ||
    normalized === "read"
  ) {
    return <FiCheckCircle />;
  }

  if (normalized === "failed") {
    return <FiXCircle />;
  }

  return <FiClock />;
};

const getStatusLabel = (status) => {
  const normalized = String(status || "pending").toLowerCase();

  if (normalized === "sent") return "Sent";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "read") return "Read";
  if (normalized === "failed") return "Failed";
  if (normalized === "pending") return "Pending";

  return normalized;
};

const getLogType = (log) => {
  const rawType = String(
    log?.message_type || log?.type || log?.template_type || ""
  ).toLowerCase();

  if (
    rawType.includes("redemption") ||
    rawType.includes("redeem") ||
    rawType.includes("payout")
  ) {
    return "redemption";
  }

  if (log?.payout_id || log?.redemption_id) {
    return "redemption";
  }

  return "reward";
};

const loadSavedTemplates = () => {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);

    if (!saved) {
      return DEFAULT_TEMPLATES;
    }

    const parsed = JSON.parse(saved);

    return {
      reward: {
        name: parsed?.reward?.name || DEFAULT_TEMPLATES.reward.name,
        language:
          parsed?.reward?.language || DEFAULT_TEMPLATES.reward.language,
        body: parsed?.reward?.body || DEFAULT_TEMPLATES.reward.body,
      },
      redemption: {
        name:
          parsed?.redemption?.name || DEFAULT_TEMPLATES.redemption.name,
        language:
          parsed?.redemption?.language ||
          DEFAULT_TEMPLATES.redemption.language,
        body:
          parsed?.redemption?.body || DEFAULT_TEMPLATES.redemption.body,
      },
    };
  } catch {
    return DEFAULT_TEMPLATES;
  }
};

const buildRewardPreview = (templateBody, entry) => {
  if (!entry) {
    return "No pending reward transaction selected. Sent transactions are removed from this list.";
  }

  const customerName = entry.customer_name || "Customer";
  const addedPoints = formatPoints(entry.total_points || entry.points || 0);
  const storeName = entry.store_name || "Store";
  const totalPoints = formatPoints(
    entry.total_points_balance ||
      entry.points_balance ||
      entry.customer_points_balance ||
      entry.total_balance ||
      entry.total_points ||
      entry.points ||
      0
  );

  return String(templateBody || DEFAULT_TEMPLATES.reward.body)
    .replaceAll("{{1}}", customerName)
    .replaceAll("{{2}}", addedPoints)
    .replaceAll("{{3}}", storeName)
    .replaceAll("{{4}}", totalPoints);
};

const buildRedemptionPreview = (templateBody, payout) => {
  if (!payout) {
    return "No pending redemption transaction selected. Sent redemption messages are removed from this list.";
  }

  const customerName =
    payout.customer_name || payout.name || payout.customer?.name || "Customer";

  const redeemedPoints = formatPoints(
    payout.points_redeemed || payout.redeemed_points || payout.points || 0
  );

  const storeName = payout.store_name || payout.store?.name || "Store";

  const totalPoints = formatPoints(
    payout.total_points_balance ||
      payout.points_balance_after ||
      payout.customer_points_balance ||
      payout.points_balance ||
      payout.customer?.points_balance ||
      0
  );

  const payoutAmount = formatMoney(
    payout.payout_value || payout.amount || payout.payout_amount || 0
  );

  return String(templateBody || DEFAULT_TEMPLATES.redemption.body)
    .replaceAll("{{1}}", customerName)
    .replaceAll("{{2}}", redeemedPoints)
    .replaceAll("{{3}}", storeName)
    .replaceAll("{{4}}", totalPoints)
    .replaceAll("{{5}}", payoutAmount);
};

const WhatsApp = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState("send");
  const [activeSendType, setActiveSendType] = useState("reward");

  const [logs, setLogs] = useState([]);
  const [rewardEntries, setRewardEntries] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedRewardEntryId, setSelectedRewardEntryId] = useState("");
  const [selectedPayoutId, setSelectedPayoutId] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const [templates, setTemplates] = useState(() => loadSavedTemplates());
  const [templateDrafts, setTemplateDrafts] = useState(() =>
    loadSavedTemplates()
  );
  const [templateEditType, setTemplateEditType] = useState("reward");
  const [editingTemplate, setEditingTemplate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const [sendingId, setSendingId] = useState(null);
  const [sendingType, setSendingType] = useState("");

  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setNotice("");

      const params = {
        limit: 100,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await api.get("/messages/logs", { params });
      setLogs(normalizeLogs(response.data));
    } catch (error) {
      console.error("WhatsApp logs loading error:", error);
      setNotice(
        error?.response?.data?.detail ||
          "Unable to load WhatsApp message history."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRewardEntries = async () => {
    try {
      setLoadingEntries(true);

      const response = await api.get("/reward-entries/grouped?limit=100");
      const data = normalizeEntries(response.data);

      setRewardEntries(data);
    } catch (error) {
      console.error("Reward entries loading error:", error);
      showToast(
        error?.response?.data?.detail ||
          "Unable to load reward entries for WhatsApp sending.",
        "error"
      );
    } finally {
      setLoadingEntries(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get("/customers/");
      setCustomers(normalizeCustomers(response.data));
    } catch (error) {
      console.error("Customers loading error:", error);
      setCustomers([]);
    }
  };

  const loadPayouts = async () => {
    try {
      setLoadingPayouts(true);

      const response = await api.get("/payouts");
      const data = normalizePayouts(response.data);

      setPayouts(data);
    } catch (error) {
      console.error("Payouts loading error:", error);
      showToast(
        error?.response?.data?.detail ||
          "Unable to load redemption transactions for WhatsApp sending.",
        "error"
      );
    } finally {
      setLoadingPayouts(false);
    }
  };

  const refreshAll = async () => {
    await Promise.allSettled([
      loadLogs(),
      loadRewardEntries(),
      loadCustomers(),
      loadPayouts(),
    ]);
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadRewardEntries();
    loadCustomers();
    loadPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerMap = useMemo(() => {
    const map = new Map();

    customers.forEach((customer) => {
      map.set(String(customer.id), customer);
    });

    return map;
  }, [customers]);

  const enhancedPayouts = useMemo(() => {
    return payouts.map((payout) => {
      const customer = customerMap.get(String(payout.customer_id));

      return {
        ...payout,
        customer_name:
          payout.customer_name ||
          payout.name ||
          payout.customer?.name ||
          customer?.name ||
          `Customer #${payout.customer_id || "-"}`,
        phone_number:
          payout.phone_number ||
          payout.customer_phone ||
          payout.customer?.phone_number ||
          customer?.phone_number ||
          "",
        points_balance:
          payout.points_balance ??
          payout.customer_points_balance ??
          payout.points_balance_after ??
          payout.customer?.points_balance ??
          customer?.points_balance ??
          0,
      };
    });
  }, [payouts, customerMap]);

  const filteredLogs = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    return logs.filter((log) => {
      const logType = getLogType(log);

      if (historyTypeFilter !== "all" && logType !== historyTypeFilter) {
        return false;
      }

      if (!text) return true;

      const values = [
        logType,
        log.customer_name,
        log.store_name,
        log.phone_number,
        log.status,
        log.message_preview,
        log.sent_by_username,
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(text)
      );
    });
  }, [logs, searchText, historyTypeFilter]);

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        const status = String(log.status || "").toLowerCase();

        acc.total += 1;

        if (status === "sent" || status === "delivered" || status === "read") {
          acc.sent += 1;
        } else if (status === "failed") {
          acc.failed += 1;
        } else {
          acc.pending += 1;
        }

        return acc;
      },
      {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      }
    );
  }, [logs]);

  const sentRewardEntryIds = useMemo(() => {
    return new Set(
      logs
        .filter((log) => {
          const status = String(log.status || "").toLowerCase();
          return (
            (status === "sent" ||
              status === "delivered" ||
              status === "read") &&
            log.reward_entry_id
          );
        })
        .map((log) => String(log.reward_entry_id || ""))
        .filter(Boolean)
    );
  }, [logs]);

  const sentPayoutIds = useMemo(() => {
    return new Set(
      logs
        .filter((log) => {
          const status = String(log.status || "").toLowerCase();
          const logType = getLogType(log);

          return (
            (status === "sent" ||
              status === "delivered" ||
              status === "read") &&
            logType === "redemption" &&
            (log.payout_id || log.redemption_id)
          );
        })
        .map((log) => String(log.payout_id || log.redemption_id || ""))
        .filter(Boolean)
    );
  }, [logs]);

  const availableRewardEntries = useMemo(() => {
    return rewardEntries.filter((entry) => {
      const entryId = String(getEntryId(entry) || "");
      return entryId && !sentRewardEntryIds.has(entryId);
    });
  }, [rewardEntries, sentRewardEntryIds]);

  const availablePayouts = useMemo(() => {
    return enhancedPayouts.filter((payout) => {
      const payoutId = String(getPayoutId(payout) || "");
      const redeemedPoints = Number(
        payout.points_redeemed || payout.redeemed_points || payout.points || 0
      );

      return payoutId && redeemedPoints > 0 && !sentPayoutIds.has(payoutId);
    });
  }, [enhancedPayouts, sentPayoutIds]);

  useEffect(() => {
    if (availableRewardEntries.length === 0) {
      if (selectedRewardEntryId) {
        setSelectedRewardEntryId("");
      }

      return;
    }

    const selectedStillAvailable = availableRewardEntries.some(
      (entry) => String(getEntryId(entry)) === String(selectedRewardEntryId)
    );

    if (!selectedStillAvailable) {
      setSelectedRewardEntryId(String(getEntryId(availableRewardEntries[0])));
    }
  }, [availableRewardEntries, selectedRewardEntryId]);

  useEffect(() => {
    if (availablePayouts.length === 0) {
      if (selectedPayoutId) {
        setSelectedPayoutId("");
      }

      return;
    }

    const selectedStillAvailable = availablePayouts.some(
      (payout) => String(getPayoutId(payout)) === String(selectedPayoutId)
    );

    if (!selectedStillAvailable) {
      setSelectedPayoutId(String(getPayoutId(availablePayouts[0])));
    }
  }, [availablePayouts, selectedPayoutId]);

  const selectedRewardEntry = useMemo(() => {
    return availableRewardEntries.find(
      (entry) => String(getEntryId(entry)) === String(selectedRewardEntryId)
    );
  }, [availableRewardEntries, selectedRewardEntryId]);

  const selectedPayout = useMemo(() => {
    return availablePayouts.find(
      (payout) => String(getPayoutId(payout)) === String(selectedPayoutId)
    );
  }, [availablePayouts, selectedPayoutId]);

  const previewMessage = useMemo(() => {
    if (activeSendType === "redemption") {
      return buildRedemptionPreview(templates.redemption.body, selectedPayout);
    }

    return buildRewardPreview(templates.reward.body, selectedRewardEntry);
  }, [
    activeSendType,
    templates,
    selectedRewardEntry,
    selectedPayout,
  ]);

  const draftPreviewMessage = useMemo(() => {
    if (templateEditType === "redemption") {
      return buildRedemptionPreview(
        templateDrafts.redemption.body,
        selectedPayout
      );
    }

    return buildRewardPreview(templateDrafts.reward.body, selectedRewardEntry);
  }, [
    templateEditType,
    templateDrafts,
    selectedRewardEntry,
    selectedPayout,
  ]);

  const sendMessageByType = async (type, recordId, allowResend = false) => {
    if (!recordId) {
      showToast("Please select a transaction first.", "error");
      return;
    }

    const url =
      type === "redemption"
        ? `/messages/payout/${recordId}/whatsapp/send`
        : `/messages/reward-entry/${recordId}/whatsapp/send`;

    try {
      setSendingId(String(recordId));
      setSendingType(type);

      const response = await api.post(url, {
        allow_resend: allowResend,
      });

      if (response.data?.success) {
        showToast(
          type === "redemption"
            ? "Redemption WhatsApp message sent successfully."
            : "Reward WhatsApp message sent successfully.",
          "success"
        );

        setActiveTab("history");
        await refreshAll();
      } else {
        showToast(
          response.data?.error_message || "WhatsApp message failed.",
          "error"
        );
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;

      if (
        error?.response?.status === 409 &&
        typeof detail === "string" &&
        detail.toLowerCase().includes("already sent")
      ) {
        const confirmResend = window.confirm(
          "WhatsApp message already sent for this transaction. Do you want to resend?"
        );

        if (confirmResend) {
          await sendMessageByType(type, recordId, true);
        }

        return;
      }

      console.error("WhatsApp send error:", error);
      showToast(
        error?.response?.data?.detail || "Unable to send WhatsApp message.",
        "error"
      );
    } finally {
      setSendingId(null);
      setSendingType("");
    }
  };

  const sendSelectedWhatsApp = () => {
    if (activeSendType === "redemption") {
      sendMessageByType("redemption", selectedPayoutId, false);
      return;
    }

    sendMessageByType("reward", selectedRewardEntryId, false);
  };

  const startEditTemplate = () => {
    setTemplateDrafts(templates);
    setEditingTemplate(true);
  };

  const cancelEditTemplate = () => {
    setTemplateDrafts(templates);
    setEditingTemplate(false);
  };

  const resetTemplateToDefault = () => {
    setTemplateDrafts((prev) => ({
      ...prev,
      [templateEditType]: DEFAULT_TEMPLATES[templateEditType],
    }));
  };

  const saveTemplate = () => {
    const draft = templateDrafts[templateEditType];

    const cleanName = draft.name.trim();
    const cleanLanguage = draft.language.trim();
    const cleanBody = draft.body.trim();

    if (!cleanName) {
      showToast("Template name is required.", "error");
      return;
    }

    if (!cleanLanguage) {
      showToast("Template language is required.", "error");
      return;
    }

    if (!cleanBody) {
      showToast("Template message body is required.", "error");
      return;
    }

    const requiredVariables =
      templateEditType === "redemption"
        ? ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}"]
        : ["{{1}}", "{{2}}", "{{3}}", "{{4}}"];

    const missingVariables = requiredVariables.filter(
      (variable) => !cleanBody.includes(variable)
    );

    if (missingVariables.length > 0) {
      showToast(
        `Missing required variables: ${missingVariables.join(", ")}`,
        "error"
      );
      return;
    }

    const updatedTemplates = {
      ...templates,
      [templateEditType]: {
        name: cleanName,
        language: cleanLanguage,
        body: cleanBody,
      },
    };

    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
    setTemplateDrafts(updatedTemplates);
    setEditingTemplate(false);
    showToast("Template saved successfully.", "success");
  };

  const updateTemplateDraft = (field, value) => {
    setTemplateDrafts((prev) => ({
      ...prev,
      [templateEditType]: {
        ...prev[templateEditType],
        [field]: value,
      },
    }));
  };

  const selectedTemplate = templates[templateEditType];
  const selectedTemplateDraft = templateDrafts[templateEditType];

  const activePendingCount =
    activeSendType === "redemption"
      ? availablePayouts.length
      : availableRewardEntries.length;

  const activeSelectedId =
    activeSendType === "redemption" ? selectedPayoutId : selectedRewardEntryId;

  const isActiveSending =
    sendingType === activeSendType && sendingId === String(activeSelectedId);

  const getHistoryPointText = (log) => {
    const logType = getLogType(log);

    if (logType === "redemption") {
      return `-${formatPoints(
        log.redeemed_points ||
          log.points_redeemed ||
          log.added_points ||
          log.points ||
          0
      )}`;
    }

    return `+${formatPoints(log.added_points || log.points || 0)}`;
  };

  const getHistoryRecordId = (log) => {
    const logType = getLogType(log);

    if (logType === "redemption") {
      return log.payout_id || log.redemption_id;
    }

    return log.reward_entry_id;
  };

  return (
    <>
      <style>{whatsappPageCss}</style>

      <div className="asw-page">
        {toast ? (
          <div
            className={`asw-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <section className="asw-header-card">
          <div className="asw-header-left">
            {onBack && (
              <button type="button" className="asw-back-btn" onClick={onBack}>
                <FiArrowLeft /> Back
              </button>
            )}

            <div className="asw-title-icon">
              <FiMessageCircle />
            </div>

            <div>
              <h1 className="asw-title">WhatsApp</h1>
              <p className="asw-subtitle">
                Send reward and redemption WhatsApp messages manually, view
                message history, manage templates, and check delivery status.
              </p>
            </div>
          </div>

        </section>

        {notice ? <div className="asw-alert">{notice}</div> : null}

        <section className="asw-stats-grid">
          <StatCard
            icon={<FiMessageCircle />}
            label="Total Messages"
            value={totals.total}
            tone="blue"
          />

          <StatCard
            icon={<FiCheckCircle />}
            label="Sent"
            value={totals.sent}
            tone="green"
          />

          <StatCard
            icon={<FiXCircle />}
            label="Failed"
            value={totals.failed}
            tone="red"
          />

          <StatCard
            icon={<FiClock />}
            label="Pending"
            value={totals.pending}
            tone="orange"
          />
        </section>

        <section className="asw-tabs-card">
          <button
            type="button"
            className={`asw-tab ${activeTab === "send" ? "active" : ""}`}
            onClick={() => setActiveTab("send")}
          >
            <FiSend /> Send WhatsApp
          </button>

          <button
            type="button"
            className={`asw-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <FiClock /> History
          </button>

          <button
            type="button"
            className={`asw-tab ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => setActiveTab("templates")}
          >
            <FiFileText /> Templates
          </button>

          <button
            type="button"
            className={`asw-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <FiSettings /> Settings
          </button>
        </section>

        {activeTab === "send" ? (
          <section className="asw-card">
            <div className="asw-card-head">
              <div>
                <h2 className="asw-card-title">Send WhatsApp Message</h2>
                <p className="asw-card-subtitle">
                  Select reward points or redemption points and send the
                  approved WhatsApp utility template manually.
                </p>
              </div>

              <span className="asw-record-badge">
                {activePendingCount} pending
              </span>
            </div>

            <div className="asw-send-type-row">
              <button
                type="button"
                className={`asw-type-btn ${
                  activeSendType === "reward" ? "active" : ""
                }`}
                onClick={() => setActiveSendType("reward")}
              >
                <FiAward />
                Reward Points
              </button>

              <button
                type="button"
                className={`asw-type-btn ${
                  activeSendType === "redemption" ? "active" : ""
                }`}
                onClick={() => setActiveSendType("redemption")}
              >
                <FiDollarSign />
                Redemption Points
              </button>
            </div>

            <div className="asw-send-grid">
              <div className="asw-send-form">
                {activeSendType === "reward" ? (
                  <>
                    <div className="asw-form-group">
                      <label>Reward Transaction</label>

                      <select
                        value={selectedRewardEntryId}
                        onChange={(event) =>
                          setSelectedRewardEntryId(event.target.value)
                        }
                        disabled={
                          loadingEntries || availableRewardEntries.length === 0
                        }
                      >
                        <option value="">
                          {availableRewardEntries.length === 0
                            ? "No pending reward transaction found"
                            : "Select reward transaction"}
                        </option>

                        {availableRewardEntries.map((entry) => {
                          const entryId = getEntryId(entry);

                          return (
                            <option key={entryId} value={entryId}>
                              #{entryId} - {entry.customer_name || "Customer"} -{" "}
                              {formatPoints(
                                entry.total_points || entry.points || 0
                              )}{" "}
                              pts - {formatDateTime(entry.created_at)}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedRewardEntry ? (
                      <div className="asw-selected-box">
                        <div>
                          <span>Customer</span>
                          <strong>
                            {selectedRewardEntry.customer_name || "-"}
                          </strong>
                        </div>

                        <div>
                          <span>Phone</span>
                          <strong>
                            {selectedRewardEntry.phone_number || "-"}
                          </strong>
                        </div>

                        <div>
                          <span>Added Points</span>
                          <strong>
                            {formatPoints(
                              selectedRewardEntry.total_points ||
                                selectedRewardEntry.points ||
                                0
                            )}{" "}
                            pts
                          </strong>
                        </div>

                        <div>
                          <span>Transaction ID</span>
                          <strong>#{getEntryId(selectedRewardEntry)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="asw-empty-inline">
                        {availableRewardEntries.length === 0
                          ? "All available reward transactions already have WhatsApp sent. Check History for sent messages."
                          : "No reward transaction selected."}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="asw-form-group">
                      <label>Redemption / Payout Transaction</label>

                      <select
                        value={selectedPayoutId}
                        onChange={(event) =>
                          setSelectedPayoutId(event.target.value)
                        }
                        disabled={loadingPayouts || availablePayouts.length === 0}
                      >
                        <option value="">
                          {availablePayouts.length === 0
                            ? "No pending redemption transaction found"
                            : "Select redemption transaction"}
                        </option>

                        {availablePayouts.map((payout) => {
                          const payoutId = getPayoutId(payout);

                          return (
                            <option key={payoutId} value={payoutId}>
                              #{payoutId} - {payout.customer_name || "Customer"} -{" "}
                              {formatPoints(
                                payout.points_redeemed ||
                                  payout.redeemed_points ||
                                  payout.points ||
                                  0
                              )}{" "}
                              pts - ₹
                              {formatMoney(
                                payout.payout_value ||
                                  payout.amount ||
                                  payout.payout_amount ||
                                  0
                              )}{" "}
                              - {formatDateTime(payout.created_at)}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedPayout ? (
                      <div className="asw-selected-box">
                        <div>
                          <span>Customer</span>
                          <strong>{selectedPayout.customer_name || "-"}</strong>
                        </div>

                        <div>
                          <span>Phone</span>
                          <strong>{selectedPayout.phone_number || "-"}</strong>
                        </div>

                        <div>
                          <span>Redeemed Points</span>
                          <strong>
                            {formatPoints(
                              selectedPayout.points_redeemed ||
                                selectedPayout.redeemed_points ||
                                selectedPayout.points ||
                                0
                            )}{" "}
                            pts
                          </strong>
                        </div>

                        <div>
                          <span>Payout Amount</span>
                          <strong>
                            ₹
                            {formatMoney(
                              selectedPayout.payout_value ||
                                selectedPayout.amount ||
                                selectedPayout.payout_amount ||
                                0
                            )}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="asw-empty-inline">
                        {availablePayouts.length === 0
                          ? "All available redemption transactions already have WhatsApp sent. Check History for sent messages."
                          : "No redemption transaction selected."}
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  className="asw-send-btn"
                  onClick={sendSelectedWhatsApp}
                  disabled={!activeSelectedId || sendingId}
                >
                  <FiSend />
                  {isActiveSending
                    ? "Sending..."
                    : activeSendType === "redemption"
                    ? "Send Redemption WhatsApp"
                    : "Send Reward WhatsApp"}
                </button>
              </div>

              <div className="asw-preview-card">
                <div className="asw-preview-header">
                  <FiMessageCircle />
                  <div>
                    <h3>Message Preview</h3>
                    <p>Preview uses your saved template text.</p>
                  </div>
                </div>

                <div className="asw-preview-body">{previewMessage}</div>

                <div className="asw-template-note">
                  Type:{" "}
                  <strong>{SEND_TYPES[activeSendType].label}</strong>
                  <br />
                  Template: <strong>{templates[activeSendType].name}</strong>
                  <br />
                  Language:{" "}
                  <strong>{templates[activeSendType].language}</strong>
                  <br />
                  Rule:{" "}
                  <strong>
                    Sent transactions are removed from Send list
                  </strong>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section className="asw-card">
            <div className="asw-card-head">
              <div>
                <h2 className="asw-card-title">WhatsApp Message History</h2>
                <p className="asw-card-subtitle">
                  Showing latest reward and redemption WhatsApp logs from
                  backend.
                </p>
              </div>

              <span className="asw-record-badge">
                {filteredLogs.length} records
              </span>
            </div>

            <div className="asw-filter-row">
              <div className="asw-search-box">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search customer, phone, message..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </div>

              <select
                className="asw-select"
                value={historyTypeFilter}
                onChange={(event) => setHistoryTypeFilter(event.target.value)}
              >
                <option value="all">All Message Types</option>
                <option value="reward">Reward Points</option>
                <option value="redemption">Redemption Points</option>
              </select>

              <select
                className="asw-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
              </select>
            </div>

            {loading ? (
              <div className="asw-loading">Loading WhatsApp logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="asw-empty">
                <div className="asw-empty-icon">
                  <FiMessageCircle />
                </div>
                <h3>No WhatsApp logs found</h3>
                <p>
                  Send a WhatsApp message from this page, then come back here and
                  refresh.
                </p>
              </div>
            ) : (
              <>
                <div className="asw-table-wrap">
                  <table className="asw-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Points</th>
                        <th>Total Points</th>
                        <th>Status</th>
                        <th>Sent By</th>
                        <th>Message Preview</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredLogs.map((log) => {
                        const logType = getLogType(log);
                        const recordId = getHistoryRecordId(log);

                        return (
                          <tr key={log.id}>
                            <td>
                              <span className="asw-date">
                                {formatDateTime(log.sent_at || log.created_at)}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`asw-type-pill asw-type-${logType}`}
                              >
                                {logType === "redemption" ? (
                                  <FiDollarSign />
                                ) : (
                                  <FiAward />
                                )}
                                {SEND_TYPES[logType].shortLabel}
                              </span>
                            </td>

                            <td>
                              <div className="asw-customer">
                                <div className="asw-avatar">
                                  <FiUser />
                                </div>

                                <div>
                                  <strong>
                                    {log.customer_name ||
                                      `Customer #${log.customer_id}`}
                                  </strong>
                                  <span>{log.store_name || "Store"}</span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="asw-phone">
                                <FiPhone />
                                <span>{log.phone_number || "-"}</span>
                              </div>
                            </td>

                            <td>
                              <span
                                className={`asw-points ${
                                  logType === "redemption"
                                    ? "asw-points-red"
                                    : "asw-points-green"
                                }`}
                              >
                                {getHistoryPointText(log)}
                              </span>
                            </td>

                            <td>
                              <span className="asw-points">
                                {formatPoints(log.total_points)}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`asw-status asw-status-${String(
                                  log.status || "pending"
                                ).toLowerCase()}`}
                              >
                                {getStatusIcon(log.status)}
                                {getStatusLabel(log.status)}
                              </span>
                            </td>

                            <td>
                              <span className="asw-user-name">
                                {log.sent_by_username || "-"}
                              </span>
                            </td>

                            <td>
                              <div className="asw-message">
                                {log.message_preview || "-"}
                              </div>

                              {log.error_message ? (
                                <div className="asw-error-text">
                                  {log.error_message}
                                </div>
                              ) : null}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="asw-action-btn"
                                disabled={!recordId || sendingId}
                                onClick={() =>
                                  sendMessageByType(logType, recordId, true)
                                }
                              >
                                <FiRepeat />
                                {sendingId === String(recordId)
                                  ? "Sending"
                                  : "Resend"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="asw-mobile-list">
                  {filteredLogs.map((log) => {
                    const logType = getLogType(log);
                    const recordId = getHistoryRecordId(log);

                    return (
                      <div className="asw-mobile-card" key={`mobile-${log.id}`}>
                        <div className="asw-mobile-top">
                          <div>
                            <h3>
                              {log.customer_name ||
                                `Customer #${log.customer_id}`}
                            </h3>
                            <p>{formatDateTime(log.sent_at || log.created_at)}</p>
                          </div>

                          <span
                            className={`asw-status asw-status-${String(
                              log.status || "pending"
                            ).toLowerCase()}`}
                          >
                            {getStatusIcon(log.status)}
                            {getStatusLabel(log.status)}
                          </span>
                        </div>

                        <div className="asw-mobile-meta">
                          <span>
                            {logType === "redemption" ? (
                              <FiDollarSign />
                            ) : (
                              <FiAward />
                            )}
                            {SEND_TYPES[logType].label}
                          </span>

                          <span>
                            <FiPhone /> {log.phone_number || "-"}
                          </span>

                          <span>{getHistoryPointText(log)} pts</span>

                          <span>Total {formatPoints(log.total_points)} pts</span>
                        </div>

                        <div className="asw-mobile-message">
                          {log.message_preview || "-"}
                        </div>

                        <button
                          type="button"
                          className="asw-action-btn mobile"
                          disabled={!recordId || sendingId}
                          onClick={() => sendMessageByType(logType, recordId, true)}
                        >
                          <FiRepeat />
                          {sendingId === String(recordId)
                            ? "Sending..."
                            : "Resend WhatsApp"}
                        </button>

                        {log.error_message ? (
                          <div className="asw-error-text">
                            {log.error_message}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === "templates" ? (
          <section className="asw-card">
            <div className="asw-card-head">
              <div>
                <h2 className="asw-card-title">WhatsApp Templates</h2>
                <p className="asw-card-subtitle">
                  Edit reward and redemption template text used for preview and
                  software settings.
                </p>
              </div>

              {!editingTemplate ? (
                <button
                  type="button"
                  className="asw-action-btn"
                  onClick={startEditTemplate}
                >
                  <FiEdit3 /> Edit Template
                </button>
              ) : (
                <span className="asw-record-badge">Editing</span>
              )}
            </div>

            <div className="asw-send-type-row asw-template-type-row">
              <button
                type="button"
                className={`asw-type-btn ${
                  templateEditType === "reward" ? "active" : ""
                }`}
                onClick={() => setTemplateEditType("reward")}
              >
                <FiAward />
                Reward Template
              </button>

              <button
                type="button"
                className={`asw-type-btn ${
                  templateEditType === "redemption" ? "active" : ""
                }`}
                onClick={() => setTemplateEditType("redemption")}
              >
                <FiDollarSign />
                Redemption Template
              </button>
            </div>

            <div className="asw-option-grid">
              <div className="asw-option-card">
                <div className="asw-option-icon">
                  <FiFileText />
                </div>

                <h3>
                  {templateEditType === "redemption"
                    ? "Redemption Points Update"
                    : "Reward Points Update"}
                </h3>

                {!editingTemplate ? (
                  <>
                    <p className="asw-template-name">
                      {selectedTemplate.name}
                    </p>

                    <div className="asw-template-body">
                      {selectedTemplate.body}
                    </div>

                    <ul className="asw-clean-list">
                      <li>{"{{1}}"} Customer Name</li>
                      <li>
                        {"{{2}}"}{" "}
                        {templateEditType === "redemption"
                          ? "Redeemed Points"
                          : "Added Points"}
                      </li>
                      <li>{"{{3}}"} Store Name</li>
                      <li>{"{{4}}"} Total Points</li>
                      {templateEditType === "redemption" ? (
                        <li>{"{{5}}"} Payout Amount</li>
                      ) : null}
                    </ul>
                  </>
                ) : (
                  <div className="asw-template-edit-form">
                    <div className="asw-form-group">
                      <label>Template Name</label>
                      <input
                        className="asw-input"
                        type="text"
                        value={selectedTemplateDraft.name}
                        onChange={(event) =>
                          updateTemplateDraft("name", event.target.value)
                        }
                        placeholder={
                          DEFAULT_TEMPLATES[templateEditType].name
                        }
                      />
                    </div>

                    <div className="asw-form-group">
                      <label>Language Code</label>
                      <input
                        className="asw-input"
                        type="text"
                        value={selectedTemplateDraft.language}
                        onChange={(event) =>
                          updateTemplateDraft("language", event.target.value)
                        }
                        placeholder="en"
                      />
                    </div>

                    <div className="asw-form-group">
                      <label>Template Message</label>
                      <textarea
                        className="asw-textarea"
                        value={selectedTemplateDraft.body}
                        onChange={(event) =>
                          updateTemplateDraft("body", event.target.value)
                        }
                        rows={5}
                        placeholder={
                          DEFAULT_TEMPLATES[templateEditType].body
                        }
                      />
                    </div>

                    <div className="asw-template-help">
                      Required variables: <strong>{"{{1}}"}</strong> customer
                      name, <strong>{"{{2}}"}</strong>{" "}
                      {templateEditType === "redemption"
                        ? "redeemed points"
                        : "added points"}
                      , <strong>{"{{3}}"}</strong> store name,{" "}
                      <strong>{"{{4}}"}</strong> total points
                      {templateEditType === "redemption" ? (
                        <>
                          , <strong>{"{{5}}"}</strong> payout amount
                        </>
                      ) : null}
                      .
                    </div>

                    <div className="asw-template-actions">
                      <button
                        type="button"
                        className="asw-action-btn"
                        onClick={saveTemplate}
                      >
                        <FiSave /> Save Template
                      </button>

                      <button
                        type="button"
                        className="asw-light-btn"
                        onClick={resetTemplateToDefault}
                      >
                        Reset Default
                      </button>

                      <button
                        type="button"
                        className="asw-light-btn"
                        onClick={cancelEditTemplate}
                      >
                        <FiX /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="asw-option-card">
                <div className="asw-option-icon">
                  <FiMessageCircle />
                </div>

                <h3>Preview</h3>
                <p className="asw-card-subtitle">
                  Preview is generated using the selected transaction.
                </p>

                <div className="asw-template-body preview">
                  {editingTemplate ? draftPreviewMessage : previewMessage}
                </div>

                <div className="asw-template-note">
                  Current template:{" "}
                  <strong>
                    {editingTemplate
                      ? selectedTemplateDraft.name
                      : selectedTemplate.name}
                  </strong>
                  <br />
                  Language:{" "}
                  <strong>
                    {editingTemplate
                      ? selectedTemplateDraft.language
                      : selectedTemplate.language}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className="asw-card">
            <div className="asw-card-head">
              <div>
                <h2 className="asw-card-title">WhatsApp Settings</h2>
                <p className="asw-card-subtitle">
                  Current integration status and next setup requirements.
                </p>
              </div>
            </div>

            <div className="asw-option-grid">
              <div className="asw-option-card">
                <div className="asw-option-icon">
                  <FiSettings />
                </div>

                <h3>Current Local Mode</h3>

                <ul className="asw-clean-list">
                  <li>WHATSAPP_MOCK=true for local testing</li>
                  <li>No real WhatsApp message is sent in mock mode</li>
                  <li>Backend still creates message logs</li>
                  <li>Reward endpoint sends reward point messages</li>
                  <li>Redemption endpoint sends payout/redeem messages</li>
                  <li>Live server needs Meta access token and phone number ID</li>
                </ul>
              </div>

              <div className="asw-option-card">
                <div className="asw-option-icon">
                  <FiCheckCircle />
                </div>

                <h3>Production Checklist</h3>

                <ul className="asw-clean-list">
                  <li>Meta WhatsApp Business API account</li>
                  <li>Approved display name</li>
                  <li>Approved reward utility template</li>
                  <li>Approved redemption utility template</li>
                  <li>WHATSAPP_ENABLED=true on EC2 backend .env</li>
                  <li>WHATSAPP_ACCESS_TOKEN only on server</li>
                </ul>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className={`asw-stat-card asw-stat-${tone}`}>
    <div className="asw-stat-icon">{icon}</div>

    <div>
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  </div>
);

const whatsappPageCss = `
  .asw-page {
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asw-toast {
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

  .asw-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .asw-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .asw-header-card {
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

  .asw-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asw-back-btn {
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

  .asw-back-btn:hover {
    background: #dbeafe;
  }

  .asw-title-icon {
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

  .asw-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asw-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asw-send-btn:disabled,
  .asw-action-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  @keyframes asw-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .asw-alert {
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 13px 16px;
    border-radius: 14px;
    margin-bottom: 18px;
    font-weight: 800;
  }

  .asw-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asw-stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
    min-width: 0;
  }

  .asw-stat-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .asw-stat-card p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asw-stat-card h3 {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 28px;
    font-weight: 950;
    line-height: 1;
  }

  .asw-stat-blue .asw-stat-icon {
    color: #2563eb;
    background: #eff6ff;
  }

  .asw-stat-green .asw-stat-icon {
    color: #059669;
    background: #ecfdf5;
  }

  .asw-stat-red .asw-stat-icon {
    color: #dc2626;
    background: #fef2f2;
  }

  .asw-stat-orange .asw-stat-icon {
    color: #ea580c;
    background: #fff7ed;
  }

  .asw-tabs-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 10px;
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
    overflow-x: auto;
  }

  .asw-tab {
    border: none;
    background: #f8fafc;
    color: #475569;
    padding: 11px 15px;
    border-radius: 13px;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    white-space: nowrap;
  }

  .asw-tab.active {
    background: #eff6ff;
    color: #2563eb;
  }

  .asw-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asw-card-head {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .asw-card-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asw-card-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
  }

  .asw-record-badge {
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

  .asw-send-type-row {
    padding: 12px 20px;
    display: flex;
    gap: 10px;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
    overflow-x: auto;
  }

  .asw-template-type-row {
    background: #f8fafc;
  }

  .asw-type-btn {
    border: none;
    background: #f8fafc;
    color: #475569;
    padding: 11px 15px;
    border-radius: 13px;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    white-space: nowrap;
  }

  .asw-type-btn.active {
    background: #eff6ff;
    color: #2563eb;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  }

  .asw-filter-row {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 220px 180px;
    gap: 12px;
    padding: 16px 20px;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
  }

  .asw-search-box {
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

  .asw-search-box input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    min-width: 0;
    color: #0f172a;
    font-weight: 750;
  }

  .asw-select,
  .asw-input {
    height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    padding: 0 12px;
    font-weight: 850;
    outline: none;
    box-sizing: border-box;
    width: 100%;
  }

  .asw-textarea {
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    padding: 12px;
    font-weight: 800;
    outline: none;
    box-sizing: border-box;
    width: 100%;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }

  .asw-send-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: 18px;
    padding: 20px;
    background: #f8fafc;
  }

  .asw-send-form,
  .asw-preview-card,
  .asw-option-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px;
  }

  .asw-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .asw-form-group + .asw-form-group {
    margin-top: 14px;
  }

  .asw-form-group label {
    color: #334155;
    font-size: 14px;
    font-weight: 950;
  }

  .asw-form-group select {
    width: 100%;
    min-height: 44px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 10px 12px;
    color: #0f172a;
    background: #ffffff;
    font-weight: 750;
    outline: none;
  }

  .asw-selected-box {
    margin: 16px 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .asw-selected-box div {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
  }

  .asw-selected-box span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 5px;
  }

  .asw-selected-box strong {
    display: block;
    color: #0f172a;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .asw-empty-inline {
    margin: 16px 0;
    padding: 14px;
    border-radius: 14px;
    background: #f8fafc;
    color: #64748b;
    font-weight: 850;
  }

  .asw-send-btn {
    border: none;
    background: #2563eb;
    color: #ffffff;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 13px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
  }

  .asw-preview-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .asw-preview-header svg {
    color: #2563eb;
    font-size: 24px;
  }

  .asw-preview-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 950;
    color: #0f172a;
  }

  .asw-preview-header p {
    margin: 3px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 750;
  }

  .asw-preview-body {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e3a8a;
    border-radius: 16px;
    padding: 15px;
    line-height: 1.55;
    font-weight: 800;
    white-space: pre-wrap;
  }

  .asw-template-note,
  .asw-template-help {
    margin-top: 14px;
    color: #475569;
    line-height: 1.6;
    font-size: 13px;
    font-weight: 800;
  }

  .asw-template-help {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
  }

  .asw-loading,
  .asw-empty {
    padding: 36px 20px;
    text-align: center;
    color: #64748b;
    font-weight: 800;
  }

  .asw-empty-icon {
    width: 62px;
    height: 62px;
    margin: 0 auto 12px;
    border-radius: 18px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-size: 28px;
  }

  .asw-empty h3 {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asw-empty p {
    margin: 8px auto 0;
    max-width: 460px;
    line-height: 1.5;
  }

  .asw-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .asw-table {
    width: 100%;
    min-width: 1320px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .asw-table th {
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

  .asw-table td {
    padding: 16px;
    border-bottom: 1px solid #eef2f7;
    vertical-align: middle;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
  }

  .asw-table tbody tr:hover {
    background: #f8fafc;
  }

  .asw-date {
    color: #334155;
    font-weight: 850;
    white-space: nowrap;
  }

  .asw-type-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }

  .asw-type-reward {
    background: #eff6ff;
    color: #2563eb;
  }

  .asw-type-redemption {
    background: #fff7ed;
    color: #ea580c;
  }

  .asw-customer {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 190px;
  }

  .asw-avatar {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .asw-customer strong {
    display: block;
    font-weight: 950;
    color: #0f172a;
  }

  .asw-customer span {
    display: block;
    color: #64748b;
    font-size: 12px;
    margin-top: 3px;
  }

  .asw-phone {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #334155;
    white-space: nowrap;
    font-weight: 900;
  }

  .asw-points {
    display: inline-flex;
    border-radius: 999px;
    background: #eff6ff;
    color: #2563eb;
    padding: 7px 11px;
    font-weight: 950;
    white-space: nowrap;
  }

  .asw-points-green {
    background: #dcfce7;
    color: #059669;
  }

  .asw-points-red {
    background: #fee2e2;
    color: #dc2626;
  }

  .asw-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 950;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .asw-status-sent,
  .asw-status-delivered,
  .asw-status-read {
    background: #dcfce7;
    color: #059669;
  }

  .asw-status-failed {
    background: #fee2e2;
    color: #dc2626;
  }

  .asw-status-pending {
    background: #fff7ed;
    color: #ea580c;
  }

  .asw-user-name {
    color: #0f172a;
    font-weight: 950;
  }

  .asw-message {
    max-width: 520px;
    color: #334155;
    line-height: 1.45;
    font-size: 13px;
    font-weight: 750;
  }

  .asw-error-text {
    margin-top: 7px;
    color: #dc2626;
    font-size: 12px;
    font-weight: 850;
  }

  .asw-action-btn,
  .asw-light-btn {
    border: 1px solid #c7d2fe;
    background: #eef2ff;
    color: #4f46e5;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    white-space: nowrap;
  }

  .asw-light-btn {
    border-color: #e2e8f0;
    background: #ffffff;
    color: #334155;
  }

  .asw-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 20px;
    background: #f8fafc;
  }

  .asw-option-icon {
    width: 48px;
    height: 48px;
    border-radius: 15px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-size: 22px;
    margin-bottom: 12px;
  }

  .asw-option-card h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 950;
    color: #0f172a;
  }

  .asw-option-card p {
    color: #64748b;
    line-height: 1.55;
    font-weight: 750;
  }

  .asw-template-name {
    display: inline-flex;
    background: #eff6ff;
    color: #2563eb;
    padding: 7px 10px;
    border-radius: 999px;
    font-weight: 950;
    margin: 0 0 12px !important;
  }

  .asw-template-body {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 13px;
    line-height: 1.5;
    color: #334155;
    font-weight: 800;
    white-space: pre-wrap;
  }

  .asw-template-body.preview {
    margin-top: 14px;
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1e3a8a;
  }

  .asw-clean-list {
    margin: 14px 0 0;
    padding-left: 18px;
    color: #334155;
    line-height: 1.8;
    font-weight: 800;
  }

  .asw-template-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 15px;
  }

  .asw-mobile-list {
    display: none;
  }

  @media (max-width: 1200px) {
    .asw-stats-grid,
    .asw-option-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asw-filter-row {
      grid-template-columns: 1fr;
    }

    .asw-send-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .asw-page {
      padding: 12px;
    }

    .asw-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asw-header-left {
      flex-wrap: wrap;
    }

    .asw-title {
      font-size: 23px;
    }

    .asw-send-btn,
    .asw-action-btn,
    .asw-light-btn {
      width: 100%;
    }

    .asw-stats-grid,
    .asw-option-grid,
    .asw-selected-box {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asw-card-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .asw-table-wrap {
      display: none;
    }

    .asw-mobile-list {
      display: grid;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
    }

    .asw-mobile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px;
    }

    .asw-mobile-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .asw-mobile-top h3 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 950;
    }

    .asw-mobile-top p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
    }

    .asw-mobile-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .asw-mobile-meta span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 900;
    }

    .asw-mobile-message {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 13px;
      padding: 11px;
      color: #334155;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
    }

    .asw-action-btn.mobile {
      width: 100%;
      justify-content: center;
      margin-top: 12px;
    }
  }

  @media (max-width: 520px) {
    .asw-header-left {
      flex-direction: column;
      align-items: flex-start;
    }

    .asw-back-btn {
      width: 100%;
    }

    .asw-send-type-row {
      flex-direction: column;
      align-items: stretch;
    }

    .asw-type-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

export default WhatsApp;