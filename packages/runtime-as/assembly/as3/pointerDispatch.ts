import { PointerEvent } from "./Event";
import { hitTestStage, lastPointerHitLocalX, lastPointerHitLocalY } from "./pointerHitTest";
import { Stage } from "./Stage";

export const POINTER_KIND_DOWN: i32 = 1;
export const POINTER_KIND_UP: i32 = 2;
export const POINTER_KIND_MOVE: i32 = 3;

export let lastPointerDispatchHitAssetId: i32 = -1;
export let lastPointerStageX: f32 = 0;
export let lastPointerStageY: f32 = 0;

export type StagePointerListener = (stageX: f32, stageY: f32, kind: i32) => void;

let boundStage: Stage | null = null;
let stagePointerListener: StagePointerListener | null = null;

export function setStagePointerListener(listener: StagePointerListener | null): void {
  stagePointerListener = listener;
}

export function bindStage(stage: Stage): void {
  boundStage = stage;
}

export function __debugLastPointerHitAssetId(): i32 {
  return lastPointerDispatchHitAssetId;
}

export function dispatchPointerFromHost(stageX: f32, stageY: f32, kind: i32): void {
  let stage = boundStage;
  lastPointerDispatchHitAssetId = -1;
  lastPointerStageX = stageX;
  lastPointerStageY = stageY;

  if (stage == null) {
    return;
  }

  if (stagePointerListener != null) {
    stagePointerListener(stageX, stageY, kind);
  }

  let target = hitTestStage(stage, stageX, stageY);
  lastPointerDispatchHitAssetId = target == null ? -1 : target.assetId;

  let type = pointerKindToType(kind);

  // Stage-level move events support HUD-style listeners without a bitmap hit.
  if (kind == POINTER_KIND_MOVE) {
    let moveEvent = new PointerEvent(type, stageX, stageY, stageX, stageY);
    stage.dispatchEvent(moveEvent);
    return;
  }

  if (target != null) {
    let event = new PointerEvent(
      type,
      stageX,
      stageY,
      lastPointerHitLocalX,
      lastPointerHitLocalY
    );
    target.dispatchEvent(event);
    return;
  }

  let stageEvent = new PointerEvent(type, stageX, stageY, stageX, stageY);
  stage.dispatchEvent(stageEvent);
}

function pointerKindToType(kind: i32): string {
  if (kind == POINTER_KIND_DOWN) {
    return PointerEvent.POINTER_DOWN;
  }
  if (kind == POINTER_KIND_UP) {
    return PointerEvent.POINTER_UP;
  }
  return PointerEvent.POINTER_MOVE;
}
