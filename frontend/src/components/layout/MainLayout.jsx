import React, { createContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export const DashboardContext = createContext();

const MainLayout = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
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
    <DashboardContext.Provider value={{ activeModule, setActiveModule }}>
      <div className="lrs-layout">
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
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

          <Outlet context={{ activeModule, setActiveModule }} />
        </main>
      </div>
    </DashboardContext.Provider>
  );
};

export default MainLayout;