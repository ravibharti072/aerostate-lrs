import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ReusableSidebar } from "../reusablesidebar/ReusableSidebar";
import { APP_NAME, APP_FULL_NAME, APP_VERSION } from "../../config/appInfo";

import {
  FiUsers,
  FiBox,
  FiClock,
  FiDollarSign,
  FiTrendingUp,
  FiBarChart2,
  FiSettings,
  FiAward,
  FiMessageCircle,
} from "react-icons/fi";

const Sidebar = ({ isOpen = false, toggleSidebar, closeSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    if (window.innerWidth <= 900 && closeSidebar) {
      closeSidebar();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const myNavigation = [
    {
      items: [
        { 
          label: "Overview", 
          children: [
            { label: "Dashboard", path: "/dashboard" },
            { label: "Recent Activity", path: "/recent-activity" },
            { label: "Notifications", path: "/notifications" },
          ]
        },
      ],
    },
    {
      section: "Operations",
      items: [
        { label: "Reward Entry", icon: <FiAward />, path: "/reward-entry" },
        { label: "Customer Directory", icon: <FiUsers />, path: "/customer-directory" },
        { label: "Item Master", icon: <FiBox />, path: "/item-master" },
        {
          label: "Transactions",
          icon: <FiClock />,
          children: [
            { label: "Point History", path: "/transaction-history" },
            { label: "Payout & Redemption", path: "/redemption" },
          ],
        },
        { label: "Leaderboard", icon: <FiTrendingUp />, path: "/leaderboard" },
        { label: "Amount Assignment", icon: <FiDollarSign />, path: "/amount-assignment" },
      ],
    },
    {
      section: "System",
      items: [
        { label: "WhatsApp Center", icon: <FiMessageCircle />, path: "/whatsapp" },
        { label: "Reports Hub", icon: <FiBarChart2 />, path: "/reports" },
        { label: "Settings", icon: <FiSettings />, path: "/settings" },
      ],
    },
  ];

  return (
    <ReusableSidebar
      isOpen={isOpen}
      onClose={closeSidebar || toggleSidebar}
      brandName={APP_NAME}
      brandSub={APP_FULL_NAME}
      version={APP_VERSION}
      logoImg="/logo.png"
      navConfig={myNavigation}
      currentPath={location.pathname}
      onNavigate={handleNavigate}
      user={user}
      onLogout={handleLogout}
      showSearch={true}
    />
  );
};

export default Sidebar;