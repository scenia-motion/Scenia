# Scenia: scenia-runtime

An experimental browser-based proof of concept for a Flash/ActionScript-3-inspired
creative coding runtime that compiles user code to WebAssembly with
AssemblyScript.

This project lives in the [Scenia](https://github.com/dotloadmovie/scenia) repository.

This is intentionally **not** a Flash emulator. It does not parse SWF files,
does not target Flash compatibility, and does not attempt to recreate the full
ActionScript 3 standard library. The goal is to explore whether the ergonomic
feel of AS3 creative coding can be recreated on the modern web:

- `Stage`
- `Sprite`
- `Bitmap`
- `TextField`
- `EventDispatcher`
- `Event.ENTER_FRAME`
- code-driven animation

Canvas2D is the first rendering backend. WebGPU, visual editing, SWF parsing,
and a full compiler are explicitly out of scope for this MVP.

## Workspace layout

```txt
packages/
  runtime-as/      AssemblyScript display-list primitives compiled into Wasm
  runtime-js/      TypeScript browser host that owns canvas, assets, and drawing
  runtime-player/  Re-export of bundle loader for standalone HTML pages
  sketch-host/     Shared Vite shell + `scenia-sketch` CLI for browser sketches
  compiler/        Placeholder for a later AS3-like-to-AssemblyScript transform
projects/
  <name>/          Sketches (pnpm exec scenia-sketch scaffold --help)
  bouncing-ball/   Reference sketch using sketch-host
builds/
  <name>/          Standalone static sites from `scenia-sketch bundle` (generated)
site/
  demos.json       Allowlist for the GitHub Pages demo gallery
```

## Commands

Run these from the **repository root** after `pnpm install`. Every sketch-specific
command takes the sketch path as an argument (for example `projects/bouncing-ball`);
nothing is hard-coded in the root `package.json` scripts.

With pnpm, extra arguments can be passed after `--` or directly after the script
name — both work:

```sh
pnpm dev projects/bouncing-ball
pnpm run build:bundle projects/bouncing-ball
pnpm run build:bundle -- projects/bouncing-ball
```

### Workspace

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspace dependencies. |
| `pnpm build` | Build every package in the monorepo (`pnpm -r build`). |
| `pnpm run build:player` | Build only `@scenia-runtime/runtime-player` (and its `runtime-js` dependency). |

### Sketch development (browser + Vite)

| Command | What it does |
| --- | --- |
| `pnpm dev <sketch-dir>` | Shorthand for `pnpm run sketch dev <sketch-dir>`. Compiles Wasm, watches AssemblyScript sources, starts the shared Vite dev server. |
| `pnpm run sketch dev <sketch-dir>` | Same as above. |
| `pnpm run sketch build <sketch-dir>` | Production Vite build for the sketch (output under the sketch’s `dist/`). |
| `pnpm run sketch dev <sketch-dir> -- --port 5174` | Dev server with extra Vite flags (anything after the second `--` goes to Vite). |

**From inside a sketch directory** (e.g. `projects/bouncing-ball/`), the sketch’s
own `package.json` provides the same workflow relative to `.`:

| Command | What it does |
| --- | --- |
| `pnpm dev` | `scenia-sketch dev .` |
| `pnpm build` | `scenia-sketch build .` |

Some sketches define extra scripts (for example `prepare-assets` on bouncing-ball);
see that sketch’s `package.json`.

### Portable bundle + standalone player

Produces a static folder (`index.html`, `sketch.bundle.json`, `runtime-player.js`)
suitable for any static host. Default output: `builds/<sketch-folder-name>/`.

| Command | What it does |
| --- | --- |
| `pnpm run build:bundle <sketch-dir>` | Bundle the sketch, write the standalone site, run a smoke check on `sketch.bundle.json`. Optional: `--out <dir>` or `-o <dir>`. |
| `pnpm run sketch -- bundle <sketch-dir>` | Bundle only (no smoke check). Optional: `--out <dir>`. |
| `pnpm run sketch -- bundle <sketch-dir> --out /tmp/my-site` | Bundle to a custom directory. |
| `pnpm run preview:bundle <build-dir>` | Serve a build folder with Vite. Optional: `--port 5180` (default `5175`). |
| `pnpm run smoke:bundle <path/to/sketch.bundle.json>` | Validate an existing bundle JSON (wasm header, assets, manifest). |
| `pnpm run build:pages` | Bundle all demos in `site/demos.json`, assemble the GitHub Pages site into `_site/`. |
| `pnpm run preview:pages` | Assemble `_site/` (local base `/`) and serve the gallery with Vite on port `5176`. |

**MVP limitations:** JSON + base64 only (large files inflate size); no
compression or binary container; assets must be listed in `sketch.json`
`runtime.assets`; host extensions (`host/main.ts`) are not included in the
bundle (canvas-only bootstrap).

### Scaffold a new sketch

| Command | What it does |
| --- | --- |
| `pnpm run sketch -- scaffold <slug>` | Create `projects/<slug>/` with `sketch.json`, `assembly/index.ts`, `asconfig.json`, and a workspace `package.json`. Runs `pnpm install` unless `--no-install`. |
| `pnpm exec scenia-sketch scaffold <slug> --width 1280 --height 720` | Same, with explicit dimensions. |
| `pnpm exec scenia-sketch scaffold --help` | Full scaffold options. |

After scaffolding: `pnpm run sketch dev projects/<slug>`.

### `scenia-sketch` CLI reference

`pnpm run sketch` is an alias for `pnpm exec scenia-sketch`. Subcommands:

```txt
scenia-sketch dev [sketch-directory] [-- ...vite-args]
scenia-sketch build [sketch-directory] [-- ...vite-args]
scenia-sketch bundle [sketch-directory] [--out|-o <directory>]
scenia-sketch scaffold <slug> [--width <n>] [--height <n>] [--description <text>]
```

Set `SKETCH_ROOT` to an absolute sketch path to ignore the `[sketch-directory]`
argument. `scenia-sketch --help` prints usage and examples.

## Getting started

```sh
pnpm install
pnpm build
pnpm dev projects/bouncing-ball
```

Open the URL Vite prints (typically `http://localhost:5173`). For a portable
static build and local preview:

```sh
pnpm run build:bundle projects/bouncing-ball
pnpm run preview:bundle builds/bouncing-ball
```

### Demo gallery (GitHub Pages)

A static gallery at [https://dotloadmovie.github.io/Scenia/](https://dotloadmovie.github.io/Scenia/)
wraps bundled sketches with a persistent header (Scenia title, GitHub link, demo
dropdown). Sketches load in an iframe so bundle paths stay relative and unchanged.

**One-time setup:** In the GitHub repository, open **Settings → Pages** and set
**Build and deployment → Source** to **GitHub Actions**. After merging to `main`,
the [Deploy GitHub Pages](.github/workflows/pages.yml) workflow builds allowlisted
demos and publishes `_site/`.

**Local preview:**

```sh
pnpm run build:pages
pnpm run preview:pages
```

Open `http://localhost:5176/` (or `?demo=bouncing-ball` to deep-link). Local
preview uses base `/`; production uses `/Scenia/` (set via `PAGES_BASE` in CI).

**Add a demo to the gallery:**

1. Create or finish a sketch under `projects/<slug>/` with `sketch.json`.
2. Add an entry to [`site/demos.json`](site/demos.json):

   ```json
   { "slug": "<slug>", "label": "My Sketch", "project": "projects/<slug>" }
   ```

3. Run `pnpm run build:pages` locally to verify, then merge to `main`.

The allowlist controls which sketches are built in CI and listed in the dropdown.
WIP sketches can be omitted until they are ready.

### Sketches (`sketch-host` + `scenia-sketch`)

Sketches avoid duplicating Vite boilerplate: one shared package
(`@scenia-runtime/sketch-host`) owns the dev server, HTML shell, Wasm output
location (`public/` under the sketch), and `vite build`. Each sketch directory
carries `sketch.json` (the sketch manifest), AssemblyScript sources + `asconfig.json`,
`public/` assets, and optionally a **host extension** (see below). See **Commands**
above for the full list of dev, build, bundle, and scaffold invocations.

**Default shell:** `index.html` is only charset, viewport, an empty title, and
a module entry—no layout chrome. The default bootstrap creates a canvas with id
`#stage` (or uses the one from `sketch.json` `canvas.selector`) and loads
`WasmCanvasRuntime` from `@scenia-runtime/runtime-js` using manifest fields
`wasmUrl`, `runtime.assets`, `runtime.background`, and optional
`runtime.debugPointerQueryParam`.

**Host extension (escape hatch):** If `host/main.ts` exists under the sketch
root, it is used as the app entry instead of the default bootstrap. Import
`bootstrapFromManifest` from `@scenia-runtime/sketch-host`, import
`virtual:sketch-manifest`, add any HTML/CSS/DOM or extra bindings there, then
call `bootstrapFromManifest(manifest)`. Optional `host/main.css` (or other
modules) can be imported from that file. Remove `host/main.ts` to fall back to
the canvas-only default for the same Wasm and manifest.

## First-pass architecture

User code is authored in AssemblyScript today. It imports small AS3-inspired
runtime classes from `@scenia-runtime/runtime-as`, creates a display tree, and
exports an `update(dt)` function:

```ts
class Main extends Sprite {
  private ball: Bitmap;

  constructor() {
    super();
    this.ball = new Bitmap("ball.png");
    this.addChild(this.ball);
    this.addEventListener<Main>(Event.ENTER_FRAME, this.onFrame);
  }

  private onFrame(e: Event): void {
    this.ball.x += 2;
    this.ball.rotation += 3;
  }
}
```

AssemblyScript requires the explicit `<Main>` type argument for this method
reference today. The intended ergonomic target is the classic AS3 shape without
that type hint.

### Frame timeline

The browser host runs one `requestAnimationFrame` loop via `RuntimeTimeline` in
`runtime-js` (pause/resume, delta clamp, render dirty flag). Each frame it calls
Wasm `update(deltaTime)`, which should call `stage.tick(deltaTime)`.

On the Wasm side, `RuntimeTimeline` (or `stage.tick` as a shorthand) runs the
default `TweenManager`, dispatches `Event.ENTER_FRAME` to listeners on the
display list, then rebuilds the render list. Large frame gaps are clamped
(default 0.1s) on both host and Wasm so tweens do not jump after tab switches.

### Tweening

Property tweens run automatically when the shared timeline ticks — the
`TweenManager` updates before enter-frame events.

```ts
import { Ease, Tween, TweenOptions, TweenStatus } from "@scenia-runtime/runtime-as/as3";

let opts = new TweenOptions();
opts.x = 520;
opts.duration = 2.0;
opts.ease = Ease.quadOut;
opts.delay = 0.3;
opts.onComplete = (status: i32): void => {
  if (status == TweenStatus.COMPLETE) {
    // chain another tween
  }
};
Tween.to(sprite, opts);
```

**`TweenOptions` fields:** `x`, `y`, `scaleX`, `scaleY`, `rotation`, `alpha`
(use `NaN` to leave a property unchanged), `duration`, `delay`, `ease`, and
`onComplete`. Delay counts down before the eased animation runs; any leftover
frame time after the delay is applied to the first animation step.

**`onComplete(status)`** runs once when the tween ends. `TweenStatus.COMPLETE`
means the tween reached its target; `TweenStatus.CANCELLED` means `stop()` was
called. Call `tween.stop()` to halt at the current interpolated values without
snapping to the end state.

See [`projects/tween-demo`](projects/tween-demo) for multi-tween, enter-frame, and
pause/resume controls.

The browser host in `runtime-js` loads the Wasm module, advances the shared
timeline each animation frame, reads a compact render list from Wasm memory, and
draws when the timeline is dirty.

## Wasm / JS bridge

The bridge is deliberately small:

- Wasm exports `update(deltaTime)`.
- Wasm exports `getRenderListPtr()` and `getRenderListLength()` (float slot count).
- Sketches with text also export `getRenderStringPtr(index)` for the per-frame
  string pool.
- The render list is a contiguous `Float64Array` in Wasm memory. Commands are
  variable-length; the host reads `kind` and advances by stride:
  - **Bitmap** (`kind = 1`, 9 slots): asset id + affine + alpha
  - **Text** (`kind = 2`, 19 slots): display object id, string pool indices,
    affine + alpha, font metrics, layout flags

Bitmap asset ids are deterministic hashes of paths (no string marshaling).
`TextField` strings are interned each frame and read from Wasm by index.

### TextField (display-only)

```ts
const label = new TextField();
label.text = "Score: 0";
label.x = 20;
label.y = 20;
label.fontSize = 24;
label.color = 0xffffff;
label.width = 300;
label.height = 40;
addChild(label);
```

Rendering uses Canvas2D `fillText` on the host. There is no text input, rich
text, or embedded font loading yet. See package READMEs for supported properties
and layout flags (`multiline`, `wordWrap`).

## Current constraints

- Minimal API surface only.
- No SWF compatibility.
- No WebGPU backend.
- No visual editor.
- No full AS3 compiler yet.
- Canvas2D rendering only.
- Readability and clear package boundaries are prioritized over completeness.

## Next implementation milestone

Vector graphics via SVG, plus richer text (input, embedded fonts, and optional
non-Canvas2D backends).
