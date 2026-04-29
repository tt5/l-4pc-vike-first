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

const LIGHTPANDA_PATH = process.env.LIGHTPANDA_PATH || `${homedir()}/.cache/lightpanda-node/lightpanda`;

async function testLogout() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Click logout button (not logged in)');

    // Go directly to logout page (no login)
    await page.goto(`${BASE_URL}/logout`);
    
    // Click the logout button
    await page.waitForSelector('button');
    await page.click('button');

    // Wait for navigation to complete (same as login test)
    console.log('Waiting for navigation to complete...');
    await page.waitForNavigation();
    
    const url = page.url();
    
    if (url === `${BASE_URL}/logout?success=true`) {
      console.log('✓ Logout clicked, URL shows success=true');
    } else {
      console.log('✗ Expected /logout?success=true, got:', url);
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

testLogout();
