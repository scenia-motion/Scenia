import type { RuntimeAsset } from "@as3-wasm-runtime/runtime-js";

export interface SketchManifest {
  wasmUrl: string;
  canvas: {
    /** Defaults to `#stage` (the id the default shell documents). */
    selector?: string;
    width?: number;
    height?: number;
  };
  runtime: {
    background?: string;
    assets?: Array<string | RuntimeAsset>;
    /** When present, `?param` in the page URL enables `debugPointer` on the runtime. */
    debugPointerQueryParam?: string;
  };
  assembly: {
    entry: string;
    config: string;
    target: string;
  };
  hooks?: {
    /** Shell command run from the sketch directory before `asc` (e.g. asset code generators). */
    preCompile?: string;
  };
}
