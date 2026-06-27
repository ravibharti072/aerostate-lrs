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
  FiShoppingBag,
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

const normalizeModuleKey = (moduleName) => {
  if (!moduleName) return "dashboard";

  const key = String(moduleName)
    .trim()
    .replaceAll(" ", "")
    .replaceAll("/", "")
    .replaceAll("-", "")
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
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

  const loadDashboardData = async () => {
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
  };

  useEffect(() => {
    if (activeModule === "dashboard") {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

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
    <div className="lrs-dashboard-page">
      <section className="lrs-dashboard-hero">
        <div>
          <h1 className="lrs-dashboard-hero-title">
            Welcome back, {loggedInUser}
          </h1>

          <p className="lrs-dashboard-hero-subtitle">
            Manage your rewards, customers, items, redemption, leaderboard, and
            reports.
          </p>
        </div>

        <div className="lrs-dashboard-user-badge">
          <FiUser size={22} />
          <span>{loggedInUser}</span>
        </div>
      </section>

      <h2 className="lrs-dashboard-section-title">Today Overview</h2>

      <section className="lrs-dashboard-stats-grid">
        <StatCard
          icon={<FiUser size={22} color="#2563eb" />}
          label="Total Customers"
          value={stats.totalCustomers}
        />

        <StatCard
          icon={<FiBox size={22} color="#059669" />}
          label="Total Items"
          value={stats.totalItems}
        />

        <StatCard
          icon={<FiStar size={22} color="#d97706" />}
          label="Total Points Balance"
          value={stats.totalPoints}
        />

        <StatCard
          icon={<FiDollarSign size={22} color="#16a34a" />}
          label="Redeemed Points"
          value={stats.totalPayouts}
        />
      </section>

      <h2 className="lrs-dashboard-section-title">Modules</h2>

      <section className="lrs-dashboard-modules-grid">
        <ModuleCard
          icon={<FiShoppingBag size={22} color="#7c3aed" />}
          title="Reward Entry"
          onClick={() => openModule("rewardEntry")}
        />

        <ModuleCard
          icon={<FiUser size={22} color="#2563eb" />}
          title="Customer Directory"
          onClick={() => openModule("customerDirectory")}
        />

        <ModuleCard
          icon={<FiBox size={22} color="#059669" />}
          title="Item Master"
          onClick={() => openModule("itemMaster")}
        />

        <ModuleCard
          icon={<FiClock size={22} color="#0f766e" />}
          title="Transaction History"
          onClick={() => openModule("transactionHistory")}
        />

        <ModuleCard
          icon={<FiDollarSign size={22} color="#16a34a" />}
          title="Payout / Redemption"
          onClick={() => openModule("redemption")}
        />

        <ModuleCard
          icon={<FiTrendingUp size={22} color="#ea580c" />}
          title="Leaderboard"
          onClick={() => openModule("leaderboard")}
        />

        <ModuleCard
          icon={<FiBarChart2 size={22} color="#2563eb" />}
          title="Reports"
          onClick={() => openModule("reports")}
        />

        <ModuleCard
          icon={<FiSettings size={22} color="#4b5563" />}
          title="Settings"
          onClick={() => openModule("settings")}
        />
      </section>

      <RecentActivity recentModules={recentModules} onModuleClick={openModule} />

      <section className="lrs-time-box">
        <FiClock size={18} color="#2563eb" />

        <span>
          {currentTime.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
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
      </section>
    </div>
  );
};

const ModuleLoader = () => (
  <div className="lrs-module-loader">Loading module...</div>
);

const StatCard = ({ icon, label, value }) => (
  <div className="lrs-stat-card">
    <div className="lrs-stat-icon">{icon}</div>

    <div>
      <p className="lrs-stat-label">{label}</p>
      <h3 className="lrs-stat-value">{value}</h3>
    </div>
  </div>
);

const ModuleCard = ({ icon, title, onClick }) => (
  <button type="button" className="lrs-module-card" onClick={onClick}>
    <h3 className="lrs-module-card-title">
      {icon} {title}
    </h3>
  </button>
);

const MODULE_NAMES = {
  dashboard: "Dashboard",
  amountAssignment: "Amount Assignment",
  rewardEntry: "Reward Entry",
  customerDirectory: "Customer Directory",
  itemMaster: "Item Master",
  transactionHistory: "Transaction History",
  redemption: "Payout / Redemption",
  leaderboard: "Leaderboard",
  reports: "Reports",
  settings: "Settings",
};

const RecentActivity = ({ recentModules, onModuleClick }) => (
  <section className="lrs-recent-box">
    <div className="lrs-recent-header">
      <h2 className="lrs-recent-title">
        <FiClock size={20} color="#2563eb" /> Recently Used Modules
      </h2>

      <span className="lrs-recent-badge">
        {recentModules.length > 0 ? `${recentModules.length} modules` : "None"}
      </span>
    </div>

    {recentModules.length > 0 ? (
      <div className="lrs-activity-list">
        {recentModules.map((moduleKey, index) => (
          <button
            type="button"
            key={`${moduleKey}-${index}`}
            className="lrs-activity-item"
            onClick={() => onModuleClick(moduleKey)}
          >
            <h4 className="lrs-activity-title">
              {MODULE_NAMES[moduleKey] || moduleKey}
            </h4>

            <span className="lrs-activity-tag">Module</span>
          </button>
        ))}
      </div>
    ) : (
      <p className="lrs-no-activity">
        No modules used yet. Start exploring by clicking a module above or in
        the sidebar.
      </p>
    )}
  </section>
);

export default Dashboard;