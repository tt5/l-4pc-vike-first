export default function Page() {
  return (
    <>
      <h1>Test Page</h1>
      <p data-testid="description">This is a test page for E2E testing.</p>

      <div id="counter-section">
        <p>Count: <span id="counter-value" data-testid="counter">0</span></p>
        <button id="increment-btn" data-testid="increment">Increment</button>
        <button id="decrement-btn" data-testid="decrement">Decrement</button>
      </div>
      <script innerHTML={`
        (function() {
          const counterName = "testpage_counter";
          const counterEl = document.getElementById('counter-value');
          const incrementBtn = document.getElementById('increment-btn');
          const decrementBtn = document.getElementById('decrement-btn');
          
          async function fetchCounter() {
            try {
              const response = await fetch('/api/counter/' + counterName);
              const data = await response.json();
              counterEl.textContent = data.value;
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
              counterEl.textContent = data.value;
            } catch (error) {
              console.error("Failed to increment counter:", error);
            }
          }

          function decrement() {
            const currentCount = parseInt(counterEl.textContent || '0', 10);
            const newValue = Math.max(0, currentCount - 1);
            counterEl.textContent = newValue.toString();
          }

          incrementBtn?.addEventListener('click', increment);
          decrementBtn?.addEventListener('click', decrement);
          
          fetchCounter();
          setInterval(fetchCounter, 2000);
        })();
      `} />
    </>
  );
}