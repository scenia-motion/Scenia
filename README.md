# atast: as3-wasm-runtime

An experimental browser-based proof of concept for a Flash/ActionScript-3-inspired
creative coding runtime that compiles user code to WebAssembly with
AssemblyScript.

This project currently lives in the `atast` repository.

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
  sketch-host/     Shared Vite shell + `as3-sketch` CLI for browser sketches
  compiler/        Placeholder for a later AS3-like-to-AssemblyScript transform
projects/
  <name>/          Sketches (pnpm exec as3-sketch scaffold --help)
  bouncing-ball/   Reference sketch using sketch-host
builds/
  <name>/          Standalone static sites from `as3-sketch bundle` (generated)
```

## Getting started

```sh
pnpm install
pnpm build
pnpm dev
```

`pnpm dev` runs the bouncing-ball sketch. The same command is also available
as:

```sh
pnpm example:bouncing-ball
```

### Portable bundle + standalone player (MVP)

Sketches still use **Vite for day-to-day dev** (`pnpm run sketch dev …`). For a
portable static folder (`index.html`, bundle JSON, and `runtime-player.js`) that
any static host can serve:

```sh
pnpm run build:bundle
pnpm run preview:bundle
```

`build:bundle` compiles `projects/bouncing-ball`, writes `sketch.bundle.json`
(JSON with base64 wasm and assets), copies `runtime-player.js`, writes
`index.html` into `builds/bouncing-ball/`, and runs a small smoke check.

`preview:bundle` serves that folder with Vite (static dev server) so you can
open the standalone page in a browser.

Build a portable site for another sketch (default output: `builds/<folder-name>/`):

```sh
pnpm run sketch -- bundle projects/ampersand
```

Or choose any output directory (absolute or relative to your shell cwd):

```sh
pnpm run sketch -- bundle projects/ampersand --out /tmp/ampersand-site
```

**MVP limitations:** JSON + base64 only (large files inflate size); no
compression or binary container; assets must be listed in `sketch.json`
`runtime.assets`; host extensions (`host/main.ts`) are not included in the
bundle (canvas-only bootstrap).

### Sketches (`sketch-host` + `as3-sketch`)

Sketches avoid duplicating Vite boilerplate: one shared package
(`@as3-wasm-runtime/sketch-host`) owns the dev server, HTML shell, Wasm output
location (`public/` under the sketch), and `vite build`. Each sketch directory
carries `sketch.json` (the sketch manifest), AssemblyScript sources + `asconfig.json`,
`public/` assets, and optionally a **host extension** (see below).

From the repository root (after `pnpm install`):

```sh
pnpm run sketch dev projects/bouncing-ball
pnpm run sketch build projects/bouncing-ball
pnpm run sketch -- bundle projects/bouncing-ball
```

Scaffold a new empty sketch (creates `projects/<slug>/` with `sketch.json`,
`assembly/index.ts` bound to an empty `Stage`, and `asconfig.json`):

```sh
pnpm run sketch -- scaffold my-sketch
pnpm exec as3-sketch scaffold my-sketch --width 1280 --height 720
```

After writing the files the scaffolder runs `pnpm install` from the repo root
so the new workspace package picks up its `workspace:*` dependencies. Pass
`--no-install` to skip that step (e.g. for offline or CI use).

`pnpm run sketch scaffold …` and `pnpm run sketch -- scaffold …` behave the same
(the CLI ignores a leading `--` inserted by `pnpm exec`). See
`pnpm exec as3-sketch scaffold --help`.

Extra Vite flags go after `--`:

```sh
pnpm run sketch dev projects/bouncing-ball -- --port 5174
```

**Default shell:** `index.html` is only charset, viewport, an empty title, and
a module entry—no layout chrome. The default bootstrap creates a canvas with id
`#stage` (or uses the one from `sketch.json` `canvas.selector`) and loads
`WasmCanvasRuntime` from `@as3-wasm-runtime/runtime-js` using manifest fields
`wasmUrl`, `runtime.assets`, `runtime.background`, and optional
`runtime.debugPointerQueryParam`.

**Host extension (escape hatch):** If `host/main.ts` exists under the sketch
root, it is used as the app entry instead of the default bootstrap. Import
`bootstrapFromManifest` from `@as3-wasm-runtime/sketch-host`, import
`virtual:sketch-manifest`, add any HTML/CSS/DOM or extra bindings there, then
call `bootstrapFromManifest(manifest)`. Optional `host/main.css` (or other
modules) can be imported from that file. Remove `host/main.ts` to fall back to
the canvas-only default for the same Wasm and manifest.

## First-pass architecture

User code is authored in AssemblyScript today. It imports small AS3-inspired
runtime classes from `@as3-wasm-runtime/runtime-as`, creates a display tree, and
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

The browser host in `runtime-js` loads the Wasm module, calls `update(dt)` every
animation frame, reads a compact render list from Wasm memory, and draws bitmap
commands to a Canvas2D context.

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
