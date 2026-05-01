import { createMemo } from "solid-js";
import { usePageContext } from "vike-solid/usePageContext";
import styles from "../pages/Layout.module.css";

export function Link(props: { href: string; children: string }) {
  const pageContext = usePageContext();
  const isActive = createMemo(() =>
    props.href === "/"
      ? pageContext.urlPathname === props.href
      : (pageContext.urlPathname?.startsWith(props.href) ?? false),
  );
  return (
    <a
      href={props.href}
      class={`${styles.sidebarLink} ${isActive() ? styles.sidebarLinkActive : ""}`}
    >
      {props.children}
    </a>
  );
}
