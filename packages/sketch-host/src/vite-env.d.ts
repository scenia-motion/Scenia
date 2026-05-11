/// <reference types="vite/client" />

declare module "virtual:sketch-manifest" {
  import type { SketchManifest } from "./manifest.js";
  const manifest: SketchManifest;
  export default manifest;
}
