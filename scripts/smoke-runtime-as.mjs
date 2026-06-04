#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.join(__dirname, "../packages/runtime-as/build/runtime-as-smoke.wasm");

if (!existsSync(wasmPath)) {
  console.error("Wasm smoke module not found. Run: pnpm --filter @scenia-runtime/runtime-as build");
  process.exit(1);
}

let bytes = readFileSync(wasmPath);
let { instance } = await WebAssembly.instantiate(bytes, {
  env: {
    abort(message, fileName, line, column) {
      throw new Error(`abort at ${fileName}:${line}:${column} (${message})`);
    }
  }
});

let smoke = instance.exports.smoke;
if (typeof smoke !== "function") {
  throw new Error("smoke export missing from runtime-as-smoke.wasm");
}

let code = smoke();
if (code < 0) {
  console.error("[smoke-runtime-as] FAILED with code", code);
  process.exit(1);
}

console.log("[smoke-runtime-as] OK", "renderListLength=", code);
