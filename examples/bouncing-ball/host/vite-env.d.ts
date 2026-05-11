/// <reference types="vite/client" />

declare module "virtual:sketch-manifest" {
  import type { SketchManifest } from "@as3-wasm-runtime/sketch-host";
  const manifest: SketchManifest;
  export default manifest;
}
