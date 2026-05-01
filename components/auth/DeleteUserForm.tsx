import { createSignal } from "solid-js";

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
      style={{
        padding: "12px 24px",
        "background-color": isDeleting() ? "#ccc" : "#d32f2f",
        color: "white",
        border: "none",
        "border-radius": "4px",
        cursor: isDeleting() ? "not-allowed" : "pointer",
        "font-size": "16px",
        "font-weight": "bold",
      }}
    >
      {isDeleting() ? "Deleting..." : "Delete Account"}
    </button>
  );
}
