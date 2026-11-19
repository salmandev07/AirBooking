import { Component } from "react";

// Catches unexpected render errors and shows a simple fallback.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("AirBooking error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-page">
          <div className="auth-card">
            <h1>Something went wrong</h1>
            <p className="muted center">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
            <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
