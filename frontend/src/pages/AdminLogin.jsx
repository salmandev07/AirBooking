import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setBusy(true);
    try {
      const user = await login(username, password);
      navigate(user.is_staff || user.is_superuser ? "/admin" : "/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1>Admin login</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
          />
        </label>

        <label style={{ display: "flex", alignItems: "center" }}>
          Password
          <input
            style={{ flex: 1, marginRight: 8, paddingRight: 30 }}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="btn btn-link text-muted fs-7 small p-0 m-0"
            onClick={() => setShowPassword((s) => !s)}
            style={{ width: 24, height: 24, padding: 0, marginLeft: 4, background: "transparent", border: "none" }}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill={currentColor}
              stroke={currentColor}
              strokeWidth={2}
            >
              <path d="M1 12s4-8 8-8 8 4 8 4-4 8-8 8z" />
              <circle cx="8" cy="8" r="3" />
            </svg>
          </button>
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in..." : "Admin login"}
        </button>
      </form>

      <p className="muted center">
        Staff? You can <Link to="/login">log in as a user</Link>.
      </p>
    </div>
  );
}
