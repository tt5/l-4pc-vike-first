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
      const response = await makeApiCall(`/api/counter/${counterName}/increment`, { method: "POST" });
      const { data } = await parseApiResponse<{ name: string; value: number }>(response, "increment counter");
      setCount(data.value);
    } catch (error) {
      console.error("Failed to increment counter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Decrement counter (using increment with -1 via reset then set)
  const decrement = async () => {
    if (isLoading()) return;
    setIsLoading(true);
    try {
      const currentCount = count();
      const newValue = Math.max(0, currentCount - 1);
      
      // Reset to 0 then increment to desired value
      await makeApiCall(`/api/counter/${counterName}/reset`, { method: "POST" });
      
      for (let i = 0; i < newValue; i++) {
        await makeApiCall(`/api/counter/${counterName}/increment`, { method: "POST" });
      }
      
      setCount(newValue);
    } catch (error) {
      console.error("Failed to decrement counter:", error);
    } finally {
      setIsLoading(false);
    }
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
