import { useCallback, useEffect, useState } from "react";

import api, { errorMessage } from "../api";
import StatusBadge from "../components/StatusBadge";

const FLIGHT_STATUS_OPTIONS = [
  "On Time",
  "Delayed",
  "Boarding",
  "Departed",
  "Landed",
  "Cancelled",
];

const EMPTY_FLIGHT = {
  flight_number: "",
  airline: "",
  origin: "",
  origin_code: "",
  destination: "",
  destination_code: "",
  departure_time: "",
  arrival_time: "",
  price: "",
  total_seats: 180,
  status: "On Time",
};

export default function AdminDashboard() {
  const [tab, setTab] = useState("users");

  return (
    <div>
      <div className="page-head">
        <h1>Admin Dashboard</h1>
        <div className="tabs">
          <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
            Users
          </button>
          <button className={`tab ${tab === "flights" ? "active" : ""}`} onClick={() => setTab("flights")}>
            Flights
          </button>
          <button className={`tab ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
            Statistics
          </button>
        </div>
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "flights" && <FlightsTab />}
      {tab === "stats" && <StatsTab />}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    const query = filter ? `?status=${filter}` : "";
    api
      .get(`/admin/users/${query}`)
      .then((res) => setUsers(res.data.results || res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id, action) {
    setNotice("");
    setError("");
    try {
      const { data } = await api.post(`/admin/users/${id}/${action}/`);
      setNotice(`${data.username} is now ${data.approval_status}. Email queued via Celery.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="filter-bar">
        {["pending", "approved", "rejected", ""].map((value) => (
          <button
            key={value || "all"}
            className={`chip ${filter === value ? "active" : ""}`}
            onClick={() => setFilter(value)}
          >
            {value || "all"}
          </button>
        ))}
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan="6" className="muted center">No users in this list.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.username}</strong>
                  <div className="muted small">{u.first_name} {u.last_name}</div>
                </td>
                <td>{u.email}</td>
                <td>{u.phone || "-"}</td>
                <td><StatusBadge status={u.approval_status} /></td>
                <td className="small">{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  {u.approval_status === "pending" ? (
                    <div className="row tight">
                      <button className="btn btn-sm btn-primary" onClick={() => decide(u.id, "approve")}>
                        Approve
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => decide(u.id, "reject")}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="muted small">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlightsTab() {
  const [flights, setFlights] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(EMPTY_FLIGHT);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api
      .get("/admin/flights/")
      .then((res) => setFlights(res.data.results || res.data))
      .catch((err) => setError(errorMessage(err)));

    api
      .get("/admin/flights/stats/")
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  async function createFlight(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api.post("/admin/flights/", {
        ...form,
        price: Number(form.price),
        total_seats: Number(form.total_seats),
      });
      setNotice(`Flight ${form.flight_number} created.`);
      setForm(EMPTY_FLIGHT);
      setShowForm(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function changeStatus(id, status) {
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`/admin/flights/${id}/status/`, { status });
      setNotice(`${data.flight_number} is now ${data.status}.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="mini-stats">
          {stats && (
            <>
              <span>{stats.total_flights} flights</span>
              <span>{stats.booked_seats}/{stats.total_seats} seats sold</span>
              <span>{stats.total_bookings} bookings</span>
            </>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close form" : "New flight"}
        </button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={createFlight}>
          <h2>New flight</h2>
          <div className="row">
            <label>
              Flight number
              <input value={form.flight_number} onChange={update("flight_number")} placeholder="AI-999" required />
            </label>
            <label>
              Airline
              <input value={form.airline} onChange={update("airline")} placeholder="Air India" required />
            </label>
          </div>
          <div className="row">
            <label>
              Origin
              <input value={form.origin} onChange={update("origin")} placeholder="Delhi - Indira Gandhi Intl" required />
            </label>
            <label>
              Origin code
              <input value={form.origin_code} onChange={update("origin_code")} maxLength="3" placeholder="DEL" required />
            </label>
          </div>
          <div className="row">
            <label>
              Destination
              <input value={form.destination} onChange={update("destination")} placeholder="Mumbai - Chhatrapati Shivaji" required />
            </label>
            <label>
              Destination code
              <input value={form.destination_code} onChange={update("destination_code")} maxLength="3" placeholder="BOM" required />
            </label>
          </div>
          <div className="row">
            <label>
              Departure
              <input type="datetime-local" value={form.departure_time} onChange={update("departure_time")} placeholder="2026-11-25T08:00" required />
            </label>
            <label>
              Arrival
              <input type="datetime-local" value={form.arrival_time} onChange={update("arrival_time")} placeholder="2026-11-25T09:30" required />
            </label>
          </div>
          <div className="row">
            <label>
              Price (INR)
              <input type="number" min="0" value={form.price} onChange={update("price")} placeholder="5000" required />
            </label>
            <label>
              Total seats
              <input type="number" min="1" value={form.total_seats} onChange={update("total_seats")} placeholder="180" required />
            </label>
          </div>
          <button className="btn btn-primary">Create flight</button>
        </form>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Price</th>
              <th>Seats left</th>
              <th>Status</th>
              <th>Update status</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => (
              <tr key={f.id}>
                <td>
                  <strong>{f.flight_number}</strong>
                  <div className="muted small">{f.airline}</div>
                </td>
                <td>{f.origin_code} to {f.destination_code}</td>
                <td className="small">{new Date(f.departure_time).toLocaleString()}</td>
                <td>Rs. {Number(f.price).toLocaleString()}</td>
                <td className={f.available_seats < 20 ? "low-text" : ""}>{f.available_seats}</td>
                <td><StatusBadge status={f.status} /></td>
                <td>
                  <select
                    value={f.status}
                    onChange={(e) => changeStatus(f.id, e.target.value)}
                    className="inline-select"
                  >
                    {FLIGHT_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/flights/stats/")
      .then((res) => setStats(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <div className="page-loading">Loading statistics...</div>;

  const occupancy =
    stats.total_seats > 0 ? (stats.booked_seats / stats.total_seats) * 100 : 0;
  // Below 1% a whole number reads as 0%, so keep one decimal.
  const occupancyLabel =
    occupancy > 0 && occupancy < 1 ? occupancy.toFixed(1) : Math.round(occupancy);

  return (
    <div className="stat-grid">
      <div className="card stat">
        <span className="stat-num">{stats.total_flights}</span>
        <span className="stat-label">Flights</span>
      </div>
      <div className="card stat">
        <span className="stat-num">{stats.total_bookings}</span>
        <span className="stat-label">Bookings</span>
      </div>
      <div className="card stat">
        <span className="stat-num">{stats.confirmed_bookings}</span>
        <span className="stat-label">Confirmed</span>
      </div>
      <div className="card stat">
        <span className="stat-num">{stats.pending_users}</span>
        <span className="stat-label">Pending users</span>
      </div>
      <div className="card stat">
        <span className="stat-num">{occupancyLabel}%</span>
        <span className="stat-label">Seat occupancy</span>
      </div>
      <div className="card stat">
        <span className="stat-num">{stats.booked_seats}</span>
        <span className="stat-label">Seats sold</span>
      </div>
    </div>
  );
}
