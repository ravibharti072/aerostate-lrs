import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <AppContent />
      </Suspense>
    </BrowserRouter>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        width: "100%",
        display: "block",
      }}
    >
      <main style={{ width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/superadmin" element={<SuperAdmin />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin", "Admin", "Staff"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function PageLoader() {
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

export default App;