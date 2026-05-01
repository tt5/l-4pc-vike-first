import { createSignal } from "solid-js";
import styles from "./AuthForms.module.css";

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
        class={isLoggingOut() ? styles.buttonDangerDisabled : styles.buttonDanger}
      >
        {isLoggingOut() ? "Logging out..." : "Logout"}
      </button>
    </form>
  );
}
