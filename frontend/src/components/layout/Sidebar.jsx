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
  FiMessageCircle,
  FiChevronRight,
} from "react-icons/fi";

const sidebarCss = `
  :root {
    --lrs-sidebar-width: 270px;
  }

  .lrs-layout {
    min-height: 100vh;
    background: #f8fafc;
  }

  .lrs-main-content {
    min-height: 100vh;
    background: #f8fafc;
    box-sizing: border-box;
  }

  .lrs-mobile-menu-btn {
    display: none;
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 9997;
    width: 42px;
    height: 42px;
    border: 1px solid #dbeafe;
    background: #ffffff;
    color: #2563eb;
    border-radius: 13px;
    font-size: 22px;
    font-weight: 900;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
    cursor: pointer;
  }

  .lrs-sidebar {
    width: var(--lrs-sidebar-width);
    height: 100vh;
    background:
      radial-gradient(circle at 20% 10%, rgba(37, 99, 235, 0.06), transparent 32%),
      radial-gradient(circle at 80% 90%, rgba(20, 184, 166, 0.07), transparent 34%),
      #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    z-index: 9998;
    box-shadow: 8px 0 28px rgba(15, 23, 42, 0.04);
  }

  .lrs-sidebar-header {
    min-height: 96px;
    padding: 20px 18px 16px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: blur(12px);
  }

  .lrs-sidebar-brand-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .lrs-sidebar-logo-mark {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: linear-gradient(135deg, #eff6ff, #ecfdf5);
    border: 1px solid #dbeafe;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    overflow: hidden;
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.12);
  }

  .lrs-sidebar-logo-img {
    width: 34px;
    height: 34px;
    object-fit: contain;
    display: block;
  }

  .lrs-sidebar-brand-text {
    min-width: 0;
  }

  .lrs-sidebar-logo-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .lrs-sidebar-app-name {
    color: #0f172a;
    font-size: 16px;
    font-weight: 950;
    letter-spacing: -0.03em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-version-badge {
    flex: 0 0 auto;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 3px 7px;
    font-size: 10px;
    font-weight: 950;
    line-height: 1;
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.10);
  }

  .lrs-sidebar-subtitle {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 11px;
    font-weight: 850;
    line-height: 1.2;
  }

  .lrs-sidebar-close {
    display: none;
    width: 38px;
    height: 38px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    border-radius: 12px;
    cursor: pointer;
    place-items: center;
    flex: 0 0 auto;
  }

  .lrs-sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px 12px 16px;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  .lrs-sidebar-nav::-webkit-scrollbar {
    width: 6px;
  }

  .lrs-sidebar-nav::-webkit-scrollbar-track {
    background: transparent;
  }

  .lrs-sidebar-nav::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }

  .lrs-sidebar-section {
    margin-bottom: 18px;
  }

  .lrs-sidebar-section-title {
    margin: 0 0 8px;
    padding: 0 8px;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lrs-sidebar-item {
    width: 100%;
    min-height: 42px;
    border: 1px solid transparent;
    background: transparent;
    color: #0f172a;
    border-radius: 13px;
    padding: 0 11px;
    margin-bottom: 6px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 9px;
    text-align: left;
    font-family: inherit;
    transition: 0.16s ease;
  }

  .lrs-sidebar-item:hover {
    background: #f8fafc;
    border-color: #e2e8f0;
    transform: translateX(2px);
  }

  .lrs-sidebar-item.is-active {
    background: linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%);
    border-color: #bfdbfe;
    color: #2563eb;
    box-shadow:
      0 10px 22px rgba(37, 99, 235, 0.12),
      inset 0 0 0 1px rgba(255, 255, 255, 0.70);
  }

  .lrs-sidebar-item.is-active .lrs-sidebar-icon {
    background: #ffffff;
    color: #2563eb;
    box-shadow: 0 7px 14px rgba(37, 99, 235, 0.10);
  }

  .lrs-sidebar-icon {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    color: inherit;
    font-size: 16px;
    border-radius: 8px;
  }

  .lrs-sidebar-label {
    font-size: 14px;
    font-weight: 900;
    color: inherit;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lrs-sidebar-arrow {
    color: #94a3b8;
    font-size: 14px;
    opacity: 0;
    transform: translateX(-4px);
    transition: 0.16s ease;
  }

  .lrs-sidebar-item:hover .lrs-sidebar-arrow,
  .lrs-sidebar-item.is-active .lrs-sidebar-arrow {
    opacity: 1;
    transform: translateX(0);
  }

  .lrs-sidebar-item.is-active .lrs-sidebar-arrow {
    color: #2563eb;
  }

  .lrs-sidebar-footer {
    padding: 14px 14px 16px;
    border-top: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(12px);
  }

  .lrs-sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 46px;
    padding: 0 10px;
    margin-bottom: 10px;
    border-radius: 15px;
    background: linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%);
    border: 1px solid #bfdbfe;
    color: #0f172a;
    box-shadow:
      0 12px 24px rgba(37, 99, 235, 0.10),
      0 12px 28px rgba(20, 184, 166, 0.08);
  }

  .lrs-sidebar-user-icon {
    width: 30px;
    height: 30px;
    border-radius: 11px;
    background: linear-gradient(135deg, #2563eb, #10b981);
    color: #ffffff;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.20);
  }

  .lrs-sidebar-user-name {
    font-size: 14px;
    font-weight: 950;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lrs-sidebar-logout {
    width: 100%;
    height: 44px;
    border: none;
    background: #ef4444;
    color: #ffffff;
    border-radius: 13px;
    font-size: 14px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    box-shadow: 0 12px 22px rgba(239, 68, 68, 0.18);
    transition: 0.16s ease;
  }

  .lrs-sidebar-logout:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .lrs-sidebar-overlay {
    display: none;
  }

  body.lrs-sidebar-lock {
    overflow: hidden;
  }

  @media (min-width: 901px) {
    .lrs-sidebar {
      position: fixed;
      left: 0;
      top: 0;
    }

    .lrs-main-content {
      margin-left: var(--lrs-sidebar-width);
      width: calc(100% - var(--lrs-sidebar-width));
    }
  }

  @media (max-width: 900px) {
    .lrs-mobile-menu-btn {
      display: grid;
      place-items: center;
    }

    .lrs-main-content {
      width: 100%;
      padding-top: 56px;
    }

    .lrs-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      transform: translateX(-105%);
      transition: transform 0.22s ease;
      box-shadow: 18px 0 45px rgba(15, 23, 42, 0.18);
    }

    .lrs-sidebar.is-open {
      transform: translateX(0);
    }

    .lrs-sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.48);
      z-index: 9997;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease;
    }

    .lrs-sidebar-overlay.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    .lrs-sidebar-close {
      display: grid;
    }
  }

  @media (max-width: 420px) {
    :root {
      --lrs-sidebar-width: 86vw;
    }

    .lrs-sidebar {
      width: var(--lrs-sidebar-width);
    }

    .lrs-sidebar-header {
      padding: 16px 14px;
    }

    .lrs-sidebar-app-name {
      font-size: 15px;
    }
  }
`;

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

    transactionhistory: "transactionHistory",
    pointshistory: "transactionHistory",
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
          key: "rewardEntry",
          label: "Reward Entry",
          icon: <FiAward />,
        },
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
      section: "COMMUNICATION",
      items: [
        {
          key: "whatsapp",
          label: "WhatsApp",
          icon: <FiMessageCircle />,
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
      <style>{sidebarCss}</style>

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
                    <FiChevronRight className="lrs-sidebar-arrow" />
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="lrs-sidebar-footer">
          <div className="lrs-sidebar-user">
            <span className="lrs-sidebar-user-icon">
              <FiUser size={16} />
            </span>

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