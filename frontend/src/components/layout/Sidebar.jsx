import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { DashboardContext } from "./MainLayout";
import { APP_NAME, APP_VERSION } from "../../config/appInfo";

import {
  FiGrid,
  FiUsers,
  FiBox,
  FiClock,
  FiDollarSign,
  FiTrendingUp,
  FiBarChart2,
  FiSettings,
  FiUser,
  FiLogOut,
  FiX,
  FiAward,
} from "react-icons/fi";

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

    customerdirectory: "customerDirectory",
    customermaster: "customerDirectory",
    customers: "customerDirectory",

    itemmaster: "itemMaster",
    loyaltyitemmaster: "itemMaster",
    rewardsprogram: "itemMaster",
    rewards: "itemMaster",

    rewardentry: "rewardEntry",
    salesentry: "rewardEntry",
    loyaltyentry: "rewardEntry",
    assignpoints: "rewardEntry",

    transactionhistory: "transactionHistory",
    pointshistory: "transactionHistory",
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

const getDashboardUrl = (moduleKey) => {
  const normalized = normalizeModuleKey(moduleKey);

  if (!normalized || normalized === "dashboard") {
    return "/dashboard";
  }

  return `/dashboard?module=${normalized}`;
};

const Sidebar = ({
  isOpen = false,
  toggleSidebar,
  closeSidebar,
  activeModule: activeModuleProp,
  setActiveModule: setActiveModuleProp,
}) => {
  const contextValue = useContext(DashboardContext) || {};

  const activeModule =
    activeModuleProp || contextValue.activeModule || "dashboard";

  const setActiveModule =
    setActiveModuleProp || contextValue.setActiveModule || (() => {});

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleCloseSidebar = () => {
    if (closeSidebar) {
      closeSidebar();
      return;
    }

    if (toggleSidebar) {
      toggleSidebar();
    }
  };

  const handleNavigate = (module) => {
    const normalizedModule = normalizeModuleKey(module);

    setActiveModule(normalizedModule);
    navigate(getDashboardUrl(normalizedModule));

    if (window.innerWidth <= 900) {
      handleCloseSidebar();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    {
      section: "MAIN",
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: <FiGrid />,
        },
        {
          key: "amountAssignment",
          label: "Amount Assignment",
          icon: <FiDollarSign />,
        },
      ],
    },
    {
      section: "LOYALTY MANAGEMENT",
      items: [
        {
          key: "customerDirectory",
          label: "Customer Directory",
          icon: <FiUsers />,
        },
        {
          key: "itemMaster",
          label: "Item Master",
          icon: <FiBox />,
        },
        {
          key: "rewardEntry",
          label: "Reward Entry",
          icon: <FiAward />,
        },
        {
          key: "transactionHistory",
          label: "Transaction History",
          icon: <FiClock />,
        },
        {
          key: "redemption",
          label: "Payout / Redemption",
          icon: <FiDollarSign />,
        },
        {
          key: "leaderboard",
          label: "Leaderboard",
          icon: <FiTrendingUp />,
        },
      ],
    },
    {
      section: "REPORTS",
      items: [
        {
          key: "reports",
          label: "Reports",
          icon: <FiBarChart2 />,
        },
      ],
    },
    {
      section: "SYSTEM",
      items: [
        {
          key: "settings",
          label: "Settings",
          icon: <FiSettings />,
        },
      ],
    },
  ];

  return (
    <>
      <div
        className={`lrs-sidebar-overlay ${isOpen ? "is-open" : ""}`}
        onClick={handleCloseSidebar}
        aria-hidden="true"
      />

      <aside className={`lrs-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="lrs-sidebar-header">
          <div className="lrs-sidebar-brand-row">
            <div className="lrs-sidebar-logo-mark">
              <img
                src="/logo.png"
                alt="AeroState LRS"
                className="lrs-sidebar-logo-img"
              />
            </div>

            <div className="lrs-sidebar-brand-text">
              <h2 className="lrs-sidebar-logo-title">
                <span className="lrs-sidebar-app-name">{APP_NAME}</span>
                <span className="app-version-badge">v{APP_VERSION}</span>
              </h2>

              <p className="lrs-sidebar-subtitle">Loyalty Reward System</p>
            </div>
          </div>

          <button
            type="button"
            className="lrs-sidebar-close"
            onClick={handleCloseSidebar}
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="lrs-sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section} className="lrs-sidebar-section">
              <h3 className="lrs-sidebar-section-title">{section.section}</h3>

              {section.items.map((item) => {
                const isActive =
                  normalizeModuleKey(activeModule) ===
                  normalizeModuleKey(item.key);

                return (
                  <button
                    type="button"
                    key={item.key}
                    className={`lrs-sidebar-item ${
                      isActive ? "is-active" : ""
                    }`}
                    onClick={() => handleNavigate(item.key)}
                  >
                    <span className="lrs-sidebar-icon">{item.icon}</span>
                    <span className="lrs-sidebar-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="lrs-sidebar-footer">
          <div className="lrs-sidebar-user">
            <FiUser size={18} />
            <span className="lrs-sidebar-user-name">
              {user?.username || "User"}
            </span>
          </div>

          <button
            type="button"
            className="lrs-sidebar-logout"
            onClick={handleLogout}
          >
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;