#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function usage() {
  console.error(`Usage: pnpm run preview:bundle -- <build-directory> [--port <n>]

Example:
  pnpm run preview:bundle -- builds/bouncing-ball
  pnpm run preview:bundle -- builds/ampersand --port 5180`);
  process.exit(1);
}

/** `pnpm run preview:bundle -- <args>` inserts a leading `--`. */
function stripLeadingPassthroughDash(argv) {
  if (argv[0] === "--") {
    return argv.slice(1);
  }
  return argv;
}

function parseArgv(argv) {
  let buildDir;
  let port = "5175";
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (a === "--port" || a === "-p") {
      port = argv[++i];
      if (port == null || port.length === 0) {
        console.error("Missing value for " + a);
        process.exit(1);
      }
      continue;
    }
    if (a === "--help" || a === "-h") {
      usage();
    }
    if (a.startsWith("-")) {
      console.error("Unknown option " + JSON.stringify(a));
      process.exit(1);
    }
    if (buildDir != null) {
      console.error("Unexpected extra argument " + JSON.stringify(a));
      process.exit(1);
    }
    buildDir = a;
  }
  if (buildDir == null || buildDir.length === 0) {
    usage();
  }
  return { buildDir, port };
}

let { buildDir, port } = parseArgv(stripLeadingPassthroughDash(process.argv.slice(2)));
let serveRoot = path.resolve(repoRoot, buildDir);

if (!existsSync(serveRoot) || !statSync(serveRoot).isDirectory()) {
  console.error("Build directory not found: " + serveRoot);
  process.exit(1);
}

let viteRun = spawnSync(
  "pnpm",
  ["exec", "vite", "--host", "0.0.0.0", "--port", port, serveRoot],
  { cwd: repoRoot, stdio: "inherit" }
);
process.exit(viteRun.status ?? 1);
