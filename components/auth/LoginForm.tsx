export function LoginForm() {
  return (
    <form action="/api/auth/login" method="post">
      <div style={{ "margin-bottom": "15px" }}>
        <label for="username" style={{ display: "block", "margin-bottom": "5px" }}>
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
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
          name="password"
          style={{
            padding: "8px",
            width: "100%",
            "box-sizing": "border-box",
          }}
          required
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "10px 20px",
          "background-color": "#1976d2",
          color: "white",
          border: "none",
          "border-radius": "4px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Login
      </button>
    </form>
  );
}
