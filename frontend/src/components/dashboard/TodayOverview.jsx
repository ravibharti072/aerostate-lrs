import React from "react";
import {
  FiBox,
  FiTrendingUp,
  FiDollarSign,
  FiAlertTriangle,
} from "react-icons/fi";

const TodayOverview = ({ stats = {} }) => {
  const cards = [
    {
      icon: <FiBox size={20} />,
      title: "Total Products",
      value: stats.totalProducts ?? 0,
      bg: "#eff6ff",
      color: "#2563eb",
    },
    {
      icon: <FiTrendingUp size={20} />,
      title: "Today Stock Sold",
      value: stats.todayStockSold ?? 0,
      bg: "#ecfdf5",
      color: "#059669",
    },
    {
      icon: <FiDollarSign size={20} />,
      title: "Today Sales",
      value: `₹${Number(stats.todaySales || 0).toFixed(2)}`,
      bg: "#f5f3ff",
      color: "#7c3aed",
    },
    {
      icon: <FiAlertTriangle size={20} />,
      title: "Low Stock Alerts",
      value: stats.lowStockAlerts ?? 0,
      bg: "#fef2f2",
      color: "#dc2626",
    },
  ];

  return (
    <section className="responsive-stats-grid" style={styles.grid}>
      {cards.map((card, index) => (
        <div key={index} style={styles.card}>
          <div
            style={{
              ...styles.icon,
              backgroundColor: card.bg,
              color: card.color,
            }}
          >
            {card.icon}
          </div>
          <div>
            <p style={styles.title}>{card.title}</p>
            <h2 style={styles.value}>{card.value}</h2>
          </div>
        </div>
      ))}
    </section>
  );
};

// Styles match the dashboard exactly
const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
    marginBottom: "10px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  icon: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
  },
  value: {
    margin: "6px 0 0",
    fontSize: "clamp(20px, 3vw, 28px)",
    fontWeight: "700",
    color: "#111827",
  },
};

export default TodayOverview;