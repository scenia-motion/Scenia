#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let distCli = path.join(pkgRoot, "dist", "cli.js");

if (!existsSync(distCli)) {
  let result = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], {
    cwd: pkgRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await import(pathToFileURL(distCli).href);
