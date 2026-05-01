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

async function testAuthFull() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Track test failures for cleanup decision
  let hasFailures = false;

  // Generate unique username to avoid conflicts
  const testUsername = 'authtest_' + Date.now();
  console.log('[Test] Starting full auth flow test for user: ' + testUsername);

  // Store auth token from API calls
  let authToken = null;

  try {
    // =================================================================
    // STEP 1: Non-logged in state verification
    // =================================================================
    console.log('\n[Step 1] Verify non-logged-in state on dashboard');
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(500);
    await page.waitForSelector('h2');

    const dashboardHeading = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent : '';
    });
    const dashboardBody = await page.evaluate(() => document.body.textContent);

    if (dashboardHeading.includes('Not Authenticated')) {
      console.log('  ✓ Dashboard shows "Not Authenticated" for anonymous user');
    } else {
      console.log('  ✗ Expected "Not Authenticated" heading, got:', dashboardHeading);
      hasFailures = true;
    }

    if (dashboardBody.includes('You must be logged in to view this page')) {
      console.log('  ✓ Page shows appropriate message for non-logged-in user');
    } else {
      console.log('  ✗ Expected "You must be logged in" message');
      hasFailures = true;
    }

    // Verify protected content is NOT shown
    if (!dashboardBody.includes('Dashboard (Protected)')) {
      console.log('  ✓ Protected dashboard content is not shown for anonymous user');
    } else {
      console.log('  ✗ Protected dashboard content should not be visible to anonymous users');
      hasFailures = true;
    }

    // Verify login link is shown
    const hasLoginLink = await page.evaluate(() => {
      return document.querySelector('a[href="/login"]') !== null;
    });
    if (hasLoginLink) {
      console.log('  ✓ Login link is shown for non-logged-in user');
    } else {
      console.log('  ✗ Login link should be shown for non-logged-in user');
      hasFailures = true;
    }

    console.log('\n[Step 2] Verify non-logged-in state on logout page');
    await page.goto(`${BASE_URL}/logout`);
    await page.waitForSelector('h2');

    const logoutHeading = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent : '';
    });
    const logoutBody = await page.evaluate(() => document.body.textContent);

    if (logoutHeading.includes('Not Logged In')) {
      console.log('  ✓ Logout page shows "Not Logged In" for anonymous user');
    } else {
      console.log('  ✗ Expected "Not Logged In" heading, got:', logoutHeading);
      hasFailures = true;
    }

    if (logoutBody.includes('You are not currently logged in')) {
      console.log('  ✓ Page shows appropriate message for non-logged-in user');
    } else {
      console.log('  ✗ Expected "not currently logged in" message');
      hasFailures = true;
    }

    // =================================================================
    // STEP 2: Registration
    // =================================================================
    console.log('\n[Step 3] Register new user');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForSelector('#reg-username');

    await page.type('#reg-username', testUsername);
    await page.type('#reg-password', 'testpass123');
    await page.type('#confirm-password', 'testpass123');

    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const registerUrl = page.url();
    if (registerUrl === `${BASE_URL}/login?registered=true`) {
      console.log('  ✓ Registration successful, redirected to /login?registered=true');
    } else {
      console.log('  ✗ Expected redirect to /login?registered=true, got:', registerUrl);
      hasFailures = true;
    }

    // =================================================================
    // STEP 3: Login
    // =================================================================
    console.log('\n[Step 4] Login with registered user');
    const loginFormData = new URLSearchParams();
    loginFormData.append('username', testUsername);
    loginFormData.append('password', 'testpass123');

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: loginFormData,
      redirect: 'manual'
    });

    const setCookie = loginRes.headers.get('set-cookie');
    authToken = parseCookie(setCookie);

    if (loginRes.status === 302 && loginRes.headers.get('location') === '/login?login=true' && authToken) {
      console.log('  ✓ Login successful, got auth token');
    } else {
      console.log('  ✗ Login failed. Status:', loginRes.status, 'Location:', loginRes.headers.get('location'));
      hasFailures = true;
    }

    // =================================================================
    // STEP 4: Authenticated state verification
    // =================================================================
    console.log('\n[Step 5] Verify authenticated state on dashboard');
    await page.setCookie({
      name: 'auth-token',
      value: authToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await delay(500);
    await page.waitForSelector('h1');

    const authDashboardBody = await page.evaluate(() => document.body.textContent);

    if (authDashboardBody.includes('Dashboard (Protected)')) {
      console.log('  ✓ Dashboard shows protected heading for logged-in user');
    } else {
      console.log('  ✗ Expected "Dashboard (Protected)" heading');
      hasFailures = true;
    }

    if (authDashboardBody.includes(`Welcome, ${testUsername}`)) {
      console.log('  ✓ Page shows welcome message with username');
    } else {
      console.log('  ✗ Expected welcome message with username');
      hasFailures = true;
    }

    if (authDashboardBody.includes('You are successfully authenticated')) {
      console.log('  ✓ Authenticated status message is shown');
    } else {
      console.log('  ✗ Expected authenticated status message');
      hasFailures = true;
    }

    if (!authDashboardBody.includes('Not Authenticated')) {
      console.log('  ✓ "Not Authenticated" message is not shown for logged-in user');
    } else {
      console.log('  ✗ "Not Authenticated" should not appear for logged-in users');
      hasFailures = true;
    }

    console.log('\n[Step 6] Verify authenticated state on logout page');
    await page.goto(`${BASE_URL}/logout`);
    await page.waitForSelector('h2');

    const authLogoutHeading = await page.$eval('h2', el => el.textContent);
    const authLogoutBody = await page.evaluate(() => document.body.textContent);

    if (authLogoutHeading === 'Logout') {
      console.log('  ✓ Logout page shows "Logout" heading for logged-in user');
    } else {
      console.log('  ✗ Expected "Logout" heading, got:', authLogoutHeading);
      hasFailures = true;
    }

    if (authLogoutBody.includes(`Logged in as ${testUsername}`)) {
      console.log('  ✓ Page shows logged-in username');
    } else {
      console.log('  ✗ Expected to see logged-in username');
      hasFailures = true;
    }

    const hasLogoutButton = await page.evaluate(() => {
      return document.querySelector('form[action="/api/auth/logout"]') !== null;
    });
    if (hasLogoutButton) {
      console.log('  ✓ Logout button is shown for logged-in user');
    } else {
      console.log('  ✗ Logout button should be shown for logged-in user');
      hasFailures = true;
    }

    // =================================================================
    // STEP 5: Logout
    // =================================================================
    console.log('\n[Step 7] Logout via API');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': `auth-token=${authToken}`
      },
      redirect: 'manual'
    });

    if (logoutRes.status === 302 && logoutRes.headers.get('location') === '/logout?success=true') {
      console.log('  ✓ Logout API call successful');
    } else {
      console.log('  ✗ Logout failed. Status:', logoutRes.status, 'Location:', logoutRes.headers.get('location'));
      hasFailures = true;
    }

    // Clear the cookie from browser
    await page.deleteCookie({ name: 'auth-token', domain: 'localhost' });

    console.log('\n[Step 8] Verify session was removed');
    await page.goto(`${BASE_URL}/logout`);
    await delay(500);
    await page.waitForSelector('h2');

    const afterLogoutHeading = await page.$eval('h2', el => el.textContent);
    if (afterLogoutHeading.includes('Not Logged In')) {
      console.log('  ✓ Session removed - logout page shows "Not Logged In"');
    } else {
      console.log('  ✗ Expected "Not Logged In" after logout, got:', afterLogoutHeading);
      hasFailures = true;
    }

    // =================================================================
    // STEP 6: Account deletion (final cleanup)
    // =================================================================
    if (hasFailures) {
      console.log('\n[Cleanup] Skipping account deletion due to test failures');
      process.exitCode = 1;
    } else {
      console.log('\n[Step 9] Delete account');

      // Re-login to get fresh token for deletion
      const reloginFormData = new URLSearchParams();
      reloginFormData.append('username', testUsername);
      reloginFormData.append('password', 'testpass123');

      const reloginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: reloginFormData,
        redirect: 'manual'
      });

      const reloginCookie = reloginRes.headers.get('set-cookie');
      const deleteToken = parseCookie(reloginCookie);

      if (reloginRes.status === 302 && deleteToken) {
        console.log('  ✓ Re-login successful for deletion');
      } else {
        console.log('  ✗ Re-login failed for deletion. Status:', reloginRes.status);
        hasFailures = true;
        process.exitCode = 1;
        return;
      }

      // Call delete API
      const deleteRes = await fetch(`${BASE_URL}/api/auth/delete`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${deleteToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const deleteData = await deleteRes.json();

      if (deleteRes.status === 200 && deleteData.success) {
        console.log('  ✓ Delete account API call successful');
      } else {
        console.log('  ✗ Delete failed. Status:', deleteRes.status, 'Error:', deleteData.error);
        hasFailures = true;
        process.exitCode = 1;
        return;
      }

      // Verify account was deleted by trying to access dashboard
      console.log('\n[Step 10] Verify account was deleted');
      await page.setCookie({
        name: 'auth-token',
        value: deleteToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true
      });

      await page.goto(`${BASE_URL}/dashboard`);
      await delay(500);
      await page.waitForSelector('h2');

      const afterDeleteBody = await page.evaluate(() => document.body.textContent);

      if (afterDeleteBody.includes('Not Authenticated')) {
        console.log('  ✓ Account deleted - dashboard shows "Not Authenticated"');
      } else {
        console.log('  ✗ Expected "Not Authenticated" after account deletion');
        hasFailures = true;
        process.exitCode = 1;
      }

      if (!afterDeleteBody.includes('Dashboard (Protected)')) {
        console.log('  ✓ Protected dashboard content is not shown for deleted user');
      } else {
        console.log('  ✗ Protected content should not appear for deleted user');
        hasFailures = true;
        process.exitCode = 1;
      }

      if (!hasFailures) {
        console.log('\n[Test] All auth flow tests passed successfully');
      } else {
        console.log('\n[Test] Some auth flow tests failed');
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await page.close();
    await context.close();
    await browser.disconnect();
    proc.kill();
  }
}

testAuthFull();
