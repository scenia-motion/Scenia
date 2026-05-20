# Build outputs

Each subdirectory here is a **standalone static site** produced by `scenia-sketch bundle` (from the repository root):

```sh
pnpm run sketch -- bundle projects/<sketch-name>
```

By default the command writes to `builds/<sketch-folder-name>/`. Use `--out <path>` to deploy anywhere on disk.

Typical contents of a build folder:

- `index.html` — loads the sketch in the browser
- `sketch.bundle.json` — portable wasm + assets (base64 JSON)
- `runtime-player.js` — browser loader (ES module)

These folders are **not** pnpm workspace packages; they are plain static files suitable for any static host or:

```sh
pnpm run preview:bundle -- builds/<sketch-folder-name>
```

By default, per-sketch subfolders under `builds/` are listed in the repository `.gitignore` so generated bundles stay local; remove those patterns if you want to commit deployable artifacts.
