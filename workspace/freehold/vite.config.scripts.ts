import { defineConfig, Plugin } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

const copyManifest: Plugin = {
  name: 'copy-manifest',
  closeBundle() {
    copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(__dirname, 'dist/manifest.json'),
    );
  },
};

export default defineConfig({
  plugins: [copyManifest],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: 'service-worker/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
  },
});
