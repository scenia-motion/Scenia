import {
  Ease,
  Shape,
  Stage,
  TextField,
  Tween,
  TweenOptions,
  TweenStatus,
  bindStage,
  clampDelta,
  getDefaultRuntimeTimeline,
  getRenderListLength,
  getRenderStringPtr,
  RENDER_KIND_SHAPE,
  RENDER_SHAPE_STRIDE
} from "./as3";
import { __renderListKindAt } from "./as3/renderList";

let completeStatus: i32 = -1;

export function smokeTweenComplete(): i32 {
  completeStatus = -1;

  let stage = new Stage(1, 1);
  bindStage(stage);
  let label = new TextField();
  label.text = "smoke";
  stage.addChild(label);

  let opts = new TweenOptions();
  opts.x = 1;
  opts.duration = 0.5;
  opts.ease = Ease.quadOut;
  opts.onComplete = (status: i32): void => {
    completeStatus = status;
  };
  Tween.to(label, opts);

  for (let i = 0; i < 5; i++) {
    stage.tick(0.1);
  }

  if (completeStatus != TweenStatus.COMPLETE) {
    return -1;
  }

  return getRenderListLength();
}

/** Original smoke entry; runs full timeline/tween checks. */
export function smoke(): i32 {
  return smokeAll();
}

export function smokeMultiTween(): i32 {
  let stage = new Stage(10, 10);
  bindStage(stage);

  let a = new TextField();
  let b = new TextField();
  stage.addChild(a);
  stage.addChild(b);

  let optsA = new TweenOptions();
  optsA.x = 4;
  optsA.duration = 1.0;
  Tween.to(a, optsA);

  let optsB = new TweenOptions();
  optsB.x = 8;
  optsB.duration = 2.0;
  Tween.to(b, optsB);

  for (let i = 0; i < 5; i++) {
    stage.tick(0.1);
  }
  if (a.x < 1.9 || a.x > 2.1) {
    return -2;
  }
  if (b.x < 1.9 || b.x > 2.1) {
    return -3;
  }

  for (let i = 0; i < 5; i++) {
    stage.tick(0.1);
  }
  if (a.x < 3.9 || a.x > 4.1) {
    return -4;
  }
  if (b.x < 3.9 || b.x > 4.1) {
    return -5;
  }

  return 0;
}

export function smokeClampDelta(): i32 {
  let stage = new Stage(1, 1);
  bindStage(stage);
  let label = new TextField();
  stage.addChild(label);

  let opts = new TweenOptions();
  opts.x = 10;
  opts.duration = 1.0;
  let tween = Tween.to(label, opts);

  stage.tick(10.0);
  if (tween.elapsed > 0.11) {
    return -6;
  }

  return 0;
}

export function smokePausedTimeline(): i32 {
  let stage = new Stage(1, 1);
  bindStage(stage);
  let label = new TextField();
  stage.addChild(label);

  let opts = new TweenOptions();
  opts.x = 5;
  opts.duration = 1.0;
  Tween.to(label, opts);

  let timeline = getDefaultRuntimeTimeline();
  timeline.paused = true;
  stage.tick(1.0);
  if (label.x != 0) {
    return -7;
  }

  timeline.paused = false;
  for (let i = 0; i < 5; i++) {
    stage.tick(0.1);
  }
  if (label.x < 2.4 || label.x > 2.6) {
    return -8;
  }

  return 0;
}

export function smokeClampHelper(): i32 {
  if (clampDelta(10.0, 0.1) != 0.1) {
    return -9;
  }
  if (clampDelta(-1.0, 0.1) != 0) {
    return -10;
  }
  return 0;
}

export function smokeShapeRender(): i32 {
  let stage = new Stage(1, 1);
  bindStage(stage);

  let tri = new Shape();
  tri.graphics.beginFill(0x4488ff);
  tri.graphics.moveTo(0, -40);
  tri.graphics.lineTo(35, 30);
  tri.graphics.lineTo(-35, 30);
  tri.graphics.endFill();
  stage.addChild(tri);

  stage.tick(0.1);

  if (getRenderListLength() != RENDER_SHAPE_STRIDE) {
    return -11;
  }
  if (__renderListKindAt(0) != RENDER_KIND_SHAPE as f64) {
    return -12;
  }
  if (getRenderStringPtr(0) == 0) {
    return -13;
  }

  return 0;
}

export function smokeAll(): i32 {
  let result = smokeTweenComplete();
  if (result < 0) {
    return result;
  }

  result = smokeMultiTween();
  if (result != 0) {
    return result;
  }

  result = smokeClampDelta();
  if (result != 0) {
    return result;
  }

  result = smokePausedTimeline();
  if (result != 0) {
    return result;
  }

  result = smokeShapeRender();
  if (result != 0) {
    return result;
  }

  return smokeClampHelper();
}
