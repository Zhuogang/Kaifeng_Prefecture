// Shared Linux software-GL launch path for stills, sessions and navigation checks.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';

export async function launchBrowser({ width = 1672, height = 941, timeout = 900000 } = {}) {
  const executablePath = process.env.CHROME || path.join(os.homedir(),
    '.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell');
  if (!fs.existsSync(executablePath)) throw new Error(`Chromium not found: ${executablePath}; set CHROME`);
  fs.mkdirSync('out/tmp', { recursive: true });
  const profile = fs.mkdtempSync(path.resolve('out/tmp/chromium-'));
  try {
    const browser = await puppeteer.launch({
      executablePath, headless: 'shell', pipe: true, userDataDir: profile, protocolTimeout: timeout,
      args: [
        '--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server',
        '--use-angle=' + (process.env.ANGLE || 'vulkan'), '--enable-features=Vulkan', '--ignore-gpu-blocklist',
        '--disable-gpu-watchdog', '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
      ],
      defaultViewport: { width: Math.min(width, 1920), height: Math.min(height, 1080) },
    });
    browser.once('disconnected', () => fs.rmSync(profile, { recursive: true, force: true }));
    return browser;
  } catch (error) {
    fs.rmSync(profile, { recursive: true, force: true });
    throw error;
  }
}

export function observeErrors(page) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const assertClean = () => { if (errors.length) throw new Error(errors.join('\n')); };
  assertClean.reset = () => { errors.length = 0; };
  return assertClean;
}
