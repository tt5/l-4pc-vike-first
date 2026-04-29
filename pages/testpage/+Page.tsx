export default function Page() {
  return (
    <>
      <h1>Test Page</h1>
      <p data-testid="description">This is a test page for E2E testing.</p>

      <div id="counter-section" innerHTML={`
        <p>Count: <span id="counter-value" data-testid="counter">0</span></p>
        <button id="increment-btn" data-testid="increment" onclick="var el=document.getElementById('counter-value');el.textContent=parseInt(el.textContent)+1">Increment</button>
        <button id="decrement-btn" data-testid="decrement" onclick="var el=document.getElementById('counter-value');el.textContent=parseInt(el.textContent)-1">Decrement</button>
      `} />
    </>
  );
}
