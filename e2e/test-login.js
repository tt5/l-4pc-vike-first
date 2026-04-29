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

async function testLogin() {
  // Start Lightpanda with optional cookie file for faster subsequent runs
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];

  const proc = spawn(LIGHTPANDA_PATH, args);
  await waitForLightpanda(lpdopts.host, lpdopts.port);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'testuser1';
    console.log('[Test] Login with user: ' + testUsername);

    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#username');

    await page.type('#username', testUsername);
    await page.type('#password', 'testpass123');

    await page.click('button[type="submit"]');

    // Wait for login and redirect
    await page.waitForNavigation();
    const url = page.url();

    if (url === `${BASE_URL}/login?login=true`) {
      console.log('✓ Login successful, redirected to login page');
    } else {
      console.log('✗ Expected redirect to /login?login=true, got:', url);
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

testLogin();
