import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
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
          Username or email
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username or email"
            autoComplete="username"
          />
        </label>

        <label>
          Password
          <div style={{ position: "relative" }}>
            <input
              style={{ width: "100%", paddingRight: 56 }}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                padding: 0,
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="muted center">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>

      <p className="muted center">
        No account yet? <Link to="/register">Register here</Link>
        &nbsp;&nbsp;Admin?{" "}
        <Link to="/admin/login" className="btn btn-ghost">Admin login</Link>
      </p>
    </div>
  );
}
