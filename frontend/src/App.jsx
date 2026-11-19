import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";

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
import VerifyEmail from "./pages/VerifyEmail";

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

function AppLayout() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
      <footer className="footer">Air Booking - Django and React project</footer>
    </div>
  );
}

// Public pages use a split screen: brand panel on the left, form on the right.
function AuthLayout() {
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-brand">
          <span className="brand-dot" />
          Air Booking
        </div>

        <div className="auth-hero-body">
          <p className="auth-kicker">Flight booking platform</p>
          <h1>Search flights. Book seats. Track trips.</h1>

          <div className="auth-route">
            <span className="route-code">DEL</span>
            <span className="route-dash" />
            <span className="route-code">BOM</span>
          </div>

          <ul className="auth-points">
            <li>Live flight status updates</li>
            <li>Seat-safe booking and cancellation</li>
            <li>Email notifications for every step</li>
          </ul>
        </div>

        <p className="auth-foot">Django REST Framework + React</p>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand">
          <span className="brand-dot" />
          Air Booking
        </div>
        <Outlet />
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/search" element={<Private><FlightList /></Private>} />
        <Route path="/book/:flightId" element={<Private><BookFlight /></Private>} />
        <Route path="/trips" element={<Private><MyTrips /></Private>} />
        <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
