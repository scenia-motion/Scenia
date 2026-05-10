# Bouncing Ball example

Vite demo for the experimental AS3-inspired Wasm runtime.

The AssemblyScript source in `assembly/index.ts` creates a `Stage`, a `Sprite`,
a `Bitmap("ball.png")`, and an `Event.ENTER_FRAME` listener. The browser app in
`src/main.ts` loads the generated Wasm module and draws the render list to
Canvas2D.

The `addEventListener<Main>(...)` call uses an explicit type argument because
AssemblyScript method references keep their concrete `this` type.

## Run

From the repository root:

```sh
pnpm install
pnpm example:bouncing-ball
```

Or from this package:

```sh
pnpm dev
```

The example scripts compile `assembly/index.ts` to `public/main.wasm` and write
a tiny generated `public/ball.png` before starting Vite. AssemblyScript compiler
options live in `asconfig.json`.

## Build

```sh
pnpm build
```

The production build compiles the Wasm module first, then runs TypeScript and
Vite.
