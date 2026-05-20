# Bouncing Ball example

Sketch for the experimental AS3-inspired Wasm runtime, served through the
shared `@as3-wasm-runtime/sketch-host` Vite shell.

The AssemblyScript source in `assembly/index.ts` creates a `Stage`, a `Sprite`,
a `Bitmap("ball.png")`, and an `Event.ENTER_FRAME` listener. The browser loads
the generated Wasm module via `WasmCanvasRuntime` (`@as3-wasm-runtime/runtime-js`)
and draws the render list to Canvas2D.

Sketch-specific browser UI (title, copy, layout, styling) lives under `host/`
as the optional host extension. The default path without `host/main.ts` is a
minimal canvas-only page; see the repository root README for the contract.

The `addEventListener<Main>(...)` call uses an explicit type argument because
AssemblyScript method references keep their concrete `this` type.

## Run

From the repository root:

```sh
pnpm install
pnpm example:bouncing-ball
```

Or using the shared CLI from the repo root:

```sh
pnpm run sketch dev projects/bouncing-ball
```

Or from this directory:

```sh
pnpm dev
```

The dev script runs `as3-sketch` (the `sketch-host` bin shim compiles that
package on demand if `dist/` is missing), then `hooks.preCompile` from
`sketch.json` (`pnpm run prepare-assets`), compiles AssemblyScript to
`public/main.wasm`, starts `asc --watch`, then Vite. AssemblyScript options live
in `asconfig.json`; browser/Wasm options live in `sketch.json`.

## Build

From the repository root:

```sh
pnpm build
```

Or for this package only:

```sh
pnpm build
```

The production build runs the same pipeline as dev, without `asc --watch`, then
`vite build` into `dist/`.
