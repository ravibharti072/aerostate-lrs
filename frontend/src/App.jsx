import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

// Dashboard
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));

// Merchant / Staff Modules
const TransactionHistory = lazy(() => import("./pages/transactionhistory/TransactionHistory"));
const ItemMaster = lazy(() => import("./pages/itemmaster/ItemMaster"));
const CustomerDirectory = lazy(() => import("./pages/customerdirectory/CustomerDirectory"));
const Payout = lazy(() => import("./pages/payout/Payout"));
const Leaderboard = lazy(() => import("./pages/leaderboard/Leaderboard"));
const WhatsApp = lazy(() => import("./pages/whatsapp/WhatsApp"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const RewardEntry = lazy(() => import("./pages/rewardentry/RewardEntry"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const AmountAssignment = lazy(() => import("./pages/amountassignment/AmountAssignment"));

// General Auth & Utility Pages (Updated Login path to new folder)
const Login = lazy(() => import("./pages/login/Login"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

// SuperAdmin Module Pages
const SuperAdminLogin = lazy(() => import("./pages/superadmin/login/SuperAdminLogin"));
const SuperAdmin = lazy(() => import("./pages/superadmin/SuperAdmin"));
const OnboardClient = lazy(() => import("./pages/superadmin/onboardclient/OnboardClient"));
const ClientDirectory = lazy(() => import("./pages/superadmin/clientdirectory/ClientDirectory"));
const SuperAdminProfile = lazy(() => import("./pages/superadmin/profile/SuperAdminProfile"));
const Subscriptions = lazy(() => import("./pages/superadmin/subscriptions/Subscriptions"));

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
          {/* General User Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Dedicated SuperAdmin Portal Routes */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
          <Route path="/superadmin/onboard-client" element={<OnboardClient />} />
          <Route path="/superadmin/client-directory" element={<ClientDirectory />} />
          <Route path="/superadmin/subscriptions" element={<Subscriptions />} />
          <Route path="/superadmin/profile" element={<SuperAdminProfile />} />

          {/* Backward compatibility aliases */}
          <Route path="/superadmin/create-client" element={<Navigate to="/superadmin/onboard-client" replace />} />
          <Route path="/superadmin/credentials" element={<Navigate to="/superadmin/profile" replace />} />

          {/* Protected Merchant / Staff Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["SuperAdmin", "Admin", "Staff"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            <Route path="/item-master" element={<ItemMaster />} />
            <Route path="/customer-directory" element={<CustomerDirectory />} />
            <Route path="/redemption" element={<Payout />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reward-entry" element={<RewardEntry />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/amount-assignment" element={<AmountAssignment />} />
          </Route>

          {/* Root Path Handler */}
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

          {/* Catch-all */}
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