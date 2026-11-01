/**
 * Headless web smoke run of the main journeys.
 *
 * Drives the exported web build in Chromium at phone size — onboarding, the Daily
 * Question, a Smart Drill, every tab, the Review deck, a mock paper and Settings — and
 * saves a screenshot plus the visible text of each screen. It is the quick pass to run
 * where no Android emulator is available; the Maestro flows in `e2e/` remain the
 * device-level check.
 *
 *   npx expo export --platform web --output-dir dist
 *   node scripts/web-smoke.cjs dist light   # or: dark
 *
 * Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`,
 * or any global install). Output lands in `web-smoke-<scheme>/`; `issues.txt` lists
 * failed steps and console errors.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(process.argv[2] ?? 'dist');
const scheme = process.argv[3] === 'dark' ? 'dark' : 'light';
const out = path.resolve(`web-smoke-${scheme}`);
const PORT = 8089;
const TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.css': 'text/css',
};

/** Static server with the cross-origin isolation expo-sqlite's web worker needs. */
const serve = () =>
  http
    .createServer((req, res) => {
      let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(root, 'index.html');
      }
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    })
    .listen(PORT);

const main = async () => {
  const { chromium } = require('playwright');
  fs.mkdirSync(out, { recursive: true });
  const server = serve();
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme })
  ).newPage();
  const issues = [];
  page.on('console', (m) => m.type() === 'error' && issues.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));

  let shotIndex = 0;
  const sel = (id) =>
    (id.endsWith('*') ? `[data-testid^="${id.slice(0, -1)}"]` : `[data-testid="${id}"]`) +
    ':visible';
  const waitFor = (id, timeout = 8000) => page.locator(sel(id)).first().waitFor({ timeout });
  const visible = (id) =>
    waitFor(id, 2500).then(
      () => true,
      () => false,
    );
  const tap = async (id) => {
    await waitFor(id);
    await page.locator(sel(id)).first().click();
    await page.waitForTimeout(400);
  };
  const tab = async (label) => {
    await page.locator(`a[role=tab][aria-label^="${label}"]`).last().click();
    await page.waitForTimeout(800);
  };
  const shot = async (name) => {
    shotIndex += 1;
    const file = path.join(out, `${String(shotIndex).padStart(2, '0')}-${name}`);
    await page.screenshot({ path: `${file}.png` });
    fs.writeFileSync(`${file}.txt`, await page.evaluate(() => document.body.innerText));
  };
  const step = async (name, run) => {
    try {
      await run();
    } catch (error) {
      issues.push(`step failed: ${name}: ${String(error.message).split('\n')[0]}`);
      await shot(`FAIL-${name}`);
    }
  };

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  for (const s of [
    'account',
    'level',
    'starting-point',
    'schedule',
    'goal',
    'plan',
    'preferences',
    'done',
  ]) {
    await step(`onboarding-${s}`, async () => {
      await waitFor(`onboarding-step-${s}`);
      if (s === 'level') await tap('track-professional');
      if (s === 'starting-point') await tap('starting-point-beginner');
      await shot(`onboarding-${s}`);
      await tap('onboarding-primary');
    });
  }
  await step('home', async () => {
    await waitFor('screen-home');
    await shot('home');
  });
  await step('daily-question', async () => {
    await tap('home-daily-question');
    await waitFor('quiz-question');
    await tap('quiz-choice-*');
    await shot('quiz-feedback');
    await tap('quiz-next');
    await waitFor('quiz-results');
    await shot('quiz-results');
    await tap('quiz-results-done');
    await waitFor('screen-home');
  });
  await step('smart-drill', async () => {
    await tap('home-smart-drill');
    for (let i = 0; i < 30 && !(await visible('quiz-results')); i += 1) {
      const choices = page.locator(sel('quiz-choice-*'));
      await choices.nth(i % Math.max(1, await choices.count())).click();
      await tap('quiz-next');
    }
    await shot('drill-results');
    await tap('quiz-results-done');
  });
  for (const [label, id] of [
    ['Learn tab', 'screen-learn'],
    ['Practice tab', 'screen-practice'],
    ['Review tab', 'screen-review'],
    ['Progress tab', 'screen-progress'],
    ['Home tab', 'screen-home'],
  ]) {
    await step(id, async () => {
      await tab(label);
      await waitFor(id);
      await shot(id);
    });
  }
  await step('mock', async () => {
    await tab('Practice tab');
    await tap('practice-more-toggle');
    await tap('practice-action-mock-exam');
    await waitFor('mock-setup');
    await shot('mock-setup');
    await tap('mock-start');
    await waitFor('mock-stem');
    await tap('mock-choice-*');
    await tap('mock-flag');
    await shot('mock-running');
    await tap('mock-pause');
    await shot('mock-paused');
    await tap('mock-resume');
    await tap('mock-submit');
    await tap('mock-submit-confirm-action');
    await waitFor('mock-result');
    await shot('mock-result');
  });
  await step('settings', async () => {
    await page.goto(`http://localhost:${PORT}/settings`);
    await page.waitForTimeout(2000);
    await shot('settings');
  });

  fs.writeFileSync(path.join(out, 'issues.txt'), issues.join('\n'));
  await browser.close();
  server.close();
  console.log(`${shotIndex} screens in ${out}; ${issues.length} issue(s).`);
  if (issues.some((issue) => issue.startsWith('step failed'))) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
