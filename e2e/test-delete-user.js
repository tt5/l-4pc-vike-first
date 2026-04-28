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

async function testDeleteUser() {
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', 
    ['serve', '--host', lpdopts.host, '--port', lpdopts.port]);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    const testUsername = 'deleteuser_' + Date.now();
    
    // Register and login
    console.log('[Setup] Creating test user...');
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
    
    // Navigate to dashboard where delete button is
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(500);
    
    // Test delete account
    console.log('[Test] Delete user account...');
    
    // Click delete account button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const deleteBtn = buttons.find(b => b.textContent?.includes('Delete Account'));
      deleteBtn?.click();
    });
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });
    
    await delay(1500);
    const url = page.url();
    
    // After deletion, should be redirected
    if (url === `${BASE_URL}/` || url === `${BASE_URL}/login`) {
      console.log('✓ Account deleted, redirected to:', url);
    } else {
      console.log('✗ Unexpected URL after delete:', url);
      process.exitCode = 1;
    }
    
    // Verify cannot login again
    console.log('[Test] Verify deleted user cannot login...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#username');
    await page.type('#username', testUsername);
    await page.type('#password', 'testpass123');
    await page.click('button[type="submit"]');
    
    await delay(1000);
    const errorText = await page.evaluate(() => {
      const errorDiv = document.querySelector('[style*="color: red"]');
      return errorDiv?.textContent || '';
    });
    
    if (errorText || page.url().includes('/login')) {
      console.log('✓ Deleted user cannot login');
    } else {
      console.log('✗ Deleted user was able to login (unexpected)');
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

testDeleteUser();
