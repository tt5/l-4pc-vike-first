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

// Helper to parse cookie value from Set-Cookie header
function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/auth-token=([^;]+)/);
  return match ? match[1] : null;
}

async function testLoggedInDashboard() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Store auth token from API calls
  let authToken = null;

  try {
    const testUsername = 'testuser1';
    console.log('[Test] Login with user: ' + testUsername);

    // Step 1: Login via Node.js fetch API
    const formData = new URLSearchParams();
    formData.append('username', testUsername);
    formData.append('password', 'testpass123');

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    });

    // Extract auth token from Set-Cookie header
    const setCookie = loginRes.headers.get('set-cookie');
    authToken = parseCookie(setCookie);

    if (loginRes.status === 302 && loginRes.headers.get('location') === '/login?login=true' && authToken) {
      console.log('✓ Login API call successful, got auth token');
    } else {
      console.log('✗ Login failed. Status:', loginRes.status, 'Location:', loginRes.headers.get('location'));
      process.exitCode = 1;
      return;
    }

    // Set the auth cookie in the browser
    await page.setCookie({
      name: 'auth-token',
      value: authToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true
    });

    // Step 2: Navigate to dashboard and verify protected content is visible
    console.log('[Test] Visit dashboard while logged in');
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(500);
    await page.waitForSelector('h1');

    const bodyText = await page.evaluate(() => document.body.textContent);

    // Verify dashboard heading is shown
    if (bodyText.includes('Dashboard (Protected)')) {
      console.log('✓ Dashboard shows protected heading for logged-in user');
    } else {
      console.log('✗ Expected "Dashboard (Protected)" heading');
      process.exitCode = 1;
    }

    // Verify welcome message with username
    if (bodyText.includes(`Welcome, ${testUsername}`)) {
      console.log('✓ Page shows welcome message with username');
    } else {
      console.log('✗ Expected welcome message with username');
      process.exitCode = 1;
    }

    // Verify authenticated status is shown
    if (bodyText.includes('You are successfully authenticated')) {
      console.log('✓ Authenticated status message is shown');
    } else {
      console.log('✗ Expected authenticated status message');
      process.exitCode = 1;
    }

    // Verify "Not Authenticated" fallback is NOT shown (this also covers login prompt)
    if (!bodyText.includes('Not Authenticated')) {
      console.log('✓ "Not Authenticated" message is not shown for logged-in user');
    } else {
      console.log('✗ "Not Authenticated" should not appear for logged-in users');
      process.exitCode = 1;
    }

    console.log('[Test] All logged-in dashboard tests passed');
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

testLoggedInDashboard();
