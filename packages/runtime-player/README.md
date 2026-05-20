# @scenia-runtime/runtime-player

Thin browser entry point for portable sketch bundles. Re-exports
`loadSketchBundle` and related types from `@scenia-runtime/runtime-js`.

The build emits a self-contained `dist/browser/runtime-player.js` (Vite bundles
`runtime-js` in). The `scenia-sketch bundle` command copies that file next to
`sketch.bundle.json` and `index.html` under `builds/<name>/` (or any `--out`
directory). See the repository root README.

```sh
pnpm --filter @scenia-runtime/runtime-player build
```
