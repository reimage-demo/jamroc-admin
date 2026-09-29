import React from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./styles.css";
const url = import.meta.env.VITE_CONVEX_URL;
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="setup-screen">
        <h1>Connection interrupted</h1>
        <p>Reload to reconnect. Your saved changes are safe.</p>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    {url ? (
      <ConvexProvider client={new ConvexReactClient(url)}>
        <App />
      </ConvexProvider>
    ) : (
      <main className="setup-screen">
        <img src="assets/logo.webp" alt="Jam Roc" />
        <p className="eyebrow">STAFF PORTAL</p>
        <h1>
          Your kitchen.
          <br />
          Your control room.
        </h1>
        <p>
          The staff portal is ready to connect. Set the Jam Roc Convex
          deployment URL to enable secure sign-in.
        </p>
        <p>Admin and employee access use separate permissions.</p>
      </main>
    )}
  </ErrorBoundary>,
);
