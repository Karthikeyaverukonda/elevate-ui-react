import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import { auth, UserRole, STORAGE_KEYS } from "@/lib/localStorage"; 

// The magic happens here: Enforces role checks AND locks the browser tab to the context
const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: UserRole }) => {
  // Pass the target role so the auth engine fetches ONLY that specific role's token
  const user = auth.getCurrentUser(role);
  
  if (!user) return <Navigate to={role ? `/?role=${role}` : "/"} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  
  // LOCK TAB: Tell this specific browser tab it belongs to this role securely
  sessionStorage.setItem(STORAGE_KEYS.ACTIVE_TAB_ROLE, user.role);

  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* We leave role flexible here so Employee or Managers can see their version of home */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        
        {/* Strictly enforce role barriers for Management and Admin consoles */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/manager" element={<ProtectedRoute role="art-manager"><ManagerDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
};

export default App;