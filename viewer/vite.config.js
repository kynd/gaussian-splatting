import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  base: './',
  build: {
    outDir: '../docs',
    emptyOutDir: true
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    fs: {
      allow: ['..']
    }
  },
});
