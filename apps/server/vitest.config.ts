import { defineConfig } from 'vitest/config';

// The first Fastify request on a cold Windows box can take several seconds.
export default defineConfig({ test: { testTimeout: 30_000 } });
