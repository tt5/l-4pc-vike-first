import { onMount, createSignal } from "solid-js";
import { useAuth } from "../../contexts/AuthContext";

export default function Page() {
  const { user, isInitialized, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [error, setError] = createSignal("");

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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await deleteAccount();
      // Redirect is handled in deleteAccount function
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  };

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
        <h2>Welcome, {user()?.username}!</h2>
        <p>This is a protected route. You can only see this because you're authenticated.</p>
        <p>User ID: {user()?.id}</p>
      </div>

      <div
        style={{
          padding: "20px",
          "background-color": "#fff3e0",
          "border-radius": "4px",
          "margin-top": "20px",
          "border": "1px solid #ff9800",
        }}
      >
        <h3 style={{ "margin-top": "0", color: "#e65100" }}>Account Management</h3>
        
        {error() && (
          <div
            style={{
              color: "red",
              "margin-bottom": "15px",
              padding: "10px",
              "background-color": "#ffebee",
              "border-radius": "4px",
            }}
          >
            {error()}
          </div>
        )}

        <button
          onClick={handleDeleteAccount}
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
          {isDeleting() ? "Deleting Account..." : "Delete Account"}
        </button>
        
        <p style={{ 
          "margin-top": "10px", 
          "font-size": "14px", 
          color: "#666",
          "margin-bottom": "0"
        }}>
          ⚠️ This will permanently delete your account and all associated data.
        </p>
      </div>
    </>
  );
}
