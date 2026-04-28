import { onMount } from "solid-js";
import { useAuth } from "../../contexts/AuthContext";

export default function Page() {
  const { user, isInitialized } = useAuth();

  onMount(() => {
    if (isInitialized() && !user()) {
      window.location.href = "/login";
    }
  });

  if (!isInitialized()) {
    return <div>Loading...</div>;
  }

  if (!user()) {
    return null; // Will redirect
  }

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
        <h2>Welcome, {user()!.username}!</h2>
        <p>This is a protected route. You can only see this because you're authenticated.</p>
        <p>User ID: {user()!.id}</p>
      </div>
    </>
  );
}
