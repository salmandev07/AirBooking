import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
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

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            autoComplete="current-password"
          />
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
