import styles from "./AuthForms.module.css";

export function LoginForm() {
  return (
    <form action="/api/auth/login" method="post">
      <div class={styles.formGroup}>
        <label for="username" class={styles.label}>
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          class={styles.input}
          required
        />
      </div>

      <div class={styles.formGroup}>
        <label for="password" class={styles.label}>
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          class={styles.input}
          required
        />
      </div>

      <button type="submit" class={styles.buttonPrimary}>
        Login
      </button>
    </form>
  );
}
