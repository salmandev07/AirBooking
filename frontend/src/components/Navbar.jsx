import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to={isAdmin ? "/admin" : "/"} className="brand">
        <span className="brand-dot" />
        Air Booking
      </Link>

      <nav className="nav-links">
        {isAdmin ? (
          <NavLink to="/admin">Admin</NavLink>
        ) : (
          isLoggedIn && (
            <>
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/search">Search Flights</NavLink>
              <NavLink to="/trips">My Trips</NavLink>
            </>
          )
        )}
      </nav>

      <div className="nav-auth">
        {isLoggedIn ? (
          <>
            {!isAdmin && (
              <span className="nav-user">
                {user.username}
                <span className="badge badge-green">{user.approval_status}</span>
              </span>
            )}
            <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/admin/login" className="btn btn-ghost">Admin login</Link>
            <Link to="/login" className="btn btn-ghost">User login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
