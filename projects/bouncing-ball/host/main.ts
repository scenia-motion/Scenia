import { bootstrapFromManifest } from "@scenia-runtime/sketch-host";
import manifest from "virtual:sketch-manifest";
//import "./main.css";

document.title = "scenia-runtime: bouncing ball";

let app = document.createElement("main");
app.id = "app";

/*let panel = document.createElement("section");
panel.className = "panel";

let eyebrow = document.createElement("p");
eyebrow.className = "eyebrow";
eyebrow.textContent = "scenia-runtime";

let heading = document.createElement("h1");
heading.textContent = "Bouncing Ball";

let blurb = document.createElement("p");
blurb.textContent =
  "AssemblyScript code creates a Stage, Sprite, Bitmap, and ENTER_FRAME listener. JavaScript reads the Wasm render list and draws the bitmap on Canvas2D.";

panel.append(eyebrow, heading, blurb);*/

let canvas = document.createElement("canvas");
canvas.id = "stage";
canvas.width = manifest.canvas.width ?? 1280;
canvas.height = manifest.canvas.height ?? 720;
canvas.setAttribute("aria-label", "Bouncing ball demo canvas");

app.append(canvas);
document.body.replaceChildren(app);

bootstrapFromManifest(manifest).catch((error) => {
  let message = error instanceof Error ? error.message : String(error);
  let pre = document.createElement("pre");
  pre.className = "error";
  pre.textContent = message;
  app.appendChild(pre);
  console.error(error);
});
