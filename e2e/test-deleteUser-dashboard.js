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

async function testDeleteUserDashboard() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Store auth token from API calls
  let authToken = null;

  try {
    // Generate unique username to avoid conflicts with parallel tests
    const testUsername = 'deleteuser_' + Date.now();
    console.log('[Test] Register and test deletion for user: ' + testUsername);

    // Step 0: Register a new user via API
    console.log('[Test] Register new user: ' + testUsername);
    const regFormData = new URLSearchParams();
    regFormData.append('username', testUsername);
    regFormData.append('password', 'testpass123');

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: regFormData,
      redirect: 'manual'
    });

    if (regRes.status === 302 && regRes.headers.get('location') === '/login?registered=true') {
      console.log('✓ Registration successful');
    } else {
      console.log('✗ Registration failed. Status:', regRes.status, 'Location:', regRes.headers.get('location'));
      process.exitCode = 1;
      return;
    }

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

    // Step 2: Navigate to dashboard and verify "Delete Account" button is visible
    console.log('[Test] Visit dashboard and verify Delete Account button');
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
      console.log('✗ Expected welcome message with username:', testUsername);
      process.exitCode = 1;
    }

    // Verify "Danger Zone" section is present
    if (bodyText.includes('Danger Zone')) {
      console.log('✓ Danger Zone section is visible');
    } else {
      console.log('✗ Expected "Danger Zone" section');
      process.exitCode = 1;
    }

    // Verify "Delete Account" button is shown
    const hasDeleteButton = await page.evaluate(() => {
      return document.body.textContent.includes('Delete Account');
    });

    if (hasDeleteButton) {
      console.log('✓ Delete Account button is shown');
    } else {
      console.log('✗ Delete Account button should be shown');
      process.exitCode = 1;
    }

    // Step 3: Delete account via API
    console.log('[Test] Call delete account API');
    const deleteRes = await fetch(`${BASE_URL}/api/auth/delete`, {
      method: 'DELETE',
      headers: {
        'Cookie': `auth-token=${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const deleteData = await deleteRes.json();

    if (deleteRes.status === 200 && deleteData.success) {
      console.log('✓ Delete account API call successful');
    } else {
      console.log('✗ Delete failed. Status:', deleteRes.status, 'Error:', deleteData.error);
      process.exitCode = 1;
      return;
    }

    // Clear the cookie from browser (server clears it via Set-Cookie header)
    await page.deleteCookie({ name: 'auth-token', domain: 'localhost' });

    // Step 4: Verify session was removed by reloading dashboard
    console.log('[Test] Verify session was removed - reload dashboard');
    await page.evaluate(() => {
      location.href = '/dashboard';
    });
    await delay(1000);
    await page.waitForSelector('h2');

    const finalBodyText = await page.evaluate(() => document.body.textContent);

    // Verify "Not Authenticated" message is shown after deletion
    if (finalBodyText.includes('Not Authenticated')) {
      console.log('✓ Session removed - dashboard shows "Not Authenticated"');
    } else {
      console.log('✗ Expected "Not Authenticated" after account deletion');
      process.exitCode = 1;
    }

    // Verify protected content is NOT shown
    if (!finalBodyText.includes('Dashboard (Protected)')) {
      console.log('✓ Protected dashboard content is not shown for deleted user');
    } else {
      console.log('✗ Protected content should not appear for deleted user');
      process.exitCode = 1;
    }

    // Verify "Danger Zone" is NOT shown
    if (!finalBodyText.includes('Danger Zone')) {
      console.log('✓ Danger Zone section is not shown for deleted user');
    } else {
      console.log('✗ Danger Zone should not appear for deleted user');
      process.exitCode = 1;
    }

    console.log('[Test] All delete account dashboard tests passed');
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

testDeleteUserDashboard();
