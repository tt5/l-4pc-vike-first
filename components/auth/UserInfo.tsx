import { useAuth } from "../../contexts/AuthContext";

export function UserInfo() {
  const auth = useAuth();
  const user = auth.user;

  const handleLogout = async () => {
    await auth.logout();
  };

  if (!user()) {
    return (
      <div
        style={{
          padding: "10px",
          "background-color": "#f5f5f5",
          "border-radius": "4px",
          "margin-bottom": "20px",
        }}
      >
        Not logged in
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "10px",
        "background-color": "#e3f2fd",
        "border-radius": "4px",
        "margin-bottom": "20px",
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
      }}
    >
      <span>
        <strong>Logged in as:</strong> {user()?.username}
      </span>
      <button
        onClick={handleLogout}
        style={{
          padding: "5px 15px",
          "background-color": "#d32f2f",
          color: "white",
          border: "none",
          "border-radius": "4px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}
