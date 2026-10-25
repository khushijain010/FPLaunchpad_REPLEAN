// pnpm ui-check [url]: click every control in a real browser and check what it did.
// Needs the built site served (pnpm preview) and, for running files, `pnpm server`.
// Exits non-zero if any check fails or the page logs an unexpected error.

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const results: Array<[name: string, ok: boolean, detail: string]> = [];
const consoleErrors: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  results.push([name, ok, detail]);
}

async function newPage(browser: Browser, opts: { width?: number; height?: number; noWebGL?: boolean; theme?: string } = {}): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1440, height: opts.height ?? 900 } });
  await ctx.addInitScript((theme) => {
    // A clean slate per context: no saved files, panel open state or theme from earlier runs.
    if (!sessionStorage.getItem('ui-check')) {
      localStorage.clear();
      if (theme) localStorage.setItem('replean.theme', theme);
      sessionStorage.setItem('ui-check', '1');
    }
  }, opts.theme ?? 'dark');
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
  await page.waitForSelector('.header', { timeout: 30_000 });
  await page.waitForSelector('.scrubber, .viz-empty', { timeout: 30_000 });
}

const stepOf = async (page: Page) => Number(await page.locator('.scrubber').getAttribute('aria-valuenow'));
const totalOf = async (page: Page) => Number(await page.locator('.scrubber').getAttribute('aria-valuemax'));
const pause = (page: Page, ms = 250) => page.waitForTimeout(ms);
const sidebarFile = (page: Page, name: string) => page.locator(`.sidebar .tree-file:has(.tree-name:text-is("${name}")) > .tree-row`);
const editorText = (page: Page) => page.locator('.live-editor .cm-content').innerText();

async function replaceEditorText(page: Page, text: string): Promise<void> {
  await page.locator('.live-editor .cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(text);
}

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
  check('Step counter shows Step n / n', (await page.locator('.step-count').innerText()).replace(/\s/g, '') === `Step${total}/${total}`);
  await page.click('button[aria-label="Reset"]');
  check('Reset returns to step 0', (await stepOf(page)) === 0);

  await page.selectOption('.speed-select select', '2');
  check('Speed menu selects 2x', (await page.locator('.speed-select select').inputValue()) === '2');
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
  await page.selectOption('.speed-select select', '0.5');
  await page.locator('body').click({ position: { x: 700, y: 20 } });
  await page.keyboard.press(']');
  check('] speeds up', (await page.locator('.speed-select select').inputValue()) === '1');
  await page.keyboard.press('[');
  check('[ slows down', (await page.locator('.speed-select select').inputValue()) === '0.5');

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
  await page.locator('body').click({ position: { x: 700, y: 20 } });
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
    const on = await page.locator('.viz-bar .tab[aria-selected="true"]').innerText();
    check(`Key ${key} opens ${view}`, on.startsWith(view), on);
  }
  await page.keyboard.press('p');
  check('P toggles autoplay', (await page.locator('button[aria-label="Pause"]').count()) === 1);
  await page.keyboard.press('p');
  await page.keyboard.press('d');
  check('D switches the tree to 2D', (await page.locator('.tree2d svg').count()) === 1);
  await page.keyboard.press('d');
  await page.keyboard.press('f');
  check('F enters full screen', (await page.locator('.app.is-presenting').count()) === 1);
  await page.keyboard.press('Escape');
  check('Esc leaves full screen', (await page.locator('.app.is-presenting').count()) === 0);
  await page.keyboard.press('b');
  check('B closes the files panel', (await page.locator('.sidebar').count()) === 0);
  await page.keyboard.press('b');
  check('B opens the files panel', (await page.locator('.sidebar').count()) === 1);
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.keyboard.press('t');
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  check('T switches the theme', before !== after, `${before} -> ${after}`);
  await page.keyboard.press('t');
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
    await page.click(`.viz-bar .tab:has-text("${tab}")`);
    await pause(page, 400);
    const selected = (await page.locator('.viz-bar .tab[aria-selected="true"]').innerText()).startsWith(tab);
    check(`${tab} tab shows its view`, selected && (await page.locator(selector).count()) > 0);
  }
  await page.click('.viz-bar .tab:has-text("List Lab")');
  check('List Lab draws a box per list element', (await page.locator('.ll-box').count()) >= 3);
  // The face (text) must fit the box; the drawn top/side edges stick out on purpose.
  const boxesFit = await page.$$eval('.ll-box', (els) => els.every((b) => (b.querySelector('.ll-face') as HTMLElement).offsetWidth <= b.clientWidth));
  check('List Lab boxes fit their text', boxesFit);
  check('"auto view" appears after picking a view', (await page.locator('.auto-link').count()) === 1);
  await page.click('.auto-link');
  check('"auto view" hands the choice back', (await page.locator('.auto-dot').count()) === 1 && (await page.locator('.auto-link').count()) === 0);

  await page.click('.viz-bar .tab:has-text("Tree")');
  await page.click('.segmented button:has-text("2D")');
  check('2D button draws the 2D tree', (await page.locator('.tree2d svg').count()) === 1);
  const fits2d = await page.$$eval('.t2-node', (nodes) =>
    nodes.every((n) => {
      const rect = n.querySelector('rect')!.getBBox();
      const label = (n.querySelector('.t2-label') as SVGGraphicsElement).getBBox();
      return label.width <= rect.width + 0.5;
    }),
  );
  check('2D labels fit inside their nodes', fits2d);
  // The longest goals in the examples: every box holds its whole goal and no two boxes touch.
  await open(page, '#sample=compiler');
  await page.keyboard.press('End');
  await page.click('.viz-bar .tab:has-text("Tree")');
  await pause(page, 500);
  const whole = await page.$$eval('.t2-node', (nodes) => {
    const boxes = nodes.map((n) => {
      const r = n.querySelector('rect')!.getBoundingClientRect();
      const t = n.querySelector('.t2-label')!.getBoundingClientRect();
      return { r, t, text: n.querySelector('.t2-label')!.textContent ?? '' };
    });
    const inside = boxes.every(({ r, t }) => t.left >= r.left - 0.5 && t.right <= r.right + 0.5 && t.top >= r.top - 0.5 && t.bottom <= r.bottom + 0.5);
    const uncut = boxes.every(({ text }) => !text.includes('…'));
    const apart = boxes.every((a, i) => boxes.every((b, j) => i === j || a.r.right <= b.r.left || b.r.right <= a.r.left || a.r.bottom <= b.r.top || b.r.bottom <= a.r.top));
    return { n: boxes.length, inside, uncut, apart };
  });
  check('2D boxes hold their whole goal, no "…"', whole.n >= 8 && whole.inside && whole.uncut, JSON.stringify(whole));
  check('2D boxes never overlap', whole.apart);
  await page.click('.segmented button:has-text("3D")');
  // The 3D view loads lazily; wait for its canvas rather than a fixed time.
  await page.waitForSelector('.tree3d canvas', { timeout: 10_000 }).catch(() => undefined);
  check('3D button draws the 3D tree', (await page.locator('.tree3d canvas').count()) === 1 && !(await page.locator('.viz-layer').isHidden()));

  await page.click('button[aria-label="Full screen"]');
  await pause(page, 600);
  const vw = page.viewportSize()!.width;
  const vizBox = await page.locator('.pane.viz').boundingBox();
  const codeBox = await page.locator('.pane.code').boundingBox();
  check('Full screen: the editor side takes no space', codeBox === null || codeBox.width === 0, JSON.stringify(codeBox));
  check('Full screen: the visualization fills the window', !!vizBox && vizBox.x < 12 && vizBox.width > vw * 0.95, JSON.stringify(vizBox));
  check('Full screen: the files panel is hidden', (await page.locator('.sidebar').count()) === 0);
  await page.click('button[aria-label="Full screen"]');
  check('Full screen button restores the layout', (await page.locator('.pane.code').isVisible()) && (await page.locator('.sidebar').count()) === 1);

  await page.keyboard.press('End');
  await page.click('.viz-bar .tab:has-text("Tree")');
  await pause(page, 1500);
  check('Q.E.D. shown at the end', (await page.locator('.t3-qed.is-on').count()) === 1 && (await page.locator('.remaining.is-done').count()) === 1);
  check('Goal State shows Q.E.D. at the end', (await page.locator('.gs-qed').count()) === 1);
}

async function editorAndPanels(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  await page.locator('.cm-line', { hasText: 'constructor' }).click();
  check('Clicking a code line jumps to it', (await stepOf(page)) === 2, `step ${await stepOf(page)}`);
  check('Current line highlighted in the editor', (await page.locator('.cm-ls-current', { hasText: 'constructor' }).count()) === 1);
  check('Goal State lists both goals after constructor', (await page.locator('.gs-list li').count()) === 2);
  check('Goal State shows the current goal', (await page.locator('.gs-target').innerText()).trim() === 'q');
  await page.click('.panel-tab:has-text("Local Context")');
  check('Local Context shows both goal cards', (await page.locator('.goal-card').count()) === 2);
  check('A sample with no errors shows no error panel', (await page.locator('.lean-errors').count()) === 0);
  check('Explanation names the tactic', (await page.locator('.explain-tactic').innerText()) === 'constructor');
  await page.click('.panel-tab:has-text("Tactic Info")');
  check('Tactic Info shows the line and goal counts', (await page.locator('.tactic-info').innerText()).includes('2 opened'));
  check('Breadcrumb shows where the file lives', (await page.locator('.crumb').allInnerTexts()).join(' / ') === 'Examples / Logic / and_comm.lean');

  const sep = page.locator('.divider:not(.divider-y)');
  await sep.focus();
  await page.keyboard.press('ArrowRight');
  check('Divider arrow keys resize', (await sep.getAttribute('aria-valuenow')) === '52');
  await sep.dblclick();
  check('Divider double-click resets to 50/50', (await sep.getAttribute('aria-valuenow')) === '50');
  await page.keyboard.press('ArrowRight');
  check('After using the divider, → steps the proof again', (await stepOf(page)) === 3, `step ${await stepOf(page)}`);

  // The row dividers between the top and bottom cards of each column.
  for (const [name, panel] of [['editor and goal', '.editor-panel'], ['visualization and explanation', '.viz-panel']] as const) {
    const row = page.locator(`.divider-y[aria-label*="${name}"]`);
    check(`Row divider between ${name} panels exists`, (await row.count()) === 1);
    const before = await page.locator(panel).evaluate((el) => el.getBoundingClientRect().height);
    const start = Number(await row.getAttribute('aria-valuenow'));
    await row.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
    const after = await page.locator(panel).evaluate((el) => el.getBoundingClientRect().height);
    check(`Row divider (${name}): ↓ grows the top card`, Number(await row.getAttribute('aria-valuenow')) === start + 10 && after > before + 20, `${before} -> ${after}`);
    const box = await row.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 120, { steps: 6 });
      await page.mouse.up();
    }
    check(`Row divider (${name}): dragging up shrinks the top card`, Number(await row.getAttribute('aria-valuenow')) < start + 10);
  }
  const leftRow = page.locator('.divider-y[aria-label*="editor and goal"]');
  await leftRow.focus();
  await page.keyboard.press('ArrowDown');
  const kept = await leftRow.getAttribute('aria-valuenow');
  await page.reload();
  await page.waitForSelector('.transport');
  check('Panel sizes are remembered after a reload', (await page.locator('.divider-y[aria-label*="editor and goal"]').getAttribute('aria-valuenow')) === kept);
  await page.locator('.divider-y[aria-label*="editor and goal"]').dblclick();
  check('Row divider double-click resets', (await page.locator('.divider-y[aria-label*="editor and goal"]').getAttribute('aria-valuenow')) === '56');
  await page.locator('.divider-y[aria-label*="visualization"]').dblclick();
}

async function sidebarAndTabs(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  check('Files panel open on a first visit', (await page.locator('.sidebar').count()) === 1);
  const examples = await page.locator('.sidebar .tree-name').allInnerTexts();
  check('Examples are grouped into folders', ['Logic', 'Numbers', 'Lists', 'Programs'].every((f) => examples.includes(f)), examples.join(','));
  for (const name of ['and_comm.lean', 'or_comm.lean', 'zero_add.lean', 'rev.lean', 'compiler.lean']) {
    await sidebarFile(page, name).click();
    await page.waitForFunction((n) => location.hash.includes(`sample=${n.replace('.lean', '')}&`), name);
    check(`Sidebar opens ${name}`, (await stepOf(page)) === 0 && (await page.locator('.file-tab.is-on').innerText()).includes(name));
  }
  check('Each example opened as a tab', (await page.locator('.file-tab').count()) === 5);
  await page.keyboard.press('ArrowRight');
  check('After clicking the sidebar, → steps the proof', (await stepOf(page)) === 1);
  check('Permalink updates with the step', /step=1$/.test(await page.evaluate(() => location.hash)));
  await page.click('.file-tab:has-text("or_comm.lean") .file-tab-main');
  check('Clicking a tab switches to it', (await page.locator('.crumbs').innerText()).includes('or_comm.lean'));
  await page.click('.file-tab:has-text("rev.lean") .file-tab-close');
  check('× closes a tab', (await page.locator('.file-tab').count()) === 4);

  await page.click('.sidebar button[aria-label="Search files"]');
  await page.fill('.sidebar-search', 'zero');
  const visible = await page.locator('.sidebar .file-row .tree-name').allInnerTexts();
  check('Search filters the files', visible.length === 1 && visible[0] === 'zero_add.lean', visible.join(','));
  await page.fill('.sidebar-search', '');
  await page.click('.sidebar button[aria-label="Search files"]');

  await page.click('button[aria-label="Close the files panel"]');
  check('Header button closes the files panel', (await page.locator('.sidebar').count()) === 0);
  await page.click('button[aria-label="Open the files panel"]');
  check('Header button opens the files panel', (await page.locator('.sidebar').count()) === 1);
}

async function myFiles(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  check('My Proofs starts empty', (await page.locator('.tree-empty').count()) === 1);

  // Copy an example into My Proofs.
  await page.click('.editor-actions button:has-text("Copy to My Proofs")');
  check('Copy to My Proofs makes an editable copy', (await editorText(page)).includes('theorem and_comm') && (await sidebarFile(page, 'and_comm.lean').count()) === 2);

  // A new file from the sidebar, run through Lean.
  await page.click('.sidebar button[aria-label="New file"]');
  check('New file opens the editor in a new tab', (await editorText(page)).includes('imp_chain') && (await page.locator('.file-tab.is-on').innerText()).includes('proof.lean'));
  check('Before running, the visualization says to run the file', (await page.locator('.viz-empty').count()) === 1);
  const live = (await page.locator('.live-bar .btn.primary').isDisabled()) === false;
  check('Run is available when the Lean server answers', live);
  if (live) {
    await replaceEditorText(page, 'theorem two (p q : Prop) (hp : p) (hq : q) : p ∧ q := by\n  constructor\n  · exact hp\n  · exact hq\n');
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('.code-host', { timeout: 120_000 });
    check('Ctrl+Enter runs the file and plays it', (await totalOf(page)) === 3);
    await page.keyboard.press('End');
    check('Your file reaches Q.E.D.', (await page.locator('.remaining.is-done').count()) === 1);

    await page.click('.editor-actions button:has-text("Edit")');
    await replaceEditorText(page, 'theorem two (p q : Prop) (hp : p) (hq : q) : p ∧ q := by\n  constructor\n  · exact hp\n  · exact hp\n');
    check('Editing marks the file as changed since the last run', (await page.locator('.sidebar .tree-file.is-active .stale-dot').count()) === 1);
    await page.click('.live-bar button:has-text("Show last result")');
    check('"Show last result" returns to the visualization', (await page.locator('.code-host').count()) === 1 && (await page.locator('.stale-note').count()) === 1);
    await page.click('.editor-actions button:has-text("Edit")');
    await page.click('.live-bar .btn.primary');
    await page.waitForSelector('.code-host', { timeout: 120_000 });
    await page.keyboard.press('End'); // the failing line is the last one
    const card = await page.locator('.le-card').innerText().catch(() => '');
    check('A failing line shows Lean’s error in the visualization panel', card.includes('Lean error on line 4'), card.slice(0, 120));
    check('The stale mark clears after running', (await page.locator('.sidebar .tree-file.is-active .stale-dot').count()) === 0);

    // A Mathlib file gets a clear explanation instead of a cryptic rejection.
    await page.click('.editor-actions button:has-text("Edit")');
    await replaceEditorText(page, 'import Mathlib\n\ntheorem sq (n : ℕ) (h : Even n) : Even (n ^ 2) := by\n  rcases h with ⟨k, rfl⟩\n  ring_nf\n  use 2 * k ^ 2\n  ring\n');
    await page.click('.live-bar .btn.primary');
    const err = await page.locator('.live-error').innerText();
    check('A Mathlib file is explained, with core replacements', err.includes('imports Mathlib') && err.includes('ring_nf → omega'), err.slice(0, 140));
  }

  // Rename, delete, upload, drop.
  await sidebarFile(page, 'proof.lean').hover();
  await page.click('.sidebar button[aria-label="Rename proof.lean"]');
  await page.fill('.rename-input', 'mine');
  await page.keyboard.press('Enter');
  check('Rename gives the file a new name (.lean added)', (await sidebarFile(page, 'mine.lean').count()) === 1 && (await page.locator('.file-tab.is-on').innerText()).includes('mine.lean'));

  await page.setInputFiles('.sidebar input[type=file]', [
    { name: 'up.lean', mimeType: 'text/plain', buffer: Buffer.from('theorem up : True := by\n  trivial\n') },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not lean') },
  ]);
  // Files are read asynchronously; wait for the new one to appear.
  await sidebarFile(page, 'up.lean').waitFor({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForFunction(() => document.querySelector('.live-editor .cm-content')?.textContent?.includes('theorem up'), undefined, { timeout: 5_000 }).catch(() => undefined);
  check('Upload adds .lean files', (await sidebarFile(page, 'up.lean').count()) === 1 && (await editorText(page)).includes('theorem up'));
  check('Upload refuses non-.lean files with a message', (await page.locator('.sidebar-error').innerText()).includes('notes.txt'));

  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(['theorem dropped (p : Prop) (hp : p) : p := by\n  exact hp\n'], 'dropped.lean', { type: 'text/plain' }));
    return d;
  });
  await page.dispatchEvent('.sidebar', 'drop', { dataTransfer: dt });
  await pause(page, 300);
  check('Dropping a .lean file on the sidebar adds it', (await sidebarFile(page, 'dropped.lean').count()) === 1);

  await sidebarFile(page, 'up.lean').hover();
  await page.click('.sidebar button[aria-label="Delete up.lean"]');
  check('Delete asks first', (await page.locator('.row-confirm').count()) === 1);
  await page.click('.row-confirm button:has-text("Yes")');
  check('Delete removes the file and its tab', (await sidebarFile(page, 'up.lean').count()) === 0 && (await page.locator('.file-tab:has-text("up.lean")').count()) === 0);

  await page.reload();
  await page.waitForSelector('.sidebar');
  check('My Proofs survive a reload', (await sidebarFile(page, 'mine.lean').count()) === 1 && (await sidebarFile(page, 'dropped.lean').count()) === 1);
}

async function dialogs(page: Page): Promise<void> {
  await open(page, '#sample=and_comm&step=0');
  await page.click('button[aria-label="Help, shortcuts and contact"]');
  const help = page.locator('dialog[open]');
  const text = await help.innerText();
  check('? button opens Help', text.includes('Keyboard shortcuts'));
  check('Help lists the shortcuts', text.includes('Files panel') && text.includes('2D / 3D tree'));
  check('Help has About and Contact', text.includes('About') && text.includes('Contact') && text.includes('Khushi') && text.includes('github.com/khushijain010'));
  check('Help has no "Built by" line', !/Built by/i.test(text));
  await page.click('dialog[open] button[aria-label="Close"]');
  check('× closes Help', (await page.locator('dialog[open]').count()) === 0);
  await page.keyboard.press('?');
  check('? key opens Help', (await page.locator('dialog[open]').count()) === 1);
  await page.keyboard.press('Escape');
  check('Esc closes Help', (await page.locator('dialog[open]').count()) === 0);
  await page.click('.brand');
  check('The logo opens Help too', (await page.locator('dialog[open]').count()) === 1);
  await page.mouse.click(5, 5);
  check('Clicking outside closes Help', (await page.locator('dialog[open]').count()) === 0);

  await page.click('button[aria-label="Light theme"]');
  check('Sun button switches to light', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('Light theme actually changes the page colors', bg !== 'rgb(11, 11, 13)', bg);
  await page.click('button[aria-label="Dark theme"]');
  check('Moon button switches to dark', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  check('No lite button any more', (await page.locator('button:has-text("lite")').count()) === 0);
}

async function pages(browser: Browser): Promise<void> {
  {
    const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
    await open(page, '#sample=and_comm&step=1');
    check('Phone: no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    check('Phone: files panel starts closed', (await page.locator('.sidebar').count()) === 0);
    await page.click('button[aria-label="Open the files panel"]');
    check('Phone: files panel opens over the page', (await page.locator('.sidebar').count()) === 1);
    await page.click('.sidebar-scrim', { position: { x: 380, y: 400 } });
    check('Phone: tapping outside closes it', (await page.locator('.sidebar').count()) === 0);
    const editorTop = (await page.locator('.editor-panel').boundingBox())!.y;
    const vizTop = (await page.locator('.viz-panel').boundingBox())!.y;
    check('Phone: editor stacked above the visualization', editorTop < vizTop);
    await page.click('button[aria-label="Next line"]');
    check('Phone: Next works', (await stepOf(page)) === 2);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser, { noWebGL: true });
    await open(page, '#sample=and_comm&step=2');
    check('No WebGL: tree falls back to 2D', (await page.locator('.tree2d svg').count()) === 1);
    check('No WebGL: 3D button disabled', await page.locator('.segmented button:has-text("3D")').isDisabled());
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
    await page.waitForSelector('.scrubber');
    check('Error card buttons load another example', (await totalOf(page)) > 0);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser);
    await page.route('**/api/health', (r) => r.fulfill({ status: 503, body: '' }));
    await open(page, '#sample=and_comm&step=0');
    await page.click('.sidebar button[aria-label="New file"]');
    await pause(page, 500);
    check('Lean server down: Run is disabled', await page.locator('.live-bar .btn.primary').isDisabled());
    check('Lean server down: the editor says so and that the file is saved', (await page.locator('.live-status').innerText()).includes('saved'));
    await ctx.close();
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, fn] of [
    ['transport', transport],
    ['shortcuts', shortcuts],
    ['views', viewsAndTools],
    ['editor and panels', editorAndPanels],
    ['sidebar and tabs', sidebarAndTabs],
    ['my files', myFiles],
    ['dialogs', dialogs],
  ] as const) {
    const { ctx, page } = await newPage(browser);
    try {
      await fn(page);
    } catch (e) {
      check(`${name}: finished without throwing`, false, e instanceof Error ? e.message.split('\n')[0]! : String(e));
    }
    await ctx.close();
  }
  try {
    await pages(browser);
  } catch (e) {
    check('pages: finished without throwing', false, e instanceof Error ? e.message.split('\n')[0]! : String(e));
  }
  await browser.close();

  for (const [name, ok, detail] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
  // Expected: the empty-state and bad-trace checks provoke a 404 / bad fetch, the server-down check a 503.
  const unexpected = consoleErrors.filter((e) => !e.includes('503') && !e.includes('404'));
  for (const e of unexpected) console.log(`CONSOLE  ${e}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed, ${unexpected.length} console errors.`);
  process.exit(failed || unexpected.length ? 1 : 0);
}

void main();
