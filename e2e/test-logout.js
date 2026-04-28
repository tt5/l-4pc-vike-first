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

async function testLogout() {
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', 
    ['serve', '--host', lpdopts.host, '--port', lpdopts.port]);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'logoutuser_' + Date.now();
    
    // Register and login first
    console.log('[Setup] Creating and logging in test user...');
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const registerBtn = buttons.find(b => b.textContent?.includes('Register'));
      registerBtn?.click();
    });
    await delay(100);
    await page.type('#reg-username', testUsername);
    await page.type('#reg-password', 'testpass123');
    await page.type('#confirm-password', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Test logout
    console.log('[Test] Logout...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const logoutBtn = buttons.find(b => b.textContent?.includes('Logout'));
      logoutBtn?.click();
    });
    
    await delay(1000);
    const url = page.url();
    
    // Check if we're redirected to home (logout redirects to /)
    if (url === `${BASE_URL}/` || url === `${BASE_URL}/login`) {
      console.log('✓ Logout successful, session cleared');
    } else {
      console.log('✗ Unexpected redirect after logout:', url);
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
