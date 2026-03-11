import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ScrumMasterDashboard from "./pages/ScrumMasterDashboard";

import { auth, UserRole, STORAGE_KEYS } from "@/lib/localStorage";


// Protected Route Component
const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: UserRole;
}) => {

  // Get logged-in user
  const user = auth.getCurrentUser(role);

  // If user not logged in → redirect to login
  if (!user) {
    return <Navigate to={role ? `/?role=${role}` : "/"} replace />;
  }

  // If role mismatch → redirect to home
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // Lock this browser tab to the user's role
  sessionStorage.setItem(STORAGE_KEYS.ACTIVE_TAB_ROLE, user.role);

  return <>{children}</>;
};


const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Common routes (Employee + Manager) */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        {/* Admin route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Art Manager route */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute role="art-manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Scrum Master route (NEW) */}
        <Route
          path="/scrum-master"
          element={
            <ProtectedRoute role="employee">
              <ScrumMasterDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      <Toaster />
    </BrowserRouter>
  );
};

export default App;