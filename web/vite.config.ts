import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webRoot = dirname(fileURLToPath(import.meta.url));
const rabieFontPath = resolve(webRoot, 'src/assets/Rabie-Variable.woff2');
const rabieFontParts = [
  'rabie-01.b64',
  'rabie-02.b64',
  'rabie-03.b64',
  'rabie-04.b64',
  'rabie-05.b64',
  'rabie-06.b64',
  'rabie-07.b64',
].map((part) => resolve(webRoot, 'font-parts', part));

function materializeRabieFont() {
  const base64 = rabieFontParts
    .map((part) => readFileSync(part, 'utf8').trim())
    .join('');

  mkdirSync(dirname(rabieFontPath), { recursive: true });
  writeFileSync(rabieFontPath, Buffer.from(base64, 'base64'));
}

materializeRabieFont();

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap:
      process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    rollupOptions: {
      maxParallelFileOps: 128,
    },
  },
});
