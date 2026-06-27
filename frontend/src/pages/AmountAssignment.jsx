import React, { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiRefreshCw,
  FiSave,
  FiLock,
  FiInfo,
  FiCheckCircle,
} from "react-icons/fi";
import api from "../api/axios";

function AmountAssignment({ onBack }) {
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

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.location.href = "/dashboard";
  };

  const showToast = (type, message) => {
    setToast({ type, message });

    setTimeout(() => {
      setToast({ type: "", message: "" });
    }, 3000);
  };

  const getErrorMessage = (error, fallback) => {
    const detail = error.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

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

      setForm((prev) => ({
        ...prev,
        point_value_rupees: value,
      }));
    } catch (error) {
      console.error("Point value fetch error:", error);
      showToast("error", getErrorMessage(error, "Unable to load amount value."));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitPointValue = async (e) => {
    e.preventDefault();

    const pointValue = Number(form.point_value_rupees);

    if (!pointValue || pointValue <= 0) {
      showToast("error", "Enter valid rupee value per point.");
      return;
    }

    if (!form.password) {
      showToast("error", "Enter your password to update amount.");
      return;
    }

    try {
      setSaving(true);

      await api.put("/settings/point-value", {
        point_value_rupees: pointValue,
        password: form.password,
      });

      setCurrentValue(pointValue);

      setForm((prev) => ({
        ...prev,
        password: "",
      }));

      showToast("success", "Amount assignment updated successfully.");
    } catch (error) {
      console.error("Point value update error:", error);
      showToast("error", getErrorMessage(error, "Unable to update amount."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{amountAssignmentCss}</style>

      <div className="asa-page">
        {toast.message && (
          <div
            className={`asa-toast ${
              toast.type === "error" ? "error" : "success"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="asa-header">
          <button type="button" onClick={handleBack} className="asa-back-btn">
            <FiArrowLeft size={16} />
            Back
          </button>

          <div className="asa-title-wrap">
            <h2 className="asa-title">
              <span className="asa-title-icon">₹</span>
              Amount Assignment
            </h2>

            <p className="asa-subtitle">
              Set the payout value of each reward point.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPointValue}
            className="asa-refresh-btn"
            disabled={loading}
          >
            <FiRefreshCw size={16} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="asa-top-info-card">
          <div className="asa-top-info-left">
            <div className="asa-top-icon">
              <FiInfo size={20} />
            </div>

            <div>
              <h3>Payout conversion setting</h3>
              <p>Set how much money one reward point is worth during payout.</p>
            </div>
          </div>

          <div className="asa-current-pill">
            1 Point = ₹{formatAmount(currentValue)}
          </div>
        </div>

        <div className="asa-grid">
          <section className="asa-preview-card">
            <div className="asa-card-header">
              <div className="asa-green-icon-box">
                <span>₹</span>
              </div>

              <div>
                <p>Current Assigned Amount</p>
                <h1>1 Point = ₹{formatAmount(currentValue)}</h1>
              </div>
            </div>

            <div className="asa-example-box">
              <h3>Example Calculation</h3>

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
              <FiCheckCircle size={17} color="#16a34a" />
              <span>
                This amount will be used in Payout / Redemption calculation.
              </span>
            </div>
          </section>

          <section className="asa-form-card">
            <h3>Update Amount Per Point</h3>

            <p>
              Enter new rupee value and confirm with your login password.
            </p>

            <form onSubmit={submitPointValue}>
              <div className="asa-form-group">
                <label>Amount in Rupees for 1 Point</label>

                <div className="asa-amount-input-wrap">
                  <span>₹</span>

                  <input
                    type="number"
                    name="point_value_rupees"
                    value={form.point_value_rupees}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    placeholder="Example: 0.25"
                    required
                  />
                </div>

                <small>
                  Example: enter <b>0.25</b> for 25 paise per point.
                </small>
              </div>

              <div className="asa-form-group">
                <label>Password Confirmation</label>

                <div className="asa-password-wrap">
                  <FiLock size={16} />

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your login password"
                    required
                  />
                </div>

                <small>
                  Password is required to protect payout value changes.
                </small>
              </div>

              <button type="submit" className="asa-save-btn" disabled={saving}>
                <FiSave size={16} />
                {saving ? "Updating..." : "Update Amount"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

const amountAssignmentCss = `
  .asa-page {
    width: 100%;
    max-width: 100%;
    min-height: 100vh;
    padding: 20px 24px 40px;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asa-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    padding: 12px 22px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    max-width: min(420px, calc(100vw - 28px));
    text-align: center;
  }

  .asa-toast.success {
    background-color: #16a34a;
  }

  .asa-toast.error {
    background-color: #dc2626;
  }

  .asa-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }

  .asa-back-btn,
  .asa-refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 15px;
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 800;
    font-size: 14px;
    min-height: 40px;
  }

  .asa-refresh-btn {
    background-color: #f9fafb;
  }

  .asa-refresh-btn:disabled,
  .asa-save-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .asa-title-wrap {
    flex: 1;
    min-width: 0;
  }

  .asa-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 24px;
    font-weight: 900;
    color: #111827;
  }

  .asa-title-icon {
    color: #16a34a;
    font-size: 26px;
    font-weight: 900;
    line-height: 1;
  }

  .asa-subtitle {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.5;
    font-weight: 600;
  }

  .asa-top-info-card {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 18px 20px;
    margin-bottom: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .asa-top-info-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asa-top-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background-color: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .asa-top-info-card h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    color: #111827;
  }

  .asa-top-info-card p {
    margin: 4px 0 0;
    color: #6b7280;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;
  }

  .asa-current-pill {
    background-color: #ecfdf5;
    color: #047857;
    border: 1px solid #bbf7d0;
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 900;
    font-size: 14px;
    white-space: nowrap;
  }

  .asa-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
    align-items: stretch;
  }

  .asa-preview-card,
  .asa-form-card {
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    height: 100%;
    box-sizing: border-box;
    min-width: 0;
  }

  .asa-card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    min-height: 70px;
  }

  .asa-green-icon-box {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background-color: #ecfdf5;
    color: #16a34a;
    border: 1px solid #bbf7d0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .asa-green-icon-box span {
    font-size: 32px;
    font-weight: 900;
    line-height: 1;
    transform: translateY(-1px);
  }

  .asa-card-header p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
    font-weight: 900;
  }

  .asa-card-header h1 {
    margin: 6px 0 0;
    color: #111827;
    font-size: 30px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .asa-example-box {
    padding: 16px;
    border-radius: 14px;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    margin-bottom: 16px;
  }

  .asa-example-box h3 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 900;
    color: #111827;
  }

  .asa-example-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
    font-weight: 800;
  }

  .asa-example-row.last {
    border-bottom: none;
    padding-bottom: 0;
  }

  .asa-example-row strong {
    color: #111827;
    font-weight: 900;
    white-space: nowrap;
  }

  .asa-note-box {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background-color: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.45;
  }

  .asa-note-box svg {
    margin-top: 1px;
    flex-shrink: 0;
  }

  .asa-form-card > h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    color: #111827;
  }

  .asa-form-card > p {
    margin: 6px 0 22px;
    color: #6b7280;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;
  }

  .asa-form-group {
    margin-bottom: 18px;
  }

  .asa-form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 900;
    color: #374151;
  }

  .asa-form-group small {
    display: block;
    margin-top: 7px;
    color: #6b7280;
    font-weight: 600;
    font-size: 12px;
    line-height: 1.4;
  }

  .asa-amount-input-wrap,
  .asa-password-wrap {
    position: relative;
  }

  .asa-amount-input-wrap span {
    position: absolute;
    top: 50%;
    left: 13px;
    transform: translateY(-50%);
    color: #6b7280;
    font-weight: 900;
    line-height: 1;
  }

  .asa-password-wrap svg {
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .asa-amount-input-wrap input,
  .asa-password-wrap input {
    width: 100%;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    font-size: 15px;
    outline: none;
    box-sizing: border-box;
    background-color: #ffffff;
    color: #111827;
    min-height: 46px;
  }

  .asa-amount-input-wrap input {
    padding: 12px 12px 12px 34px;
  }

  .asa-password-wrap input {
    padding: 12px 12px 12px 38px;
  }

  .asa-save-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid #2563eb;
    background-color: #2563eb;
    color: #ffffff;
    cursor: pointer;
    font-weight: 900;
    font-size: 15px;
    box-shadow: 0 2px 6px rgba(37,99,235,0.2);
    min-height: 46px;
  }

  @media (max-width: 1000px) {
    .asa-grid {
      grid-template-columns: 1fr;
    }

    .asa-preview-card,
    .asa-form-card {
      height: auto;
    }
  }

  @media (max-width: 768px) {
    .asa-page {
      padding: 12px;
    }

    .asa-toast {
      top: 70px;
    }

    .asa-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      margin-bottom: 18px;
    }

    .asa-back-btn,
    .asa-refresh-btn {
      width: 100%;
    }

    .asa-title {
      font-size: 23px;
      align-items: flex-start;
    }

    .asa-top-info-card {
      padding: 14px;
      align-items: stretch;
      flex-direction: column;
    }

    .asa-top-info-left {
      align-items: flex-start;
    }

    .asa-current-pill {
      width: 100%;
      text-align: center;
    }

    .asa-preview-card,
    .asa-form-card {
      padding: 16px;
      border-radius: 14px;
    }

    .asa-card-header {
      align-items: flex-start;
    }

    .asa-card-header h1 {
      font-size: 24px;
    }

    .asa-green-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 14px;
    }

    .asa-green-icon-box span {
      font-size: 28px;
    }

    .asa-example-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
  }

  @media (max-width: 420px) {
    .asa-page {
      padding: 10px;
    }

    .asa-title {
      font-size: 21px;
    }

    .asa-top-info-left {
      flex-direction: column;
    }

    .asa-card-header {
      flex-direction: column;
      min-height: auto;
    }

    .asa-card-header h1 {
      font-size: 22px;
    }

    .asa-preview-card,
    .asa-form-card {
      padding: 14px;
    }
  }
`;

export default AmountAssignment;