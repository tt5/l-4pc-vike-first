import { createSignal, onMount } from "solid-js";

export default function Page() {
  const [isLoggingOut, setIsLoggingOut] = createSignal(false);
  const [isSuccess, setIsSuccess] = createSignal(false);

  onMount(() => {
    // Check if success parameter is in URL (client-side only)
    const urlParams = new URLSearchParams(window.location.search);
    setIsSuccess(urlParams.get('success') === 'true');
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear client-side auth state
    sessionStorage.removeItem("user");

    // Update URL to show success
    window.history.replaceState({}, '', '/logout?success=true');
    window.location.reload();
  };

  if (isSuccess()) {
    return (
      <div style={{ 
        padding: "20px", 
        "text-align": "center",
        "font-size": "18px",
        "background-color": "#e8f5e9",
        "border-radius": "4px",
      }}>
        <h2>✓ Successfully logged out</h2>
        <p>You have been logged out.</p>
        <p>
          <a href="/login">Log in again</a> | <a href="/">Go to home page</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "20px", 
      "text-align": "center",
    }}>
      <h2>Logout</h2>
      <p>Click the button below to log out of your account.</p>
      
      <button
        onClick={handleLogout}
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
    </div>
  );
}
