// Live mode backend: Lean source in, trace out.
//
// Lean can run arbitrary code while elaborating (`#eval`, `native_decide`, macros), so this server
// is as dangerous as running `lean` on whatever is posted to it. Hence:
//   - locally it listens on 127.0.0.1 only; publicly it runs inside the sandboxed container
//     (Dockerfile, docs/LIVE.md) with `publicMode`, which also filters source (policy.ts) and
//     rate-limits per IP;
//   - it rejects requests from any web page other than the player itself (a malicious site could
//     otherwise POST to it from your browser);
//   - it requires JSON, so a cross-site form post can't sneak through without a preflight;
//   - one job at a time, a size limit and a hard timeout that kills the whole process tree.

import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Trace } from '../../web/src/core/types.ts';
import { checkPublicSource } from './policy.ts';

export const MAX_SOURCE_BYTES = 64 * 1024;
export const TIMEOUT_MS = 60_000;

/** Pages allowed to talk to this server: the Vite dev server and `vite preview`. */
export const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export type TraceRunner = (file: string, title: string) => Promise<Trace>;

export type AppOptions = Readonly<{
  leanDir: string;
  runTrace: TraceRunner;
  leanVersion: () => Promise<string | null>;
  /** Public deployment: filter source, rate-limit, trust the host's proxy for client IPs. */
  publicMode?: boolean;
  /** Extra page origins allowed to call the API, e.g. the deployed site. */
  extraOrigins?: readonly string[];
  /** Runs per client IP per minute in public mode. */
  ratePerMinute?: number;
}>;

export function buildApp({
  leanDir,
  runTrace,
  leanVersion,
  publicMode = false,
  extraOrigins = [],
  ratePerMinute = 6,
}: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: MAX_SOURCE_BYTES * 2, trustProxy: publicMode });
  const liveDir = path.join(leanDir, 'Live');
  const origins = new Set([...ALLOWED_ORIGINS, ...extraOrigins]);
  const recent = new Map<string, readonly number[]>();
  let busy = false;

  /** Sliding one-minute window per IP. */
  const allow = (ip: string): boolean => {
    const now = Date.now();
    const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
    if (hits.length >= ratePerMinute) return false;
    recent.set(ip, [...hits, now]);
    return true;
  };

  app.addHook('onRequest', async (req, reply) => {
    const origin = req.headers.origin;
    if (origin !== undefined && origins.has(origin)) {
      // The deployed site lives on another origin, so answer CORS for allowed pages only.
      reply.header('access-control-allow-origin', origin);
      reply.header('vary', 'origin');
      if (req.method === 'OPTIONS') {
        return reply
          .header('access-control-allow-methods', 'GET, POST')
          .header('access-control-allow-headers', 'content-type')
          .header('access-control-max-age', '600')
          .code(204)
          .send();
      }
    } else if (origin !== undefined) {
      return reply.code(403).send({ error: 'This server only answers the Replean player.' });
    }
  });

  app.get('/api/health', async () => {
    const version = await leanVersion();
    return { ok: version !== null, leanVersion: version, public: publicMode };
  });

  app.post('/api/trace', async (req, reply) => {
    if (!req.headers['content-type']?.startsWith('application/json')) {
      return reply.code(415).send({ error: 'Send JSON: { "source": "..." }.' });
    }
    const body = req.body as { source?: unknown; title?: unknown } | null;
    const source = typeof body?.source === 'string' ? body.source.replace(/\r\n/g, '\n') : null;
    if (source === null || source.trim() === '') return reply.code(400).send({ error: 'The request contains no Lean source.' });
    if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
      return reply.code(413).send({ error: `Source exceeds ${MAX_SOURCE_BYTES / 1024} KB.` });
    }
    if (publicMode) {
      const verdict = checkPublicSource(source);
      if (!verdict.ok) {
        return reply.code(422).send({ error: `Rejected by the public server's safety filter: ${verdict.reasons.join('; ')}.` });
      }
      if (!allow(req.ip)) return reply.code(429).send({ error: `Rate limit reached (${ratePerMinute} runs per minute). Try again shortly.` });
    }
    if (busy) return reply.code(429).send({ error: 'Lean is busy with another run. Try again in a moment.' });

    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 80) : 'Your proof';
    busy = true;
    const name = `L${randomUUID().replace(/-/g, '')}.lean`;
    const file = path.join(liveDir, name);
    try {
      await mkdir(liveDir, { recursive: true });
      await writeFile(file, source, 'utf8');
      // The file name is generated here, never taken from the request.
      const trace = await runTrace(`Live/${name}`, title);
      return { trace };
    } catch (e) {
      return reply.code(422).send({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      busy = false;
      await rm(file, { force: true });
    }
  });

  return app;
}
