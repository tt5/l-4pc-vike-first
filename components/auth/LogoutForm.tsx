import { createSignal } from "solid-js";

export function LogoutForm() {
  const [isLoggingOut, setIsLoggingOut] = createSignal(false);

  const handleLogout = () => {
    // Clear client-side auth state before form submission
    sessionStorage.removeItem("user");
    setIsLoggingOut(true);
  };

  return (
    <form action="/api/auth/logout" method="post" onSubmit={handleLogout}>
      <button
        type="submit"
        disabled={isLoggingOut()}
        style={{
          padding: "12px 24px",
          "background-color": isLoggingOut() ? "#ccc" : "#d32f2f",
          color: "white",
          border: "none",
          "border-radius": "4px",
          cursor: isLoggingOut() ? "not-allowed" : "pointer",
          "font-size": "16px",
          "font-weight": "bold",
        }}
      >
        {isLoggingOut() ? "Logging out..." : "Logout"}
      </button>
    </form>
  );
}
