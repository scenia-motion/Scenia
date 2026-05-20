import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function buildRuntimePlayerPackage(repoRoot: string): void {
  let r = spawnSync(
    "pnpm",
    ["--filter", "@as3-wasm-runtime/runtime-player", "build"],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

export function resolveRuntimePlayerBrowserJs(repoRoot: string): string {
  let p = path.join(repoRoot, "packages", "runtime-player", "dist", "browser", "runtime-player.js");
  if (!existsSync(p)) {
    throw new Error("Missing runtime player bundle at " + p + " — build @as3-wasm-runtime/runtime-player first.");
  }
  return p;
}

export function copyRuntimePlayerIntoOutdir(repoRoot: string, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  let src = resolveRuntimePlayerBrowserJs(repoRoot);
  copyFileSync(src, path.join(outDir, "runtime-player.js"));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function writeStandalonePlayerIndexHtml(outDir: string, title: string): void {
  let safeTitle = escapeHtml(title);
  let html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      html,
      body {
        margin: 0;
        height: 100%;
        background: #0f172a;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      #app {
        min-height: 100%;
        display: grid;
        place-items: center;
        padding: 16px;
        box-sizing: border-box;
      }
      #status {
        position: fixed;
        left: 12px;
        bottom: 12px;
        font-size: 12px;
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <p id="status">Loading sketch bundle…</p>
    <script type="module">
      import { loadSketchBundle } from "./runtime-player.js";

      const status = document.getElementById("status");
      const mount = document.getElementById("app");

      loadSketchBundle("./sketch.bundle.json", { mount })
        .then((runtime) => {
          status.textContent = \`Running: \${runtime.canvas.width}×\${runtime.canvas.height}\`;
        })
        .catch((error) => {
          status.textContent = "Failed to load sketch bundle.";
          console.error(error);
        });
    </script>
  </body>
</html>
`;
  writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

export function readBundleTitleFromOutdir(outDir: string): string {
  let bundlePath = path.join(outDir, "sketch.bundle.json");
  let raw = readFileSync(bundlePath, "utf8");
  let bundle = JSON.parse(raw) as { manifest?: { name?: string } };
  let name = bundle.manifest?.name;
  if (typeof name === "string" && name.length > 0) {
    return name;
  }
  return "AS3 Wasm sketch bundle";
}
