import { useAuth } from "../../contexts/AuthContext";
import styles from "./UserInfo.module.css";

export function UserInfo() {
  const auth = useAuth();
  const user = auth.user;

  const handleLogout = async () => {
    await auth.logout();
  };

  if (!user()) {
    return (
      <div class={styles.guest}>
        Not logged in
      </div>
    );
  }

  return (
    <div
      data-testid="user-info"
      class={styles.authenticated}
    >
      <span>
        <strong>Logged in as:</strong> {user()?.username}
      </span>
      <button
        data-testid="logout"
        onClick={handleLogout}
        class={styles.logoutButton}
      >
        Logout
      </button>
    </div>
  );
}
