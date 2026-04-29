import { onMount } from "solid-js";

export default function Page() {
  // Client-side auth check - server middleware only runs on full page reloads
  onMount(async () => {
    try {
      // Verify the token with the server
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      const data = await response.json();

      if (!data.valid) {
        // Redirect to login if token is invalid
        window.location.href = "/login";
      }
    } catch (error) {
      // If verification fails, redirect to login
      console.error('Auth verification failed:', error);
      window.location.href = "/login";
    }
  });

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
