import { createSignal, onMount } from "solid-js";
import { useData } from "vike-solid/useData";
import Board from "../../components/game/Board";
import styles from "./Page.module.css";

export default function Page() {
  const data = useData<{ initialCount: number }>();
  // Use SSR value as initial signal value, then hydrate on client
  const [count, setCount] = createSignal(data?.initialCount ?? 0);
  let solidStatusRef: HTMLSpanElement | undefined;
  const counterName = "testpage_counter";
  let undoFunction: (() => void) | undefined;

  async function fetchCounter() {
    try {
      const response = await fetch('/api/counter/' + counterName);
      const data = await response.json();
      setCount(data.value);
    } catch (error) {
      console.error("Failed to fetch counter:", error);
    }
  }

  async function increment() {
    try {
      const response = await fetch('/api/counter/' + counterName + '/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const data = await response.json();
      setCount(data.value);
    } catch (error) {
      console.error("Failed to increment counter:", error);
    }
  }

  function decrement() {
    setCount(c => Math.max(0, c - 1));
  }

  onMount(() => {
    if (solidStatusRef) {
      solidStatusRef.textContent = 'active';
      solidStatusRef.setAttribute('data-solid-mounted', 'true');
    }
    // Refresh from server on mount to get latest value
    fetchCounter();
  });

  function handleUndo() {
    if (undoFunction) {
      undoFunction();
    }
  }

  return (
    <div class={styles.page}>
      <div class={styles.controlsContainer}>
        <h2>Board Controls</h2>
        <button class={styles.undoButton} onClick={handleUndo}>
          Undo Move
        </button>
      </div>
      <div class={styles.boardContainer}>
        <Board onUndo={(undoFn) => { undoFunction = undoFn; }} />
      </div>
    </div>
  );
}
