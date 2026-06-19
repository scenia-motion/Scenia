# @scenia-runtime/runtime-as

AssemblyScript runtime primitives for the experimental AS3-inspired creative
coding environment.

## What it includes

- `Event`
- `EventDispatcher`
- `DisplayObject`
- `DisplayObjectContainer`
- `Sprite`
- `Bitmap`
- `Shape` / `Graphics`
- `TextField`
- `Stage`

The classes are intentionally small. They model the parts needed by the first
demo: transform properties, visibility, alpha, parent/child display lists,
`addChild`, `removeChild`, and `Event.ENTER_FRAME`. Pointer events bubble along
the display parent chain (`bubbles` is true on `PointerEvent`; capture phase is
not implemented yet).

## Rendering contract

`bindStage(stage)` registers the stage on the default `RuntimeTimeline`.
`stage.tick(deltaTime)` is a shorthand for `getDefaultRuntimeTimeline().tick(deltaTime)`,
which updates tweens, dispatches `Event.ENTER_FRAME` (to objects on stage with
listeners), clamps large deltas, and rebuilds the flat render list. JavaScript
reads the render list directly from Wasm memory through:

- `getRenderListPtr()`
- `getRenderListLength()`

The render list is a contiguous `Float64Array`. Commands are variable-length;
the host walks the buffer using each record's `kind` field.

**Bitmap** (`kind = 1`, stride 9):

```txt
[kind, assetId, a, b, c, d, tx, ty, alpha]
```

**Text** (`kind = 2`, stride 19):

```txt
[kind, displayObjectId, textIndex, fontFamilyIndex, fontWeightIndex,
 a, b, c, d, tx, ty, alpha, fontSize, color, align, width, height, multiline, wordWrap]
```

**Shape** (`kind = 3`, stride 15):

```txt
[kind, displayObjectId, pathIndex, fillColor, fillAlpha, strokeColor, strokeAlpha,
 strokeWidth, a, b, c, d, tx, ty, alpha]
```

Sentinels: `fillAlpha = -1` means no fill; `strokeWidth = 0` means no stroke.
The SVG path `d` string at `pathIndex` is built from `Graphics` drawing commands
in local space; the world affine is applied at collect time.

String payloads are interned per frame into a small Wasm string pool. The host
reads them through `getRenderStringPtr(index)` (same AssemblyScript string
layout as the loader). Invisible objects are culled before they enter the render
list.

## Shape / Graphics

Vector drawing via an SVG path serialized each frame:

```ts
const tri = new Shape();
tri.graphics.beginFill(0x4488ff);
tri.graphics.moveTo(0, -40);
tri.graphics.lineTo(35, 30);
tri.graphics.lineTo(-35, 30);
tri.graphics.endFill();
tri.x = 200;
tri.y = 180;
stage.addChild(tri);
```

Supported `Graphics` methods: `clear`, `beginFill`, `endFill`, `lineStyle`,
`moveTo`, `lineTo`, `drawRect`, `drawCircle` (24-segment approximation).
Geometry is in local space; transforms inherit from the display list like
`Bitmap` and `TextField`. Empty graphics (after `clear` or with no draw
commands) are omitted from the render list.

**Limitations:** no external SVG loading, gradients, or bezier curves yet;
`Graphics` is on `Shape` only (not `Sprite`); vector pointer hit-testing is not
implemented. Sketches that use `Shape` or `TextField` must export
`getRenderStringPtr()` from their Wasm entry module.

## TextField

Display-only text for Canvas2D rendering on the host:

```ts
const label = new TextField();
label.text = "Hello";
label.x = 20;
label.y = 20;
label.fontSize = 24;
label.color = 0xffffff;
label.width = 300;
label.height = 40;
stage.addChild(label);
```

Supported properties: `text`, `fontFamily`, `fontSize`, `fontWeight`, `color`,
`align` (`TextAlign.LEFT` | `CENTER` | `RIGHT`), `width`, `height`, `multiline`,
`wordWrap`, plus inherited transform/visibility/alpha from `DisplayObject`.

**Limitations:** no text input, caret, selection, rich/HTML text, embedded fonts,
or non-Canvas2D backends. Font names are passed to the browser as CSS font
strings only (no asset loading).

## Build

```sh
pnpm --filter @scenia-runtime/runtime-as build
```

The build compiles a small smoke module to verify the source package. The
package also acts as an AssemblyScript source dependency for sketches under
`projects/`.
