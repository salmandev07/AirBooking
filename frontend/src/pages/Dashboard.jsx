import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api, { errorMessage } from "../api";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

// Small welcome screen with the user's booking numbers.
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/bookings/stats/")
      .then((res) => setStats(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Hello, {user.first_name || user.username} 👋</h1>
          <p className="muted">
            Account status: <StatusBadge status={user.approval_status} /> Ready to fly?
          </p>
        </div>
        <Link to="/search" className="btn btn-primary">Search flights</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <div className="card stat">
          <span className="stat-num">{stats ? stats.total_bookings : "-"}</span>
          <span className="stat-label">Total bookings</span>
        </div>
        <div className="card stat">
          <span className="stat-num">{stats ? stats.upcoming : "-"}</span>
          <span className="stat-label">Upcoming trips</span>
        </div>
        <div className="card stat">
          <span className="stat-num">{stats ? stats.cancelled : "-"}</span>
          <span className="stat-label">Cancelled</span>
        </div>
      </div>

      <div className="card">
        <h2>How this works</h2>
        <ol className="steps">
          <li>Search flights by airport, date and price.</li>
          <li>Pick a flight and choose how many seats you want.</li>
          <li>Pay (simulated) and get an instant booking reference.</li>
          <li>Track everything under <Link to="/trips">My Trips</Link>.</li>
        </ol>
      </div>
    </div>
  );
}
