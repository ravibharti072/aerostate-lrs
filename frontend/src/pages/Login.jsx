import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AerostateLogo = () => {
  return (
    <div style={logoStyles.logoWrapper}>
      <div style={logoStyles.blueBox}></div>
      <div style={logoStyles.tealBox}></div>
      <div style={logoStyles.lightBox}></div>
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

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    <div style={styles.page}>
      <div style={styles.leftPanel}>
        <div style={styles.brandBox}>
          <AerostateLogo />

          <h1 style={styles.brandTitle}>Aerostate LRS</h1>

          <p style={styles.brandText}>
            Loyalty reward, customer points, redemption, payout and reporting in one secure platform.
          </p>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={styles.title}>Welcome Back</h2>
            <p style={styles.subtitle}>Login to manage your store operations</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>User ID</label>
              <input
                type="text"
                name="userId"
                value={credentials.userId}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="Enter your user ID"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={styles.input}
              />
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p style={styles.footerText}>
            Secure access for authorized store users only.
          </p>
        </div>
      </div>
    </div>
  );
};

const logoStyles = {
  logoWrapper: {
    position: "relative",
    width: "64px",
    height: "64px",
    marginBottom: "26px",
  },

  blueBox: {
    position: "absolute",
    top: "0",
    left: "0",
    width: "32px",
    height: "32px",
    backgroundColor: "#3b82f6",
    borderRadius: "6px",
    boxShadow: "0 12px 24px rgba(59, 130, 246, 0.45)",
  },

  tealBox: {
    position: "absolute",
    bottom: "0",
    right: "0",
    width: "32px",
    height: "32px",
    backgroundColor: "#14b8a6",
    borderRadius: "6px",
    boxShadow: "0 12px 24px rgba(20, 184, 166, 0.45)",
  },

  lightBox: {
    position: "absolute",
    bottom: "0",
    left: "0",
    width: "32px",
    height: "32px",
    backgroundColor: "#e2e8f0",
    borderRadius: "6px",
    boxShadow: "0 12px 24px rgba(226, 232, 240, 0.2)",
    zIndex: 10,
  },
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    backgroundColor: "#f4f5f7",
    fontFamily: "Arial, sans-serif",
  },

  leftPanel: {
    background: "linear-gradient(135deg, #111827, #1f2937)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "50px",
    color: "white",
  },

  brandBox: {
    maxWidth: "470px",
  },

  brandTitle: {
    fontSize: "42px",
    lineHeight: "1.1",
    margin: "0 0 18px 0",
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: "-0.5px",
  },

  brandText: {
    fontSize: "17px",
    lineHeight: "1.7",
    color: "#ffffff",
    margin: 0,
    maxWidth: "440px",
  },

  rightPanel: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "38px 36px",
    boxShadow: "0 22px 55px rgba(15, 23, 42, 0.12)",
    border: "1px solid #e5e7eb",
  },

  header: {
    marginBottom: "30px",
    textAlign: "left",
  },

  title: {
    margin: "0 0 8px 0",
    fontSize: "30px",
    color: "#000000",
    fontWeight: "800",
    letterSpacing: "-0.4px",
  },

  subtitle: {
    margin: 0,
    fontSize: "15px",
    color: "#000000",
  },

  form: {
    display: "flex",
    flexDirection: "column",
  },

  inputGroup: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#000000",
  },

  input: {
    width: "100%",
    padding: "14px 15px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    color: "#000000",
    backgroundColor: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  },

  errorBox: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
  },

  button: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "800",
    fontSize: "15px",
    marginTop: "4px",
  },

  footerText: {
    marginTop: "24px",
    textAlign: "center",
    color: "#000000",
    fontSize: "13px",
  },
};

export default Login;