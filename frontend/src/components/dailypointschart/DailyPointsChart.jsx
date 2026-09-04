import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import "./dailyPointsChart.css";

export default function DailyPointsChart() {
  const [period, setPeriod] = useState("daily"); // "daily", "weekly", "monthly"
  const [chartData, setChartData] = useState([]);
  const [activeBar, setActiveBar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/dashboard/daily-points-chart?period=${period}`);
        if (response.data) {
          setChartData(response.data);
        }
      } catch (error) {
        console.error("Failed to load chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [period]);

  const maxPoints = Math.max(...chartData.map((d) => d.points), 100);

  return (
    <div className="daily-points-chart-card">
      <div className="chart-header">
        <div>
          <h3>Points Earned Overview</h3>
          <p>Activity breakdown over time</p>
        </div>
        <div className="chart-toggle-group">
          <button 
            className={`toggle-btn ${period === "daily" ? "active" : ""}`} 
            onClick={() => setPeriod("daily")}
          >
            Daily
          </button>
          <button 
            className={`toggle-btn ${period === "weekly" ? "active" : ""}`} 
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </button>
          <button 
            className={`toggle-btn ${period === "monthly" ? "active" : ""}`} 
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
        </div>
      </div>

      {loading ? (
        <div className="chart-body-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', color: '#64748b' }}>
          Loading chart data...
        </div>
      ) : (
        <div className="chart-container">
          <div className="chart-y-axis">
            <span>{maxPoints}</span>
            <span>{Math.round(maxPoints / 2)}</span>
            <span>0</span>
          </div>

          <div className="chart-bars-area">
            {chartData.map((item, index) => {
              const heightPercent = item.points > 0 ? Math.max(8, (item.points / maxPoints) * 100) : 0;
              const isHovered = activeBar === index;

              return (
                <div
                  key={index}
                  className="chart-bar-column"
                  onMouseEnter={() => setActiveBar(index)}
                  onMouseLeave={() => setActiveBar(null)}
                >
                  {isHovered && (
                    <div className="chart-tooltip">
                      <span className="tooltip-date">{item.date}</span>
                      <span className="tooltip-points">+{item.points} pts</span>
                    </div>
                  )}
                  <div
                    className={`chart-bar ${isHovered ? "active" : ""}`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <span className="chart-x-label">
                    {period === "daily" 
                      ? (index % 5 === 0 ? item.date.split(" ")[1] : "") 
                      : item.date.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}