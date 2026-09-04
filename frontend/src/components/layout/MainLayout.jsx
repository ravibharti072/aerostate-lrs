import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("lrs-sidebar-lock");
    } else {
      document.body.classList.remove("lrs-sidebar-lock");
    }

    return () => {
      document.body.classList.remove("lrs-sidebar-lock");
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setSidebarOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="lrs-layout">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />

      <main className="lrs-main-content">
        <button
          type="button"
          className="lrs-mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          ☰
        </button>

        {/* React Router handles swapping components here based on the URL automatically */}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;