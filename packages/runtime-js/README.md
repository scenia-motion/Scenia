# @scenia-runtime/runtime-js

TypeScript browser host for Wasm modules built with
`@scenia-runtime/runtime-as`.

## Responsibilities

- Own the `<canvas>` and Canvas2D context.
- Load the Wasm module.
- Load bitmap assets.
- Call the Wasm `update(dt)` export on every animation frame.
- Read the render list from Wasm memory.
- Draw bitmap and text commands to Canvas2D.

## Boundary contract

The host expects Wasm exports named `update(deltaTime)`, `getRenderListPtr()`,
and `getRenderListLength()`. Sketches with `TextField` nodes should also export
`getRenderStringPtr(index)` so the host can resolve interned strings.

Render commands are read from a contiguous `Float64Array`. The host walks the
buffer by `kind`:

```txt
Bitmap (kind 1): [kind, assetId, a, b, c, d, tx, ty, alpha]
Text   (kind 2): [kind, displayObjectId, textIndex, fontFamilyIndex, fontWeightIndex,
                  a, b, c, d, tx, ty, alpha, fontSize, color, align, width, height,
                  multiline, wordWrap]
```

Bitmaps use `setTransform` + `drawImage`. Text uses Canvas2D `fillText` with
`font`, `fillStyle`, `textBaseline = "top"`, and alignment from `TextAlign`.
Multiline without wrap splits on `\n`; with `wordWrap`, lines are broken using
`measureText` and an approximate line height of `fontSize * 1.2`. Text is
clipped to `width` × `height` when both are positive.

**Limitations:** display-only; browser font resolution only; strings are read
from Wasm each frame (fine for HUD-style labels, not tuned for huge dynamic
copy yet).

## Minimal usage

```ts
import { WasmCanvasRuntime } from "@scenia-runtime/runtime-js";

const runtime = await WasmCanvasRuntime.load({
  canvas: document.querySelector("canvas")!,
  wasmUrl: "/main.wasm",
  assets: ["ball.png"]
});

runtime.start();
```

Asset ids are computed from bitmap paths with `assetIdForPath(path)`. The same
hash exists in AssemblyScript, so `new Bitmap("ball.png")` can be matched to the
image loaded by JavaScript without string marshaling.

## Portable sketch bundles

`loadSketchBundle` loads a JSON bundle (base64 wasm + assets) produced by
`scenia-sketch bundle`. Use this for standalone HTML pages without Vite:

```ts
import { loadSketchBundle } from "@scenia-runtime/runtime-js";

await loadSketchBundle("./sketch.bundle.json", {
  mount: document.getElementById("app")!
});
```

See the repository root README for `pnpm run build:bundle` and the `builds/`
output layout.

## Build

```sh
pnpm --filter @scenia-runtime/runtime-js build
```
