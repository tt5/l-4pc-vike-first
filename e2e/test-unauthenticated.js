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

async function testUnauthenticated() {
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', 
    ['serve', '--host', lpdopts.host, '--port', lpdopts.port]);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Access dashboard while NOT authenticated...');
    
    // Clear any potential session data by using fresh context
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(1000);
    
    const url = page.url();
    
    // Dashboard should redirect to /login when not authenticated
    if (url === `${BASE_URL}/login` || url.includes('/login')) {
      console.log('✓ Redirected to login as expected');
    } else if (url === `${BASE_URL}/dashboard`) {
      // Check if we're on dashboard but showing "Loading..." or redirected client-side
      const pageContent = await page.evaluate(() => document.body.textContent);
      if (pageContent.includes('Login') || pageContent.includes('Authentication')) {
        console.log('✓ Redirected to login (client-side)');
      } else {
        console.log('✗ Stayed on dashboard without auth');
        process.exitCode = 1;
      }
    } else {
      console.log('✗ Unexpected URL:', url);
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

testUnauthenticated();
