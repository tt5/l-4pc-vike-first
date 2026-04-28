import { Show } from "solid-js";
import { LoginForm } from "../../components/auth/LoginForm";
import { UserInfo } from "../../components/auth/UserInfo";
import { useAuth } from "../../contexts/AuthContext";

export default function Page() {
  const auth = useAuth();
  const user = auth.user;

  return (
    <>
      <h1>Login</h1>

      <UserInfo />

      <Show when={!user()}>
        <div style={{ "max-width": "400px" }}>
          <LoginForm />
        </div>
      </Show>

      <Show when={user()}>
        <div
          style={{
            padding: "20px",
            "background-color": "#e8f5e9",
            "border-radius": "4px",
            "text-align": "center",
          }}
        >
          <p>You are already logged in!</p>
        </div>
      </Show>
    </>
  );
}
