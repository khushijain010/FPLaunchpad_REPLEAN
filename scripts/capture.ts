// Walk every sample through every step in a real (headless) browser.
// Fails on any console error; saves screenshots to docs/screenshots/.
//
//   pnpm build && pnpm preview &      # serves http://localhost:4173
//   pnpm capture [url]

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './lean.ts';
import { SAMPLES } from './samples.ts';

const url = process.argv[2] ?? 'http://localhost:4173/';
const OUT = path.join(ROOT, 'docs/screenshots');

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  const shot = async (name: string) => {
    await page.waitForTimeout(1400); // let springs and the camera settle
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  };

  for (const s of SAMPLES) {
    await page.goto(`${url}#sample=${s.id}&step=0`);
    await page.reload(); // hash-only navigation doesn't re-boot the app
    await page.waitForSelector('.transport');
    const total = Number(await page.locator('.scrubber').getAttribute('aria-valuemax'));
    await shot(`${s.id}-0`);
    for (let k = 1; k <= total; k++) {
      await page.keyboard.press('ArrowRight');
      const now = Number(await page.locator('.scrubber').getAttribute('aria-valuenow'));
      if (now !== k) problems.push(`${s.id}: after ${k} presses the step is ${now}`);
      if (k === 2 || k === total) await shot(`${s.id}-${k}`);
    }
    // Back and jump must land on the same frames as stepping.
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    const back = Number(await page.locator('.scrubber').getAttribute('aria-valuenow'));
    if (back !== total - 1) problems.push(`${s.id}: End then Left gave ${back}, expected ${total - 1}`);
  }

  // Lite mode and each view, on the list sample.
  await page.goto(`${url}#sample=rev&step=3`);
  await page.reload();
  await page.waitForSelector('.transport');
  for (const [key, name] of [['2', 'view-list'], ['3', 'view-rewrite'], ['4', 'view-shrink'], ['1', 'view-tree']] as const) {
    await page.keyboard.press(key);
    await shot(`rev-${name}`);
  }
  await page.keyboard.press('d');
  await shot('rev-2d');
  await page.keyboard.press('d');

  // Light theme.
  await page.keyboard.press('t');
  await shot('rev-light');
  await page.keyboard.press('t');

  // Your own file, if a Lean server answers (pnpm live, or the preview proxy to 127.0.0.1:8791).
  const health = await page.evaluate(async (u) => {
    try {
      return (await (await fetch(`${u}api/health`)).json()) as { ok?: boolean };
    } catch {
      return null;
    }
  }, url);
  if (health?.ok) {
    const proof = ['theorem two_steps (p q : Prop) (hp : p) (hq : q) : p ∧ q := by', '  constructor', '  · exact hp', '  · exact hq', ''].join('\n');
    // Upload a file the way a person would: from the files panel.
    await page.setInputFiles('.sidebar input[type=file]', { name: 'two_steps.lean', mimeType: 'text/plain', buffer: Buffer.from(proof) });
    await page.waitForSelector('.live-editor .cm-content');
    await shot('file-editor');
    await page.click('.live-bar .btn.primary');
    await page.waitForSelector('.code-host', { timeout: 150_000 });
    const total = Number(await page.locator('.scrubber').getAttribute('aria-valuemax'));
    if (total !== 3) problems.push(`file: expected 3 steps, got ${total}`);
    for (let k = 1; k <= total; k++) await page.keyboard.press('ArrowRight');
    await shot('file-done');
  } else {
    console.log('No Lean server answering; skipped the file check.');
  }

  await browser.close();
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`No console errors. Screenshots in ${path.relative(ROOT, OUT)}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
