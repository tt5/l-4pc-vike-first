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

async function runAuthTests() {
  // Start Lightpanda
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', 
    ['serve', '--host', lpdopts.host, '--port', lpdopts.port]);
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'testuser_' + Date.now();

    // Test 1: Register new user
    console.log('\n[Test 1] Register...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#username');
    
    // Click Register tab first
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const registerBtn = buttons.find(b => b.textContent?.includes('Register'));
      registerBtn?.click();
    });
    await page.waitForTimeout(100);
    
    await page.type('#username', testUsername);
    await page.type('#password', 'testpass123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    console.log('✓ Register successful, redirected to:', page.url());

    // Test 2: Check session persistence (reload)
    console.log('\n[Test 2] Session persistence...');
    await page.goto(`${BASE_URL}/dashboard`);
    const userInfo = await page.$eval('[data-testid="user-info"]', el => el.textContent)
      .catch(() => null);
    console.log(userInfo ? `✓ User info found: ${userInfo}` : '✗ User info not found');

    // Test 3: Logout
    console.log('\n[Test 3] Logout...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const logoutBtn = buttons.find(b => b.textContent?.includes('Logout'));
      logoutBtn?.click();
    });
    await page.waitForNavigation();
    console.log('✓ Logged out, redirected to:', page.url());

    // Test 4: Verify protected route redirects
    console.log('\n[Test 4] Protected route redirect...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForNetworkIdle();
    const currentUrl = page.url();
    console.log(currentUrl.includes('/login') ? '✓ Redirects to login' : '✗ No redirect');

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

runAuthTests();