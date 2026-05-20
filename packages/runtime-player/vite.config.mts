import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Single-file ESM bundle for standalone HTML pages (no bare package imports). */
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "runtime-player"
    },
    outDir: path.resolve(__dirname, "dist/browser"),
    emptyOutDir: true,
    sourcemap: false,
    minify: false
  },
  resolve: {
    dedupe: ["@scenia-runtime/runtime-js"]
  }
});
