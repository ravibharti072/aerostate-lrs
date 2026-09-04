import React from 'react';
import './systemMilestonesCard.css';
import { FiTarget } from 'react-icons/fi';

const formatNumber = (num) => Number(num).toLocaleString('en-IN');

// Helper to calculate the "next" milestone dynamically based on current value
const calculateNextMilestone = (current, steps) => {
  for (let step of steps) {
    if (current < step) return step;
  }
  return steps[steps.length - 1] * 2; // Fallback
};

const SystemMilestonesCard = ({ totalCustomers, totalIssued, totalPayouts }) => {
  // Define stepping stones for your milestones
  const targetCustomers = calculateNextMilestone(totalCustomers, [10, 50, 100, 500, 1000, 5000]);
  const targetIssued = calculateNextMilestone(totalIssued, [1000, 5000, 10000, 50000, 100000, 500000]);
  const targetRedeemed = calculateNextMilestone(totalPayouts, [500, 1000, 5000, 10000, 50000, 100000]);

  const milestones = [
    {
      label: "Customer Acquisition",
      current: totalCustomers,
      target: targetCustomers,
      color: "#3b82f6", // Blue
      suffix: "members"
    },
    {
      label: "Points Economy (Issued)",
      current: totalIssued,
      target: targetIssued,
      color: "#10b981", // Green
      suffix: "pts"
    },
    {
      label: "Value Realized (Redeemed)",
      current: totalPayouts,
      target: targetRedeemed,
      color: "#8b5cf6", // Indigo
      suffix: "pts"
    }
  ];

  return (
    <div className="ops-stacked-card system-milestones-card">
      <div className="sm-header">
        <div className="sm-title-group">
          <h4>System Milestones</h4>
          <p className="subtitle">Tracking growth towards next targets</p>
        </div>
        <div className="sm-icon-wrapper">
          <FiTarget size={18} />
        </div>
      </div>
      
      <div className="sm-body">
        {milestones.map((m, idx) => {
          const percent = Math.min(100, (m.current / m.target) * 100) || 0;
          
          return (
            <div className="sm-item" key={`ms-${idx}`}>
              <div className="sm-item-header">
                <span className="sm-label">{m.label}</span>
                <span className="sm-values">
                  <strong>{formatNumber(m.current)}</strong> / {formatNumber(m.target)} <span className="sm-suffix">{m.suffix}</span>
                </span>
              </div>
              <div className="sm-progress-track">
                <div 
                  className="sm-progress-fill" 
                  style={{ 
                    width: `${percent}%`, 
                    backgroundColor: m.color 
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemMilestonesCard;