import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

import {
  FiBox,
  FiSettings,
  FiStar,
  FiDollarSign,
  FiUser,
  FiClock,
  FiTrendingUp,
  FiBarChart2,
  FiMessageCircle,
  FiRefreshCw,
  FiGrid,
  FiArrowRight,
  FiAward,
  FiUsers,
  FiCheckCircle,
  FiZap,
} from "react-icons/fi";

import api from "../api/axios";

const CustomerDirectory = lazy(() => import("./CustomerDirectory"));
const ItemMaster = lazy(() => import("./ItemMaster"));
const RewardEntry = lazy(() => import("./RewardEntry"));
const TransactionHistory = lazy(() => import("./TransactionHistory"));
const RedemptionPortal = lazy(() => import("./RedemptionPortal"));
const Leaderboard = lazy(() => import("./Leaderboard"));
const AmountAssignment = lazy(() => import("./AmountAssignment"));
const ReportsHub = lazy(() => import("./ReportsHub"));
const Settings = lazy(() => import("./Settings"));
const WhatsApp = lazy(() => import("./WhatsApp"));

const normalizeModuleKey = (moduleName) => {
  if (!moduleName) return "dashboard";

  const key = String(moduleName)
    .trim()
    .replaceAll(" ", "")
    .replaceAll("/", "")
    .replaceAll("-", "")
    .replaceAll("_", "")
    .toLowerCase();

  const moduleMap = {
    dashboard: "dashboard",

    amountassignment: "amountAssignment",
    amountperpoint: "amountAssignment",
    pointvalue: "amountAssignment",
    pointvaluerupees: "amountAssignment",

    rewardentry: "rewardEntry",
    salesentry: "rewardEntry",
    loyaltyentry: "rewardEntry",
    assignpoints: "rewardEntry",

    customerdirectory: "customerDirectory",
    customermaster: "customerDirectory",
    customers: "customerDirectory",

    itemmaster: "itemMaster",
    loyaltyitemmaster: "itemMaster",
    rewardsprogram: "itemMaster",
    rewards: "itemMaster",

    pointshistory: "transactionHistory",
    transactionhistory: "transactionHistory",
    transectionhistory: "transactionHistory",

    whatsapp: "whatsapp",
    whatsappmessages: "whatsapp",
    whatsappmessage: "whatsapp",
    messagecenter: "whatsapp",
    messages: "whatsapp",
    messagehistory: "whatsapp",

    payoutredemption: "redemption",
    redemption: "redemption",
    redemptionportal: "redemption",
    payouts: "redemption",

    leaderboard: "leaderboard",

    reports: "reports",
    reportshub: "reports",
    allreports: "reports",

    settings: "settings",
    accountsettings: "settings",
    profile: "settings",
    userprofile: "settings",
  };

  return moduleMap[key] || "dashboard";
};

const getModuleFromSearch = (search) => {
  const params = new URLSearchParams(search);
  const moduleParam = params.get("module");

  if (!moduleParam) return "dashboard";

  return normalizeModuleKey(moduleParam);
};

const getDashboardUrl = (moduleKey) => {
  const normalized = normalizeModuleKey(moduleKey);

  if (!normalized || normalized === "dashboard") {
    return "/dashboard";
  }

  return `/dashboard?module=${normalized}`;
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.payouts)) return data.payouts;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatNumber = (value) => {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return "0";

  return numberValue.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const moduleCards = [
  {
    key: "rewardEntry",
    title: "Reward Entry",
    description: "Create customer reward transactions with multiple items.",
    icon: <FiAward />,
    tone: "purple",
  },
  {
    key: "customerDirectory",
    title: "Customer Directory",
    description: "Register customers and manage identity or bank details.",
    icon: <FiUsers />,
    tone: "blue",
  },
  {
    key: "itemMaster",
    title: "Item Master",
    description: "Create products, units, and points per unit.",
    icon: <FiBox />,
    tone: "green",
  },
  {
    key: "transactionHistory",
    title: "Transaction History",
    description: "View grouped reward entries and item details.",
    icon: <FiClock />,
    tone: "teal",
  },
  {
    key: "redemption",
    title: "Payout / Redemption",
    description: "Redeem customer points using assigned payout value.",
    icon: <FiDollarSign />,
    tone: "green",
  },
  {
    key: "leaderboard",
    title: "Leaderboard",
    description: "Rank customers by balance, earned points, and activity.",
    icon: <FiTrendingUp />,
    tone: "orange",
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    description: "Send reward-point WhatsApp messages manually.",
    icon: <FiMessageCircle />,
    tone: "green",
  },
  {
    key: "reports",
    title: "Reports",
    description: "Open reports for payout, customers, and transactions.",
    icon: <FiBarChart2 />,
    tone: "blue",
  },
  {
    key: "settings",
    title: "Settings",
    description: "Update account, shop name, and security settings.",
    icon: <FiSettings />,
    tone: "gray",
  },
];

const MODULE_NAMES = {
  dashboard: "Dashboard",
  amountAssignment: "Amount Assignment",
  rewardEntry: "Reward Entry",
  customerDirectory: "Customer Directory",
  itemMaster: "Item Master",
  transactionHistory: "Transaction History",
  redemption: "Payout / Redemption",
  leaderboard: "Leaderboard",
  whatsapp: "WhatsApp",
  reports: "Reports",
  settings: "Settings",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const outletContext = useOutletContext() || {};
  const layoutActiveModule = outletContext.activeModule || "dashboard";
  const setLayoutActiveModule = outletContext.setActiveModule || (() => {});

  const skipNextContextSyncRef = useRef(false);

  const [activeModule, setActiveModule] = useState(() =>
    getModuleFromSearch(location.search)
  );

  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentModules, setRecentModules] = useState([]);

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalItems: 0,
    totalPoints: 0,
    totalPayouts: 0,
  });

  const loggedInUser = useMemo(() => {
    try {
      const savedUser =
        localStorage.getItem("aerostate_loyalty_user") ||
        localStorage.getItem("aerostate_user") ||
        localStorage.getItem("username") ||
        localStorage.getItem("user_id") ||
        localStorage.getItem("user");

      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);

          if (typeof parsedUser === "string") return parsedUser;
          if (parsedUser?.username) return parsedUser.username;
          if (parsedUser?.name) return parsedUser.name;
          if (parsedUser?.email) return parsedUser.email;
        } catch {
          return String(savedUser).replaceAll('"', "");
        }
      }

      return "User";
    } catch {
      return "User";
    }
  }, []);

  const changeModule = useCallback(
    (moduleName, options = {}) => {
      const normalizedModule = normalizeModuleKey(moduleName);
      const targetUrl = getDashboardUrl(normalizedModule);
      const currentUrl = `${location.pathname}${location.search}`;

      setActiveModule(normalizedModule);
      setLayoutActiveModule(normalizedModule);

      if (currentUrl !== targetUrl) {
        navigate(targetUrl, {
          replace: Boolean(options.replace),
        });
      }
    },
    [location.pathname, location.search, navigate, setLayoutActiveModule]
  );

  useEffect(() => {
    const moduleFromUrl = getModuleFromSearch(location.search);

    skipNextContextSyncRef.current = true;

    setActiveModule(moduleFromUrl);
    setLayoutActiveModule(moduleFromUrl);

    Promise.resolve().then(() => {
      skipNextContextSyncRef.current = false;
    });
  }, [location.search, setLayoutActiveModule]);

  useEffect(() => {
    if (skipNextContextSyncRef.current) return;

    const normalizedLayoutModule = normalizeModuleKey(layoutActiveModule);

    if (normalizedLayoutModule !== activeModule) {
      changeModule(normalizedLayoutModule);
    }
  }, [layoutActiveModule, activeModule, changeModule]);

  useEffect(() => {
    if (activeModule !== "dashboard") {
      setRecentModules((prev) => {
        const filtered = prev.filter((mod) => mod !== activeModule);
        return [activeModule, ...filtered].slice(0, 5);
      });
    }
  }, [activeModule]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const [customersRes, itemsRes, payoutsRes] = await Promise.allSettled([
        api.get("/customers/"),
        api.get("/loyalty/items"),
        api.get("/payouts"),
      ]);

      const customers =
        customersRes.status === "fulfilled"
          ? normalizeList(customersRes.value.data)
          : [];

      const items =
        itemsRes.status === "fulfilled"
          ? normalizeList(itemsRes.value.data)
          : [];

      const payouts =
        payoutsRes.status === "fulfilled"
          ? normalizeList(payoutsRes.value.data)
          : [];

      const totalPoints = customers.reduce(
        (sum, customer) =>
          sum +
          Number(
            customer.points_balance ??
              customer.point_balance ??
              customer.available_points ??
              customer.availablePoints ??
              0
          ),
        0
      );

      const totalPayouts = payouts.reduce(
        (sum, payout) =>
          sum +
          Number(
            payout.points_redeemed ??
              payout.pointsRedeemed ??
              payout.redeem_points ??
              payout.redeemed_points ??
              0
          ),
        0
      );

      setStats({
        totalCustomers: customers.length,
        totalItems: items.length,
        totalPoints,
        totalPayouts,
      });
    } catch (error) {
      console.error("Dashboard data loading error:", error);
    }
  }, []);

  useEffect(() => {
    if (activeModule !== "dashboard") return;

    loadDashboardData();

    const autoRefresh = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(autoRefresh);
  }, [activeModule, loadDashboardData]);

  const goBackToMenu = () => {
    changeModule("dashboard", { replace: true });
  };

  const openModule = (moduleName) => {
    changeModule(moduleName);
  };

  const renderModule = () => {
    if (activeModule === "amountAssignment") {
      return <AmountAssignment onBack={goBackToMenu} />;
    }

    if (activeModule === "rewardEntry") {
      return <RewardEntry onBack={goBackToMenu} />;
    }

    if (activeModule === "customerDirectory") {
      return <CustomerDirectory onBack={goBackToMenu} />;
    }

    if (activeModule === "itemMaster") {
      return <ItemMaster onBack={goBackToMenu} />;
    }

    if (activeModule === "transactionHistory") {
      return <TransactionHistory onBack={goBackToMenu} />;
    }

    if (activeModule === "redemption") {
      return <RedemptionPortal onBack={goBackToMenu} />;
    }

    if (activeModule === "leaderboard") {
      return <Leaderboard onBack={goBackToMenu} />;
    }

    if (activeModule === "whatsapp") {
      return <WhatsApp onBack={goBackToMenu} />;
    }

    if (activeModule === "reports") {
      return <ReportsHub onBack={goBackToMenu} />;
    }

    if (activeModule === "settings") {
      return <Settings onBack={goBackToMenu} />;
    }

    return null;
  };

  if (activeModule !== "dashboard") {
    return <Suspense fallback={<ModuleLoader />}>{renderModule()}</Suspense>;
  }

  return (
    <>
      <style>{dashboardCss}</style>

      <div className="asd-page">
        <section className="asd-header-card">
          <div className="asd-header-left">
            <div className="asd-title-icon">
              <FiGrid />
            </div>

            <div className="asd-title-wrap">
              <h1 className="asd-title">Dashboard</h1>
              <p className="asd-subtitle">
                Manage rewards, customers, items, redemption, leaderboard,
                WhatsApp messages, reports, and settings.
              </p>
            </div>
          </div>

          <div className="asd-header-time">
            <FiClock />

            <div>
              <span>
                {currentTime.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>

              <strong>
                {currentTime.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </strong>
            </div>
          </div>
        </section>

        <section className="asd-welcome-card">
          <div>
            <p className="asd-welcome-kicker">Welcome back</p>
            <h2 className="asd-welcome-title">{loggedInUser}</h2>
            <p className="asd-welcome-text">
              Your loyalty system is ready. Select a module below or use the
              sidebar to continue work.
            </p>
          </div>

          <div className="asd-welcome-user">
            <div className="asd-welcome-avatar">
              {String(loggedInUser || "U").charAt(0).toUpperCase()}
            </div>

            <div>
              <span>Logged in as</span>
              <strong>{loggedInUser}</strong>
            </div>
          </div>
        </section>

        <section className="asd-summary-grid">
          <StatCard
            icon={<FiUser />}
            label="Total Customers"
            value={formatNumber(stats.totalCustomers)}
            tone="blue"
          />

          <StatCard
            icon={<FiBox />}
            label="Total Items"
            value={formatNumber(stats.totalItems)}
            tone="green"
          />

          <StatCard
            icon={<FiStar />}
            label="Total Points Balance"
            value={formatNumber(stats.totalPoints)}
            tone="orange"
          />

          <StatCard
            icon={<FiDollarSign />}
            label="Redeemed Points"
            value={formatNumber(stats.totalPayouts)}
            tone="purple"
          />
        </section>

        <section className="asd-main-grid">
          <div className="asd-card asd-modules-card">
            <div className="asd-card-head">
              <div>
                <h2 className="asd-card-title">Modules</h2>
                <p className="asd-card-subtitle">
                  Open any module to manage daily loyalty operations.
                </p>
              </div>

              <span className="asd-record-badge">
                {moduleCards.length} modules
              </span>
            </div>

            <div className="asd-modules-grid">
              {moduleCards.map((module) => (
                <ModuleCard
                  key={module.key}
                  icon={module.icon}
                  title={module.title}
                  description={module.description}
                  tone={module.tone}
                  onClick={() => openModule(module.key)}
                />
              ))}
            </div>
          </div>

          <div className="asd-side-column">
            <RecentActivity
              recentModules={recentModules}
              onModuleClick={openModule}
            />
          </div>
        </section>
      </div>
    </>
  );
};

const ModuleLoader = () => (
  <>
    <style>{dashboardCss}</style>

    <div className="asd-page">
      <div className="asd-loader-card">
        <div className="asd-loader-icon">
          <FiRefreshCw />
        </div>

        <h2>Loading module...</h2>
        <p>Please wait while the selected page opens.</p>
      </div>
    </div>
  </>
);

const StatCard = ({ icon, label, value, tone = "blue" }) => (
  <div className="asd-summary-card">
    <div className={`asd-summary-icon ${tone}`}>{icon}</div>

    <div>
      <p className="asd-summary-label">{label}</p>
      <h3 className="asd-summary-value">{value}</h3>
    </div>
  </div>
);

const ModuleCard = ({ icon, title, description, tone = "blue", onClick }) => (
  <button type="button" className="asd-module-card" onClick={onClick}>
    <div className={`asd-module-icon ${tone}`}>{icon}</div>

    <div className="asd-module-content">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>

    <FiArrowRight className="asd-module-arrow" />
  </button>
);

const RecentActivity = ({ recentModules, onModuleClick }) => (
  <section className="asd-card asd-recent-card">
    <div className="asd-card-head compact">
      <div className="asd-side-title">
        <div className="asd-side-icon purple">
          <FiZap />
        </div>

        <div>
          <h2 className="asd-card-title">Recently Used</h2>
          <p className="asd-card-subtitle">Quickly reopen recent modules.</p>
        </div>
      </div>

      <span className="asd-record-badge">
        {recentModules.length > 0 ? recentModules.length : "None"}
      </span>
    </div>

    {recentModules.length > 0 ? (
      <div className="asd-activity-list">
        {recentModules.map((moduleKey, index) => (
          <button
            type="button"
            key={`${moduleKey}-${index}`}
            className="asd-activity-item"
            onClick={() => onModuleClick(moduleKey)}
          >
            <div>
              <h4>{MODULE_NAMES[moduleKey] || moduleKey}</h4>
              <p>Module</p>
            </div>

            <FiArrowRight />
          </button>
        ))}
      </div>
    ) : (
      <div className="asd-empty-activity">
        <FiCheckCircle />
        <p>No modules used yet. Start by selecting a module from the list.</p>
      </div>
    )}
  </section>
);

const dashboardCss = `
  .asd-page {
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asd-header-card {
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

  .asd-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asd-title-icon {
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

  .asd-title-wrap {
    min-width: 0;
  }

  .asd-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asd-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asd-header-time {
    min-width: 225px;
    height: 58px;
    padding: 0 16px;
    border-radius: 16px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.10);
  }

  .asd-header-time svg {
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asd-header-time span {
    display: block;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.1;
  }

  .asd-header-time strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 17px;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
  }

  .asd-welcome-card {
    background: linear-gradient(135deg, #ffffff 0%, #eff6ff 55%, #ecfdf5 100%);
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asd-welcome-kicker {
    margin: 0 0 6px;
    color: #2563eb;
    font-size: 13px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .asd-welcome-title {
    margin: 0;
    font-size: 28px;
    font-weight: 950;
    color: #0f172a;
    letter-spacing: -0.03em;
  }

  .asd-welcome-text {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
  }

  .asd-welcome-user {
    min-width: 220px;
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid #dbeafe;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .asd-welcome-avatar {
    width: 52px;
    height: 52px;
    border-radius: 17px;
    background: linear-gradient(135deg, #2563eb, #22c55e);
    color: #ffffff;
    display: grid;
    place-items: center;
    font-size: 20px;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .asd-welcome-user span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
  }

  .asd-welcome-user strong {
    display: block;
    margin-top: 4px;
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
    word-break: break-word;
  }

  .asd-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asd-summary-card {
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

  .asd-summary-icon,
  .asd-module-icon,
  .asd-side-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asd-summary-icon.blue,
  .asd-module-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asd-summary-icon.green,
  .asd-module-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asd-summary-icon.orange,
  .asd-module-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asd-summary-icon.purple,
  .asd-module-icon.purple,
  .asd-side-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .asd-module-icon.teal {
    background: #f0fdfa;
    color: #0f766e;
  }

  .asd-module-icon.gray {
    background: #f1f5f9;
    color: #475569;
  }

  .asd-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asd-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 26px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .asd-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 18px;
    align-items: stretch;
  }

  .asd-side-column {
    display: flex;
    align-items: stretch;
    min-width: 0;
  }

  .asd-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
    max-width: 100%;
    min-width: 0;
  }

  .asd-modules-card,
  .asd-recent-card {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .asd-recent-card {
    width: 100%;
  }

  .asd-card-head {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
    min-height: 73px;
    box-sizing: border-box;
  }

  .asd-card-head.compact {
    padding: 18px 16px;
  }

  .asd-card-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asd-card-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asd-record-badge {
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

  .asd-modules-grid {
    padding: 16px;
    background: #f8fafc;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    flex: 1;
  }

  .asd-module-card {
    min-height: 128px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 18px;
    padding: 16px;
    cursor: pointer;
    text-align: left;
    color: #0f172a;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
    transition: 0.18s ease;
  }

  .asd-module-card:hover {
    transform: translateY(-2px);
    border-color: #bfdbfe;
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.08);
  }

  .asd-module-content {
    min-width: 0;
  }

  .asd-module-content h3 {
    margin: 0;
    color: #0f172a;
    font-size: 16px;
    font-weight: 950;
    line-height: 1.25;
  }

  .asd-module-content p {
    margin: 7px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.45;
  }

  .asd-module-arrow {
    color: #94a3b8;
    margin-top: 13px;
    flex: 0 0 auto;
  }

  .asd-side-title {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asd-activity-list {
    padding: 12px;
    background: #f8fafc;
    display: grid;
    gap: 10px;
    align-content: start;
    flex: 1;
  }

  .asd-activity-item {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 14px;
    padding: 13px;
    cursor: pointer;
    color: #0f172a;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .asd-activity-item:hover {
    border-color: #bfdbfe;
    background: #eff6ff;
  }

  .asd-activity-item h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 950;
    color: #0f172a;
  }

  .asd-activity-item p {
    margin: 4px 0 0;
    font-size: 12px;
    font-weight: 800;
    color: #64748b;
  }

  .asd-empty-activity {
    margin: 12px;
    padding: 18px;
    border-radius: 16px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    color: #64748b;
    text-align: center;
    display: grid;
    place-items: center;
    gap: 8px;
    flex: 1;
  }

  .asd-empty-activity svg {
    color: #059669;
    font-size: 22px;
  }

  .asd-empty-activity p {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.45;
  }

  .asd-loader-card {
    max-width: 440px;
    margin: 80px auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 28px;
    text-align: center;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asd-loader-icon {
    width: 54px;
    height: 54px;
    margin: 0 auto 14px;
    border-radius: 18px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-size: 24px;
  }

  .asd-loader-card h2 {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
    font-weight: 950;
  }

  .asd-loader-card p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 700;
  }

  @media (max-width: 1400px) {
    .asd-main-grid {
      grid-template-columns: 1fr;
    }

    .asd-side-column {
      display: block;
    }

    .asd-recent-card {
      min-height: auto;
    }
  }

  @media (max-width: 1200px) {
    .asd-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asd-modules-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .asd-page {
      padding: 12px;
    }

    .asd-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asd-header-left {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .asd-title-icon {
      width: 44px;
      height: 44px;
      font-size: 20px;
    }

    .asd-title {
      font-size: 23px;
    }

    .asd-header-time {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .asd-welcome-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asd-welcome-title {
      font-size: 24px;
    }

    .asd-welcome-user {
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .asd-summary-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asd-summary-value {
      font-size: 23px;
    }

    .asd-card-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .asd-card-head.compact {
      flex-direction: column;
      align-items: flex-start;
    }

    .asd-modules-grid {
      grid-template-columns: 1fr;
      padding: 12px;
    }

    .asd-module-card {
      min-height: auto;
    }
  }

  @media (max-width: 420px) {
    .asd-page {
      padding: 10px;
    }

    .asd-header-left {
      flex-direction: column;
    }

    .asd-title {
      font-size: 22px;
    }

    .asd-module-card {
      grid-template-columns: 1fr;
    }

    .asd-module-arrow {
      display: none;
    }

    .asd-welcome-user {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

export default Dashboard;