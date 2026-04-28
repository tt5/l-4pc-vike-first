'use strict'

import { spawn } from 'child_process';
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

async function testLogin() {
  // Start Lightpanda with optional cookie file for faster subsequent runs
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];

  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', args);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'testuser';
    console.log('[Test] Login with user: ' + testUsername);

    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#username');

    await page.type('#username', testUsername);
    await page.type('#password', 'testpass123');

    await page.click('button[type="submit"]');

    // Wait for login and redirect to dashboard
    await page.waitForNavigation();
    const url = page.url();

    if (url === `${BASE_URL}/dashboard`) {
      console.log('✓ Login successful, redirected to dashboard');
    } else {
      console.log('✗ Expected redirect to /dashboard, got:', url);
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
