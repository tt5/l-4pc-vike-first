import { RegisterForm } from "../../components/auth/RegisterForm";
import styles from "../../components/auth/AuthForms.module.css";

export default function Page() {
  return (
    <>
      <h1>Register</h1>

      <div class={styles.formContainer}>
        <RegisterForm />
      </div>
    </>
  );
}
