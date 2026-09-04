import React from "react";
import "./heroCard.css";

export default function HeroCard({
  totalIssuedFormatted,
  activeMembers,
  payoutsFormatted,
  growthPercent,
  redemptionPercent
}) {
  return (
    <section className="points-hero-card-dark">
      <div className="hero-dark-left">
        <span className="hero-dark-kicker">TOTAL POINTS ISSUED</span>
        <div className="hero-dark-main-val">
          <h2>{totalIssuedFormatted}</h2>
          <span className="pts-label">pts</span>
        </div>
        <p className="hero-dark-sub">
          Held across {activeMembers} active members. Includes {payoutsFormatted} pts successfully redeemed to date.
        </p>
        <div className="hero-dark-trend">
          <span className="trend-pill-green">
            {growthPercent >= 0 ? `▲ +${growthPercent}%` : `▼ ${growthPercent}%`} vs last 30 days
          </span>
        </div>
      </div>

      <div className="hero-dark-right">
        <div className="circular-progress-wrap">
          <svg className="circular-gauge" viewBox="0 0 36 36">
            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path 
              className="circle-fill" 
              strokeDasharray={`${redemptionPercent}, 100`} 
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
            />
          </svg>
          <div className="circular-gauge-content">
            <span className="gauge-percent">{redemptionPercent}%</span>
            <span className="gauge-sub">redeemed</span>
          </div>
        </div>
      </div>
    </section>
  );
}