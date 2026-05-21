#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadDemos() {
  const demosPath = path.join(repoRoot, "site", "demos.json");
  if (!existsSync(demosPath)) {
    console.error("Missing site/demos.json");
    process.exit(1);
  }
  const demos = JSON.parse(readFileSync(demosPath, "utf8"));
  if (!Array.isArray(demos) || demos.length === 0) {
    console.error("site/demos.json must be a non-empty array");
    process.exit(1);
  }
  for (const entry of demos) {
    if (typeof entry.slug !== "string" || entry.slug.length === 0) {
      console.error("Each demo entry needs a slug");
      process.exit(1);
    }
    if (typeof entry.project !== "string" || entry.project.length === 0) {
      console.error("Each demo entry needs a project path");
      process.exit(1);
    }
  }
  return demos;
}

const demos = loadDemos();
let failed = false;

for (const { slug, project } of demos) {
  const outDir = path.join("builds", slug);
  console.log(`\n=== Bundling ${project} → ${outDir} ===\n`);
  const run = spawnSync(
    "node",
    ["scripts/build-bundle.mjs", project, "--out", outDir],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (run.status !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
