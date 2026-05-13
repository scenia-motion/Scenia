# as3-wasm-runtime

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
  sketch-host/     Shared Vite shell + `as3-sketch` CLI for browser sketches
  compiler/        Placeholder for a later AS3-like-to-AssemblyScript transform
examples/
  <name>/          Sketches (pnpm exec as3-sketch scaffold --help)
  bouncing-ball/   Reference sketch using sketch-host
```

## Getting started

```sh
pnpm install
pnpm build
pnpm dev
```

`pnpm dev` runs the bouncing-ball example. The same command is also available
as:

```sh
pnpm example:bouncing-ball
```

### Sketches (`sketch-host` + `as3-sketch`)

Sketches avoid duplicating Vite boilerplate: one shared package
(`@as3-wasm-runtime/sketch-host`) owns the dev server, HTML shell, Wasm output
location (`public/` under the sketch), and `vite build`. Each sketch directory
carries `sketch.json` (manifest), AssemblyScript sources + `asconfig.json`,
`public/` assets, and optionally a **host extension** (see below).

From the repository root (after `pnpm install`):

```sh
pnpm run sketch dev examples/bouncing-ball
pnpm run sketch build examples/bouncing-ball
```

Scaffold a new empty sketch (creates `examples/<slug>/` with `sketch.json`,
`assembly/index.ts` bound to an empty `Stage`, and `asconfig.json`):

```sh
pnpm run sketch -- scaffold my-sketch
pnpm exec as3-sketch scaffold my-sketch --width 1280 --height 720
```

`pnpm run sketch scaffold …` and `pnpm run sketch -- scaffold …` behave the same
(the CLI ignores a leading `--` inserted by `pnpm exec`). See
`pnpm exec as3-sketch scaffold --help`.

Extra Vite flags go after `--`:

```sh
pnpm run sketch dev examples/bouncing-ball -- --port 5174
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
- Wasm exports `getRenderListPtr()` and `getRenderListLength()`.
- The render list is a `Float64Array` in Wasm memory.
- JS owns the current stride constant, keeping the per-frame export surface to
  two render-list functions.
- Each command currently has 8 slots:
  1. kind (`1` = bitmap)
  2. asset id
  3. x
  4. y
  5. rotation in degrees
  6. scaleX
  7. scaleY
  8. alpha

Asset ids are deterministic hashes of bitmap paths. `new Bitmap("ball.png")` in
AssemblyScript and `assetIdForPath("ball.png")` in JavaScript produce the same
id, keeping the MVP free of string marshaling.

## Current constraints

- Minimal API surface only.
- No SWF compatibility.
- No WebGPU backend.
- No visual editor.
- No full AS3 compiler yet.
- Canvas2D rendering only.
- Readability and clear package boundaries are prioritized over completeness.

## Next implementation milestone

The next milestone should add additional simple asset types to the system - namely text and vector graphics via SVG.
