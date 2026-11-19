import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import BookFlight from "./pages/BookFlight";
import Dashboard from "./pages/Dashboard";
import FlightList from "./pages/FlightList";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import MyTrips from "./pages/MyTrips";
import Register from "./pages/Register";

function Private({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />;
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <div className="app">
      <Navbar />

      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/" element={<Private><Dashboard /></Private>} />
          <Route path="/search" element={<Private><FlightList /></Private>} />
          <Route path="/book/:flightId" element={<Private><BookFlight /></Private>} />
          <Route path="/trips" element={<Private><MyTrips /></Private>} />
          <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">Air Booking - Django and React project</footer>
    </div>
  );
}
