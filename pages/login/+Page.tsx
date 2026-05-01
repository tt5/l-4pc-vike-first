import { LoginForm } from "../../components/auth/LoginForm";
import styles from "../../components/auth/AuthForms.module.css";

export default function Page() {
  return (
    <>
      <h1>Login</h1>

      <div class={styles.formContainer}>
        <LoginForm />
      </div>
    </>
  );
}
