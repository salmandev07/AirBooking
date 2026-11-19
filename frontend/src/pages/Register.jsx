import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";

const EMPTY = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  password: "",
  password2: "",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  // Catch typos before the request goes out.
  function validate() {
    if (!form.username || !form.email || !form.password) {
      return "Username, email and password are required.";
    }
    if (!form.email.includes("@")) {
      return "Please enter a valid email address.";
    }
    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (form.password !== form.password2) {
      return "The two passwords do not match.";
    }
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      await register(form);
      // The account is created unverified - confirm the email next.
      navigate("/verify-email", { state: { email: form.email } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Create an account</h1>
      <p className="muted">New accounts need admin approval before you can log in.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            First name
            <input value={form.first_name} onChange={update("first_name")} placeholder="First name" />
          </label>
          <label>
            Last name
            <input value={form.last_name} onChange={update("last_name")} placeholder="Last name" />
          </label>
        </div>

        <label>
          Username *
          <input value={form.username} onChange={update("username")} placeholder="username" autoComplete="username" />
        </label>

        <label>
          Email *
          <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" autoComplete="email" />
        </label>

        <label>
          Phone
          <input value={form.phone} onChange={update("phone")} placeholder="+91 ..." />
        </label>

        <div className="row">
          <label>
            Password * <span className="muted">(min 6)</span>
            <div style={{ position: "relative" }}>
              <input
                style={{ width: "100%", paddingRight: 56 }}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="password"
                autoComplete="new-password"
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
                  color: "var(--accent)",
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
          <label>
            Confirm Password *
            <div style={{ position: "relative" }}>
              <input
                style={{ width: "100%", paddingRight: 56 }}
                type={showPassword2 ? "text" : "password"}
                value={form.password2}
                onChange={update("password2")}
                placeholder="repeat password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword2((s) => !s)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                {showPassword2 ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        </div>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="muted center">
        Already registered? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
