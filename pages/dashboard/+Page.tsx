import { createSignal, Show } from "solid-js";
import { useData } from "vike-solid/useData";
import type { Data } from "./+data";
import { DeleteUserForm } from "../../components/auth/DeleteUserForm";
import styles from "./Dashboard.module.css";

export default function Page() {
  const data = useData<Data>();
  const isAuthenticated = () => data?.isAuthenticated ?? false;
  const user = () => data?.user;
  const [notification, setNotification] = createSignal<{ type: "success" | "error"; message: string } | null>(null);
  const [isDeleted, setIsDeleted] = createSignal(false);

  const handleDeleteSuccess = () => {
    setIsDeleted(true);
    setNotification({ type: "success", message: "Account deleted successfully. You have been logged out." });
  };

  const handleDeleteError = (error: string) => {
    setNotification({ type: "error", message: error });
  };

  return (
    <>
      <Show when={isAuthenticated()} keyed fallback={
        <div class={styles.cardError}>
          <h2>Not Authenticated</h2>
          <p>You must be logged in to view this page.</p>
          <p><a href="/login">Go to login</a></p>
        </div>
      }>
    <>
      <h1>Dashboard (Protected)</h1>

      <Show when={notification()}>
        <div
          class={notification()?.type === "success" ? styles.notificationSuccess : styles.notificationError}
        >
          {notification()?.message}
        </div>
      </Show>

      <Show when={!isDeleted()}>
        <div class={styles.cardSuccess}>
          <h2>Welcome{user() ? `, ${user()?.username}` : ''}!</h2>
          <p>This is a protected route. You can only see this because you're authenticated.</p>
        </div>

        <div class={styles.cardSuccess}>
          <h3>Authentication Status</h3>
          <p>✅ You are successfully authenticated via server-side cookies.</p>
          <p>The auth middleware verified your session and allowed access to this protected route.</p>
        </div>

        <div class={styles.cardWarning}>
          <h3>Danger Zone</h3>
          <p>Once you delete your account, there is no going back. Please be certain.</p>
          <DeleteUserForm onSuccess={handleDeleteSuccess} onError={handleDeleteError} />
        </div>
      </Show>

      <Show when={isDeleted()}>
        <div class={styles.marginTop}>
          <p><a href="/">Go to home page</a></p>
        </div>
      </Show>
    </>
      </Show>
    </>
  );
}
