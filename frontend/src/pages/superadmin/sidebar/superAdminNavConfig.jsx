import React from "react";
import {
  FiGrid,
  FiUserPlus,
  FiUsers,
  FiCreditCard,
  FiKey
} from "react-icons/fi";

export const superAdminNavConfig = [
  {
    section: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <FiGrid size={18} />,
        path: "/superadmin",
        isRoute: true,
      },
    ],
  },
  {
    section: "Tenant & Store Management",
    items: [
      {
        id: "onboard-client",
        label: "Onboard Client",
        icon: <FiUserPlus size={18} />,
        path: "/superadmin/onboard-client",
        isRoute: true,
      },
      {
        id: "client-directory",
        label: "Client Directory",
        icon: <FiUsers size={18} />,
        path: "/superadmin/client-directory",
        isRoute: true,
      },
      {
        id: "subscriptions",
        label: "Subscriptions & Plans",
        icon: <FiCreditCard size={18} />,
        path: "/superadmin/subscriptions",
        isRoute: true,
      },
    ],
  },
  {
    section: "Security & Control",
    items: [
      {
        id: "update-credentials",
        label: "Update Credentials",
        icon: <FiKey size={18} />,
        path: "/superadmin/profile",
        isRoute: true,
      },
    ],
  },
];