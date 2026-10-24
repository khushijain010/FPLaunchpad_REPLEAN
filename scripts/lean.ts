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

/** Kill a process and everything it started. On Windows `kill()` would only stop the shell. */
function killTree(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
  else process.kill(-pid, 'SIGKILL');
}

const MAX_OUTPUT = 32 * 1024 * 1024;

/** Run a fixed command. Arguments must never contain user text: on Windows this goes through a shell. */
export function run(cmd: string, args: readonly string[], cwd: string, timeoutMs = 600_000): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [...args], {
      cwd,
      shell: process.platform === 'win32',
      windowsHide: true,
      detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    const fail = (e: Error) => {
      clearTimeout(timer);
      killTree(child.pid);
      reject(e);
    };
    const timer = setTimeout(() => fail(new Error(`Lean timed out after ${Math.round(timeoutMs / 1000)} s.`)), timeoutMs);
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > MAX_OUTPUT) fail(new Error('Lean output exceeded the size limit.'));
    });
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
    throw new Error('`lake` is not on PATH. Install Lean with elan first: https://github.com/leanprover/elan');
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
