import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content-script/index': 'content-script/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'contentScript',
      },
    },
  },
});
