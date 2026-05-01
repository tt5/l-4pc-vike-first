import { Show } from "solid-js";
import { useData } from "vike-solid/useData";
import type { Data } from "./+data";

export default function Page() {
  const data = useData<Data>();
  const isAuthenticated = () => data?.isAuthenticated ?? false;
  const user = () => data?.user;

  return (
    <>
      <Show when={isAuthenticated()} keyed fallback={
        <div style={{
          padding: "20px",
          "background-color": "#ffebee",
          "border-radius": "4px",
          "margin-top": "20px",
        }}>
          <h2>Not Authenticated</h2>
          <p>You must be logged in to view this page.</p>
          <p><a href="/login">Go to login</a></p>
        </div>
      }>
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
        <h2>Welcome{user() ? `, ${user()?.username}` : ''}!</h2>
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
      </Show>
    </>
  );
}
