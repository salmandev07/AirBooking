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
      <div className="auth-card">
        <h1>Password changed</h1>
        <div className="alert alert-success">{notice}</div>
        <button className="btn btn-primary btn-block" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
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
          <label>
            New password
            <div style={{ position: "relative" }}>
              <input
                style={{ width: "100%", paddingRight: 56 }}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 6 characters"
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
            Confirm password
            <div style={{ position: "relative" }}>
              <input
                style={{ width: "100%", paddingRight: 56 }}
                type={showPassword2 ? "text" : "password"}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
