export const RENDER_KIND_BITMAP = 1;
export const RENDER_KIND_TEXT = 2;
export const RENDER_BITMAP_STRIDE = 9;
export const RENDER_TEXT_STRIDE = 19;
/** @deprecated Use RENDER_BITMAP_STRIDE */
export const RENDER_LIST_STRIDE = RENDER_BITMAP_STRIDE;

export const TEXT_ALIGN_LEFT = 0;
export const TEXT_ALIGN_CENTER = 1;
export const TEXT_ALIGN_RIGHT = 2;

/** Wasm `dispatchPointerFromHost` kind argument; must match runtime-as `POINTER_KIND_*`. */
export const POINTER_KIND_DOWN = 1;
export const POINTER_KIND_UP = 2;
export const POINTER_KIND_MOVE = 3;

export interface WasmRuntimeExports {
  memory: WebAssembly.Memory;
  update(deltaTime: number): void;
  getRenderListPtr(): number;
  getRenderListLength(): number;
  getRenderStringPtr?(index: number): number;
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

export interface BitmapRenderCommand {
  kind: typeof RENDER_KIND_BITMAP;
  assetId: number;
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
  alpha: number;
}

export interface TextRenderCommand {
  kind: typeof RENDER_KIND_TEXT;
  displayObjectId: number;
  text: string;
  fontFamily: string;
  fontWeight: string;
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
  alpha: number;
  fontSize: number;
  color: number;
  align: number;
  width: number;
  height: number;
  multiline: boolean;
  wordWrap: boolean;
}

export type RenderCommand = BitmapRenderCommand | TextRenderCommand;

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
    let floatLength = this.exports.getRenderListLength();
    let memory = new Float64Array(this.exports.memory.buffer, ptr, floatLength);
    let commands: RenderCommand[] = [];
    let offset = 0;

    while (offset < floatLength) {
      let kind = memory[offset];
      if (kind === RENDER_KIND_BITMAP) {
        commands.push({
          kind: RENDER_KIND_BITMAP,
          assetId: memory[offset + 1],
          a: memory[offset + 2],
          b: memory[offset + 3],
          c: memory[offset + 4],
          d: memory[offset + 5],
          tx: memory[offset + 6],
          ty: memory[offset + 7],
          alpha: memory[offset + 8]
        });
        offset += RENDER_BITMAP_STRIDE;
      } else if (kind === RENDER_KIND_TEXT) {
        commands.push({
          kind: RENDER_KIND_TEXT,
          displayObjectId: memory[offset + 1],
          text: this.readRenderString(memory[offset + 2]),
          fontFamily: this.readRenderString(memory[offset + 3]),
          fontWeight: this.readRenderString(memory[offset + 4]),
          a: memory[offset + 5],
          b: memory[offset + 6],
          c: memory[offset + 7],
          d: memory[offset + 8],
          tx: memory[offset + 9],
          ty: memory[offset + 10],
          alpha: memory[offset + 11],
          fontSize: memory[offset + 12],
          color: memory[offset + 13],
          align: memory[offset + 14],
          width: memory[offset + 15],
          height: memory[offset + 16],
          multiline: memory[offset + 17] !== 0,
          wordWrap: memory[offset + 18] !== 0
        });
        offset += RENDER_TEXT_STRIDE;
      } else {
        break;
      }
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
      } else if (command.kind === RENDER_KIND_TEXT) {
        this.drawTextField(command);
      }
    }

    context.restore();
  }

  private drawBitmap(command: BitmapRenderCommand): void {
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

  private drawTextField(command: TextRenderCommand): void {
    let context = this.context;
    context.save();
    context.setTransform(command.a, command.b, command.c, command.d, command.tx, command.ty);
    context.globalAlpha = clamp(command.alpha, 0, 1);
    context.font = `${command.fontWeight} ${command.fontSize}px ${command.fontFamily}`;
    context.fillStyle = colorToCss(command.color);
    context.textBaseline = "top";
    context.textAlign = textAlignToCanvas(command.align);

    if (command.width > 0 && command.height > 0) {
      context.beginPath();
      context.rect(0, 0, command.width, command.height);
      context.clip();
    }

    let lineHeight = command.fontSize * 1.2;
    let lines = layoutTextLines(context, command.text, command.width, command.multiline, command.wordWrap);
    let x = textOffsetX(command.align, command.width);

    for (let i = 0; i < lines.length; i++) {
      let y = i * lineHeight;
      if (command.height > 0 && y > command.height) {
        break;
      }
      context.fillText(lines[i], x, y);
    }

    context.restore();
  }

  private readRenderString(index: number): string {
    let getPtr = this.exports.getRenderStringPtr;
    if (typeof getPtr !== "function") {
      return "";
    }
    return readAssemblyScriptString(this.exports.memory, getPtr(index));
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

function layoutTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  multiline: boolean,
  wordWrap: boolean
): string[] {
  if (!multiline) {
    return [text];
  }

  if (!wordWrap) {
    return text.split("\n");
  }

  let lines: string[] = [];
  let paragraphs = text.split("\n");
  for (let p = 0; p < paragraphs.length; p++) {
    lines.push(...wrapParagraph(context, paragraphs[p], width));
  }
  return lines.length > 0 ? lines : [""];
}

function wrapParagraph(context: CanvasRenderingContext2D, paragraph: string, maxWidth: number): string[] {
  if (paragraph.length === 0) {
    return [""];
  }

  if (maxWidth <= 0) {
    return [paragraph];
  }

  let words = paragraph.split(/\s+/);
  let lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    let candidate = current.length === 0 ? word : `${current} ${word}`;
    if (context.measureText(candidate).width <= maxWidth || current.length === 0) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function textAlignToCanvas(align: number): CanvasTextAlign {
  if (align === TEXT_ALIGN_CENTER) {
    return "center";
  }
  if (align === TEXT_ALIGN_RIGHT) {
    return "right";
  }
  return "left";
}

function textOffsetX(align: number, width: number): number {
  if (align === TEXT_ALIGN_CENTER) {
    return width * 0.5;
  }
  if (align === TEXT_ALIGN_RIGHT) {
    return width;
  }
  return 0;
}

function colorToCss(color: number): string {
  return `#${(color >>> 0).toString(16).padStart(6, "0")}`;
}

export function readAssemblyScriptString(memory: WebAssembly.Memory, ptr: number): string {
  if (ptr === 0) {
    return "";
  }

  let view = new DataView(memory.buffer);
  let byteLength = view.getUint32(ptr - 4, true);
  let length = byteLength >>> 1;
  let codes = new Uint16Array(memory.buffer, ptr, length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(codes[i]);
  }
  return result;
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
