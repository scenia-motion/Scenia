#!/usr/bin/env node
import {
  DEFAULT_MAX_FRAME_DELTA_SECONDS,
  RuntimeTimeline,
  clampFrameDelta
} from "../packages/runtime-js/dist/timeline.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(clampFrameDelta(10, 0.1) === 0.1, "clampFrameDelta should cap large deltas");
assert(clampFrameDelta(-1, 0.1) === 0, "clampFrameDelta should ignore negative deltas");
assert(
  DEFAULT_MAX_FRAME_DELTA_SECONDS === 0.1,
  "DEFAULT_MAX_FRAME_DELTA_SECONDS should be 0.1"
);

let timeline = new RuntimeTimeline();
let tickSum = 0;
let tickCount = 0;

timeline.onTick((dt) => {
  tickSum += dt;
  tickCount++;
});

timeline.step(0.05);
assert(tickCount === 1, "step should invoke tick callbacks once");
assert(Math.abs(tickSum - 0.05) < 1e-6, "step should pass clamped delta to callbacks");

timeline.step(5);
assert(Math.abs(tickSum - 0.05 - 0.1) < 1e-6, "large step delta should clamp to maxFrameDeltaSeconds");

timeline.pause();
timeline.step(1);
assert(tickCount === 2, "paused step should not run tick callbacks");
assert(timeline.paused, "timeline should stay paused");

timeline.resume();
timeline.step(0.02);
assert(tickCount === 3, "resume should allow ticks again");
assert(Math.abs(tickSum - 0.05 - 0.1 - 0.02) < 1e-6, "resume step should apply normal delta");

timeline.markDirty();
assert(timeline.isDirty, "markDirty should set dirty flag");
timeline.clearDirty();
assert(!timeline.isDirty, "clearDirty should clear dirty flag");

console.log("[timeline-smoke] OK");
