import { bootstrapFromManifest } from "@scenia-runtime/sketch-host";
import type { WasmCanvasRuntime } from "@scenia-runtime/runtime-js";
import manifest from "virtual:sketch-manifest";

document.title = "scenia-runtime: tween demo";

let app = document.createElement("main");
app.id = "app";

let hint = document.createElement("p");
hint.textContent = "Space: pause/resume · B: simulate tab blur (clamped step)";
hint.setAttribute(
  "style",
  "margin:8px 12px;font:14px/1.4 system-ui,sans-serif;color:#a8b4c8"
);

let canvas = document.createElement("canvas");
canvas.id = "stage";
canvas.width = manifest.canvas.width ?? 640;
canvas.height = manifest.canvas.height ?? 360;
canvas.setAttribute("aria-label", "Tween demo canvas");
canvas.tabIndex = 0;

app.append(hint, canvas);
document.body.replaceChildren(app);
canvas.focus();

let runtime: WasmCanvasRuntime | null = null;

bootstrapFromManifest(manifest)
  .then((r) => {
    runtime = r;
  })
  .catch((error) => {
    let message = error instanceof Error ? error.message : String(error);
    let pre = document.createElement("pre");
    pre.textContent = message;
    app.appendChild(pre);
    console.error(error);
  });

window.addEventListener("keydown", (event) => {
  if (runtime == null) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (runtime.isPaused) {
      runtime.resume();
      hint.textContent = "Space: pause/resume · B: simulate tab blur (clamped step)";
    } else {
      runtime.pause();
      hint.textContent = "Paused — Space to resume";
    }
  }

  if (event.code === "KeyB") {
    event.preventDefault();
    runtime.step(2.0);
  }
});
