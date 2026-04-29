import { createSignal } from "solid-js";

export default function Page() {
  // Server-side auth is handled by auth middleware
  // If user is not authenticated, they won't reach this page

  return (
    <>
      <h1>Dashboard (Protected)</h1>
      <div
        style={{
          padding: "20px",
          "background-color": "#e8f5e9",
          "border-radius": "4px",
          "margin-top": "20px",
        }}
      >
        <h2>Welcome to your dashboard!</h2>
        <p>This is a protected route. You can only see this because you're authenticated.</p>
      </div>

      <div
        style={{
          padding: "20px",
          "background-color": "#e8f5e9",
          "border-radius": "4px",
          "margin-top": "20px",
        }}
      >
        <h3>Authentication Status</h3>
        <p>✅ You are successfully authenticated via server-side cookies.</p>
        <p>The auth middleware verified your session and allowed access to this protected route.</p>
      </div>
    </>
  );
}
