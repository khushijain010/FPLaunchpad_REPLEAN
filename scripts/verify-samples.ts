// pnpm verify: every sample compiles with `lake build`, and each sample file is listed in the manifest.

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { LEAN_DIR, requireLake, run } from './lean.ts';
import { SAMPLES } from './samples.ts';

async function main(): Promise<void> {
  const onDisk = (await readdir(path.join(LEAN_DIR, 'Samples'))).filter((f) => f.endsWith('.lean'));
  const listed = new Set(SAMPLES.map((s) => path.basename(s.file)));
  const missing = onDisk.filter((f) => !listed.has(f));
  if (missing.length) throw new Error(`Samples not in scripts/samples.ts: ${missing.join(', ')}`);

  await requireLake();
  const r = await run('lake', ['build', 'Samples'], LEAN_DIR);
  process.stdout.write(r.stdout);
  if (r.code !== 0) throw new Error(`lake build Samples failed:\n${r.stderr}`);
  console.log(`All ${SAMPLES.length} samples compile.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
