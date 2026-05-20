#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function usage() {
  console.error(`Usage: pnpm run build:bundle -- <sketch-directory> [--out|-o <directory>]

Example:
  pnpm run build:bundle -- projects/bouncing-ball
  pnpm run build:bundle -- projects/ampersand --out builds/ampersand`);
  process.exit(1);
}

/** `pnpm run build:bundle -- <args>` inserts a leading `--`. */
function stripLeadingPassthroughDash(argv) {
  if (argv[0] === "--") {
    return argv.slice(1);
  }
  return argv;
}

function parseArgv(argv) {
  let sketchPath;
  let outDir;
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (a === "--out" || a === "-o") {
      outDir = argv[++i];
      if (outDir == null || outDir.length === 0) {
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
    if (sketchPath != null) {
      console.error("Unexpected extra argument " + JSON.stringify(a));
      process.exit(1);
    }
    sketchPath = a;
  }
  if (sketchPath == null || sketchPath.length === 0) {
    usage();
  }
  return { sketchPath, outDir };
}

let { sketchPath, outDir } = parseArgv(stripLeadingPassthroughDash(process.argv.slice(2)));

let sketchRoot = path.resolve(repoRoot, sketchPath);
if (!existsSync(path.join(sketchRoot, "sketch.json"))) {
  console.error("No sketch.json in " + sketchRoot);
  process.exit(1);
}

let bundleArgs = ["run", "sketch", "--", "bundle", sketchPath];
if (outDir != null) {
  bundleArgs.push("--out", outDir);
}

let bundleRun = spawnSync("pnpm", bundleArgs, { cwd: repoRoot, stdio: "inherit" });
if (bundleRun.status !== 0) {
  process.exit(bundleRun.status ?? 1);
}

let outRoot =
  outDir != null && outDir.length > 0
    ? path.resolve(repoRoot, outDir)
    : path.join(repoRoot, "builds", path.basename(sketchRoot));

let bundlePath = path.join(outRoot, "sketch.bundle.json");
let smokeRun = spawnSync("node", ["scripts/smoke-bundle.mjs", bundlePath], {
  cwd: repoRoot,
  stdio: "inherit"
});
process.exit(smokeRun.status ?? 1);
