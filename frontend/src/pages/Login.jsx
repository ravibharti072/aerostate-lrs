import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const AerostateLogo = () => {
  return (
    <div className="asl-logo-wrapper" aria-hidden="true">
      <div className="asl-logo-box asl-logo-blue" />
      <div className="asl-logo-box asl-logo-light" />
      <div className="asl-logo-box asl-logo-teal" />
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [credentials, setCredentials] = useState({
    userId: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const username = credentials.userId.trim();

    if (!username || !credentials.password) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      await login(username, credentials.password);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login Error:", err);

      if (err.code === "ECONNABORTED") {
        setError("Login request timeout. Please check backend server.");
      } else if (err.response?.status === 401) {
        setError("Invalid username or password.");
      } else if (err.response?.status === 403) {
        setError(
          err.response?.data?.detail ||
            "This user is not allowed to login here."
        );
      } else if (err.response?.status === 404) {
        setError("Login API not found. Please check backend URL.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Cannot connect to backend. Please check server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{loginCss}</style>

      <main className="asl-login-page">
        <section className="asl-brand-panel">
          <div className="asl-brand-content">
            <div className="asl-brand-main">
              <AerostateLogo />

              <div>
                <p className="asl-brand-kicker">AeroState Platform</p>
                <h1>Aerostate LRS</h1>

                <p className="asl-brand-text">
                  Loyalty reward, customer points, redemption, payout,
                  WhatsApp messaging, and reporting in one secure platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="asl-form-panel">
          <div className="asl-login-card">
            <div className="asl-card-logo-row">
              <div className="asl-card-logo">
                <AerostateLogo />
              </div>

              <div>
                <p>Aerostate LRS</p>
                <span>Loyalty Reward System</span>
              </div>
            </div>

            <div className="asl-login-header">
              <h2>Welcome Back</h2>
              <p>Login to manage your store operations.</p>
            </div>

            <form onSubmit={handleSubmit} className="asl-login-form">
              <div className="asl-field-group">
                <label htmlFor="userId">User ID</label>

                <div className="asl-input-wrap">
                  <FiUser />

                  <input
                    id="userId"
                    type="text"
                    name="userId"
                    value={credentials.userId}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    placeholder="Enter your user ID"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="asl-field-group">
                <label htmlFor="password">Password</label>

                <div className="asl-input-wrap">
                  <FiLock />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="asl-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {error && <div className="asl-error-box">{error}</div>}

              <button
                type="submit"
                className="asl-login-btn"
                disabled={loading}
              >
                <span>{loading ? "Logging in..." : "Login"}</span>
                {!loading && <FiArrowRight />}
              </button>
            </form>

            <div className="asl-secure-note">
              <FiShield />
              <span>Secure access for authorized store users only.</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

const loginCss = `
  * {
    box-sizing: border-box;
  }

  .asl-login-page {
    width: 100%;
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(420px, 0.95fr) minmax(420px, 1.05fr);
    background: #f8fafc;
    color: #0f172a;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    overflow-x: hidden;
  }

  .asl-brand-panel {
    min-height: 100vh;
    background:
      radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.28), transparent 30%),
      radial-gradient(circle at 80% 75%, rgba(20, 184, 166, 0.24), transparent 34%),
      linear-gradient(135deg, #0f172a 0%, #111827 48%, #1e293b 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56px;
    position: relative;
    overflow: hidden;
  }

  .asl-brand-panel::before {
    content: "";
    position: absolute;
    inset: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    pointer-events: none;
  }

  .asl-brand-content {
    width: 100%;
    max-width: 560px;
    position: relative;
    z-index: 1;
  }

  .asl-brand-main {
    display: grid;
    gap: 20px;
  }

  .asl-logo-wrapper {
    position: relative;
    width: 62px;
    height: 62px;
    flex: 0 0 auto;
  }

  .asl-logo-box {
    position: absolute;
    width: 31px;
    height: 31px;
    border-radius: 9px;
  }

  .asl-logo-blue {
    top: 0;
    left: 0;
    background: #3b82f6;
    box-shadow: 0 14px 30px rgba(59, 130, 246, 0.38);
  }

  .asl-logo-light {
    bottom: 0;
    left: 0;
    background: #e2e8f0;
    box-shadow: 0 14px 30px rgba(226, 232, 240, 0.18);
    z-index: 2;
  }

  .asl-logo-teal {
    bottom: 0;
    right: 0;
    background: #14b8a6;
    box-shadow: 0 14px 30px rgba(20, 184, 166, 0.35);
  }

  .asl-brand-kicker {
    margin: 0 0 9px;
    color: #93c5fd;
    font-size: 13px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .asl-brand-content h1 {
    margin: 0;
    color: #ffffff;
    font-size: 48px;
    line-height: 1.05;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .asl-brand-text {
    max-width: 540px;
    margin: 18px 0 0;
    color: #e5e7eb;
    font-size: 17px;
    line-height: 1.7;
    font-weight: 750;
  }

  .asl-form-panel {
    min-height: 100vh;
    background:
      radial-gradient(circle at 30% 20%, rgba(37, 99, 235, 0.08), transparent 28%),
      radial-gradient(circle at 82% 80%, rgba(20, 184, 166, 0.08), transparent 28%),
      #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .asl-login-card {
    width: 100%;
    max-width: 455px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    padding: 34px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.13);
  }

  .asl-card-logo-row {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-bottom: 28px;
  }

  .asl-card-logo {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .asl-card-logo .asl-logo-wrapper {
    width: 34px;
    height: 34px;
    margin: 0;
  }

  .asl-card-logo .asl-logo-box {
    width: 17px;
    height: 17px;
    border-radius: 5px;
  }

  .asl-card-logo-row p {
    margin: 0;
    color: #0f172a;
    font-size: 17px;
    font-weight: 950;
    letter-spacing: -0.02em;
  }

  .asl-card-logo-row span {
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }

  .asl-login-header {
    margin-bottom: 24px;
  }

  .asl-login-header h2 {
    margin: 0;
    color: #0f172a;
    font-size: 30px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .asl-login-header p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
    font-weight: 750;
    line-height: 1.45;
  }

  .asl-login-form {
    display: grid;
    gap: 16px;
  }

  .asl-field-group {
    display: grid;
    gap: 8px;
  }

  .asl-field-group label {
    color: #334155;
    font-size: 13px;
    font-weight: 950;
  }

  .asl-input-wrap {
    position: relative;
  }

  .asl-input-wrap > svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 18px;
    pointer-events: none;
  }

  .asl-input-wrap input {
    width: 100%;
    height: 48px;
    border: 1px solid #cbd5e1;
    border-radius: 13px;
    padding: 0 46px 0 42px;
    outline: none;
    background: #ffffff;
    color: #0f172a;
    font-size: 14px;
    font-weight: 800;
    transition: 0.15s ease;
  }

  .asl-input-wrap input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.10);
  }

  .asl-input-wrap input:disabled {
    background: #f8fafc;
    cursor: not-allowed;
  }

  .asl-input-wrap input::placeholder {
    color: #94a3b8;
    font-weight: 700;
  }

  .asl-password-toggle {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    display: grid;
    place-items: center;
  }

  .asl-password-toggle:hover {
    background: #f1f5f9;
  }

  .asl-error-box {
    background: #fee2e2;
    color: #991b1b;
    padding: 12px 13px;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 850;
    border: 1px solid #fecaca;
    line-height: 1.45;
  }

  .asl-login-btn {
    width: 100%;
    height: 48px;
    border: none;
    border-radius: 13px;
    background: #2563eb;
    color: #ffffff;
    font-size: 15px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    box-shadow: 0 14px 28px rgba(37, 99, 235, 0.24);
    transition: 0.16s ease;
  }

  .asl-login-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(37, 99, 235, 0.28);
  }

  .asl-login-btn:disabled {
    opacity: 0.68;
    cursor: not-allowed;
    transform: none;
  }

  .asl-secure-note {
    margin-top: 20px;
    border-radius: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.45;
  }

  .asl-secure-note svg {
    color: #2563eb;
    flex: 0 0 auto;
    margin-top: 1px;
  }

  @media (max-width: 1100px) {
    .asl-login-page {
      grid-template-columns: 1fr;
    }

    .asl-brand-panel {
      min-height: auto;
      padding: 42px 24px;
    }

    .asl-brand-panel::before {
      inset: 16px;
      border-radius: 22px;
    }

    .asl-brand-content {
      max-width: 760px;
    }

    .asl-form-panel {
      min-height: auto;
      padding: 34px 20px;
    }
  }

  @media (max-width: 768px) {
    .asl-brand-panel {
      padding: 34px 16px;
    }

    .asl-brand-content h1 {
      font-size: 36px;
    }

    .asl-brand-text {
      font-size: 15px;
    }

    .asl-form-panel {
      padding: 20px 12px;
    }

    .asl-login-card {
      max-width: none;
      padding: 24px;
      border-radius: 20px;
    }

    .asl-login-header h2 {
      font-size: 26px;
    }
  }

  @media (max-width: 420px) {
    .asl-brand-panel {
      padding: 28px 12px;
    }

    .asl-logo-wrapper {
      width: 54px;
      height: 54px;
    }

    .asl-logo-box {
      width: 27px;
      height: 27px;
    }

    .asl-brand-content h1 {
      font-size: 31px;
    }

    .asl-login-card {
      padding: 20px;
    }

    .asl-card-logo-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

export default Login;