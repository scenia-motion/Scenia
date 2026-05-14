export const RENDER_KIND_BITMAP = 1;
export const RENDER_LIST_STRIDE = 9;

/** Wasm `dispatchPointerFromHost` kind argument; must match runtime-as `POINTER_KIND_*`. */
export const POINTER_KIND_DOWN = 1;
export const POINTER_KIND_UP = 2;
export const POINTER_KIND_MOVE = 3;

export interface WasmRuntimeExports {
  memory: WebAssembly.Memory;
  update(deltaTime: number): void;
  getRenderListPtr(): number;
  getRenderListLength(): number;
  registerAssetDimensions?(assetId: number, width: number, height: number): void;
  dispatchPointerFromHost?(stageX: number, stageY: number, kind: number): void;
  __debugLastPointerHitAssetId?(): number;
}

export interface RuntimeAsset {
  id?: number;
  path: string;
  url?: string;
}

export interface RuntimeHostOptions {
  canvas: HTMLCanvasElement;
  wasmUrl: string | URL;
  assets?: Array<string | RuntimeAsset>;
  background?: string;
  imports?: WebAssembly.Imports;
  /** When true, log pointer mapping and post-dispatch Wasm hit-test asset id (if exported). */
  debugPointer?: boolean;
}

export interface RenderCommand {
  kind: number;
  assetId: number;
  /** Canvas2D `setTransform(a, b, c, d, e, f)` with e,f as tx,ty */
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
  alpha: number;
}

export function assetIdForPath(path: string): number {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = (Math.imul(hash, 31) + path.charCodeAt(i)) & 0x7fffffff;
  }
  return hash === 0 ? 1 : hash;
}

export class WasmCanvasRuntime {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly exports: WasmRuntimeExports;

  private readonly images = new Map<number, HTMLImageElement>();
  private readonly background: string;
  private readonly debugPointer: boolean;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private pointerBridgeAttached = false;
  private pointerBridgeLogged = false;
  private readonly pointerDownHandler = (event: PointerEvent): void => {
    this.dispatchPointerToWasm(event, POINTER_KIND_DOWN);
  };
  private readonly pointerUpHandler = (event: PointerEvent): void => {
    this.dispatchPointerToWasm(event, POINTER_KIND_UP);
  };
  private readonly pointerMoveHandler = (event: PointerEvent): void => {
    this.dispatchPointerToWasm(event, POINTER_KIND_MOVE);
  };

  private constructor(canvas: HTMLCanvasElement, exports: WasmRuntimeExports, background: string, debugPointer: boolean) {
    let context = canvas.getContext("2d");
    if (context == null) {
      throw new Error("Canvas2D is not available in this browser.");
    }

    this.canvas = canvas;
    this.context = context;
    this.exports = exports;
    this.background = background;
    this.debugPointer = debugPointer;
  }

  static async load(options: RuntimeHostOptions): Promise<WasmCanvasRuntime> {
    let wasmModule = await instantiateWasm(options.wasmUrl, options.imports);
    let runtimeExports = assertRuntimeExports(wasmModule.instance.exports);
    let runtime = new WasmCanvasRuntime(
      options.canvas,
      runtimeExports,
      options.background ?? "#ffffff",
      options.debugPointer ?? false
    );

    await runtime.loadAssets(options.assets ?? []);
    return runtime;
  }

  async loadAssets(assets: Array<string | RuntimeAsset>): Promise<void> {
    await Promise.all(
      assets.map((asset) => {
        let descriptor = typeof asset === "string" ? { path: asset } : asset;
        return this.loadImage(descriptor.path, descriptor.url ?? descriptor.path, descriptor.id);
      })
    );
  }

  async loadImage(path: string, url = path, id = assetIdForPath(path)): Promise<HTMLImageElement> {
    let image = new Image();
    image.decoding = "async";
    image.src = url;

    await image.decode();
    this.images.set(id, image);
    this.pushAssetDimensionsToWasm(id, image.naturalWidth, image.naturalHeight);
    return image;
  }

  start(): void {
    if (this.animationFrameId != null) {
      return;
    }

    this.lastTimestamp = performance.now();
    this.attachPointerBridge();
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.animationFrameId == null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.detachPointerBridge();
  }

  step(deltaTime: number): void {
    this.exports.update(deltaTime);
    this.draw();
  }

  readRenderList(): RenderCommand[] {
    let ptr = this.exports.getRenderListPtr();
    let length = this.exports.getRenderListLength();
    let stride = RENDER_LIST_STRIDE;
    let memory = new Float64Array(this.exports.memory.buffer, ptr, length * stride);
    let commands: RenderCommand[] = [];

    for (let i = 0; i < length; i++) {
      let offset = i * stride;
      commands.push({
        kind: memory[offset + 0],
        assetId: memory[offset + 1],
        a: memory[offset + 2],
        b: memory[offset + 3],
        c: memory[offset + 4],
        d: memory[offset + 5],
        tx: memory[offset + 6],
        ty: memory[offset + 7],
        alpha: memory[offset + 8]
      });
    }

    return commands;
  }

  draw(): void {
    let commands = this.readRenderList();
    let context = this.context;

    context.save();
    context.globalAlpha = 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = this.background;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < commands.length; i++) {
      let command = commands[i];
      if (command.kind === RENDER_KIND_BITMAP) {
        this.drawBitmap(command);
      }
    }

    context.restore();
  }

  private drawBitmap(command: RenderCommand): void {
    let image = this.images.get(command.assetId);
    if (image == null) {
      return;
    }

    let context = this.context;
    context.save();
    context.setTransform(command.a, command.b, command.c, command.d, command.tx, command.ty);
    context.globalAlpha = clamp(command.alpha, 0, 1);
    context.drawImage(image, 0, 0);
    context.restore();
  }

  private readonly frame = (timestamp: number): void => {
    let deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.step(deltaTime);
    this.animationFrameId = requestAnimationFrame(this.frame);
  };

  private pushAssetDimensionsToWasm(assetId: number, width: number, height: number): void {
    let register = this.exports.registerAssetDimensions;
    if (typeof register === "function") {
      register(assetId, width, height);
    }
  }

  private clientToStage(clientX: number, clientY: number): { stageX: number; stageY: number } {
    let rect = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / rect.width;
    let scaleY = this.canvas.height / rect.height;
    return {
      stageX: (clientX - rect.left) * scaleX,
      stageY: (clientY - rect.top) * scaleY
    };
  }

  private dispatchPointerToWasm(event: PointerEvent, kind: number): void {
    let dispatch = this.exports.dispatchPointerFromHost;
    if (typeof dispatch !== "function") {
      return;
    }

    let { stageX, stageY } = this.clientToStage(event.clientX, event.clientY);
    dispatch(stageX, stageY, kind);

    if (this.debugPointer) {
      let hitAssetId: number | undefined;
      let peek = this.exports.__debugLastPointerHitAssetId;
      if (typeof peek === "function") {
        hitAssetId = peek();
      }

      console.log("[as3-wasm-runtime:pointer]", {
        kind,
        clientX: event.clientX,
        clientY: event.clientY,
        stageX,
        stageY,
        hitAssetId
      });
    }
  }

  private attachPointerBridge(): void {
    if (this.pointerBridgeAttached) {
      return;
    }

    if (typeof this.exports.dispatchPointerFromHost !== "function") {
      return;
    }

    this.canvas.addEventListener("pointerdown", this.pointerDownHandler);
    this.canvas.addEventListener("pointerup", this.pointerUpHandler);
    this.canvas.addEventListener("pointermove", this.pointerMoveHandler);
    this.pointerBridgeAttached = true;

    if (this.debugPointer && !this.pointerBridgeLogged) {
      this.pointerBridgeLogged = true;
      console.log("[as3-wasm-runtime:pointer]", "bridge attached (pointerdown/up/move -> Wasm)");
    }
  }

  private detachPointerBridge(): void {
    if (!this.pointerBridgeAttached) {
      return;
    }

    this.canvas.removeEventListener("pointerdown", this.pointerDownHandler);
    this.canvas.removeEventListener("pointerup", this.pointerUpHandler);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);
    this.pointerBridgeAttached = false;
  }
}

async function instantiateWasm(
  wasmUrl: string | URL,
  imports: WebAssembly.Imports = {}
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  let mergedImports: WebAssembly.Imports = {
    ...imports,
    env: {
      abort(message: number, fileName: number, line: number, column: number): never {
        throw new Error(`AssemblyScript abort at ${fileName}:${line}:${column} (${message})`);
      },
      ...(imports.env ?? {})
    }
  };

  if ("instantiateStreaming" in WebAssembly) {
    try {
      let response = await fetch(wasmUrl);
      return await WebAssembly.instantiateStreaming(response, mergedImports);
    } catch {
      // Some static servers do not serve .wasm with application/wasm yet.
    }
  }

  let response = await fetch(wasmUrl);
  let bytes = await response.arrayBuffer();
  return WebAssembly.instantiate(bytes, mergedImports);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function assertRuntimeExports(exports: WebAssembly.Exports): WasmRuntimeExports {
  if (!(exports.memory instanceof WebAssembly.Memory)) {
    throw new Error("Wasm module must export memory.");
  }

  for (let i = 0; i < REQUIRED_FUNCTION_EXPORTS.length; i++) {
    let name = REQUIRED_FUNCTION_EXPORTS[i];
    if (typeof exports[name] !== "function") {
      throw new Error(`Wasm module must export ${name}().`);
    }
  }

  return exports as unknown as WasmRuntimeExports;
}

const REQUIRED_FUNCTION_EXPORTS = ["update", "getRenderListPtr", "getRenderListLength"] as const;
