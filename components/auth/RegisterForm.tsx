import styles from "./AuthForms.module.css";

export function RegisterForm() {
  return (
    <form action="/api/auth/register" method="post">
      <div class={styles.formGroup}>
        <label for="reg-username" class={styles.label}>
          Username
        </label>
        <input
          type="text"
          id="reg-username"
          name="username"
          class={styles.input}
          required
        />
      </div>

      <div class={styles.formGroup}>
        <label for="reg-password" class={styles.label}>
          Password
        </label>
        <input
          type="password"
          id="reg-password"
          name="password"
          class={styles.input}
          required
        />
      </div>

      <div class={styles.formGroup}>
        <label for="confirm-password" class={styles.label}>
          Confirm Password
        </label>
        <input
          type="password"
          id="confirm-password"
          name="confirm-password"
          class={styles.input}
          required
        />
      </div>

      <button type="submit" class={styles.buttonSuccess}>
        Register
      </button>
    </form>
  );
}
