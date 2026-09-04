import React from 'react';
import { FiArrowRight, FiTrendingUp, FiTrendingDown, FiMinus, FiGift } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './recentRedemptionsCard.css';

const formatMoney = (value) => Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatNumber = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const RecentRedemptionsCard = ({ 
  redemptions = [],
  totalRedeemedValue = 0, 
  totalPayouts = 0,       
  transactionCount = 0,        
  trendValue = 0               
}) => {
  const navigate = useNavigate();

  // Determine if the card is in a pure empty state
  const isEmpty = redemptions.length === 0 && totalPayouts === 0;

  // Dynamic Trend Logic
  const isUp = trendValue > 0;
  const isDown = trendValue < 0;
  const TrendIcon = isUp ? FiTrendingUp : isDown ? FiTrendingDown : FiMinus;
  const trendClass = isUp ? 'positive' : isDown ? 'negative' : 'neutral';
  const trendSign = isUp ? '+' : '';

  return (
    <div className="ops-stacked-card recent-redemptions-card">
      <div className="rr-header">
        <h4>Recent Redemptions</h4>
        <p className="subtitle">Latest payout transactions</p>
      </div>
      
      {/* --- SUMMARY HEADER BLOCK --- */}
      <div className="rr-summary-block">
        <div className="rr-summary-left">
          {isEmpty ? (
            <>
              <div className="rr-summary-main">
                <span className="rr-summary-empty-text">No redemptions yet</span>
              </div>
              <div className="rr-summary-meta">
                <span>0 transactions this month</span>
              </div>
            </>
          ) : (
            <>
              <div className="rr-summary-main">
                <span className="rr-summary-amount">₹{formatMoney(totalRedeemedValue)}</span>
                <span className="rr-summary-points">· {formatNumber(totalPayouts)} pts redeemed</span>
              </div>
              <div className="rr-summary-meta">
                <span>{transactionCount} transactions this month</span>
                <span className={`rr-trend-badge ${trendClass}`}>
                  <TrendIcon size={12} /> {trendSign}{trendValue} vs last month
                </span>
              </div>
            </>
          )}
        </div>
        <div className="rr-summary-right">
          {/* Hide sparkline completely if empty */}
          {!isEmpty && (
            <svg className="rr-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline 
                points="0,25 15,20 30,28 50,15 70,18 85,8 100,12" 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          )}
        </div>
      </div>

      <hr className="rr-divider" />
      {/* --- END SUMMARY HEADER BLOCK --- */}

      <div className={`rr-body ${isEmpty ? 'rr-body-empty' : ''}`}>
        {!isEmpty ? (
          <div className="rr-list">
            {redemptions.map((item, idx) => (
              <div className="rr-item" key={`rr-${idx}`}>
                <div className="rr-left">
                  <div className="rr-avatar">{item.name.charAt(0).toUpperCase()}</div>
                  <div className="rr-details">
                    <span className="rr-name">{item.name}</span>
                    <span className="rr-time">{item.time}</span>
                  </div>
                </div>
                <div className="rr-right">
                  <span className="rr-points">-{item.points} pts</span>
                  <span className="rr-value">₹{formatMoney(item.value)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rr-empty-state-block">
            <FiGift className="rr-empty-icon" />
            <span className="rr-empty-primary">No redemptions recorded yet</span>
            <span className="rr-empty-secondary">Once a customer redeems points, it'll show up here.</span>
          </div>
        )}
      </div>

      {/* Hide the view all link to prevent interaction when there is nothing to view */}
      {!isEmpty && (
        <div className="rr-footer">
          <button className="rr-footer-link" onClick={() => navigate('/redemption')}>
            View all payouts <FiArrowRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentRedemptionsCard;