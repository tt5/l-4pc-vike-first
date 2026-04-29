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

    // Test JavaScript counter functionality
    console.log('[Test] Testing JavaScript counter...');

    // Check initial counter value
    const initialCounter = await page.$eval('[data-testid="counter"]', el => el.textContent);
    if (initialCounter === '0') {
      console.log('✓ Initial counter value is 0');
    } else {
      console.log('✗ Expected counter to be "0", got:', initialCounter);
      process.exitCode = 1;
    }

    // Test increment button using page.evaluate (Lightpanda compatible)
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="increment"]');
      if (btn) btn.click();
    });
    await delay(100);
    const afterIncrement = await page.$eval('[data-testid="counter"]', el => el.textContent);
    if (afterIncrement === '1') {
      console.log('✓ Counter incremented to 1');
    } else {
      console.log('✗ Expected counter to be "1" after increment, got:', afterIncrement);
      process.exitCode = 1;
    }

    // Test decrement button
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="decrement"]');
      if (btn) btn.click();
    });
    await delay(100);
    const afterDecrement = await page.$eval('[data-testid="counter"]', el => el.textContent);
    if (afterDecrement === '0') {
      console.log('✓ Counter decremented to 0');
    } else {
      console.log('✗ Expected counter to be "0" after decrement, got:', afterDecrement);
      process.exitCode = 1;
    }

    // Test multiple increments
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="increment"]');
      if (btn) {
        btn.click();
        btn.click();
        btn.click();
      }
    });
    await delay(100);
    const afterMultiple = await page.$eval('[data-testid="counter"]', el => el.textContent);
    if (afterMultiple === '3') {
      console.log('✓ Counter correctly shows 3 after multiple increments');
    } else {
      console.log('✗ Expected counter to be "3", got:', afterMultiple);
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
