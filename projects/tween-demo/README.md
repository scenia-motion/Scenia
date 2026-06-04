# tween-demo

Animates blocks with overlapping `Tween.to` calls, an `Event.ENTER_FRAME` frame
counter, and host keyboard controls for pause/resume and clamped large steps.

- **Space** — pause/resume the host timeline (Wasm does not advance while paused).
- **B** — one `step(2.0)` with delta clamping (simulates returning from a tab blur).

## Run

```sh
pnpm install   # from repository root, once
pnpm run sketch dev projects/tween-demo
```

Or from this directory: `pnpm dev`.

Uses optional `host/main.ts` for keyboard controls; Wasm timing still flows through
`stage.tick` → `RuntimeTimeline` on the AssemblyScript side.

## Build

```sh
pnpm run sketch build projects/tween-demo
```
