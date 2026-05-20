import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { SketchBundle, SketchBundlePayload } from "@scenia-runtime/runtime-js";
import type { SketchManifest } from "./manifest.js";

const RUNTIME_VERSION = "0.1.0";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm"
};

function mimeForFile(filePath: string): string {
  let ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function encodeBase64(bytes: Buffer): string {
  return bytes.toString("base64");
}

function resolveWasmFile(sketchRoot: string, manifest: SketchManifest): string {
  let wasmUrl = manifest.wasmUrl;
  let rel = wasmUrl.startsWith("/") ? wasmUrl.slice(1) : wasmUrl;
  let inPublic = path.join(sketchRoot, "public", rel);
  if (existsSync(inPublic)) {
    return inPublic;
  }
  let direct = path.join(sketchRoot, rel);
  if (existsSync(direct)) {
    return direct;
  }
  throw new Error(`Wasm file not found for wasmUrl "${manifest.wasmUrl}" (looked in public/ and sketch root).`);
}

function declaredAssetPaths(manifest: SketchManifest): string[] {
  let assets = manifest.runtime.assets ?? [];
  let paths: string[] = [];
  for (let i = 0; i < assets.length; i++) {
    let asset = assets[i];
    paths.push(typeof asset === "string" ? asset : asset.path);
  }
  return paths;
}

function resolveAssetFile(sketchRoot: string, assetPath: string): string {
  let normalized = assetPath.replace(/^\/+/, "");
  let inPublic = path.join(sketchRoot, "public", normalized);
  if (existsSync(inPublic)) {
    return inPublic;
  }
  let direct = path.join(sketchRoot, normalized);
  if (existsSync(direct)) {
    return direct;
  }
  throw new Error(`Asset not found for path "${assetPath}" (looked in public/ and sketch root).`);
}

function readPayload(filePath: string): SketchBundlePayload {
  let bytes = readFileSync(filePath);
  return {
    mime: mimeForFile(filePath),
    data: encodeBase64(bytes)
  };
}

function sketchName(sketchRoot: string): string {
  let pkgPath = path.join(sketchRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      let pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
      if (typeof pkg.name === "string" && pkg.name.length > 0) {
        return pkg.name;
      }
    } catch {
      // fall through
    }
  }
  return path.basename(sketchRoot);
}

export interface BuildSketchBundleOptions {
  outFile?: string;
}

/**
 * Assemble a portable JSON sketch bundle from a compiled sketch directory.
 * Caller must compile wasm (e.g. via `asc`) before invoking this.
 */
export function buildSketchBundle(sketchRoot: string, options: BuildSketchBundleOptions = {}): string {
  let manifestPath = path.join(sketchRoot, "sketch.json");
  if (!existsSync(manifestPath)) {
    throw new Error("Missing sketch.json at " + manifestPath);
  }

  let manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SketchManifest;
  let wasmFile = resolveWasmFile(sketchRoot, manifest);

  let assets: Record<string, SketchBundlePayload> = {};
  for (let assetPath of declaredAssetPaths(manifest)) {
    let file = resolveAssetFile(sketchRoot, assetPath);
    assets[assetPath] = readPayload(file);
  }

  let bundle: SketchBundle = {
    manifest: {
      name: sketchName(sketchRoot),
      entry: manifest.assembly.entry,
      width: manifest.canvas.width,
      height: manifest.canvas.height,
      backgroundColor: manifest.runtime.background,
      runtimeVersion: RUNTIME_VERSION
    },
    wasm: {
      mime: "application/wasm",
      data: encodeBase64(readFileSync(wasmFile))
    },
    assets
  };

  let outFile = options.outFile ?? path.join(sketchRoot, "dist", "sketch.bundle.json");
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(bundle), "utf8");
  return outFile;
}
