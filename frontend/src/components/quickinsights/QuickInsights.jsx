import React from "react";
import "./quickInsights.css";

export default function QuickInsights({ 
  title = "Quick Insights", 
  subtitle = "Key metrics at a glance", 
  insights = [] 
}) {
  return (
    <div className="quick-insights-card">
      <div className="qi-header">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      
      <div className="qi-list">
        {insights.map((insight, index) => (
          <div className="qi-item" key={index}>
            {/* Applies the color theme passed from the parent, defaults to grey */}
            <div className={`qi-icon ${insight.colorTheme || 'theme-default'}`}>
              {insight.icon}
            </div>
            <div className="qi-content">
              <span className="qi-label">{insight.label}</span>
              <span className="qi-value truncate" title={insight.value}>
                {insight.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}