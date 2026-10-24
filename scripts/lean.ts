// Running Lean from Node: the one place that spawns `lake`. Shared by the trace generator
// and the live-mode server.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSteps } from '../apps/web/src/core/buildSteps.ts';
import { parseRawOutput } from '../apps/web/src/core/raw.ts';
import { extractTheorem } from '../apps/web/src/core/tactics.ts';
import type { Trace } from '../apps/web/src/core/types.ts';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEAN_DIR = path.join(ROOT, 'lean');

export type RunResult = Readonly<{ code: number | null; stdout: string; stderr: string }>;

export function run(cmd: string, args: readonly string[], cwd: string, timeoutMs = 600_000): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [...args], { cwd, shell: process.platform === 'win32', windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${cmd} ${args.join(' ')} timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

export async function requireLake(): Promise<void> {
  try {
    const r = await run('lake', ['--version'], LEAN_DIR, 60_000);
    if (r.code !== 0) throw new Error(r.stderr);
  } catch {
    throw new Error('`lake` is not on PATH. Install Lean with elan first (see HUMAN_TASKS.md).');
  }
}

export type TraceMetaInput = Readonly<{ id: string; title: string; blurb: string; watch: string }>;

/** Run the extractor on one file (path relative to lean/) and turn its output into a Trace. */
export async function traceFile(file: string, meta: TraceMetaInput, timeoutMs?: number): Promise<Trace> {
  const r = await run('lake', ['exe', 'extract', file], LEAN_DIR, timeoutMs);
  if (r.code !== 0) throw new Error(`extract ${file} failed (exit ${r.code}):\n${r.stderr || r.stdout}`);
  const raw = parseRawOutput(JSON.parse(r.stdout));
  const source = (await readFile(path.join(LEAN_DIR, file), 'utf8')).replace(/\r\n/g, '\n');
  const { steps, messages } = buildSteps(raw, source);
  return {
    schema: 1,
    meta: { ...meta, theorem: extractTheorem(source), leanVersion: raw.leanVersion },
    source,
    steps,
    messages,
  };
}
