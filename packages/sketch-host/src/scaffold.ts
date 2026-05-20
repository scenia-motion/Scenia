import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    let marker = path.join(dir, "pnpm-workspace.yaml");
    if (existsSync(marker)) {
      return dir;
    }
    let parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate pnpm-workspace.yaml above " + from);
    }
    dir = parent;
  }
}

function validateSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid slug "${slug}". Use lowercase kebab-case (letters, digits, hyphens), e.g. my-demo.`
    );
  }
}

function parsePositiveInt(name: string, value: string): number {
  let n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 16384) {
    throw new Error(`${name} must be an integer between 1 and 16384, got ${JSON.stringify(value)}`);
  }
  return n;
}

export interface ScaffoldOptions {
  slug: string;
  width: number;
  height: number;
  description: string;
  install: boolean;
}

export function printScaffoldHelp(): void {
  console.log(`scenia-sketch scaffold — new empty sketch under projects/<slug>

Usage:
  scenia-sketch scaffold <slug> [--width <px>] [--height <px>] [--description <text>]

Options:
  -w, --width          Stage / canvas width (default 640)
      --height         Stage / canvas height (default 360)
  -d, --description    package.json "description" field
      --no-install     Skip the automatic \`pnpm install\` after scaffolding

Slug: lowercase kebab-case (e.g. particle-field).

After writing the sketch files this command runs \`pnpm install\` from the
repository root so the new workspace package picks up its
\`workspace:*\` dependencies. Pass \`--no-install\` to skip this step.

Must be run from inside the monorepo (pnpm-workspace.yaml is discovered upward).

From the repo root, prefer passing flags through pnpm, for example:
  pnpm run sketch -- scaffold particle-field --width 1280 --height 720
`);
}

export function parseScaffoldArgv(argv: string[]): ScaffoldOptions {
  let slug: string | undefined;
  let width = 640;
  let height = 360;
  let description = "";
  let install = true;

  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (a === "--width" || a === "-w") {
      width = parsePositiveInt("--width", argv[++i] ?? "");
      continue;
    }
    if (a === "--height") {
      height = parsePositiveInt("--height", argv[++i] ?? "");
      continue;
    }
    if (a === "--description" || a === "-d") {
      description = argv[++i] ?? "";
      continue;
    }
    if (a === "--no-install") {
      install = false;
      continue;
    }
    if (a.startsWith("-")) {
      throw new Error(`Unknown option ${JSON.stringify(a)}`);
    }
    if (slug != null) {
      throw new Error(`Unexpected extra argument ${JSON.stringify(a)}`);
    }
    slug = a;
  }

  if (slug == null || slug.length === 0) {
    printScaffoldHelp();
    throw new Error("Missing <slug>.");
  }

  validateSlug(slug);
  return { slug, width, height, description, install };
}

function assemblySource(width: number, height: number): string {
  return `import {
  Stage,
  bindStage,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr
} from "@scenia-runtime/runtime-as/as3";

const stage = new Stage(${width}, ${height});
bindStage(stage);

export function update(deltaTime: f32): void {
  stage.tick(deltaTime);
}

export function getRenderListPtr(): usize {
  return runtimeGetRenderListPtr();
}

export function getRenderListLength(): i32 {
  return runtimeGetRenderListLength();
}
`;
}

function sketchJson(slug: string, width: number, height: number): string {
  let o = {
    wasmUrl: "/main.wasm",
    canvas: {
      selector: "#stage",
      width,
      height
    },
    runtime: {
      background: "#1a1a1a",
      assets: [] as string[]
    },
    assembly: {
      entry: "assembly/index.ts",
      config: "asconfig.json",
      target: "release"
    }
  };
  return JSON.stringify(o, null, 2) + "\n";
}

function packageJson(slug: string, description: string): string {
  let desc =
    description.length > 0
      ? description
      : `Empty sketch scaffolded with scenia-sketch (see repository README).`;
  let o = {
    name: "@scenia-runtime/" + slug,
    version: "0.1.0",
    private: true,
    description: desc,
    type: "module",
    scripts: {
      dev: "pnpm exec scenia-sketch dev .",
      build: "pnpm exec scenia-sketch build ."
    },
    dependencies: {
      "@scenia-runtime/runtime-js": "workspace:*",
      "@scenia-runtime/sketch-host": "workspace:*"
    },
    devDependencies: {
      "@scenia-runtime/runtime-as": "workspace:*",
      assemblyscript: "^0.28.9"
    }
  };
  return JSON.stringify(o, null, 2) + "\n";
}

const ASCONFIG_JSON = `{
  "targets": {
    "release": {
      "outFile": "public/main.wasm",
      "optimizeLevel": 3,
      "shrinkLevel": 0,
      "converge": false,
      "noAssert": false,
      "exportRuntime": true
    }
  }
}
`;

function readme(slug: string): string {
  return `# ${slug}

Empty sketch created with \`scenia-sketch scaffold\`. AssemblyScript entry:
\`assembly/index.ts\` (bound \`Stage\` with no display objects yet).

## Run

\`\`\`sh
pnpm install   # from repository root, once
pnpm run sketch dev projects/${slug}
\`\`\`

Or from this directory: \`pnpm dev\`.

## Build

\`\`\`sh
pnpm run sketch build projects/${slug}
\`\`\`

See the repository root README for \`sketch.json\`, optional \`host/main.ts\`, and the default canvas shell.
`;
}

function runPnpmInstall(repoRoot: string): void {
  console.log("Running pnpm install in " + repoRoot);
  let r = spawnSync("pnpm", ["install"], { cwd: repoRoot, stdio: "inherit" });
  if (r.error != null) {
    let code = (r.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(
        "Could not run pnpm: command not found on PATH. Re-run with --no-install or install pnpm and run `pnpm install` manually."
      );
    }
    throw r.error;
  }
  if (r.status !== 0) {
    throw new Error("pnpm install failed (exit " + String(r.status ?? r.signal ?? "?") + ")");
  }
}

export function runScaffold(cwd: string, argv: string[]): void {
  if (argv[0] === "--help" || argv[0] === "-h") {
    printScaffoldHelp();
    return;
  }

  let opts = parseScaffoldArgv(argv);
  let repoRoot = findRepoRoot(cwd);
  let projectsDir = path.join(repoRoot, "projects");
  let sketchDir = path.join(projectsDir, opts.slug);

  if (existsSync(sketchDir)) {
    throw new Error("Directory already exists: " + sketchDir);
  }

  mkdirSync(path.join(sketchDir, "assembly"), { recursive: true });
  mkdirSync(path.join(sketchDir, "public"), { recursive: true });

  writeFileSync(path.join(sketchDir, "package.json"), packageJson(opts.slug, opts.description), "utf8");
  writeFileSync(path.join(sketchDir, "sketch.json"), sketchJson(opts.slug, opts.width, opts.height), "utf8");
  writeFileSync(path.join(sketchDir, "asconfig.json"), ASCONFIG_JSON, "utf8");
  writeFileSync(path.join(sketchDir, "assembly", "index.ts"), assemblySource(opts.width, opts.height), "utf8");
  writeFileSync(path.join(sketchDir, "public", ".gitkeep"), "", "utf8");
  writeFileSync(path.join(sketchDir, "README.md"), readme(opts.slug), "utf8");

  console.log("Created sketch at " + sketchDir);

  if (opts.install) {
    runPnpmInstall(repoRoot);
    console.log("Next: pnpm run sketch dev projects/" + opts.slug);
  } else {
    console.log("Skipped pnpm install (--no-install).");
    console.log("Next: pnpm install && pnpm run sketch dev projects/" + opts.slug);
  }
}
