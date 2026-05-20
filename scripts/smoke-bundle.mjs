#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function stripLeadingPassthroughDash(argv) {
  if (argv[0] === "--") {
    return argv.slice(1);
  }
  return argv;
}

const bundlePath = stripLeadingPassthroughDash(process.argv.slice(2))[0];

if (bundlePath == null || bundlePath.length === 0) {
  console.error("Usage: node scripts/smoke-bundle.mjs <path/to/sketch.bundle.json>");
  process.exit(1);
}

if (!existsSync(bundlePath)) {
  console.error("Bundle not found: " + bundlePath);
  process.exit(1);
}

let raw = readFileSync(bundlePath, "utf8");
let bundle = JSON.parse(raw);

if (bundle.manifest?.name == null) {
  throw new Error("manifest.name missing");
}
if (bundle.wasm?.mime !== "application/wasm" || typeof bundle.wasm.data !== "string") {
  throw new Error("wasm payload invalid");
}
if (bundle.assets == null || typeof bundle.assets !== "object") {
  throw new Error("assets object missing");
}

let wasmBytes = Buffer.from(bundle.wasm.data, "base64");
if (wasmBytes.length < 8 || wasmBytes[0] !== 0x00 || wasmBytes[1] !== 0x61) {
  throw new Error("wasm bytes do not look like a Wasm module");
}

let assetKeys = Object.keys(bundle.assets);
for (let key of assetKeys) {
  let payload = bundle.assets[key];
  if (typeof payload.mime !== "string" || typeof payload.data !== "string") {
    throw new Error("invalid asset payload for " + key);
  }
  Buffer.from(payload.data, "base64");
}

console.log(
  "[smoke-bundle] OK",
  bundle.manifest.name,
  `wasm=${wasmBytes.length}b`,
  `assets=${assetKeys.length}`
);
