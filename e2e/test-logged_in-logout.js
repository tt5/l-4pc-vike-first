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

async function testLoggedInLogout() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'testuser1';
    console.log('[Test] Login with user: ' + testUsername);

    // Step 1: Login via API (POST form data)
    // First navigate to establish the browser context, then use fetch
    await page.goto(`${BASE_URL}/login`);

    const loginResponse = await page.evaluate(async (username, password) => {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      });
      return {
        status: response.status,
        location: response.headers.get('location')
      };
    }, testUsername, 'testpass123');

    if (loginResponse.location === '/login?login=true') {
      console.log('✓ Login API call successful');
    } else {
      console.log('✗ Expected redirect to /login?login=true, got:', loginResponse.location);
      process.exitCode = 1;
      return;
    }

    // Step 2: Navigate to logout page and verify logged-in state (SSR)
    console.log('[Test] Visit logout page while logged in');
    await page.goto(`${BASE_URL}/logout`);
    await page.waitForSelector('h2');

    const headingText = await page.$eval('h2', el => el.textContent);
    const bodyText = await page.evaluate(() => document.body.textContent);

    if (headingText === 'Logout') {
      console.log('✓ Logout page shows "Logout" heading for logged-in user');
    } else {
      console.log('✗ Expected "Logout" heading, got:', headingText);
      process.exitCode = 1;
    }

    if (bodyText.includes(`Logged in as ${testUsername}`)) {
      console.log('✓ Page shows logged-in username');
    } else {
      console.log('✗ Expected to see logged-in username');
      process.exitCode = 1;
    }

    // Verify logout form is shown
    const hasLogoutButton = await page.evaluate(() => {
      return document.querySelector('form[action="/api/auth/logout"]') !== null;
    });

    if (hasLogoutButton) {
      console.log('✓ Logout button is shown for logged-in user');
    } else {
      console.log('✗ Logout button should be shown for logged-in user');
      process.exitCode = 1;
    }

    // Step 3: Logout via API (POST form data)
    console.log('[Test] Call logout API');
    const logoutResponse = await page.evaluate(async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        redirect: 'manual'
      });
      return {
        status: response.status,
        location: response.headers.get('location')
      };
    });

    if (logoutResponse.location === '/logout?success=true') {
      console.log('✓ Logout API call successful, redirected to success page');
    } else {
      console.log('✗ Expected redirect to /logout?success=true, got:', logoutResponse.location);
      process.exitCode = 1;
    }

    // Step 4: Navigate to logout success page and verify (SSR)
    await page.goto(`${BASE_URL}/logout?success=true`);
    await page.waitForSelector('h2');

    const successHeading = await page.$eval('h2', el => el.textContent);
    const successBody = await page.evaluate(() => document.body.textContent);

    if (successHeading.includes('Successfully logged out')) {
      console.log('✓ Success page shows "Successfully logged out"');
    } else {
      console.log('✗ Expected "Successfully logged out" heading, got:', successHeading);
      process.exitCode = 1;
    }

    if (successBody.includes('You have been logged out')) {
      console.log('✓ Success page shows confirmation message');
    } else {
      console.log('✗ Expected "You have been logged out" message');
      process.exitCode = 1;
    }

    // Step 5: Verify session is gone (navigate back to logout, should show "Not Logged In")
    console.log('[Test] Verify session was removed');
    await page.goto(`${BASE_URL}/logout`);
    await page.waitForSelector('h2');

    const finalHeading = await page.$eval('h2', el => el.textContent);
    if (finalHeading.includes('Not Logged In')) {
      console.log('✓ Session removed - logout page shows "Not Logged In"');
    } else {
      console.log('✗ Expected "Not Logged In" after logout, got:', finalHeading);
      process.exitCode = 1;
    }

    console.log('[Test] All logged-in logout tests passed');
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

testLoggedInLogout();
