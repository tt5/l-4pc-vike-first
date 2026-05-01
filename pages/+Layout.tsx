// https://vike.dev/Layout

import type { JSX } from "solid-js";
import styles from "./Layout.module.css";
import logoUrl from "../assets/logo.svg";
import { Link } from "../components/Link";
import { AuthProvider } from "../contexts/AuthContext";

export default function Layout(props: { children?: JSX.Element }) {
  return (
    <AuthProvider>
      <div class={styles.layout}>
        <Sidebar>
          <Logo />
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/logout">Logout</Link>
        </Sidebar>
        <Content>{props.children}</Content>
      </div>
    </AuthProvider>
  );
}

function Sidebar(props: { children: JSX.Element }) {
  return (
    <div class={styles.sidebar}>
      {props.children}
    </div>
  );
}

function Content(props: { children: JSX.Element }) {
  return (
    <div class={styles.pageContainer}>
      <div class={styles.pageContent}>
        {props.children}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div class={styles.logo}>
      <a href="/" class={styles.link}>
        <img src={logoUrl} height={64} width={64} alt="logo" />
      </a>
    </div>
  );
}
