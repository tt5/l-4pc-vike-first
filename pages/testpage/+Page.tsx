import { createSignal, onMount, onCleanup } from "solid-js";
import { makeApiCall, parseApiResponse } from "../../utils/api";

export default function Page() {
  const [count, setCount] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(false);
  
  const counterName = "testpage_counter";

  // Fetch current counter value
  const fetchCounter = async () => {
    try {
      const response = await makeApiCall(`/api/counter/${counterName}`);
      const { data } = await parseApiResponse<{ name: string; value: number }>(response, "get counter");
      setCount(data.value);
    } catch (error) {
      console.error("Failed to fetch counter:", error);
    }
  };

  // Increment counter
  const increment = async () => {
    if (isLoading()) return;
    setIsLoading(true);
    try {
      console.log("Making increment API call...");
      const response = await makeApiCall(`/api/counter/${counterName}/increment`, { 
        method: "POST",
        body: "{}"
      });
      console.log("API response:", response);
      const { data } = await parseApiResponse<{ name: string; value: number }>(response, "increment counter");
      console.log("Parsed data:", data);
      setCount(data.value);
      console.log("Set count to:", data.value);
    } catch (error) {
      console.error("Failed to increment counter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Decrement counter (simple local update, polling will sync with database)
  const decrement = async () => {
    if (isLoading()) return;
    const currentCount = count();
    const newValue = Math.max(0, currentCount - 1);
    setCount(newValue);
  };

  onMount(() => {
    // Initial fetch
    fetchCounter();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchCounter, 3000);
    
    // Cleanup on unmount
    onCleanup(() => clearInterval(interval));
  });

  return (
    <>
      <h1>Test Page</h1>
      <p data-testid="description">This is a test page for E2E testing.</p>

      <div id="counter-section">
        <p>Count: <span id="counter-value" data-testid="counter">{count()}</span></p>
        <button 
          id="increment-btn" 
          data-testid="increment" 
          onClick={increment}
          disabled={isLoading()}
        >
          {isLoading() ? "Loading..." : "Increment"}
        </button>
        <button 
          id="decrement-btn" 
          data-testid="decrement" 
          onClick={decrement}
          disabled={isLoading()}
        >
          {isLoading() ? "Loading..." : "Decrement"}
        </button>
      </div>
    </>
  );
}
