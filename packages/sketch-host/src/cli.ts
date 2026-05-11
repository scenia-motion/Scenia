#!/usr/bin/env node
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "..");

interface SketchJson {
  assembly: {
    entry: string;
    config: string;
    target: string;
  };
  hooks?: {
    preCompile?: string;
  };
}

function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    let parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate pnpm-workspace.yaml above " + from);
    }
    dir = parent;
  }
}

function readSketchManifest(sketchRoot: string): SketchJson {
  let manifestPath = path.join(sketchRoot, "sketch.json");
  if (!existsSync(manifestPath)) {
    throw new Error("Missing sketch.json at " + manifestPath);
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as SketchJson;
}

function ensureSketchHostBuilt(): void {
  let marker = path.join(pkgRoot, "dist", "index.js");
  if (existsSync(marker)) {
    return;
  }
  let r = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: pkgRoot, stdio: "inherit" });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function buildRuntimeJs(repoRoot: string): void {
  let r = spawnSync(
    "pnpm",
    ["--filter", "@as3-wasm-runtime/runtime-js", "build"],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function runPreCompile(sketchRoot: string, cmd: string | undefined): void {
  if (cmd == null || cmd.length === 0) {
    return;
  }
  let r = spawnSync(cmd, { cwd: sketchRoot, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function runAsc(sketchRoot: string, manifest: SketchJson, extra: string[]): void {
  let { entry, config, target } = manifest.assembly;
  let args = ["exec", "asc", entry, "--config", config, "--target", target, ...extra];
  let r = spawnSync("pnpm", args, { cwd: sketchRoot, stdio: "inherit" });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function spawnAscWatch(sketchRoot: string, manifest: SketchJson): ChildProcess {
  let { entry, config, target } = manifest.assembly;
  let args = ["exec", "asc", entry, "--config", config, "--target", target, "--watch"];
  return spawn("pnpm", args, { cwd: sketchRoot, stdio: "inherit" });
}

function printHelp(): void {
  console.log(`as3-sketch — shared Vite shell for AssemblyScript sketches

Usage:
  as3-sketch dev [sketch-directory] [-- ...vite-args]
  as3-sketch build [sketch-directory] [-- ...vite-args]

Examples:
  as3-sketch dev examples/bouncing-ball
  pnpm --filter @as3-wasm-runtime/sketch-host exec -- as3-sketch dev .

Environment:
  SKETCH_ROOT   If set, absolute path to the sketch root (CLI sketch-directory is ignored).

Notes:
  sketch.json must declare assembly entry/config/target and optional hooks.preCompile.
  Optional host extension: sketch-directory/host/main.ts (see repository README).
`);
}

function parseArgs(argv: string[]): { cmd: "dev" | "build"; sketchPath: string; viteArgs: string[] } {
  let dash = argv.indexOf("--");
  let ours = dash === -1 ? argv : argv.slice(0, dash);
  let viteArgs = dash === -1 ? [] : argv.slice(dash + 1);
  let cmd = ours[0];
  if (cmd !== "dev" && cmd !== "build") {
    printHelp();
    process.exit(cmd === undefined ? 0 : 1);
  }
  let sketchPath = ours.length >= 2 ? ours[1] : ".";
  return { cmd: cmd as "dev" | "build", sketchPath, viteArgs };
}

async function main(): Promise<void> {
  let { cmd, sketchPath, viteArgs } = parseArgs(process.argv.slice(2));
  let sketchRoot =
    process.env.SKETCH_ROOT != null && process.env.SKETCH_ROOT.length > 0
      ? path.resolve(process.env.SKETCH_ROOT)
      : path.resolve(process.cwd(), sketchPath);
  if (!existsSync(path.join(sketchRoot, "sketch.json"))) {
    console.error("No sketch.json in " + sketchRoot);
    process.exit(1);
  }

  ensureSketchHostBuilt();

  let manifest = readSketchManifest(sketchRoot);
  let repoRoot = findRepoRoot(sketchRoot);

  buildRuntimeJs(repoRoot);
  runPreCompile(sketchRoot, manifest.hooks?.preCompile);

  let ascWatch: ChildProcess | null = null;
  if (cmd === "dev") {
    runAsc(sketchRoot, manifest, []);
    ascWatch = spawnAscWatch(sketchRoot, manifest);
  } else {
    runAsc(sketchRoot, manifest, []);
  }

  let viteBinArgs = ["exec", "vite", "--config", path.join(pkgRoot, "vite.config.mts"), ...viteArgs];
  if (cmd === "build") {
    viteBinArgs.push("build");
  }

  let vite = spawn("pnpm", viteBinArgs, {
    cwd: pkgRoot,
    env: { ...process.env, SKETCH_ROOT: sketchRoot },
    stdio: "inherit"
  });

  await new Promise<void>((resolve, reject) => {
    vite.on("exit", (code, signal) => {
      if (ascWatch != null) {
        ascWatch.kill("SIGINT");
      }
      if (signal === "SIGINT" || signal === "SIGTERM") {
        resolve();
      } else if (signal != null) {
        reject(new Error(String(signal)));
      } else if (code !== 0 && code != null) {
        reject(new Error("vite exited " + String(code)));
      } else {
        resolve();
      }
    });
    vite.on("error", reject);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
