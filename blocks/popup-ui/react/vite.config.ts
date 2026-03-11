import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for the popup-ui/react block.
// This config is used when building the block standalone (e.g. for testing).
// In a workspace extension, the consumer provides their own vite.config.ts that
// includes this block's source. See BLOCK.md for integration notes.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Produce a single HTML entry point referencing an adjacent JS bundle.
    // The output is suitable for serving from a chrome-extension:// origin inside an iframe.
    rollupOptions: {
      input: 'index.html',
      output: {
        // Use a predictable filename so the content script can reference it.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Do not inline the base URL — extension origins use chrome-extension:// URLs.
    assetsInlineLimit: 0,
  },
  // Prevent Vite from rewriting chrome:// protocol references.
  base: './',
})
