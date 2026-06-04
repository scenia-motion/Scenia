import { Event } from "./Event";
import { Stage } from "./Stage";
import { collectStage } from "./renderList";
import { getDefaultTweenManager } from "./tween/TweenManager";

/** Default max frame delta (seconds); matches host DEFAULT_MAX_FRAME_DELTA_SECONDS. */
export const DEFAULT_MAX_FRAME_DELTA: f32 = 0.1;

export function clampDelta(dt: f32, maxDelta: f32): f32 {
  if (dt <= 0) {
    return 0;
  }
  return dt > maxDelta ? maxDelta : dt;
}

export class RuntimeTimeline {
  currentTime: f32 = 0;
  deltaTime: f32 = 0;
  frameCount: i32 = 0;
  maxFrameDelta: f32 = DEFAULT_MAX_FRAME_DELTA;
  paused: bool = false;

  private stage: Stage | null = null;

  setStage(stage: Stage | null): void {
    this.stage = stage;
  }

  getStage(): Stage | null {
    return this.stage;
  }

  tick(rawDt: f32): void {
    if (this.paused) {
      this.deltaTime = 0;
      return;
    }

    let dt = clampDelta(rawDt, this.maxFrameDelta);
    this.deltaTime = dt;
    if (dt <= 0) {
      return;
    }

    this.currentTime += dt;
    this.frameCount++;

    getDefaultTweenManager().update(dt);

    let stage = this.stage;
    if (stage != null) {
      let event = new Event(Event.ENTER_FRAME, dt);
      stage.__broadcastEnterFrame(event);
      collectStage(stage);
    }
  }
}

const defaultRuntimeTimeline = new RuntimeTimeline();

export function getDefaultRuntimeTimeline(): RuntimeTimeline {
  return defaultRuntimeTimeline;
}
