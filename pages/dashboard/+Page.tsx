import { requireAuth } from "../../server/auth-middleware";

// This page is protected - requireAuth will throw if user is not authenticated
export default function Page() {
  const user = requireAuth();

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
        <h2>Welcome, {user.username}!</h2>
        <p>This is a protected route. You can only see this because you're authenticated.</p>
        <p>User ID: {user.id}</p>
      </div>
    </>
  );
}
