# E2E Testing

Uses [Lightpanda](https://lightpanda.io/) browser with Puppeteer for fast headless testing.

## Quick Start

```bash
# Run all tests in parallel (default)
npm run test:e2e

# Run tests sequentially
npm run test:e2e:serial

# Run individual tests
npm run test:e2e:register
npm run test:e2e:login
```

## How It Works

### Cookie-Based Authentication

Lightpanda supports loading cookies from a JSON file on startup using `--cookie <file>`:

```bash
lightpanda serve --cookie ./cookies.json --host 127.0.0.1 --port 9222
```

This allows pre-authenticating sessions to skip login flows in tests.

See `test-login.js` for an example that:
1. Generates a mock JWT token
2. Creates a cookie file
3. Starts Lightpanda with `--cookie` flag
4. Accesses protected routes immediately

### Persistent Storage

Lightpanda supports SQLite storage for localStorage/sessionStorage:

```bash
lightpanda serve \
  --storage-engine sqlite \
  --storage-sqlite-path ./storage.db
```

### Parallel Execution

The `run-tests.js` runner executes tests in parallel using Worker Threads:

- Default concurrency: 4 (set via `E2E_CONCURRENCY`)
- Each test runs in isolation with its own Lightpanda instance on a unique port
- Results are aggregated with proper exit codes

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_CONCURRENCY` | 4 | Number of parallel tests |
| `E2E_TIMEOUT` | 60000 | Test timeout in milliseconds |

## Structure

```
e2e/
├── lib/
│   └── test-runner.js    # Shared utilities, BrowserPool, helpers
├── fixtures/
│   └── cookies/          # Generated cookie files for auth
├── test-*.js             # Test files (auto-discovered)
├── run-tests.js          # Parallel test runner
└── README.md             # This file
```

## Lightpanda JavaScript Limitations

Lightpanda uses V8 for JavaScript execution but has some limitations with framework event systems:

| Feature | Status | Workaround |
|---------|--------|------------|
| Native `onclick` attributes | ✅ Works | Use `innerHTML` with raw HTML |
| React/SolidJS `onClick` | ❌ Doesn't work | Use native `onclick` instead |
| `addEventListener` | ❌ Limited | Use inline handlers |
| `page.click()` (Puppeteer) | ❌ Doesn't trigger events | Use `page.evaluate(() => btn.click())` |
| `page.reload()` (Puppeteer) | ❌ Not supported | Use `page.evaluate(() => location.reload())` |
| `page.goto()` (subsequent) | ❌ Only first works | Use `page.evaluate(() => location.href = 'url')` |

Example of working event handling:
```javascript
// ❌ Doesn't work: SolidJS onClick
<button onClick={() => {}}>Click</button>

// ✅ Works: Native onclick via innerHTML
<div innerHTML={`
  <button onclick="handler()">Click</button>
`} />
```

## Writing Tests

Basic test structure:

```javascript
'use strict'

import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:3000';
const PORT = 9222; // Use unique port per test for parallel execution

async function test() {
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', [
    'serve', '--host', '127.0.0.1', '--port', PORT
  ]);
  await delay(2000);

  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://127.0.0.1:${PORT}`
  });

  // ... test code ...

  // Cleanup
  await browser.disconnect();
  proc.kill();
}

test();
```

## Using Shared Utilities

For more advanced tests, use the helper functions:

```javascript
import { BrowserPool, TestContext, generateAuthCookie, saveCookiesToFile } from './lib/test-runner.js';

const pool = new BrowserPool(2); // Max 2 browsers
const browser = await pool.acquire();
const ctx = await new TestContext(browser, {
  cookies: [generateAuthCookie('user', 'token')]
}).init();

await ctx.goto('http://localhost:3000/dashboard');
// ... assertions ...

await ctx.close();
await pool.release(browser);
```
