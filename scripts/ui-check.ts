// pnpm ui-check [url]: click every control in a real browser and check what it did.
// Needs the built site served (pnpm preview) and, for the live-mode checks, `pnpm server`.
// Exits non-zero if any check fails or the page logs an error.

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const results: Array<[name: string, ok: boolean, detail: string]> = [];
const consoleErrors: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  results.push([name, ok, detail]);
}

async function newPage(browser: Browser, opts: { width?: number; height?: number; noWebGL?: boolean } = {}): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1440, height: opts.height ?? 900 } });
  if (opts.noWebGL) {
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type.startsWith('webgl')) return null;
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof orig;
    });
  }
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${page.url()} :: ${m.text()}`));
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: ${e.message}`));
  return { ctx, page };
}

async function open(page: Page, hash: string): Promise<void> {
  await page.goto(`${url}${hash}`);
  await page.reload();
  await page.waitForSelector('.transport', { timeout: 30_000 });
}

const stepOf = async (page: Page) => Number(await page.locator('.scrubber').getAttribute('aria-valuenow'));
const totalOf = async (page: Page) => Number(await page.locator('.scrubber').getAttribute('aria-valuemax'));
const pause = (page: Page, ms = 250) => page.waitForTimeout(ms);

async function transport(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  const total = await totalOf(page);
  check('Reset disabled at start', await page.locator('button[aria-label="Reset"]').isDisabled());
  check('Prev disabled at start', await page.locator('button[aria-label="Previous line"]').isDisabled());
  await page.click('button[aria-label="Next line"]');
  check('Next button runs one line', (await stepOf(page)) === 1, `step ${await stepOf(page)}`);
  await page.click('button[aria-label="Previous line"]');
  check('Prev button goes back one line', (await stepOf(page)) === 0);
  for (let i = 0; i < total; i++) await page.click('button[aria-label="Next line"]');
  check('Next disabled at the end', await page.locator('button[aria-label="Next line"]').isDisabled());
  check('Counter shows n / n', (await page.locator('.counter').innerText()).replace(/\s/g, '') === `${total}/${total}`);
  await page.click('button[aria-label="Reset"]');
  check('Reset returns to step 0', (await stepOf(page)) === 0);

  await page.click('.speed:has-text("2x")');
  check('Speed button 2x selects', (await page.locator('.speed:has-text("2x")').getAttribute('aria-pressed')) === 'true');
  await page.click('button[aria-label="Play"]');
  check('Play button starts autoplay', (await page.locator('button[aria-label="Pause"]').count()) === 1);
  await page.waitForFunction((t) => Number(document.querySelector('.scrubber')?.getAttribute('aria-valuenow')) === t, total, { timeout: 15_000 });
  await pause(page, 1200);
  check('Autoplay reaches the end and stops', (await stepOf(page)) === total && (await page.locator('button[aria-label="Play"]').count()) === 1);
  await page.click('button[aria-label="Play"]');
  await pause(page, 300);
  check('Play at the end restarts from the top', (await stepOf(page)) <= 1);
  await page.click('button[aria-label="Pause"]');
  check('Pause button stops autoplay', (await page.locator('button[aria-label="Play"]').count()) === 1);
  await page.click('.speed:has-text("0.5x")');
  await page.keyboard.press(']');
  check('] speeds up', (await page.locator('.speed:has-text("1x")').getAttribute('aria-pressed')) === 'true');
  await page.keyboard.press('[');
  check('[ slows down', (await page.locator('.speed:has-text("0.5x")').getAttribute('aria-pressed')) === 'true');

  const box = (await page.locator('.scrubber').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
  check('Clicking the scrubber jumps', (await stepOf(page)) === Math.round(total * 0.5), `step ${await stepOf(page)}`);
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  check('Dragging the scrubber scrubs to the end', (await stepOf(page)) === total);
  await page.locator('.scrubber').focus();
  await page.keyboard.press('ArrowLeft');
  check('Scrubber arrow keys move one step', (await stepOf(page)) === total - 1);
}

async function shortcuts(page: Page): Promise<void> {
  await open(page, '#sample=or_comm&step=0');
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  const total = await totalOf(page);
  await page.keyboard.press('ArrowRight');
  check('→ runs a line', (await stepOf(page)) === 1);
  await page.keyboard.press(' ');
  check('Space runs a line', (await stepOf(page)) === 2);
  await page.keyboard.press('ArrowLeft');
  check('← goes back', (await stepOf(page)) === 1);
  await page.keyboard.press('End');
  check('End jumps to the end', (await stepOf(page)) === total);
  await page.keyboard.press('Home');
  check('Home jumps to the start', (await stepOf(page)) === 0);
  for (const [key, view] of [['2', 'List Lab'], ['3', 'Rewrite'], ['4', 'Shrink'], ['1', 'Tree']] as const) {
    await page.keyboard.press(key);
    const on = await page.locator('.tab[aria-selected="true"]').innerText();
    check(`Key ${key} opens ${view}`, on.startsWith(view), on);
  }
  await page.keyboard.press('p');
  check('P toggles autoplay', (await page.locator('button[aria-label="Pause"]').count()) === 1);
  await page.keyboard.press('p');
  await page.keyboard.press('l');
  check('L toggles lite (2D) mode', (await page.locator('.tree2d svg').count()) === 1);
  await page.keyboard.press('l');
  await page.keyboard.press('f');
  check('F enters presentation mode', (await page.locator('.app.is-presenting').count()) === 1);
  await page.keyboard.press('Escape');
  check('Esc leaves presentation mode', (await page.locator('.app.is-presenting').count()) === 0);
}

async function viewsAndTools(page: Page): Promise<void> {
  await open(page, '#sample=rev&step=3');
  const views: Array<[string, string]> = [
    ['Tree', '.tree3d canvas, .tree2d svg'],
    ['List Lab', '.list-lab, .view-empty'],
    ['Rewrite', '.rewrite, .view-empty'],
    ['Shrink', '.shrink'],
  ];
  for (const [tab, selector] of views) {
    await page.click(`.tab:has-text("${tab}")`);
    await pause(page, 400);
    const selected = (await page.locator('.tab[aria-selected="true"]').innerText()).startsWith(tab);
    check(`${tab} tab shows its view`, selected && (await page.locator(selector).count()) > 0);
  }
  check('List Lab draws boxes for rev [1,2,3]', await (async () => {
    await page.click('.tab:has-text("List Lab")');
    return (await page.locator('.ll-box').count()) >= 3;
  })());
  check('"auto" appears after picking a view', (await page.locator('.viz-tools button:has-text("auto")').count()) === 1);
  await page.click('.viz-tools button:has-text("auto")');
  check('"auto" hands the choice back', (await page.locator('.auto-dot').count()) === 1 && (await page.locator('.viz-tools button:has-text("auto")').count()) === 0);

  await page.click('.tab:has-text("Tree")');
  await page.click('.viz-tools button:has-text("lite")');
  check('lite button switches the tree to 2D', (await page.locator('.tree2d svg').count()) === 1 && (await page.locator('.tab-sub').innerText()) === '2D');
  await page.click('.viz-tools button:has-text("lite")');
  await pause(page, 600);
  check('lite button switches back to 3D', (await page.locator('.tab-sub').innerText()) === '3D' && (await page.locator('.tree3d canvas').count()) === 1);

  await page.click('button[aria-label="Presentation mode"]');
  check('Presentation button hides the code side', (await page.locator('.pane.code').isHidden()) && (await page.locator('.app.is-presenting').count()) === 1);
  await page.click('button[aria-label="Presentation mode"]');
  check('Presentation button restores the code side', await page.locator('.pane.code').isVisible());

  // Q.E.D. at the end.
  await page.keyboard.press('End');
  await page.click('.tab:has-text("Tree")');
  await pause(page, 1500);
  check('Q.E.D. shown at the end', (await page.locator('.t3-qed.is-on').count()) === 1 && (await page.locator('.remaining.is-done').count()) === 1);
}

async function leftPane(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  await page.locator('.cm-line', { hasText: 'constructor' }).click();
  check('Clicking a code line jumps to it', (await stepOf(page)) === 2, `step ${await stepOf(page)}`);
  check('Current line highlighted in the editor', (await page.locator('.cm-ls-current', { hasText: 'constructor' }).count()) === 1);
  check('Goal panel shows both goals after constructor', (await page.locator('.goal-card').count()) === 2);
  check('A sample with no errors shows no error panel', (await page.locator('.lean-errors').count()) === 0);
  const why = page.locator('.why-toggle');
  await why.click();
  check('Why toggle collapses', (await why.getAttribute('aria-expanded')) === 'false' && (await page.locator('.why-body').count()) === 0);
  await why.click();
  check('Why toggle expands', (await why.getAttribute('aria-expanded')) === 'true' && (await page.locator('.why-headline').count()) === 1);

  const sep = page.locator('.divider');
  await sep.focus();
  await page.keyboard.press('ArrowRight');
  check('Divider arrow keys resize', (await sep.getAttribute('aria-valuenow')) === '52');
  await sep.dblclick();
  check('Divider double-click resets to 50/50', (await sep.getAttribute('aria-valuenow')) === '50');
  const b = (await sep.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + 200);
  await page.mouse.down();
  await page.mouse.move(b.x - 2000, b.y + 200, { steps: 4 });
  await page.mouse.up();
  check('Divider drag clamps at 35%', (await sep.getAttribute('aria-valuenow')) === '35');
  await page.keyboard.press('ArrowRight');
  check('After dragging the divider, → steps the proof again', (await stepOf(page)) === 3, `step ${await stepOf(page)}`);

  // Picker: every sample loads at step 0.
  const ids = await page.locator('.picker select option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter((v) => !v.startsWith('__')));
  for (const id of ids) {
    await page.selectOption('.picker select', id);
    await page.waitForFunction((i) => location.hash.includes(`sample=${i}&`), id);
    check(`Picker loads ${id}`, (await stepOf(page)) === 0 && (await totalOf(page)) > 0);
  }
  check('After picking a sample, → steps the proof (the picker gives focus back)', await page.evaluate(() => document.activeElement?.tagName !== 'SELECT'));
  await page.keyboard.press('ArrowRight');
  await pause(page);
  const hash = await page.evaluate(() => location.hash);
  check('Permalink updates with the step', /step=1$/.test(hash), `${hash}, focus on ${await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName)}`);
}

async function dialogs(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  await page.click('button[aria-label="Keyboard shortcuts"]');
  check('? button opens the shortcuts dialog', await page.locator('dialog[open] h2:has-text("Shortcuts")').isVisible());
  await page.click('dialog[open] button[aria-label="Close"]');
  check('× closes the dialog', (await page.locator('dialog[open]').count()) === 0);
  await page.keyboard.press('?');
  check('? key opens the shortcuts dialog', (await page.locator('dialog[open]').count()) === 1);
  await page.keyboard.press('Escape');
  check('Esc closes the dialog', (await page.locator('dialog[open]').count()) === 0);
  await page.click('.brand');
  const about = page.locator('dialog[open]');
  const text = await about.innerText();
  check('Logo opens About', text.includes('About Replean'));
  check('About has no "Built by" line', !/Built by/i.test(text), text.replace(/\s+/g, ' ').slice(0, 160));
  const r = (await about.boundingBox())!;
  await page.mouse.click(r.x - 20 > 0 ? r.x - 20 : 5, 5);
  check('Clicking the backdrop closes About', (await page.locator('dialog[open]').count()) === 0);
  check('No footer line on the page', (await page.locator('.footer').count()) === 0 && !(await page.locator('body').innerText()).includes('Built by'));
}

async function live(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  const offered = (await page.locator('.picker select option[value="__live__"]').count()) === 1;
  check('Live entry offered when the backend answers', offered);
  if (!offered) return;
  await page.selectOption('.picker select', '__live__');
  await page.waitForSelector('.live-editor .cm-content');
  check('Live editor opens with a Live badge', (await page.locator('.mode-badge.is-live').count()) === 1);
  await page.locator('.live-editor .cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('junk');
  await page.click('.live-bar button:has-text("Example")');
  check('Example button restores the example', (await page.locator('.live-editor .cm-content').innerText()).includes('imp_chain'));

  // Drag and drop a file.
  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(['theorem dropped (p : Prop) (hp : p) : p := by\n  exact hp\n'], 'dropped.lean', { type: 'text/plain' }));
    return d;
  });
  await page.dispatchEvent('.live', 'drop', { dataTransfer: dt });
  await pause(page, 300);
  check('Dropping a .lean file loads it', (await page.locator('.live-editor .cm-content').innerText()).includes('dropped'));

  await page.setInputFiles('.live input[type=file]', {
    name: 'two.lean',
    mimeType: 'text/plain',
    buffer: Buffer.from('theorem two (p q : Prop) (hp : p) (hq : q) : p ∧ q := by\n  constructor\n  · exact hp\n  · exact hq\n'),
  });
  check('Upload button loads a file', (await page.locator('.live-editor .cm-content').innerText()).includes('theorem two'));
  await page.click('.live-bar .btn.primary');
  await page.waitForSelector('.code-host', { timeout: 120_000 });
  check('Run plays the uploaded proof', (await totalOf(page)) === 3 && (await page.locator('.picker select').inputValue()) === '__live__');
  await page.keyboard.press('End');
  check('Live proof reaches Q.E.D.', (await page.locator('.remaining.is-done').count()) === 1);

  await page.click('.topbar button:has-text("Edit")');
  check('Edit reopens the editor with the same source', (await page.locator('.live-editor .cm-content').innerText()).includes('theorem two'));
  await page.click('.live-bar button:has-text("Back to player")');
  check('Back to player returns to the trace', (await page.locator('.code-host').count()) === 1);

  await page.click('.topbar button:has-text("Edit")');
  await page.locator('.live-editor .cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('theorem broken : := by\n  rfl\n');
  await page.keyboard.press('Control+Enter');
  await page.waitForSelector('.lean-errors', { timeout: 120_000 });
  const listText = await page.locator('.lean-errors').innerText();
  check('Ctrl+Enter runs; a file Lean rejects opens with its errors in the visualization panel', /Lean reported \d+ errors? in this file/.test(listText) && /line 1:/.test(listText), listText.slice(0, 120));
  check('The rejected line is marked in the editor gutter', (await page.locator('.cm-ls-error-dot').count()) >= 1);

  // A proof where one line fails: stepping onto it shows Lean's message as a card.
  await page.click('.topbar button:has-text("Edit")');
  await page.locator('.live-editor .cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('theorem oops (p : Prop) (hp : p) : p := by\n  exact hq\n');
  await page.keyboard.press('Control+Enter');
  await page.waitForSelector('.code-host', { timeout: 120_000 });
  check('Before the failing line runs, only the summary bar shows', (await page.locator('.le-card').count()) === 0 && (await page.locator('.le-bar').count()) === 1);
  await page.keyboard.press('ArrowRight');
  const card = await page.locator('.le-card').innerText().catch(() => '');
  check('Running the failing line shows Lean’s error in the visualization panel', card.includes('Lean error on line 2') && card.includes('hq'), card.replace(/\s+/g, ' ').slice(0, 140));
  check('The failing goal turns red in the tree', (await page.locator('.t3-label.s-error, .t2-node.s-error').count()) >= 1);

  await page.selectOption('.picker select', 'and_comm');
  check('Picking a sample leaves live mode', (await page.locator('.mode-badge.is-live').count()) === 0 && (await page.locator('.code-host').count()) === 1);
}

async function pages(browser: Browser): Promise<void> {
  {
    const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
    await open(page, '#sample=and_comm&step=1');
    const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const codeTop = (await page.locator('.pane.code').boundingBox())!.y;
    const vizTop = (await page.locator('.pane.viz').boundingBox())!.y;
    check('Phone: no horizontal scroll', noHScroll);
    check('Phone: code stacked above the visualization', codeTop < vizTop);
    await page.click('button[aria-label="Next line"]');
    check('Phone: Next works', (await stepOf(page)) === 2);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser, { noWebGL: true });
    await open(page, '#sample=and_comm&step=2');
    check('No WebGL: tree falls back to 2D', (await page.locator('.tree2d svg').count()) === 1 && (await page.locator('.tab-sub').innerText()) === '2D');
    check('No WebGL: lite button disabled with a reason', await page.locator('.viz-tools button:has-text("lite")').isDisabled());
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser);
    await page.route('**/traces/index.json', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto(url);
    await page.waitForSelector('.status-card');
    check('Empty state when there are no traces', (await page.locator('.status-card h1').innerText()) === 'No traces found');
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser);
    await page.route('**/traces/and_comm.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"schema":2}' }));
    await page.goto(`${url}#sample=and_comm&step=0`);
    await page.waitForSelector('.status-card');
    check('Error card for a bad trace', (await page.locator('.status-card h1').innerText()) === 'Could not load the trace');
    await page.click('.status-actions button:has-text("Or, swapped")');
    await page.waitForSelector('.transport');
    check('Error card buttons load another sample', (await totalOf(page)) > 0);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser);
    await page.route('**/api/health', (r) => r.fulfill({ status: 503, body: '' }));
    await open(page, '#sample=and_comm&step=0');
    await pause(page, 500);
    check('Live entry hidden when no backend answers', (await page.locator('.picker select option[value="__live__"]').count()) === 0);
    await ctx.close();
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const { page } = await newPage(browser);
  for (const [name, fn] of [
    ['transport', transport],
    ['shortcuts', shortcuts],
    ['views', viewsAndTools],
    ['left pane', leftPane],
    ['dialogs', dialogs],
    ['live', live],
  ] as const) {
    try {
      await fn(page);
    } catch (e) {
      check(`${name}: finished without throwing`, false, e instanceof Error ? e.message.split('\n')[0]! : String(e));
    }
  }
  try {
    await pages(browser);
  } catch (e) {
    check('pages: finished without throwing', false, e instanceof Error ? e.message.split('\n')[0]! : String(e));
  }
  await browser.close();

  for (const [name, ok, detail] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
  // The bad-trace check provokes one expected failed fetch; anything else is a real error.
  const unexpected = consoleErrors.filter((e) => !e.includes('503') && !e.includes('404'));
  for (const e of unexpected) console.log(`CONSOLE  ${e}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed, ${unexpected.length} console errors.`);
  process.exit(failed || unexpected.length ? 1 : 0);
}

void main();
