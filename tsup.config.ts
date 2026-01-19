import { defineConfig } from 'tsup';

export default defineConfig([
  // React component (main entry)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    banner: {
      js: '"use client";',
    },
  },
  // Browser bundle (standalone script with React bundled)
  {
    entry: ['src/browser.tsx'],
    outDir: 'dist/browser',
    format: ['iife'],
    globalName: 'MnexiumChat',
    splitting: false,
    sourcemap: true,
    minify: true,
    // Bundle React for browser usage
    noExternal: ['react', 'react-dom'],
    esbuildOptions(options) {
      options.define = {
        'process.env.NODE_ENV': '"production"',
      };
    },
  },
  // Core (vanilla JS client)
  {
    entry: ['src/core/index.ts'],
    outDir: 'dist/core',
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
  },
  // Server handlers
  {
    entry: ['src/server/index.ts'],
    outDir: 'dist/server',
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom'],
  },
]);
