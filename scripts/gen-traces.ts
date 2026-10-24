// pnpm traces          regenerate apps/web/public/traces/*.json from the Lean samples
// pnpm traces --check  regenerate in memory and fail if anything differs (golden test)
// pnpm traces --raw    also write the extractor's raw JSON next to each trace, for debugging

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LEAN_DIR, ROOT, requireLake, run, traceFile } from './lean.ts';
import { SAMPLES } from './samples.ts';

const OUT = path.join(ROOT, 'apps/web/public/traces');
const check = process.argv.includes('--check');
const keepRaw = process.argv.includes('--raw');

const stringify = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

async function main(): Promise<void> {
  await requireLake();
  console.log('Building samples and extractor with lake...');
  const build = await run('lake', ['build'], LEAN_DIR);
  if (build.code !== 0) throw new Error(`lake build failed:\n${build.stdout}\n${build.stderr}`);

  await mkdir(OUT, { recursive: true });
  const index = SAMPLES.map(({ id, title, blurb }) => ({ id, title, blurb, file: `${id}.json` }));
  const outputs: Array<[string, string]> = [['index.json', stringify(index)]];

  for (const sample of SAMPLES) {
    const trace = await traceFile(sample.file, sample);
    const errors = trace.messages.filter((m) => m.severity === 'error');
    console.log(`  ${sample.id}: ${trace.steps.length} steps${errors.length ? `, ${errors.length} ERRORS` : ''}`);
    if (errors.length) throw new Error(`${sample.file} has Lean errors:\n${errors.map((e) => `  line ${e.line}: ${e.text}`).join('\n')}`);
    if (trace.steps.length === 0) throw new Error(`${sample.file} produced no steps`);
    outputs.push([`${sample.id}.json`, stringify(trace)]);
    if (keepRaw) {
      const raw = await run('lake', ['exe', 'extract', sample.file], LEAN_DIR);
      await writeFile(path.join(OUT, `${sample.id}.raw.json`), raw.stdout);
    }
  }

  if (check) {
    const stale: string[] = [];
    for (const [name, text] of outputs) {
      const committed = await readFile(path.join(OUT, name), 'utf8').catch(() => '');
      if (committed.replace(/\r\n/g, '\n') !== text) stale.push(name);
    }
    if (stale.length) throw new Error(`Committed traces are stale: ${stale.join(', ')}. Run pnpm traces.`);
    console.log('Golden check passed: committed traces match a fresh Lean run.');
    return;
  }
  for (const [name, text] of outputs) await writeFile(path.join(OUT, name), text);
  console.log(`Wrote ${outputs.length} files to ${path.relative(ROOT, OUT)}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
