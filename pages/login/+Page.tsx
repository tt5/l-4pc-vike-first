import { LoginForm } from "../../components/auth/LoginForm";

export default function Page() {
  return (
    <>
      <h1>Login</h1>

      <div style={{ "max-width": "400px" }}>
        <LoginForm />
      </div>
    </>
  );
}
