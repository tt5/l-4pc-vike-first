'use strict';

import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_LPD_OPTS = {
  host: '127.0.0.1',
  port: 9222,
};

class BrowserPool {
  constructor(maxBrowsers = 4) {
    this.maxBrowsers = maxBrowsers;
    this.available = [];
    this.inUse = new Set();
    this.processes = [];
    this.basePort = 9222;
    this.nextPort = this.basePort;
  }

  async acquire() {
    if (this.available.length > 0) {
      const browser = this.available.pop();
      this.inUse.add(browser);
      return browser;
    }

    if (this.inUse.size < this.maxBrowsers) {
      const browser = await this.spawnBrowser();
      this.inUse.add(browser);
      return browser;
    }

    // Wait for a browser to become available
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.acquire();
  }

  async spawnBrowser() {
    const port = this.nextPort++;
    const proc = spawn(
      '/home/n/.cache/lightpanda-node/lightpanda',
      ['serve', '--host', '127.0.0.1', '--port', port.toString()],
      { stdio: 'pipe' }
    );

    // Wait for browser to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Browser on port ${port} failed to start`));
      }, 5000);

      let output = '';
      const checkReady = (data) => {
        output += data.toString();
        if (output.includes('Listening') || output.includes('CDP server ready')) {
          clearTimeout(timeout);
          proc.stdout.off('data', checkReady);
          resolve();
        }
      };

      proc.stdout.on('data', checkReady);
      proc.stderr.on('data', checkReady);
    });

    await new Promise(resolve => setTimeout(resolve, 500)); // Small buffer

    const browser = await puppeteer.connect({
      browserWSEndpoint: `ws://127.0.0.1:${port}`,
    });

    browser._port = port;
    browser._proc = proc;
    this.processes.push({ browser, proc, port });

    return browser;
  }

  async release(browser) {
    this.inUse.delete(browser);
    this.available.push(browser);
  }

  async closeAll() {
    for (const { browser, proc } of this.processes) {
      try {
        await browser.disconnect();
      } catch (e) {}
      proc.kill();
    }
    this.processes = [];
    this.available = [];
    this.inUse.clear();
  }
}

export class TestContext {
  constructor(browser, options = {}) {
    this.browser = browser;
    this.options = options;
    this.page = null;
    this.context = null;
  }

  async init() {
    this.context = await this.browser.createBrowserContext();
    this.page = await this.context.newPage();

    if (this.options.cookies) {
      await this.page.setCookie(...this.options.cookies);
    }

    return this;
  }

  async goto(url, options = {}) {
    await this.page.goto(url, options);
    return this.page;
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
  }
}

export function createCookie(name, value, domain, options = {}) {
  return {
    name,
    value,
    domain,
    path: options.path || '/',
    expires: options.expires || Date.now() / 1000 + 86400,
    httpOnly: options.httpOnly !== false,
    secure: options.secure !== false,
    sameSite: options.sameSite || 'Lax',
  };
}

export function generateAuthCookie(username, token) {
  // Match your auth cookie format from the app
  return createCookie('auth_token', token, 'localhost', {
    httpOnly: true,
    secure: false, // localhost
  });
}

export function saveCookiesToFile(cookies, filename) {
  const fixturesDir = join(__dirname, '..', 'fixtures', 'cookies');
  if (!existsSync(fixturesDir)) {
    mkdirSync(fixturesDir, { recursive: true });
  }

  const filepath = join(fixturesDir, filename);
  writeFileSync(filepath, JSON.stringify(cookies, null, 2));
  return filepath;
}

export function loadCookiesFromFile(filename) {
  const fixturesDir = join(__dirname, '..', 'fixtures', 'cookies');
  const filepath = join(fixturesDir, filename);

  if (!existsSync(filepath)) {
    return null;
  }

  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { BrowserPool };
