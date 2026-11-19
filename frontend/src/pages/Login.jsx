import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
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
      // Staff members go straight to the admin screen.
      navigate(user.is_superuser || user.is_staff ? "/admin" : "/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1>Welcome back</h1>
      <p className="muted">Log in with your approved user account.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="demo"
            autoComplete="username"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="demo123"
            autoComplete="current-password"
          />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="muted center">
        No account yet? <Link to="/register">Register here</Link>
      </p>

      <div className="demo-hint">
        <strong>Demo logins</strong>
        <ul>
          <li>admin / admin123 (admin)</li>
          <li>demo / demo123 (user)</li>
          <li>newuser / newuser123 (pending approval)</li>
        </ul>
      </div>
    </div>
  );
}
