import { useState } from "react";
import { Link } from "react-router-dom";

import api, { errorMessage } from "../api";
import StatusBadge from "../components/StatusBadge";

const AIRPORTS = [
  { code: "DEL", name: "Delhi - Indira Gandhi Intl" },
  { code: "BOM", name: "Mumbai - Chhatrapati Shivaji" },
  { code: "BLR", name: "Bengaluru - Kempegowda" },
  { code: "MAA", name: "Chennai Intl" },
  { code: "CCU", name: "Kolkata - Netaji Subhas" },
  { code: "HYD", name: "Hyderabad - Rajiv Gandhi" },
  { code: "GOI", name: "Goa - Dabolim" },
];

export default function FlightList() {
  const [filters, setFilters] = useState({
    origin: "",
    destination: "",
    date: "",
    max_price: "",
    only_available: "true",
  });

  const [flights, setFlights] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => setFilters({ ...filters, [field]: event.target.value });
  }

  async function runSearch(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    // Only send the fields the user actually filled in.
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    try {
      const { data } = await api.get(`/flights/search/?${params.toString()}`);
      setFlights(data.results);
      setSearched(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFilters({ origin: "", destination: "", date: "", max_price: "", only_available: "true" });
    setFlights([]);
    setSearched(false);
  }

  return (
    <div>
      <div className="page-head">
        <h1>Search Flights</h1>
        <button className="btn btn-outline" onClick={reset}>Clear</button>
      </div>

      <form className="card search-form" onSubmit={runSearch}>
        <div className="row">
          <label>
            From
            <select value={filters.origin} onChange={update("origin")}>
              <option value="">Any airport</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
              ))}
            </select>
          </label>

          <label>
            To
            <select value={filters.destination} onChange={update("destination")}>
              <option value="">Any airport</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="row">
          <label>
            Departure date
            <input type="date" value={filters.date} onChange={update("date")} />
          </label>

          <label>
            Max price (INR)
            <input
              type="number"
              min="0"
              value={filters.max_price}
              onChange={update("max_price")}
              placeholder="5000"
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={filters.only_available === "true"}
              onChange={(e) =>
                setFilters({ ...filters, only_available: e.target.checked ? "true" : "false" })
              }
            />
            Only show flights with free seats
          </label>
        </div>

        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {searched && !error && (
        <>
          <p className="muted">{flights.length} flight(s) found</p>

          {flights.length === 0 && (
            <div className="card empty">
              <p>No flights match those filters. Try clearing the date or price.</p>
            </div>
          )}

          <div className="flight-list">
            {flights.map((f) => (
              <div className="card flight-card" key={f.id}>
                <div className="flight-top">
                  <strong>{f.flight_number}</strong>
                  <span className="muted">{f.airline}</span>
                  <StatusBadge status={f.status} />
                </div>

                <div className="flight-route">
                  <div>
                    <span className="code">{f.origin_code}</span>
                    <span className="muted">{new Date(f.departure_time).toLocaleString()}</span>
                  </div>
                  <div className="route-line">to</div>
                  <div>
                    <span className="code">{f.destination_code}</span>
                    <span className="muted">{new Date(f.arrival_time).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flight-bottom">
                  <div>
                    <span className="price">Rs. {Number(f.price).toLocaleString()}</span>
                    <span className="muted"> / seat</span>
                    <span className={`seats ${f.available_seats < 20 ? "low" : ""}`}>
                      {f.available_seats} left
                    </span>
                  </div>
                  <Link to={`/book/${f.id}`} className="btn btn-primary">Book now</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
