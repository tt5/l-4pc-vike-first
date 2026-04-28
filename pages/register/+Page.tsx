import { RegisterForm } from "../../components/auth/RegisterForm";

export default function Page() {
  return (
    <>
      <h1>Register</h1>

      <div style={{ "max-width": "400px" }}>
        <RegisterForm />
      </div>
    </>
  );
}
