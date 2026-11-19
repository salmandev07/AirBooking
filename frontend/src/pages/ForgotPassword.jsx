import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { errorMessage } from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function sendOtp(event) {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password/", { email });
      setNotice(data.detail);
      setStep(2);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/reset-password/", {
        email,
        otp,
        password,
        password2,
      });
      setNotice(data.detail);
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
        <h1>Password changed</h1>
        <div className="alert alert-success">{notice}</div>
        <button className="btn btn-primary btn-block" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="card auth-card">
      <h1>Forgot password</h1>
      <p className="muted">
        {step === 1
          ? "Enter your email and we will send you a 6-digit code."
          : "Enter the code sent to your email and choose a new password."}
      </p>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 ? (
        <form onSubmit={sendOtp}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Sending..." : "Send reset code"}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword}>
          <label>
            Reset code
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength="6"
            />
          </label>
          <label style={{ display: "flex", alignItems: "center" }}>
          New password
          <input
            style={{ flex: 1, marginRight: 8, paddingRight: 30 }}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min 6 characters"
            autoComplete="new-password"
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
        <label style={{ display: "flex", alignItems: "center" }}>
            Confirm password
            <input
              style={{ flex: 1, marginRight: 8, paddingRight: 30 }}
              type={showPassword2 ? "text" : "password"}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="repeat password"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn btn-link text-muted fs-7 small p-0 m-0"
              onClick={() => setShowPassword2((s) => !s)}
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
            {busy ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}

      <p className="muted center">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
