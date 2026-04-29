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

async function testTestpage() {
  const args = ['serve', '--host', lpdopts.host, '--port', lpdopts.port];
  const proc = spawn(LIGHTPANDA_PATH, args);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Navigate to testpage');

    await page.goto(`${BASE_URL}/testpage`);
    await page.waitForSelector('h1');

    const heading = await page.$eval('h1', el => el.textContent);
    const description = await page.$eval('[data-testid="description"]', el => el.textContent);

    if (heading === 'Test Page') {
      console.log('✓ Page heading is correct');
    } else {
      console.log('✗ Expected heading "Test Page", got:', heading);
      process.exitCode = 1;
    }

    if (description.includes('E2E testing')) {
      console.log('✓ Page description is correct');
    } else {
      console.log('✗ Expected description with "E2E testing", got:', description);
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

testTestpage();
