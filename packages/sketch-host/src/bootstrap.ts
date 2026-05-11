import { WasmCanvasRuntime } from "@as3-wasm-runtime/runtime-js";
import type { SketchManifest } from "./manifest.js";

function showFatal(error: unknown): void {
  let message = error instanceof Error ? error.message : String(error);
  let pre = document.createElement("pre");
  pre.textContent = message;
  pre.setAttribute("style", "color:#fecaca;background:#1f0a0a;padding:12px;margin:8px");
  document.body.appendChild(pre);
}

function resolveCanvas(manifest: SketchManifest): HTMLCanvasElement {
  let selector = manifest.canvas.selector ?? "#stage";
  let el = document.querySelector<HTMLCanvasElement>(selector);
  if (el == null) {
    el = document.createElement("canvas");
    if (selector.startsWith("#")) {
      el.id = selector.slice(1);
    } else {
      el.id = "stage";
    }
    document.body.appendChild(el);
  }

  if (manifest.canvas.width != null) {
    el.width = manifest.canvas.width;
  }
  if (manifest.canvas.height != null) {
    el.height = manifest.canvas.height;
  }

  return el;
}

/**
 * Loads the sketch Wasm onto the canvas described in `manifest`, starts the frame loop, and returns the runtime.
 */
export async function bootstrapFromManifest(manifest: SketchManifest): Promise<WasmCanvasRuntime> {
  let canvas = resolveCanvas(manifest);
  let debugPointer = false;
  let param = manifest.runtime.debugPointerQueryParam;
  if (param != null && param.length > 0) {
    debugPointer = new URLSearchParams(window.location.search).has(param);
  }

  let runtime = await WasmCanvasRuntime.load({
    canvas,
    wasmUrl: manifest.wasmUrl,
    background: manifest.runtime.background,
    assets: manifest.runtime.assets ?? [],
    debugPointer
  });

  runtime.start();
  return runtime;
}

export async function bootDefaultFromManifest(manifest: SketchManifest): Promise<void> {
  try {
    await bootstrapFromManifest(manifest);
  } catch (error) {
    showFatal(error);
    console.error(error);
  }
}
