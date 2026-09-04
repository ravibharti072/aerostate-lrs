import React from 'react';
import { FiCreditCard } from 'react-icons/fi';
import './totalvaluecard.css';

const formatNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0";
};

const TotalValueCard = ({ totalAmountValue, totalRedeemedValue, totalRemainingValue, redemptionPercent }) => {
  return (
    <div className="total-amount-card">
      <div className="tac-header">
        <h4>Total Value Equivalent</h4>
        <p className="subtitle">Monetary value of issued points</p>
      </div>
      
      <div className="tac-content">
        <div className="tac-left">
          <div className="tac-amount">
            <span className="tac-currency">₹</span>
            {formatNumber(totalAmountValue)}
          </div>
          
          <div className="tac-breakdown">
            <div className="tac-bd-row">
              <span className="bd-dot" style={{backgroundColor: '#166962'}}></span>
              <span className="bd-label">Redeemed:</span>
              <span className="bd-val">₹{formatNumber(totalRedeemedValue)}</span>
            </div>
            <div className="tac-bd-row">
              <span className="bd-dot" style={{backgroundColor: '#2d5696'}}></span>
              <span className="bd-label">Remaining:</span>
              <span className="bd-val">₹{formatNumber(totalRemainingValue)}</span>
            </div>
          </div>
        </div>

        <div className="tac-right">
          <div className="tac-circular-chart">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#2d5696" strokeWidth="10" />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="#166962" 
                strokeWidth="10" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - ((redemptionPercent || 0) / 100) * 251.2} 
                strokeLinecap="round" 
                transform="rotate(-90 50 50)" 
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="tac-chart-inner">
              <span className="tac-pct">{redemptionPercent || 0}%</span>
              <span className="tac-pct-lbl">REDEEMED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalValueCard;