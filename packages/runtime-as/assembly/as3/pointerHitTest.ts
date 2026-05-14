import { matScratch, pushAffine } from "./affine2d";
import { Bitmap } from "./Bitmap";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Stage } from "./Stage";
import { lookupAssetHeight, lookupAssetWidth } from "./assetDimensions";

export let lastPointerHitLocalX: f32 = 0;
export let lastPointerHitLocalY: f32 = 0;

export function hitTestStage(stage: Stage, stageX: f32, stageY: f32): Bitmap | null {
  lastPointerHitLocalX = 0;
  lastPointerHitLocalY = 0;
  return hitTestContainer(stage, stageX, stageY, 1, 0, 0, 1, 0, 0, true);
}

function hitTestContainer(
  container: DisplayObjectContainer,
  stageX: f32,
  stageY: f32,
  pa: f32,
  pb: f32,
  pc: f32,
  pd: f32,
  ptx: f32,
  pty: f32,
  parentVisible: bool
): Bitmap | null {
  let visible = parentVisible && container.visible;
  if (!visible) {
    return null;
  }

  pushAffine(
    pa,
    pb,
    pc,
    pd,
    ptx,
    pty,
    container.x,
    container.y,
    container.rotation,
    container.scaleX,
    container.scaleY
  );
  let wa = unchecked(matScratch[0]);
  let wb = unchecked(matScratch[1]);
  let wc = unchecked(matScratch[2]);
  let wd = unchecked(matScratch[3]);
  let wtx = unchecked(matScratch[4]);
  let wty = unchecked(matScratch[5]);

  for (let i = container.numChildren - 1; i >= 0; i--) {
    let child = container.getChildAt(i);
    if (child instanceof DisplayObjectContainer) {
      let hit = hitTestContainer(
        child as DisplayObjectContainer,
        stageX,
        stageY,
        wa,
        wb,
        wc,
        wd,
        wtx,
        wty,
        visible
      );
      if (hit != null) {
        return hit;
      }
    } else if (child instanceof Bitmap) {
      let hit = hitTestBitmap(
        child as Bitmap,
        stageX,
        stageY,
        wa,
        wb,
        wc,
        wd,
        wtx,
        wty,
        visible
      );
      if (hit != null) {
        return hit;
      }
    }
  }

  return null;
}

function hitTestBitmap(
  bitmap: Bitmap,
  stageX: f32,
  stageY: f32,
  pa: f32,
  pb: f32,
  pc: f32,
  pd: f32,
  ptx: f32,
  pty: f32,
  parentVisible: bool
): Bitmap | null {
  let visible = parentVisible && bitmap.visible;
  if (!visible) {
    return null;
  }

  let width = lookupAssetWidth(bitmap.assetId);
  let height = lookupAssetHeight(bitmap.assetId);
  if (width <= 0 || height <= 0) {
    return null;
  }

  pushAffine(pa, pb, pc, pd, ptx, pty, bitmap.x, bitmap.y, bitmap.rotation, bitmap.scaleX, bitmap.scaleY);
  let wa = unchecked(matScratch[0]);
  let wb = unchecked(matScratch[1]);
  let wc = unchecked(matScratch[2]);
  let wd = unchecked(matScratch[3]);
  let wtx = unchecked(matScratch[4]);
  let wty = unchecked(matScratch[5]);

  let det = wa * wd - wb * wc;
  let adet = det >= 0 ? det : -det;
  if (adet < 1e-6) {
    return null;
  }

  let invDet: f32 = 1.0 / det;
  let dx = stageX - wtx;
  let dy = stageY - wty;
  let localX: f32 = (wd * dx - wc * dy) * invDet;
  let localY: f32 = (-wb * dx + wa * dy) * invDet;

  if (localX < 0 || localY < 0 || localX > <f32>width || localY > <f32>height) {
    return null;
  }

  lastPointerHitLocalX = localX;
  lastPointerHitLocalY = localY;
  return bitmap;
}
