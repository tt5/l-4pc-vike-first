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

async function testLoggedOutLogout() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Visit logout page while not logged in');

    // Go directly to logout page without logging in first
    await page.goto(`${BASE_URL}/logout`);
    await page.waitForSelector('h2');

    // Check that the page shows "Not Logged In" message
    const headingText = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent : '';
    });

    const bodyText = await page.evaluate(() => document.body.textContent);

    if (headingText.includes('Not Logged In')) {
      console.log('✓ Logout page shows "Not Logged In" for anonymous user');
    } else {
      console.log('✗ Expected "Not Logged In" heading, got:', headingText);
      process.exitCode = 1;
    }

    if (bodyText.includes('You are not currently logged in')) {
      console.log('✓ Page shows appropriate message for non-logged-in user');
    } else {
      console.log('✗ Expected "not currently logged in" message');
      process.exitCode = 1;
    }

    // Verify logout form is NOT shown
    const hasLogoutButton = await page.evaluate(() => {
      return document.querySelector('form[action="/api/auth/logout"]') !== null;
    });

    if (!hasLogoutButton) {
      console.log('✓ Logout button is not shown for non-logged-in user');
    } else {
      console.log('✗ Logout button should not be shown for non-logged-in user');
      process.exitCode = 1;
    }
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

testLoggedOutLogout();
