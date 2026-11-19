import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api, { errorMessage } from "../api";
import StatusBadge from "../components/StatusBadge";

// "My Trips" - every booking of the logged in user with live status.
export default function MyTrips() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    api
      .get("/bookings/")
      .then((res) => setBookings(res.data.results || res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh the flight status of every open booking every 20 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      bookings
        .filter((b) => b.status === "Confirmed")
        .forEach((b) => {
          api
            .get(`/flights/${b.flight.id}/status/`)
            .then((res) => {
              setBookings((current) =>
                current.map((item) =>
                  item.id === b.id
                    ? { ...item, flight: { ...item.flight, status: res.data.status } }
                    : item
                )
              );
            })
            .catch(() => {});
        });
    }, 20000);

    return () => clearInterval(timer);
  }, [bookings]);

  async function cancelBooking(booking) {
    const ok = window.confirm(
      `Cancel booking ${booking.reference}? Your seat will be released and the payment refunded.`
    );
    if (!ok) return;

    setNotice("");
    setError("");
    try {
      const { data } = await api.post(`/bookings/${booking.id}/cancel/`);
      setNotice(`Booking ${data.reference} cancelled.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <div className="page-loading">Loading your trips...</div>;

  return (
    <div>
      <div className="page-head">
        <h1>My Trips</h1>
        <Link to="/search" className="btn btn-primary">Book a new flight</Link>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {bookings.length === 0 && (
        <div className="card empty">
          <p>You have not booked anything yet.</p>
          <Link to="/search" className="btn btn-outline">Find a flight</Link>
        </div>
      )}

      <div className="flight-list">
        {bookings.map((b) => (
          <div className="card trip-card" key={b.id}>
            <div className="trip-head">
              <div>
                <strong className="code">{b.reference}</strong>
                <span className="muted">booked {new Date(b.created_at).toLocaleDateString()}</span>
              </div>
              <div className="badges">
                <StatusBadge status={b.payment_status} />
                <StatusBadge status={b.status} />
              </div>
            </div>

            <div className="flight-route">
              <div>
                <span className="code">{b.flight.origin_code}</span>
                <span className="muted">{new Date(b.flight.departure_time).toLocaleString()}</span>
              </div>
              <div className="route-line">→</div>
              <div>
                <span className="code">{b.flight.destination_code}</span>
                <span className="muted">{new Date(b.flight.arrival_time).toLocaleString()}</span>
              </div>
            </div>

            <div className="trip-meta">
              <span>{b.flight.flight_number} · {b.flight.airline}</span>
              <span>{b.seats} seat(s)</span>
              <span>₹{Number(b.total_amount).toLocaleString()}</span>
              <span>Live: <StatusBadge status={b.flight.status} /></span>
            </div>

            {b.status === "Confirmed" && (
              <div className="trip-actions">
                <button className="btn btn-danger" onClick={() => cancelBooking(b)}>
                  Cancel booking
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
