import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";
import AdminPage from "./pages/AdminPage";
import BookPage from "./pages/BookPage";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import MyTrips from "./pages/MyTrips";
import RegisterPage from "./pages/RegisterPage";
import SearchPage from "./pages/SearchPage";

// A tiny guard: send guests to the login page.
function Private({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

// Only staff members may open the admin page.
function AdminOnly({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <div className="app">
      <Navbar />

      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<Private><Dashboard /></Private>} />
          <Route path="/search" element={<Private><SearchPage /></Private>} />
          <Route path="/book/:flightId" element={<Private><BookPage /></Private>} />
          <Route path="/trips" element={<Private><MyTrips /></Private>} />
          <Route path="/admin" element={<AdminOnly><AdminPage /></AdminOnly>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">Air Booking &middot; Django + React demo project</footer>
    </div>
  );
}
