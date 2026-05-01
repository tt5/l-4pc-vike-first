import { createSignal, Show } from "solid-js";
import { useData } from "vike-solid/useData";
import type { Data } from "./+data";

export default function Page() {
  const data = useData<Data>();
  const [isLoggingOut, setIsLoggingOut] = createSignal(false);
  const isSuccess = () => data?.isSuccess ?? false;

  const handleLogout = () => {
    // Clear client-side auth state before form submission
    sessionStorage.removeItem("user");
    setIsLoggingOut(true);
  };

  return (
    <>
      <Show when={isSuccess()} keyed>
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
      
      <Show when={!isSuccess()} keyed>
        <div style={{ 
          padding: "20px", 
          "text-align": "center",
        }}>
          <h2>Logout</h2>
          <p>Click the button below to log out of your account.</p>
          
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
        </div>
      </Show>
    </>
  );
}
