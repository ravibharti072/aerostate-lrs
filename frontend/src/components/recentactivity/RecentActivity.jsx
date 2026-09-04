import React from "react";
import { FiClock } from "react-icons/fi";
import "./recentActivity.css";

export default function RecentActivity({ activities = [], loading = false }) {
  return (
    <div className="recent-activity-card">
      <div className="ra-header">
        <div>
          <h3>Recent Activity</h3>
          <p>Latest transactions</p>
        </div>
        <div className="ra-badge">Live</div>
      </div>

      <div className="ra-list-container">
        {loading ? (
          <div className="ra-message">Loading activity...</div>
        ) : activities.length > 0 ? (
          activities.map((act, index) => (
            <div className="ra-list-item" key={act.id || index}>
              <div className="ra-avatar">
                {act.customer ? act.customer.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="ra-content">
                <div className="ra-row-top">
                  <span className="ra-customer">{act.customer}</span>
                  {/* Fixed the double plus sign by rendering exactly what the backend sends */}
                  <span 
                    className="ra-points" 
                    style={{ color: act.is_debit ? '#ef4444' : '#10b981' }}
                  >
                    {act.points} pts
                  </span>
                </div>
                <div className="ra-row-bottom">
                  <span className="ra-item" title={act.item}>{act.item}</span>
                  <span className="ra-time">
                    <FiClock size={10} style={{ marginRight: '4px' }} />
                    {act.time}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="ra-message">No recent activity found.</div>
        )}
      </div>
    </div>
  );
}