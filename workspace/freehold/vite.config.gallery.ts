import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Gallery page build. HTML-driven, emits dist/gallery.html + hashed JS/CSS
 * assets. Runs as its own ES-module extension page (chrome-extension://.../gallery.html).
 *
 * Uses emptyOutDir: false so it doesn't wipe the content-script or SW outputs.
 */
export default defineConfig({
  root: resolve(__dirname, 'gallery'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'gallery/gallery.html'),
    },
  },
});
