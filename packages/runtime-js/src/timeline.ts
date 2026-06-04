/** Default max frame delta (seconds); limits jumps after tab blur or debugger pauses. */
export const DEFAULT_MAX_FRAME_DELTA_SECONDS = 0.1;

export type TimelineTickCallback = (deltaTime: number) => void;
export type TimelineFrameCallback = () => void;

export function clampFrameDelta(deltaTime: number, maxFrameDeltaSeconds: number): number {
  if (deltaTime <= 0) {
    return 0;
  }
  return Math.min(deltaTime, maxFrameDeltaSeconds);
}

/**
 * Authoritative host frame clock: rAF loop, pause/resume, delta clamp, tick callbacks, render dirty flag.
 */
export class RuntimeTimeline {
  running = false;
  paused = false;
  currentTime = 0;
  deltaTime = 0;
  frameCount = 0;
  maxFrameDeltaSeconds = DEFAULT_MAX_FRAME_DELTA_SECONDS;

  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private dirty = false;
  private readonly tickCallbacks: TimelineTickCallback[] = [];
  private onFrame: TimelineFrameCallback | null = null;

  get isDirty(): boolean {
    return this.dirty;
  }

  markDirty(): void {
    this.dirty = true;
  }

  clearDirty(): void {
    this.dirty = false;
  }

  onTick(callback: TimelineTickCallback): () => void {
    this.tickCallbacks.push(callback);
    return () => {
      let index = this.tickCallbacks.indexOf(callback);
      if (index >= 0) {
        this.tickCallbacks.splice(index, 1);
      }
    };
  }

  start(onFrame: TimelineFrameCallback): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.onFrame = onFrame;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.animationFrameId != null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.onFrame = null;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    // Drop wall-clock gap so the next tick does not apply a huge delta.
    this.lastTimestamp = performance.now();
  }

  /** Advance one frame with an explicit delta (seconds), e.g. manual step or tests. */
  step(rawDeltaTime: number): void {
    let deltaTime = this.paused ? 0 : clampFrameDelta(rawDeltaTime, this.maxFrameDeltaSeconds);
    this.applyDelta(deltaTime);
    this.onFrame?.();
  }

  /** Clamp a raw delta without advancing the timeline clock (for WasmCanvasRuntime.step). */
  clampDelta(rawDeltaTime: number): number {
    if (this.paused) {
      return 0;
    }
    return clampFrameDelta(rawDeltaTime, this.maxFrameDeltaSeconds);
  }

  private readonly loop = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    if (this.paused) {
      this.lastTimestamp = timestamp;
    } else {
      let rawDelta = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;
      this.applyDelta(clampFrameDelta(rawDelta, this.maxFrameDeltaSeconds));
    }

    this.onFrame?.();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private applyDelta(deltaTime: number): void {
    this.deltaTime = deltaTime;
    if (deltaTime <= 0) {
      return;
    }

    this.currentTime += deltaTime;
    this.frameCount++;

    for (let i = 0; i < this.tickCallbacks.length; i++) {
      this.tickCallbacks[i](deltaTime);
    }
  }
}
