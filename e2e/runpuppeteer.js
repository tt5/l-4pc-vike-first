'use strict'
 
import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';
 
const lpdopts = {
  host: '127.0.0.1',
  port: 9222,
};
 
const puppeteeropts = {
  browserWSEndpoint: 'ws://' + lpdopts.host + ':' + lpdopts.port,
};
 
(async () => {
  // Start Lightpanda browser in a separate process.
  const proc = spawn('/home/n/.cache/lightpanda-node/lightpanda', ['serve', '--host', lpdopts.host, '--port', lpdopts.port]);
  await new Promise(resolve => setTimeout(resolve, 2000));
 
  // Connect Puppeteer to the browser.
  const browser = await puppeteer.connect(puppeteeropts);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/register');
  await page.waitForNetworkIdle();

  // Get the page source
  const html = await page.content();
  console.log('Page source:', html);
 
  // Disconnect Puppeteer.
  await page.close();
  await context.close();
  await browser.disconnect();
 
  // Stop Lightpanda browser process.
  proc.stdout.destroy();
  proc.stderr.destroy();
  proc.kill();
})();