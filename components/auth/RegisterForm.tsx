export function RegisterForm() {
  return (
    <form action="/api/auth/register" method="post">
      <div style={{ "margin-bottom": "15px" }}>
        <label for="reg-username" style={{ display: "block", "margin-bottom": "5px" }}>
          Username
        </label>
        <input
          type="text"
          id="reg-username"
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
        <label for="reg-password" style={{ display: "block", "margin-bottom": "5px" }}>
          Password
        </label>
        <input
          type="password"
          id="reg-password"
          name="password"
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
          name="confirm-password"
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
          "background-color": "#388e3c",
          color: "white",
          border: "none",
          "border-radius": "4px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Register
      </button>
    </form>
  );
}
