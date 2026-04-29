import { createSignal, createMemo, onMount, createEffect, Show } from "solid-js";

interface PageProps {
  isSuccess?: boolean;
}

export default function Page(props: PageProps) {
  console.log('Page props:', props);
  const [isLoggingOut, setIsLoggingOut] = createSignal(false);
  const [isSuccess, setIsSuccess] = createSignal(props.isSuccess || false);
  
  // Check URL on mount for client-side routing
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success') === 'true';
    console.log('URL success param:', success);
    setIsSuccess(success);
    console.log('After setting isSuccess, new value:', success);
  });
  
  console.log('isSuccess value:', isSuccess());
  
  // Add effect to log when isSuccess changes
  createEffect(() => {
    console.log('isSuccess changed to:', isSuccess());
    console.log('DOM contains success text:', document.body.textContent.includes('Successfully logged out'));
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

    // Navigate to success state (full page load for SSR)
    window.location.href = '/logout?success=true';
  };

  return (
    <>
      <Show when={isSuccess()}>
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
      </Show>
      
      <Show when={!isSuccess()}>
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
      </Show>
    </>
  );
}
