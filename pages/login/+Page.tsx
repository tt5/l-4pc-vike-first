import { createSignal, Show } from "solid-js";
import { LoginForm } from "../../components/auth/LoginForm";
import { RegisterForm } from "../../components/auth/RegisterForm";
import { UserInfo } from "../../components/auth/UserInfo";
import { useAuth } from "../../contexts/AuthContext";

export default function Page() {
  const [activeTab, setActiveTab] = createSignal<"login" | "register">("login");
  const auth = useAuth();
  const user = auth.user;

  return (
    <>
      <h1>Authentication</h1>

      <UserInfo />

      <Show when={!user()}>
        <div style={{ "max-width": "400px" }}>
          <div style={{ display: "flex", "margin-bottom": "20px" }}>
            <button
              onClick={() => setActiveTab("login")}
              style={{
                flex: 1,
                padding: "10px",
                "background-color": activeTab() === "login" ? "#1976d2" : "#e0e0e0",
                color: activeTab() === "login" ? "white" : "black",
                border: "none",
                "border-radius": "4px 0 0 4px",
                cursor: "pointer",
              }}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab("register")}
              style={{
                flex: 1,
                padding: "10px",
                "background-color": activeTab() === "register" ? "#388e3c" : "#e0e0e0",
                color: activeTab() === "register" ? "white" : "black",
                border: "none",
                "border-radius": "0 4px 4px 0",
                cursor: "pointer",
              }}
            >
              Register
            </button>
          </div>

          {activeTab() === "login" ? <LoginForm /> : <RegisterForm />}
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
