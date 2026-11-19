import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api, { errorMessage } from "../api";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Please enter the email you registered with.");
      return;
    }
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/verify-email/", { email, otp });
      setNotice(data.detail);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email.includes("@")) {
      setError("Please enter your email address first.");
      return;
    }

    setResending(true);
    try {
      const { data } = await api.post("/auth/resend-verification/", { email });
      setNotice(data.detail);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Email confirmed</h1>
        <div className="alert alert-success">{notice}</div>
        <button className="btn btn-primary btn-block" onClick={() => navigate("/login")}>
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Confirm your email</h1>
      <p className="muted">Enter the 6-digit code we sent to your email address.</p>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
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

        <label>
          Confirmation code
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            maxLength="6"
          />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Confirming..." : "Confirm email"}
        </button>
      </form>

      <p className="muted center">
        Didn't get a code?{" "}
        <button type="button" className="link-button" onClick={resendCode} disabled={resending}>
          {resending ? "Sending..." : "Resend code"}
        </button>
      </p>

      <p className="muted center">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
