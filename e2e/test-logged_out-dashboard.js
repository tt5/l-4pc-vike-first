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

async function testLoggedOutDashboard() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Visit dashboard page while not logged in');

    // Go directly to dashboard page without logging in first
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(500);
    await page.waitForSelector('h2');

    // Check that the page shows "Not Authenticated" message
    const headingText = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent : '';
    });

    const bodyText = await page.evaluate(() => document.body.textContent);

    if (headingText.includes('Not Authenticated')) {
      console.log('✓ Dashboard shows "Not Authenticated" for anonymous user');
    } else {
      console.log('✗ Expected "Not Authenticated" heading, got:', headingText);
      process.exitCode = 1;
    }

    if (bodyText.includes('You must be logged in to view this page')) {
      console.log('✓ Page shows appropriate message for non-logged-in user');
    } else {
      console.log('✗ Expected "You must be logged in" message');
      process.exitCode = 1;
    }

    // Verify protected content is NOT shown
    if (!bodyText.includes('Dashboard (Protected)')) {
      console.log('✓ Protected dashboard content is not shown for anonymous user');
    } else {
      console.log('✗ Protected dashboard content should not be visible to anonymous users');
      process.exitCode = 1;
    }

    if (!bodyText.includes('You are successfully authenticated')) {
      console.log('✓ Authenticated status message is not shown for anonymous user');
    } else {
      console.log('✗ Authenticated status should not be visible to anonymous users');
      process.exitCode = 1;
    }

    // Verify login link is shown
    const hasLoginLink = await page.evaluate(() => {
      const link = document.querySelector('a[href="/login"]');
      return link !== null;
    });

    if (hasLoginLink) {
      console.log('✓ Login link is shown for non-logged-in user');
    } else {
      console.log('✗ Login link should be shown for non-logged-in user');
      process.exitCode = 1;
    }

    console.log('[Test] All logged-out dashboard tests passed');
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

testLoggedOutDashboard();
