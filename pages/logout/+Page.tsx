import { createSignal } from "solid-js";

interface PageProps {
  isSuccess?: boolean;
}

export default function Page(props: PageProps) {
  console.log('Page props:', props);
  const [isLoggingOut, setIsLoggingOut] = createSignal(false);
  const [isSuccess] = createSignal(props.isSuccess || false);
  console.log('isSuccess signal:', isSuccess());

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

    // Navigate to success state (full page load for SSR)
    window.location.href = '/logout?success=true';
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
