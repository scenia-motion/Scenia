# @as3-wasm-runtime/runtime-js

TypeScript browser host for Wasm modules built with
`@as3-wasm-runtime/runtime-as`.

## Responsibilities

- Own the `<canvas>` and Canvas2D context.
- Load the Wasm module.
- Load bitmap assets.
- Call the Wasm `update(dt)` export on every animation frame.
- Read the render list from Wasm memory.
- Draw bitmap commands to Canvas2D.

## Boundary contract

The host expects Wasm exports named `update(deltaTime)`, `getRenderListPtr()`,
and `getRenderListLength()`. Render commands are read as 8-field `Float64Array`
records:

```txt
[kind, assetId, x, y, rotation, scaleX, scaleY, alpha]
```

The stride is intentionally a TypeScript constant in this package, so the
per-frame Wasm API stays small.

## Minimal usage

```ts
import { WasmCanvasRuntime } from "@as3-wasm-runtime/runtime-js";

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

## Build

```sh
pnpm --filter @as3-wasm-runtime/runtime-js build
```
