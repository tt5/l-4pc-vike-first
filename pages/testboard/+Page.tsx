import { createSignal, onMount } from "solid-js";
import { useData } from "vike-solid/useData";

export default function Page() {
  const data = useData<{ initialCount: number }>();
  // Use SSR value as initial signal value, then hydrate on client
  const [count, setCount] = createSignal(data?.initialCount ?? 0);
  let solidStatusRef: HTMLSpanElement | undefined;
  const counterName = "testpage_counter";

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

  return (
    <>
      <h1>Test Page</h1>
      <p data-testid="description">This is a test page for E2E testing.</p>

      <p>SolidJS: <span data-testid="solid-status" ref={solidStatusRef}>inactive</span></p>
      <div id="counter-section">
        <p>Count: <span id="counter-value" data-testid="counter">{count()}</span></p>
        <button id="increment-btn" data-testid="increment" onClick={increment}>Increment</button>
        <button id="decrement-btn" data-testid="decrement" onClick={decrement}>Decrement</button>
      </div>
      <Board/>
    </>
  );
}
