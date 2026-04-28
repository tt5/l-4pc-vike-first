import { createSignal } from "solid-js";
import { makeApiCall, parseApiResponse } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";

export function RegisterForm() {
  const auth = useAuth();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (password() !== confirmPassword()) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await makeApiCall("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: username(),
          password: password(),
        }),
      });

      const { data } = await parseApiResponse<{ user: { id: string; username: string; token: string } }>(
        response,
        "register"
      );

      // Auto-login after successful registration
      auth.updateUser(data.user);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ "margin-bottom": "15px" }}>
        <label for="reg-username" style={{ display: "block", "margin-bottom": "5px" }}>
          Username
        </label>
        <input
          type="text"
          id="reg-username"
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
        <label for="reg-password" style={{ display: "block", "margin-bottom": "5px" }}>
          Password
        </label>
        <input
          type="password"
          id="reg-password"
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

      <div style={{ "margin-bottom": "15px" }}>
        <label for="confirm-password" style={{ display: "block", "margin-bottom": "5px" }}>
          Confirm Password
        </label>
        <input
          type="password"
          id="confirm-password"
          value={confirmPassword()}
          onInput={(e) => setConfirmPassword(e.currentTarget.value)}
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
          "background-color": isLoading() ? "#ccc" : "#388e3c",
          color: "white",
          border: "none",
          "border-radius": "4px",
          cursor: isLoading() ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {isLoading() ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
