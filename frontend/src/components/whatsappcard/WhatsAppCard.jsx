import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiXCircle, FiArrowRight, FiDollarSign } from 'react-icons/fi';
import './whatsappCard.css';

const formatMoney = (value) => Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const WhatsAppCard = ({ pendingMessages, sentMessages, isConnected = true, pendingCount = 0, sentCount = 0 }) => {
  const navigate = useNavigate();
  const totalMessages = pendingCount + sentCount;
  const sentPercent = totalMessages > 0 ? (sentCount / totalMessages) * 100 : 0;
  
  // Calculate total spend at 0.88 rupees per sent message
  const totalSpend = sentCount * 0.88;

  return (
    <div className="whatsapp-card">
      <div className="wa-header">
        <div className="wa-header-text">
          <h4>WhatsApp Message Center</h4>
          <p className="subtitle">Delivery status at a glance.</p>
        </div>
        <div className={`wa-badge ${isConnected ? 'connected' : 'pending'}`}>
          {isConnected ? 'Connected' : `${pendingCount} Pending`}
        </div>
      </div>

      <div className="wa-body">
        
        {/* SUMMARY / SPEND SECTION */}
        <div className="wa-summary-box">
          <div className="wa-chart-col">
            <div className="wa-circular-chart">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" />
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  stroke="#166962" 
                  strokeWidth="12" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (sentPercent / 100) * 251.2} 
                  strokeLinecap="round" 
                  transform="rotate(-90 50 50)" 
                  style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                />
              </svg>
              <div className="wa-chart-inner">
                <span className="wa-chart-val">{totalMessages}</span>
                <span className="wa-chart-lbl">TOTAL</span>
              </div>
            </div>
          </div>
          <div className="wa-stats-col">
            <div className="wa-stat-row">
              <span className="wa-stat-dot sent"></span>
              <span className="wa-stat-label">Messages Sent</span>
              <span className="wa-stat-val">{sentCount}</span>
            </div>
            <div className="wa-stat-row">
              <span className="wa-stat-dot pending"></span>
              <span className="wa-stat-label">Pending / Queued</span>
              <span className="wa-stat-val">{pendingCount}</span>
            </div>
            <div className="wa-stat-row spend">
              <span className="wa-stat-dot spend-dot"><FiDollarSign size={12}/></span>
              <span className="wa-stat-label">Spend (@ ₹0.88/msg)</span>
              <span className="wa-stat-val">₹{formatMoney(totalSpend)}</span>
            </div>
          </div>
        </div>

        {/* PENDING SECTION */}
        <div className="wa-section">
          <h5 className="wa-section-title">Pending</h5>
          <div className="wa-list">
            {pendingMessages && pendingMessages.length > 0 ? (
              pendingMessages.map((msg, idx) => (
                <div className="wa-list-item" key={`pend-${idx}`}>
                  <div className="wa-item-left">
                    <div className="wa-avatar">{msg.name.charAt(0).toUpperCase()}</div>
                    <div className="wa-details">
                      <span className="wa-name">{msg.name}</span>
                      <span className="wa-context">{msg.type} • {msg.time}</span>
                    </div>
                  </div>
                  <div className="wa-status pending-status">
                    <FiClock size={16} />
                  </div>
                </div>
              ))
            ) : (
              <div className="wa-empty">No pending messages</div>
            )}
          </div>
        </div>

        {/* RECENTLY SENT SECTION */}
        <div className="wa-section">
          <h5 className="wa-section-title">Recently Sent</h5>
          <div className="wa-list">
            {sentMessages && sentMessages.length > 0 ? (
              sentMessages.map((msg, idx) => (
                <div className="wa-list-item" key={`sent-${idx}`}>
                  <div className="wa-item-left">
                    <div className="wa-avatar">{msg.name.charAt(0).toUpperCase()}</div>
                    <div className="wa-details">
                      <span className="wa-name">{msg.name}</span>
                      <span className="wa-context">{msg.type} • {msg.time}</span>
                    </div>
                  </div>
                  <div className={`wa-status ${String(msg.status).toLowerCase() === 'failed' ? 'failed-status' : 'sent-status'}`}>
                    {String(msg.status).toLowerCase() === 'failed' ? <FiXCircle size={16} /> : <FiCheckCircle size={16} />}
                  </div>
                </div>
              ))
            ) : (
              <div className="wa-empty">No recent messages</div>
            )}
          </div>
        </div>
      </div>

      <div className="wa-footer">
        <button className="wa-footer-link" onClick={() => navigate('/whatsapp', { state: { activeTab: 'history' } })}>
          View all messages <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default WhatsAppCard;