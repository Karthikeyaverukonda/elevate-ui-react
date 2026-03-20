import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Login from "./pages/Login";

import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeHome from "./pages/EmployeeHome";
import Nominations from "./pages/Nominations";
import { TokenRefreshStorage } from "@/lib/ApiStorage";
import LeaderBoard from "./pages/LeaderBoard";

const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 15 minutes

const App = () => {
  useEffect(() => {
    if (!localStorage.getItem('access_token')) return;
    const interval = setInterval(() => {
      TokenRefreshStorage.refreshToken();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Common routes (Employee + Manager) */}
        <Route path="/home" element={<EmployeeHome />} />
        <Route path="/nominations" element={<Nominations />} />



        {/* Admin route */} 
        { <Route
          path="/admin"
          element={
              <AdminDashboard />
          }
        /> }

        {/* Art Manager route */}
        <Route
          path="/manager"
          element={
              <ManagerDashboard />
          }
        />
        {/* Leaderboard route */}
        <Route
          path="/leaderboard"
          element={
              <LeaderBoard />
          }
        />

        {/* Scrum Master route (NEW) */}
        {/* <Route
          path="/scrum-master"
          element={
              <ScrumMasterDashboard />
          }
        /> */}

        {/* Catch all unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      <Toaster />
    </BrowserRouter>
  );
};

export default App;