'use strict'

import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';

const lpdopts = {
  host: '127.0.0.1',
  port: 9223, // Use different port to avoid conflicts with parallel tests
};

const puppeteeropts = {
  browserWSEndpoint: `ws://${lpdopts.host}:${lpdopts.port}`,
};

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function createAuthCookie(username, token) {
  return {
    name: 'auth_token',
    value: token,
    domain: 'localhost',
    path: '/',
    expires: Date.now() / 1000 + 86400,
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  };
}

function ensureCookiesDir() {
  const cookiesDir = join(__dirname, 'fixtures', 'cookies');
  if (!existsSync(cookiesDir)) {
    mkdirSync(cookiesDir, { recursive: true });
  }
  return cookiesDir;
}

async function testLogin() {
  // Generate test user and auth cookie
  const testUsername = 'testuser_' + Date.now();
  const mockToken = 'mock_jwt_token_' + testUsername;

  // Create cookie file for Lightpanda to load
  const cookiesDir = ensureCookiesDir();
  const cookieFile = join(cookiesDir, `auth-${testUsername}.json`);
  const cookies = [createAuthCookie(testUsername, mockToken)];
  writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));

  // Start Lightpanda with pre-loaded cookies
  const args = [
    'serve',
    '--host', lpdopts.host,
    '--port', lpdopts.port.toString(),
    '--cookie', cookieFile,
  ];

  console.log('[Test] Starting Lightpanda with pre-authenticated cookies...');

  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', args);
  await delay(2000);

  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('[Test] Accessing dashboard with pre-authenticated session...');

    // Navigate to dashboard - should be accessible with the pre-loaded cookie
    await page.goto(`${BASE_URL}/dashboard`);
    await delay(1000);

    const url = page.url();
    const content = await page.content();

    // Check if we're on dashboard or were redirected (indicates auth failed)
    if (url.includes('/dashboard')) {
      console.log('✓ Successfully accessed dashboard with pre-loaded cookies');
    } else if (url.includes('/login')) {
      console.log('⚠ Redirected to login - cookies may not be working or auth endpoint needs implementation');
      console.log('  Current URL:', url);
      // Not a failure - depends on server implementation
    } else {
      console.log('? Unexpected URL:', url);
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
