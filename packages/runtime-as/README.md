# @as3-wasm-runtime/runtime-as

AssemblyScript runtime primitives for the experimental AS3-inspired creative
coding environment.

## What it includes

- `Event`
- `EventDispatcher`
- `DisplayObject`
- `DisplayObjectContainer`
- `Sprite`
- `Bitmap`
- `Stage`

The classes are intentionally small. They model the parts needed by the first
demo: transform properties, visibility, alpha, parent/child display lists,
`addChild`, `removeChild`, and `Event.ENTER_FRAME`. Pointer events bubble along
the display parent chain (`bubbles` is true on `PointerEvent`; capture phase is
not implemented yet).

## Rendering contract

`Stage.tick(deltaTime)` dispatches `Event.ENTER_FRAME` through the display tree
and rebuilds a flat render list. JavaScript reads the render list directly from
Wasm memory through:

- `getRenderListPtr()`
- `getRenderListLength()`

The JS host owns the matching stride constant. Each render command is currently
an 8-field `Float64Array` record:

```txt
[kind, assetId, a, b, c, d, tx, ty, alpha] — full affine per bitmap; host uses `setTransform(a,b,c,d,tx,ty)`.
```

Only bitmap commands exist in this MVP. Invisible objects are culled before they
enter the render list, so no visibility flag crosses the Wasm boundary.

## Build

```sh
pnpm --filter @as3-wasm-runtime/runtime-as build
```

The build compiles a small smoke module to verify the source package. The
package also acts as an AssemblyScript source dependency for examples.
