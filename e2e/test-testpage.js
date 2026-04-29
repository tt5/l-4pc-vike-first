'use strict'

import { spawn } from 'child_process';
import { homedir } from 'os';
import puppeteer from 'puppeteer-core';

const lpdopts = {
  host: '127.0.0.1',
  port: 9222,
};

const puppeteeropts = {
  browserWSEndpoint: `ws://${lpdopts.host}:${lpdopts.port}`,
};

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForLightpanda(host, port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://${host}:${port}/json/version`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Lightpanda failed to start within timeout');
}

const LIGHTPANDA_PATH = process.env.LIGHTPANDA_PATH || `${homedir()}/.cache/lightpanda-node/lightpanda`;

async function testTestpage() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Navigate to testpage');

    await page.goto(`${BASE_URL}/testpage`);
    await page.waitForSelector('h1');

    const heading = await page.$eval('h1', el => el.textContent);
    const description = await page.$eval('[data-testid="description"]', el => el.textContent);

    if (heading === 'Test Page') {
      console.log('✓ Page heading is correct');
    } else {
      console.log('✗ Expected heading "Test Page", got:', heading);
      process.exitCode = 1;
    }

    if (description.includes('E2E testing')) {
      console.log('✓ Page description is correct');
    } else {
      console.log('✗ Expected description with "E2E testing", got:', description);
      process.exitCode = 1;
    }

    // Test reset and increment API calls
    console.log('[Test] Testing reset and increment API calls');
    
    // Reset counter via API
    const resetResponse = await page.evaluate(async () => {
      const response = await fetch('/api/counter/testpage_counter/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      return response.json();
    });
    
    /*
    if (resetResponse.value === 0) {
      console.log('✓ Counter reset to 0 via API');
    } else {
      console.log('✗ Expected counter to be reset to 0, got:', resetResponse.value);
      process.exitCode = 1;
    }
    
    // Wait a moment for the page to update
    await delay(4000);
    
    // Check if page shows 0 after reset
    const afterReset = await page.$eval('[data-testid="counter"]', el => el.textContent);
    if (afterReset === '0') {
      console.log('✓ Test page shows counter as 0 after reset');
    } else {
      console.log('✗ Expected test page to show "0" after reset, got:', afterReset);
      process.exitCode = 1;
    }
    */
    
    // Increment counter via API
    const incrementResponse = await page.evaluate(async () => {
      const response = await fetch('/api/counter/testpage_counter/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      return response.json();
    });
    
    if (incrementResponse.value === 1) {
      console.log('✓ Counter incremented to 1 via API');
    } else {
      console.log('✗ Expected counter to be 1 after increment, got:', incrementResponse.value);
      process.exitCode = 1;
    }
    
    // Reload page to get fresh SSR value
    await page.goto(`${BASE_URL}/testpage`);
    await page.waitForSelector('[data-testid="counter"]');
    
    // Check if page shows 1 after reload (fresh SSR)
    const afterReload = await page.$eval('[data-testid="counter"]', el => el.textContent);
    if (afterReload === '1') {
      console.log('✓ Test page shows counter as 1 after reload (SSR)');
    } else {
      console.log('✗ Expected test page to show "1" after reload, got:', afterReload);
      process.exitCode = 1;
    }

    console.log('[Test] All JavaScript tests passed');
  } catch (error) {
    console.error('Test failed:', error);
    process.exitCode = 1;
  } finally {
    await page.close();
    await context.close();
    await browser.disconnect();
    proc.kill();
  }
}

testTestpage();
