/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps every asset path relative, so the same build works on
// Vercel, Netlify, GitHub Pages (under /<repo>/) or straight from a folder.
// Live mode: `pnpm live` runs the Lean backend on 127.0.0.1:8787; both the dev server and
// `vite preview` forward /api to it, so the page talks to its own origin.
const api = { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } };

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
