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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  // Quick client side checks so the user finds typos before hitting the API.
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
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card auth-card">
        <h1>Registration received 🎉</h1>
        <div className="alert alert-success">
          Your account was created and is now <strong>pending admin approval</strong>.
          You will get an email as soon as an administrator reviews it.
        </div>
        <button className="btn btn-primary btn-block" onClick={() => navigate("/login")}>
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="card auth-card">
      <h1>Create an account</h1>
      <p className="muted">New accounts need admin approval before you can log in.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            First name
            <input value={form.first_name} onChange={update("first_name")} />
          </label>
          <label>
            Last name
            <input value={form.last_name} onChange={update("last_name")} />
          </label>
        </div>

        <label>
          Username *
          <input value={form.username} onChange={update("username")} autoComplete="username" />
        </label>

        <label>
          Email *
          <input type="email" value={form.email} onChange={update("email")} autoComplete="email" />
        </label>

        <label>
          Phone
          <input value={form.phone} onChange={update("phone")} placeholder="+91 ..." />
        </label>

        <div className="row">
          <label>
            Password * <span className="muted">(min 6)</span>
            <input type="password" value={form.password} onChange={update("password")} autoComplete="new-password" />
          </label>
          <label>
            Repeat password *
            <input type="password" value={form.password2} onChange={update("password2")} autoComplete="new-password" />
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
