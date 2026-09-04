import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ReusableSidebar } from "../../../components/reusablesidebar/ReusableSidebar";
import { superAdminNavConfig } from "./superAdminNavConfig";

const logo = "/logo.png";

export default function SuperAdminSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  onNavigateRoute,
  onOpenCredentials,
  user,
  onLogout
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path) => {
    if (onClose) onClose();

    const flatItems = superAdminNavConfig.flatMap((sec) => sec.items);
    const target = flatItems.find(
      (item) => item.path === path || item.id === path || item.tabKey === path
    );

    // 1. Direct URL route navigation
    if (target?.isRoute && target.path) {
      if (onNavigateRoute) {
        onNavigateRoute(target.path);
      } else {
        navigate(target.path);
      }
      return;
    }

    // 2. Action or modal triggers
    if (
      target?.action === "OPEN_CREDENTIALS_MODAL" ||
      target?.id === "update-credentials"
    ) {
      if (onOpenCredentials) {
        onOpenCredentials();
        return;
      }
    }

    // 3. Tab-based view switching fallback
    if (target?.tabKey && onTabChange) {
      onTabChange(target.tabKey);
      return;
    }

    // Fallback direct path navigation if none of the above matched
    if (path && !path.startsWith("#")) {
      if (onNavigateRoute) {
        onNavigateRoute(path);
      } else {
        navigate(path);
      }
    }
  };

  // Resolve current active path for highlighting
  const currentPath =
    location.pathname !== "/superadmin"
      ? location.pathname
      : activeTab
      ? activeTab.startsWith("/") || activeTab.startsWith("#")
        ? activeTab
        : `#${activeTab}`
      : location.pathname;

  return (
    <ReusableSidebar
      isOpen={isOpen}
      onClose={onClose}
      brandName="Aerostate Lab"
      brandSub="SUPERADMIN PANEL"
      logoImg={logo}
      navConfig={superAdminNavConfig}
      currentPath={currentPath}
      onNavigate={handleNavClick}
      user={user}
      onLogout={onLogout}
      showSearch={false}
    />
  );
}