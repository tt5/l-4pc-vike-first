import { createSignal } from "solid-js";
import styles from "./AuthForms.module.css";

interface DeleteUserFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function DeleteUserForm(props: DeleteUserFormProps) {
  const [isDeleting, setIsDeleting] = createSignal(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/auth/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear client-side auth state
        sessionStorage.removeItem("user");
        props.onSuccess?.();
      } else {
        props.onError?.(data.error || "Failed to delete account");
      }
    } catch (error) {
      props.onError?.("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting()}
      class={isDeleting() ? styles.buttonDangerDisabled : styles.buttonDanger}
    >
      {isDeleting() ? "Deleting..." : "Delete Account"}
    </button>
  );
}
