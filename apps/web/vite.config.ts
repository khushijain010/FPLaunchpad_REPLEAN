/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps every asset path relative, so the same build works on
// Vercel, Netlify, GitHub Pages (under /<repo>/) or straight from a folder.
// Live mode: `pnpm live` runs the Lean backend on 127.0.0.1:8791 (REPLEAN_PORT to change it);
// both the dev server and `vite preview` forward /api to it, so the page talks to its own origin.
const port = process.env.REPLEAN_PORT ?? '8791';
const api = { '/api': { target: `http://127.0.0.1:${port}`, changeOrigin: false } };

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
