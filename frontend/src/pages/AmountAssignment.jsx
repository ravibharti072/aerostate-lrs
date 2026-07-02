import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiSave,
  FiLock,
  FiInfo,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiAward,
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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitPointValue = async (event) => {
    event.preventDefault();

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

  const summaryCards = useMemo(
    () => [
      {
        label: "Current Value",
        value: `₹${formatAmount(currentValue)}`,
        subValue: "For 1 point",
        icon: <FiDollarSign />,
        tone: "green",
      },
      {
        label: "100 Points",
        value: `₹${formatAmount(100 * currentValue)}`,
        subValue: "Example payout",
        icon: <FiAward />,
        tone: "blue",
      },
      {
        label: "250 Points",
        value: `₹${formatAmount(250 * currentValue)}`,
        subValue: "Example payout",
        icon: <FiTrendingUp />,
        tone: "purple",
      },
      {
        label: "500 Points",
        value: `₹${formatAmount(500 * currentValue)}`,
        subValue: "Example payout",
        icon: <FiCreditCard />,
        tone: "orange",
      },
    ],
    [currentValue]
  );

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

        <section className="asa-header-card">
          <div className="asa-header-left">
            <button type="button" onClick={handleBack} className="asa-back-btn">
              <FiArrowLeft />
              Back
            </button>

            <div className="asa-title-icon">
              <span>₹</span>
            </div>

            <div className="asa-title-wrap">
              <h1 className="asa-title">Amount Assignment</h1>
              <p className="asa-subtitle">
                Set the payout value of each reward point for redemption
                calculation.
              </p>
            </div>
          </div>
        </section>

        <section className="asa-summary-grid">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              subValue={card.subValue}
              tone={card.tone}
            />
          ))}
        </section>

        <section className="asa-info-card">
          <div className="asa-info-left">
            <div className="asa-info-icon">
              <FiInfo />
            </div>

            <div>
              <h2>Payout Conversion Setting</h2>
              <p>
                This value decides how much rupee amount one reward point is
                worth during payout.
              </p>
            </div>
          </div>

          <span className="asa-current-pill">
            1 Point = ₹{formatAmount(currentValue)}
          </span>
        </section>

        <section className="asa-main-grid">
          <div className="asa-card">
            <div className="asa-card-head">
              <div>
                <h2 className="asa-card-title">Current Assigned Amount</h2>
                <p className="asa-card-subtitle">
                  Preview payout conversion before changing the amount.
                </p>
              </div>

              <span className="asa-record-badge">
                ₹{formatAmount(currentValue)}
              </span>
            </div>

            <div className="asa-card-body">
              <div className="asa-current-box">
                <div className="asa-rupee-icon">
                  <span>₹</span>
                </div>

                <div>
                  <p>Current Assigned Amount</p>
                  <h3>1 Point = ₹{formatAmount(currentValue)}</h3>
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
                <FiCheckCircle />
                <span>
                  This amount will be used in Payout / Redemption calculation.
                </span>
              </div>
            </div>
          </div>

          <div className="asa-card">
            <div className="asa-card-head">
              <div>
                <h2 className="asa-card-title">Update Amount Per Point</h2>
                <p className="asa-card-subtitle">
                  Enter new rupee value and confirm with your login password.
                </p>
              </div>
            </div>

            <div className="asa-card-body">
              <form onSubmit={submitPointValue} className="asa-form">
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
                    <FiLock />

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
                  <FiSave />
                  {saving ? "Updating..." : "Update Amount"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({ icon, label, value, subValue, tone = "blue" }) {
  return (
    <div className="asa-summary-card">
      <div className={`asa-summary-icon ${tone}`}>{icon}</div>

      <div>
        <p className="asa-summary-label">{label}</p>
        <h3 className="asa-summary-value">{value}</h3>
        <span className="asa-summary-subvalue">{subValue}</span>
      </div>
    </div>
  );
}

const amountAssignmentCss = `
  .asa-page {
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .asa-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 14px 22px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 900;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.22);
    max-width: min(460px, calc(100vw - 28px));
    min-width: min(280px, calc(100vw - 28px));
    text-align: center;
  }

  .asa-toast.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  .asa-toast.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .asa-header-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asa-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .asa-back-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #2563eb;
    height: 42px;
    padding: 0 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .asa-back-btn:hover {
    background: #dbeafe;
  }

  .asa-title-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: #ecfdf5;
    color: #059669;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .asa-title-icon span {
    font-size: 28px;
    font-weight: 950;
    line-height: 1;
  }

  .asa-title-wrap {
    min-width: 0;
  }

  .asa-title {
    margin: 0;
    font-size: 26px;
    font-weight: 950;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  .asa-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asa-save-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .asa-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .asa-summary-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 0;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .asa-summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asa-summary-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .asa-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .asa-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .asa-summary-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .asa-summary-label {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
  }

  .asa-summary-value {
    margin: 6px 0 0;
    color: #0f172a;
    font-size: 24px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .asa-summary-subvalue {
    display: block;
    margin-top: 6px;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  .asa-info-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 18px 20px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .asa-info-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .asa-info-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-size: 21px;
    flex: 0 0 auto;
  }

  .asa-info-card h2 {
    margin: 0;
    color: #0f172a;
    font-size: 17px;
    font-weight: 950;
  }

  .asa-info-card p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asa-current-pill,
  .asa-record-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #bbf7d0;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 950;
    white-space: nowrap;
  }

  .asa-main-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    align-items: stretch;
  }

  .asa-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
    min-width: 0;
  }

  .asa-card-head {
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    background: #ffffff;
  }

  .asa-card-title {
    margin: 0;
    color: #0f172a;
    font-size: 19px;
    font-weight: 950;
  }

  .asa-card-subtitle {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asa-card-body {
    padding: 20px;
    background: #f8fafc;
  }

  .asa-current-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 16px;
  }

  .asa-rupee-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #bbf7d0;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .asa-rupee-icon span {
    font-size: 34px;
    font-weight: 950;
    line-height: 1;
  }

  .asa-current-box p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 950;
  }

  .asa-current-box h3 {
    margin: 7px 0 0;
    color: #0f172a;
    font-size: 30px;
    font-weight: 950;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }

  .asa-example-box {
    padding: 16px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    margin-bottom: 16px;
  }

  .asa-example-box h3 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 950;
    color: #0f172a;
  }

  .asa-example-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    font-weight: 850;
  }

  .asa-example-row.last {
    border-bottom: none;
    padding-bottom: 0;
  }

  .asa-example-row strong {
    color: #0f172a;
    font-weight: 950;
    white-space: nowrap;
  }

  .asa-note-box {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 13px;
    border-radius: 14px;
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.45;
  }

  .asa-note-box svg {
    margin-top: 1px;
    flex: 0 0 auto;
  }

  .asa-form {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 18px;
  }

  .asa-form-group {
    margin-bottom: 18px;
  }

  .asa-form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 950;
    color: #334155;
  }

  .asa-form-group small {
    display: block;
    margin-top: 8px;
    color: #64748b;
    font-weight: 700;
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
    color: #64748b;
    font-weight: 950;
    line-height: 1;
  }

  .asa-password-wrap svg {
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .asa-amount-input-wrap input,
  .asa-password-wrap input {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    background: #ffffff;
    color: #0f172a;
    font-weight: 750;
  }

  .asa-amount-input-wrap input {
    padding: 0 12px 0 34px;
  }

  .asa-password-wrap input {
    padding: 0 12px 0 38px;
  }

  .asa-amount-input-wrap input:focus,
  .asa-password-wrap input:focus {
    border-color: #2563eb;
  }

  .asa-save-btn {
    width: 100%;
    border: none;
    background: #2563eb;
    color: #ffffff;
    height: 46px;
    padding: 0 18px;
    border-radius: 13px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
  }

  @media (max-width: 1200px) {
    .asa-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .asa-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .asa-page {
      padding: 12px;
    }

    .asa-toast {
      top: 70px;
    }

    .asa-header-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asa-header-left {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .asa-back-btn {
      width: 100%;
    }

    .asa-title-icon {
      width: 44px;
      height: 44px;
    }

    .asa-title-icon span {
      font-size: 25px;
    }

    .asa-title {
      font-size: 23px;
    }

    .asa-summary-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asa-summary-value {
      font-size: 23px;
    }

    .asa-info-card {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
    }

    .asa-info-left {
      align-items: flex-start;
    }

    .asa-current-pill {
      width: 100%;
    }

    .asa-card-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .asa-card-body {
      padding: 12px;
    }

    .asa-current-box {
      align-items: flex-start;
    }

    .asa-current-box h3 {
      font-size: 24px;
    }

    .asa-example-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }

    .asa-form {
      padding: 14px;
    }
  }

  @media (max-width: 420px) {
    .asa-page {
      padding: 10px;
    }

    .asa-header-left {
      flex-direction: column;
    }

    .asa-title {
      font-size: 22px;
    }

    .asa-info-left,
    .asa-current-box {
      flex-direction: column;
    }

    .asa-current-box h3 {
      font-size: 22px;
    }
  }
`;

export default AmountAssignment;