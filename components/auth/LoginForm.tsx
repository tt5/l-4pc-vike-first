import { createSignal } from "solid-js";
import { useAuth } from "../../contexts/AuthContext";

export function LoginForm() {
  const auth = useAuth();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await auth.login(username(), password());
      // Redirect to home on successful login
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ "margin-bottom": "15px" }}>
        <label for="username" style={{ display: "block", "margin-bottom": "5px" }}>
          Username
        </label>
        <input
          type="text"
          id="username"
          value={username()}
          onInput={(e) => setUsername(e.currentTarget.value)}
          disabled={isLoading()}
          style={{
            padding: "8px",
            width: "100%",
            "box-sizing": "border-box",
          }}
          required
        />
      </div>

      <div style={{ "margin-bottom": "15px" }}>
        <label for="password" style={{ display: "block", "margin-bottom": "5px" }}>
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          disabled={isLoading()}
          style={{
            padding: "8px",
            width: "100%",
            "box-sizing": "border-box",
          }}
          required
        />
      </div>

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
        type="submit"
        disabled={isLoading()}
        style={{
          padding: "10px 20px",
          "background-color": isLoading() ? "#ccc" : "#1976d2",
          color: "white",
          border: "none",
          "border-radius": "4px",
          cursor: isLoading() ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {isLoading() ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
