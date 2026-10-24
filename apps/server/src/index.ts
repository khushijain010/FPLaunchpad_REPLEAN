// pnpm live (from the repo root) starts this together with the player, on 127.0.0.1.
// The public deployment runs the same file inside the Docker sandbox with REPLEAN_PUBLIC=1.

import { LEAN_DIR, run, traceFile } from '../../../scripts/lean.ts';
import { buildApp, TIMEOUT_MS } from './app.ts';

// Public mode is for the sandboxed container only (Dockerfile sets it). Locally it stays off and
// the server binds to loopback.
const PUBLIC = process.env.REPLEAN_PUBLIC === '1';
const PORT = Number(process.env.PORT ?? process.env.REPLEAN_PORT ?? 8787);
const HOST = PUBLIC ? '0.0.0.0' : '127.0.0.1';
const ORIGINS = (process.env.REPLEAN_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

let cachedVersion: string | null | undefined;
async function leanVersion(): Promise<string | null> {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const r = await run('lake', ['env', 'lean', '--version'], LEAN_DIR, 60_000);
    cachedVersion = r.code === 0 ? (/version ([\d.]+[^,\s]*)/.exec(r.stdout)?.[1] ?? r.stdout.trim()) : null;
  } catch {
    cachedVersion = null;
  }
  return cachedVersion;
}

async function main(): Promise<void> {
  const version = await leanVersion();
  if (!version) {
    console.error('Lean is not available (`lake` not on PATH, or lean/ not built). Install elan, then run `pnpm verify`.');
    process.exit(1);
  }
  console.log('Making sure the extractor is built...');
  const build = await run('lake', ['build', 'extract'], LEAN_DIR);
  if (build.code !== 0) {
    console.error(`lake build extract failed:\n${build.stdout}\n${build.stderr}`);
    process.exit(1);
  }
  const app = buildApp({
    leanDir: LEAN_DIR,
    leanVersion,
    publicMode: PUBLIC,
    extraOrigins: ORIGINS,
    runTrace: (file, title) => traceFile(file, { id: 'live', title, blurb: 'Your own proof, run just now.', watch: '' }, TIMEOUT_MS),
  });
  await app.listen({ host: HOST, port: PORT });
  console.log(
    PUBLIC
      ? `Public live server on ${HOST}:${PORT} (Lean ${version}). Allowed pages: ${ORIGINS.join(', ') || 'localhost only'}.`
      : `Live mode backend on http://${HOST}:${PORT} (Lean ${version}). Local only; don't expose this port.`,
  );
}

void main();
