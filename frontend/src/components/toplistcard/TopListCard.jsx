import React from 'react';
import './toplistcard.css';

const TopListCard = ({ title, subtitle, data, valueLabel }) => {
  return (
    <div className="top-list-card">
      <div className="top-list-header">
        <h4>{title}</h4>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      
      <div className="top-list-content">
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <div className="top-list-row" key={index}>
              <div className="row-left">
                {/* Fallback to first letter if no avatar is provided */}
                <div className="avatar-circle">
                  {item.avatar || item.name.charAt(0).toUpperCase()}
                </div>
                <div className="row-details">
                  <span className="row-name">{item.name}</span>
                  {item.subtext && <span className="row-subtext">{item.subtext}</span>}
                </div>
              </div>
              <div className="row-right">
                <span className="row-value">{item.value}</span>
                <span className="row-value-label">{valueLabel}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">No data available</div>
        )}
      </div>
    </div>
  );
};

export default TopListCard;