import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ScrumMasterDashboard from "./pages/ScrumMasterDashboard";


const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Common routes (Employee + Manager) */}
        {/* <Route
          path="/home"
          element={
              <Home />
          }
        /> */}

        <Route
          path="/leaderboard"
          element={
              <Leaderboard />
          }
        />

        {/* Admin route */}
        <Route
          path="/admin"
          element={
              <AdminDashboard />
          }
        />

        {/* Art Manager route */}
        <Route
          path="/manager"
          element={
              <ManagerDashboard />
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