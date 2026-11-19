import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api, { errorMessage } from "../api";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function BookFlight() {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [flight, setFlight] = useState(null);
  const [live, setLive] = useState(null);
  const [seats, setSeats] = useState(1);
  const [name, setName] = useState(user.username);
  const [email, setEmail] = useState(user.email || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    api
      .get(`/flights/${flightId}/`)
      .then((res) => setFlight(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [flightId]);

  // Poll the status endpoint so the badge keeps updating on this page.
  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const { data } = await api.get(`/flights/${flightId}/status/`);
        if (!cancelled) setLive(data);
      } catch {
        // Status is optional, ignore failures.
      }
    }

    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [flightId]);

  if (error && !flight) {
    return (
      <div className="card">
        <div className="alert alert-error">{error}</div>
        <Link to="/search" className="btn btn-outline">Back to search</Link>
      </div>
    );
  }

  if (!flight) return <div className="page-loading">Loading flight...</div>;

  if (confirmed) {
    return (
      <div className="card auth-card">
        <h1>Booking confirmed</h1>
        <div className="alert alert-success">{confirmed.message}</div>

        <div className="receipt">
          <div><span>Reference</span><strong>{confirmed.reference}</strong></div>
          <div><span>Flight</span><strong>{confirmed.flight.flight_number}</strong></div>
          <div>
            <span>Route</span>
            <strong>{confirmed.flight.origin_code} to {confirmed.flight.destination_code}</strong>
          </div>
          <div><span>Passenger</span><strong>{confirmed.passenger_name}</strong></div>
          <div><span>Seats</span><strong>{confirmed.seats}</strong></div>
          <div>
            <span>Total paid</span>
            <strong>Rs. {Number(confirmed.total_amount).toLocaleString()}</strong>
          </div>
          <div><span>Payment</span><strong>{confirmed.payment_status}</strong></div>
        </div>

        <div className="row">
          <button className="btn btn-primary" onClick={() => navigate("/trips")}>
            View my trips
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/search")}>
            Book another flight
          </button>
        </div>
      </div>
    );
  }

  const total = Number(flight.price) * seats;

  async function handleBooking(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { data } = await api.post("/bookings/", {
        flight_id: flight.id,
        seats,
        passenger_name: name,
        passenger_email: email,
      });
      setConfirmed(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link to="/search" className="back-link">Back to search</Link>

      <div className="card">
        <div className="flight-top">
          <strong>{flight.flight_number}</strong>
          <span className="muted">{flight.airline}</span>
          <StatusBadge status={live ? live.status : flight.status} />
          {live && <span className="muted small">source: {live.source}</span>}
        </div>

        <div className="flight-route">
          <div>
            <span className="code">{flight.origin_code}</span>
            <span className="muted">{flight.origin}</span>
            <span className="muted">{new Date(flight.departure_time).toLocaleString()}</span>
          </div>
          <div className="route-line">to</div>
          <div>
            <span className="code">{flight.destination_code}</span>
            <span className="muted">{flight.destination}</span>
            <span className="muted">{new Date(flight.arrival_time).toLocaleString()}</span>
          </div>
        </div>

        <div className="flight-bottom">
          <span className="price">Rs. {Number(flight.price).toLocaleString()} / seat</span>
          <span className={`seats ${flight.available_seats < 20 ? "low" : ""}`}>
            {flight.available_seats} seats available
          </span>
        </div>
      </div>

      <form className="card" onSubmit={handleBooking}>
        <h2>Passenger details</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="row">
          <label>
            Passenger name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </label>

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
          </label>
        </div>

        <label>
          Seats
          <input
            type="number"
            min="1"
            max={Math.min(10, flight.available_seats)}
            value={seats}
            placeholder="1"
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
          />
        </label>

        <div className="total-box">
          <span>Total amount</span>
          <strong>Rs. {total.toLocaleString()}</strong>
        </div>

        <button className="btn btn-primary btn-block" disabled={busy || flight.available_seats < 1}>
          {busy ? "Processing payment..." : "Pay and confirm (simulated)"}
        </button>

        <p className="muted small center">
          Payment is simulated for this demo. No card details are collected.
        </p>
      </form>
    </div>
  );
}
