import { cpSync, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import chokidar from "chokidar";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function sketchVirtualPlugin(sketchRoot: string): Plugin {
  let manifestPath = path.join(sketchRoot, "sketch.json");
  let hostMainPath = path.join(sketchRoot, "host", "main.ts");
  let bootDefaultPath = path.join(__dirname, "src", "boot-default.ts");

  return {
    name: "scenia-sketch-virtual",
    resolveId(id) {
      if (id === "virtual:sketch-manifest") {
        return "\0virtual:sketch-manifest";
      }
      if (id === "virtual:sketch-bootstrap") {
        return "\0virtual:sketch-bootstrap";
      }
    },
    load(id) {
      if (id === "\0virtual:sketch-manifest") {
        let raw = readFileSync(manifestPath, "utf8");
        let parsed: unknown = JSON.parse(raw);
        return `export default ${JSON.stringify(parsed)};`;
      }
      if (id === "\0virtual:sketch-bootstrap") {
        let target = existsSync(hostMainPath) ? hostMainPath : bootDefaultPath;
        let href = pathToFileURL(target).href;
        return `import ${JSON.stringify(href)};\n`;
      }
    }
  };
}

/**
 * `scenia-sketch dev` re-runs `asc` and rewrites `public/*.wasm`, but the sketch directory lies
 * outside Vite's `root`, so Vite's built-in watcher filters those paths and the dev client
 * never gets a reload signal. We run a dedicated chokidar watcher and call `server.hot.send`
 * ourselves so the browser fetches the new wasm.
 */
function sketchWasmDevReloadPlugin(sketchRoot: string): Plugin {
  let manifestPath = path.join(sketchRoot, "sketch.json");
  let pubDir = path.join(sketchRoot, "public");

  return {
    name: "scenia-sketch-wasm-dev-reload",
    apply: "serve",
    configureServer(server) {
      let manifestAbs = path.resolve(manifestPath);
      let pubAbs = path.resolve(pubDir);

      let watchTargets: string[] = [];
      if (existsSync(manifestAbs)) {
        watchTargets.push(manifestAbs);
      }
      if (existsSync(pubAbs)) {
        watchTargets.push(pubAbs);
      }
      if (watchTargets.length === 0) {
        return;
      }

      let debounce: ReturnType<typeof setTimeout> | null = null;
      let scheduleReload = (reason: string): void => {
        if (debounce != null) {
          clearTimeout(debounce);
        }
        debounce = setTimeout(() => {
          debounce = null;
          server.hot.send({ type: "full-reload" });
          server.config.logger.info(`[scenia-sketch] full reload (${reason})`);
        }, 100);
      };

      let watcher = chokidar.watch(watchTargets, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 40 }
      });

      let onFsEvent = (_event: string, file: string): void => {
        let abs = path.resolve(file);
        if (abs === manifestAbs) {
          scheduleReload("sketch.json");
          return;
        }
        if (
          (abs.startsWith(pubAbs + path.sep) || abs === pubAbs) &&
          abs.endsWith(".wasm")
        ) {
          scheduleReload(path.relative(sketchRoot, abs) || "wasm");
        }
      };
      watcher.on("all", onFsEvent);

      let shutdown = (): void => {
        if (debounce != null) {
          clearTimeout(debounce);
          debounce = null;
        }
        void watcher.close();
      };
      server.httpServer?.once("close", shutdown);
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    }
  };
}

/**
 * Vite omits `publicDir` when it lies outside `root`, so we mirror the sketch's
 * `public/` into the dev server and into `dist/` on production builds.
 */
function sketchPublicPlugin(sketchRoot: string): Plugin {
  let pub = path.join(sketchRoot, "public");

  return {
    name: "scenia-sketch-public",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let pathname = req.url?.split("?")[0] ?? "";
        if (
          pathname === "" ||
          pathname.startsWith("/@") ||
          pathname.startsWith("/node_modules") ||
          pathname.startsWith("/src")
        ) {
          return next();
        }

        let decoded = decodeURIComponent(pathname);
        let rel = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
        if (rel.startsWith("/")) {
          rel = rel.slice(1);
        }
        if (rel === "") {
          return next();
        }

        let absPub = path.resolve(pub);
        let file = path.resolve(absPub, rel);
        if (!file.startsWith(absPub + path.sep) && file !== absPub) {
          return next();
        }
        if (!existsSync(file)) {
          return next();
        }
        if (!statSync(file).isFile()) {
          return next();
        }

        let ext = path.extname(file);
        let mime =
          ext === ".wasm"
            ? "application/wasm"
            : ext === ".png"
              ? "image/png"
              : "application/octet-stream";
        res.setHeader("Content-Type", mime);
        res.end(readFileSync(file));
      });
    },
    closeBundle() {
      if (!existsSync(pub)) {
        return;
      }
      let outDir = path.join(sketchRoot, "dist");
      cpSync(pub, outDir, { recursive: true });
    }
  };
}

export default defineConfig(() => {
  let sketchRoot = path.resolve(process.env.SKETCH_ROOT ?? ".");
  let repoRoot = findRepoRoot(sketchRoot);

  return {
    root: __dirname,
    publicDir: false,
    plugins: [
      sketchVirtualPlugin(sketchRoot),
      sketchWasmDevReloadPlugin(sketchRoot),
      sketchPublicPlugin(sketchRoot)
    ],
    server: {
      host: "0.0.0.0",
      fs: {
        allow: [repoRoot, __dirname, sketchRoot]
      }
    },
    build: {
      emptyOutDir: true,
      outDir: path.join(sketchRoot, "dist")
    },
    resolve: {
      dedupe: ["@scenia-runtime/runtime-js"]
    }
  };
});
