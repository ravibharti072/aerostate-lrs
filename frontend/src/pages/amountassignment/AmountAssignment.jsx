import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSave,
  FiLock,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiAward,
} from "react-icons/fi";
import api from "../../api/axios";

// Reusable Components
import PortalHeader from "../../components/portalheader/PortalHeader";
import StatCard from "../../components/statcard/StatCard";
import ModuleWriternHeader from "../../components/modulewriternheader/ModuleWriternHeader";

import "./amountAssignment.css";

export default function AmountAssignment({ onBack }) {
  const navigate = useNavigate();
  const [currentValue, setCurrentValue] = useState(1);
  const [form, setForm] = useState({
    point_value_rupees: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: "", message: "" });

  useEffect(() => {
    fetchPointValue();
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: "", message: "" }), 3000);
  };

  const getErrorMessage = (error, fallback) => {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(", ");
    if (typeof detail === "string") return detail;
    return fallback;
  };

  const formatAmount = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fetchPointValue = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings/point-value");
      const value = Number(
        res.data?.point_value_rupees ??
          res.data?.point_value ??
          res.data?.value ??
          res.data?.amount ??
          1
      );
      setCurrentValue(value);
      setForm((prev) => ({ ...prev, point_value_rupees: value }));
    } catch (error) {
      console.error("Point value fetch error:", error);
      showToast("error", getErrorMessage(error, "Unable to load amount value."));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPointValue = async (event) => {
    event.preventDefault();
    const pointValue = Number(form.point_value_rupees);

    if (!pointValue || pointValue <= 0) {
      showToast("error", "Enter valid rupee value per point.");
      return;
    }

    if (!form.password) {
      showToast("error", "Enter your admin password to update amount.");
      return;
    }

    try {
      setSaving(true);
      await api.put("/settings/point-value", {
        point_value_rupees: pointValue,
        password: form.password,
      });
      setCurrentValue(pointValue);
      setForm((prev) => ({ ...prev, password: "" }));
      showToast("success", "Point valuation updated successfully.");
    } catch (error) {
      console.error("Point value update error:", error);
      showToast("error", getErrorMessage(error, "Unable to update amount."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="directory-page">
      {toast.message && (
        <div className={`toast-notification ${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      {/* PORTAL HEADER */}
      <PortalHeader 
        title="Amount Assignment" 
        kicker="LOYALTY MANAGEMENT"
        description="Set the payout value of each reward point for customer redemption calculations."
        icon={FiDollarSign} 
        backPath="/dashboard" 
        rightAction={
          <span className="payout-conversion-badge">
            1 Point = ₹{formatAmount(currentValue)}
          </span>
        }
      />

      {/* STATS GRID */}
      <div className="dir-stats-grid">
        <StatCard title="Current Value" value={`₹${formatAmount(currentValue)}`} Icon={FiDollarSign} colorTheme="green" />
        <StatCard title="100 Points Value" value={`₹${formatAmount(100 * currentValue)}`} Icon={FiAward} colorTheme="blue" />
        <StatCard title="250 Points Value" value={`₹${formatAmount(250 * currentValue)}`} Icon={FiTrendingUp} colorTheme="purple" />
        <StatCard title="500 Points Value" value={`₹${formatAmount(500 * currentValue)}`} Icon={FiCreditCard} colorTheme="orange" />
      </div>

      <section className="dir-modules-section">
        <ModuleWriternHeader 
          title="Payout Conversion Setting"
          description="Configure how much cash value one loyalty point represents during payouts."
          badgeCount={`₹${formatAmount(currentValue)}`}
          badgeLabel="per point"
        />

        <div className="asa-main-grid">
          {/* LEFT CARD: CURRENT VALUE & CONVERSION PREVIEW */}
          <div className="settings-card">
            <div className="settings-card-head">
              <div className="settings-card-icon conversion"><FiDollarSign /></div>
              <div>
                <h2 className="settings-card-title">Current Valuation</h2>
                <p className="settings-card-subtitle">Active payout conversion rate applied across the system.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="asa-current-box">
                <div className="asa-rupee-icon">
                  <span>₹</span>
                </div>
                <div>
                  <p>Standard Redemption Rate</p>
                  <h3>1 Point = ₹{formatAmount(currentValue)}</h3>
                </div>
              </div>

              <div className="asa-example-box">
                <h3>Conversion Breakdown</h3>
                <div className="asa-example-row">
                  <span>100 points</span>
                  <strong>₹{formatAmount(100 * currentValue)}</strong>
                </div>
                <div className="asa-example-row">
                  <span>250 points</span>
                  <strong>₹{formatAmount(250 * currentValue)}</strong>
                </div>
                <div className="asa-example-row last">
                  <span>500 points</span>
                  <strong>₹{formatAmount(500 * currentValue)}</strong>
                </div>
              </div>

              <div className="asa-note-box">
                <FiCheckCircle size={15} color="#2d5696" style={{ flexShrink: 0 }} />
                <span>Updated valuation applies automatically to all new redemption claims.</span>
              </div>
            </div>
          </div>

          {/* RIGHT CARD: UPDATE FORM */}
          <div className="settings-card">
            <div className="settings-card-head">
              <div className="settings-card-icon security"><FiLock /></div>
              <div>
                <h2 className="settings-card-title">Update Amount Per Point</h2>
                <p className="settings-card-subtitle">Enter new rupee value and confirm with your admin password.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <form onSubmit={submitPointValue} className="settings-form">
                <div className="form-group">
                  <label>Rupee Value for 1 Point *</label>
                  <div className="asa-amount-input-wrap">
                    <span className="currency-prefix">₹</span>
                    <input
                      className="settings-input"
                      type="number"
                      name="point_value_rupees"
                      value={form.point_value_rupees}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      placeholder="0.25"
                      required
                    />
                  </div>
                  <small className="field-hint">
                    Example: Enter <strong>0.25</strong> for 25 paise or <strong>1.00</strong> for 1 rupee per point.
                  </small>
                </div>

                <div className="form-group">
                  <label>Admin Password Confirmation *</label>
                  <div className="password-input-wrap">
                    <FiLock size={15} className="password-icon" />
                    <input
                      className="settings-input"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter admin password"
                      required
                      style={{ paddingLeft: "36px" }}
                    />
                  </div>
                  <small className="field-hint">
                    Password verification is required to safeguard payout parameters.
                  </small>
                </div>

                <div className="settings-actions">
                  <button type="submit" className="btn-submit" disabled={saving}>
                    <FiSave size={15} /> {saving ? "Updating Valuation..." : "Save Valuation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}