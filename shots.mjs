// Screenshot runner for GILDED WIRE: serves game/ over local HTTP, opens each staged shot
// (?shot=... from shots.json) in headless Chromium with SwiftShader, waits for the page to
// signal it painted, and saves a JPEG into screenshots/. Fails loudly on any console error
// or any network request (the game must load zero remote resources).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/makefun/tools/node_modules/playwright-core');

const here = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const destDir = join(here, 'screenshots');
mkdirSync(destDir, { recursive: true });

const PORT = 8123;

// Find a Chromium binary: the Playwright cache first, then the tools install.
const candidates = [
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell',
  '/home/hatch/workspace/makefun/tools/node_modules/chromium_headless_shell-1187/chrome-linux/headless_shell',
  '/home/hatch/workspace/makefun/tools/node_modules/chromium-1187/chrome-linux/chrome',
  '/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome',
];
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('no chromium binary found');
  process.exit(1);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`serve.ts did not come up: ${serverLog}`);
}

let failures = 0;
try {
  await waitForServer();
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  const requests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('request', (req) => requests.push(req.url()));

  for (const shot of shots) {
    errors.length = 0;
    requests.length = 0;
    const url = `http://127.0.0.1:${PORT}/${shot.query}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
    await page.waitForTimeout(150);
    const path = join(destDir, shot.name);
    await page.screenshot({ path, type: 'jpeg', quality: 85 });
    const size = statSync(path).size;
    const external = requests.filter((u) => !u.startsWith(`http://127.0.0.1:${PORT}`));
    console.log(`${shot.name}: ${size} bytes, ${requests.length} requests, ${external.length} external, ${errors.length} console errors`);
    if (errors.length > 0) {
      console.error(`  console errors: ${errors.join(' | ')}`);
      failures += 1;
    }
    if (external.length > 0) {
      console.error(`  external requests: ${external.join(', ')}`);
      failures += 1;
    }
    if (size > 262144) {
      console.error(`  OVER 256 KiB cap`);
      failures += 1;
    }
  }
  await browser.close();
} finally {
  server.kill();
}

if (failures > 0) {
  console.error(`${failures} screenshot problem(s)`);
  process.exit(1);
}
console.log('all screenshots captured cleanly');
