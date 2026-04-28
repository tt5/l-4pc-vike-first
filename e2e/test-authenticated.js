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

async function testAuthenticated() {
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', 
    ['serve', '--host', lpdopts.host, '--port', lpdopts.port]);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'authuser_' + Date.now();
    
    // Register and login
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
    
    // Test accessing protected route while authenticated
    console.log('[Test] Access dashboard while authenticated...');
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(500);
    
    const url = page.url();
    const welcomeText = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2?.textContent || '';
    });
    
    if (url === `${BASE_URL}/dashboard` && welcomeText.includes('Welcome')) {
      console.log('✓ Protected route accessible, user:', welcomeText);
    } else {
      console.log('✗ Dashboard not accessible or user not shown');
      console.log('  URL:', url);
      console.log('  Welcome:', welcomeText);
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

testAuthenticated();
