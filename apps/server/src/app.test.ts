import { mkdtemp, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Trace } from '../../web/src/core/types.ts';
import { buildApp, MAX_SOURCE_BYTES, type AppOptions, type TraceRunner } from './app.ts';

const fakeTrace = (title: string): Trace => ({
  schema: 1,
  meta: { id: 'live', title, blurb: '', watch: '', theorem: '', leanVersion: 'test' },
  source: '',
  steps: [],
  messages: [],
});

async function setup(runTrace: TraceRunner = async (_f, t) => fakeTrace(t), extra: Partial<AppOptions> = {}) {
  const leanDir = await mkdtemp(path.join(os.tmpdir(), 'replean-'));
  const app = buildApp({ leanDir, runTrace, leanVersion: async () => '4.34.1', ...extra });
  return { app, leanDir };
}

const post = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST' as const,
  url: '/api/trace',
  headers: { 'content-type': 'application/json', ...headers },
  payload: JSON.stringify(body),
});

describe('live server', () => {
  it('reports Lean as available', async () => {
    const { app } = await setup();
    const r = await app.inject({ method: 'GET', url: '/api/health' });
    expect(r.json()).toEqual({ ok: true, leanVersion: '4.34.1', public: false });
  });

  it('answers its root URL with a pointer instead of a 404', async () => {
    const { app } = await setup();
    const r = await app.inject({ method: 'GET', url: '/' });
    expect(r.statusCode).toBe(200);
    expect(r.json().health).toBe('/api/health');
  });

  it('traces posted source and cleans up the temp file', async () => {
    let seen = '';
    const { app, leanDir } = await setup(async (file, title) => {
      seen = file;
      return fakeTrace(title);
    });
    const r = await app.inject(post({ source: 'theorem t : True := by\n  trivial\n', title: 'mine' }));
    expect(r.statusCode).toBe(200);
    expect(r.json().trace.meta.title).toBe('mine');
    expect(seen).toMatch(/^Live\/L[0-9a-f]{32}\.lean$/);
    expect(await readdir(path.join(leanDir, 'Live'))).toEqual([]);
  });

  it('refuses requests from other websites', async () => {
    const { app } = await setup();
    const r = await app.inject(post({ source: 'x' }, { origin: 'https://evil.example' }));
    expect(r.statusCode).toBe(403);
  });

  it('accepts the player origin', async () => {
    const { app } = await setup();
    const r = await app.inject(post({ source: 'x' }, { origin: 'http://localhost:5173' }));
    expect(r.statusCode).toBe(200);
  });

  it('requires JSON', async () => {
    const { app } = await setup();
    const r = await app.inject({ method: 'POST', url: '/api/trace', headers: { 'content-type': 'text/plain' }, payload: 'source=x' });
    expect(r.statusCode).toBe(415);
  });

  it('rejects empty and oversized source', async () => {
    const { app } = await setup();
    expect((await app.inject(post({ source: '   ' }))).statusCode).toBe(400);
    expect((await app.inject(post({ source: 'a'.repeat(MAX_SOURCE_BYTES + 1) }))).statusCode).toBe(413);
  });

  it('turns a Lean failure into a readable error', async () => {
    const { app } = await setup(async () => {
      throw new Error('Lean timed out after 60 s.');
    });
    const r = await app.inject(post({ source: 'x' }));
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toMatch(/timed out/);
  });

  it('runs one job at a time', async () => {
    let release = () => {};
    const { app } = await setup(() => new Promise((res) => (release = () => res(fakeTrace('a')))));
    const first = app.inject(post({ source: 'a' }));
    await new Promise((r) => setTimeout(r, 20));
    const second = await app.inject(post({ source: 'b' }));
    expect(second.statusCode).toBe(429);
    release();
    expect((await first).statusCode).toBe(200);
  });
});

describe('public mode', () => {
  const site = 'https://khushi.github.io';
  const pub = (extra: Partial<AppOptions> = {}) => setup(undefined, { publicMode: true, extraOrigins: [site], ...extra });

  it('answers the deployed site with CORS headers, including the preflight', async () => {
    const { app } = await pub();
    const pre = await app.inject({ method: 'OPTIONS', url: '/api/trace', headers: { origin: site, 'access-control-request-method': 'POST' } });
    expect(pre.statusCode).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe(site);
    const r = await app.inject(post({ source: 'theorem t : True := trivial' }, { origin: site }));
    expect(r.statusCode).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe(site);
  });

  it('still refuses every other site', async () => {
    const { app } = await pub();
    expect((await app.inject(post({ source: 'x' }, { origin: 'https://other.example' }))).statusCode).toBe(403);
  });

  it('refuses source that runs code', async () => {
    const { app } = await pub();
    const r = await app.inject(post({ source: '#eval IO.println "hi"' }, { origin: site }));
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toMatch(/#eval/);
  });

  it('rate-limits per client', async () => {
    const { app } = await pub({ ratePerMinute: 2 });
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await app.inject(post({ source: 'theorem t : True := trivial' }, { origin: site }))).statusCode);
    expect(codes).toEqual([200, 200, 429]);
  });
});
