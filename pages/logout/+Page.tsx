import { Show } from "solid-js";
import { useData } from "vike-solid/useData";
import type { Data } from "./+data";
import { LogoutForm } from "../../components/auth/LogoutForm";

export default function Page() {
  const data = useData<Data>();
  const isSuccess = () => data?.isSuccess ?? false;
  const isLoggedIn = () => data?.isLoggedIn ?? false;
  const user = () => data?.user;

  return (
    <>
      <Show when={isSuccess()} keyed>
        <div style={{
          padding: "20px",
          "text-align": "center",
          "font-size": "18px",
          "background-color": "#e8f5e9",
          "border-radius": "4px",
        }}>
          <h2>✓ Successfully logged out</h2>
          <p>You have been logged out.</p>
          <p>
            <a href="/login">Log in again</a> | <a href="/">Go to home page</a>
          </p>
        </div>
      </Show>

      <Show when={!isSuccess() && isLoggedIn()} keyed>
        <div style={{
          padding: "20px",
          "text-align": "center",
        }}>
          <h2>Logout</h2>
          <p>Logged in as <strong>{user()?.username}</strong>. Click the button below to log out.</p>

          <LogoutForm />
        </div>
      </Show>

      <Show when={!isSuccess() && !isLoggedIn()} keyed>
        <div style={{
          padding: "20px",
          "text-align": "center",
          "background-color": "#fff3e0",
          "border-radius": "4px",
        }}>
          <h2>Not Logged In</h2>
          <p>You are not currently logged in.</p>
          <p>
            <a href="/login">Log in</a> | <a href="/">Go to home page</a>
          </p>
        </div>
      </Show>
    </>
  );
}
