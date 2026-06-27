import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const normalizeRole = (role) => {
  if (!role) return "";

  const value = String(role).toLowerCase().trim();

  if (
    value === "superadmin" ||
    value === "super-admin" ||
    value === "super_admin"
  ) {
    return "superadmin";
  }

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return value;
};

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          color: "#2563eb",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = normalizeRole(user.role);
  const allowed = allowedRoles.map(normalizeRole);

  if (allowed.length > 0 && !allowed.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}