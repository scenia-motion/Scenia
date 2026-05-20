#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let distCli = path.join(pkgRoot, "dist", "cli.js");

function maxSourceMtimeMs(dir) {
  let max = 0;
  for (let ent of readdirSync(dir, { withFileTypes: true })) {
    let p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      max = Math.max(max, maxSourceMtimeMs(p));
    } else if (ent.isFile() && /\.(ts|mts)$/.test(ent.name)) {
      max = Math.max(max, statSync(p).mtimeMs);
    }
  }
  return max;
}

function sketchHostNeedsCompile() {
  if (!existsSync(distCli)) {
    return true;
  }
  let srcRoot = path.join(pkgRoot, "src");
  if (!existsSync(srcRoot)) {
    return false;
  }
  let newestSrc = maxSourceMtimeMs(srcRoot);
  return newestSrc > statSync(distCli).mtimeMs;
}

if (sketchHostNeedsCompile()) {
  let result = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], {
    cwd: pkgRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await import(pathToFileURL(distCli).href);
