import { matScratch, pushAffine } from "./affine2d";
import { Bitmap } from "./Bitmap";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Stage } from "./Stage";

export const RENDER_KIND_BITMAP: i32 = 1;
/** kind, assetId, a, b, c, d, tx, ty, alpha — matches Canvas setTransform(a,b,c,d,tx,ty) + globalAlpha */
export const RENDER_LIST_STRIDE: i32 = 9;

const MAX_RENDER_ITEMS: i32 = 1024;
const renderList = new StaticArray<f64>(MAX_RENDER_ITEMS * RENDER_LIST_STRIDE);
let renderListLength: i32 = 0;

export function getRenderListPtr(): usize {
  return changetype<usize>(renderList);
}

export function getRenderListLength(): i32 {
  return renderListLength;
}

export function clearRenderList(): void {
  renderListLength = 0;
}

export function collectStage(stage: Stage): void {
  clearRenderList();
  collectContainer(stage, 1, 0, 0, 1, 0, 0, 1, true);
}

function collectContainer(
  container: DisplayObjectContainer,
  pa: f32,
  pb: f32,
  pc: f32,
  pd: f32,
  ptx: f32,
  pty: f32,
  parentAlpha: f32,
  parentVisible: bool
): void {
  let visible = parentVisible && container.visible;
  if (!visible) {
    return;
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
  let worldAlpha = parentAlpha * container.alpha;

  for (let i = 0; i < container.numChildren; i++) {
    let child = container.getChildAt(i);
    if (child instanceof DisplayObjectContainer) {
      collectContainer(child as DisplayObjectContainer, wa, wb, wc, wd, wtx, wty, worldAlpha, visible);
    } else if (child instanceof Bitmap) {
      collectBitmap(child as Bitmap, wa, wb, wc, wd, wtx, wty, worldAlpha, visible);
    }
  }
}

function collectBitmap(
  bitmap: Bitmap,
  pa: f32,
  pb: f32,
  pc: f32,
  pd: f32,
  ptx: f32,
  pty: f32,
  parentAlpha: f32,
  parentVisible: bool
): void {
  let visible = parentVisible && bitmap.visible;
  if (!visible || renderListLength >= MAX_RENDER_ITEMS) {
    return;
  }

  pushAffine(pa, pb, pc, pd, ptx, pty, bitmap.x, bitmap.y, bitmap.rotation, bitmap.scaleX, bitmap.scaleY);
  let wa = unchecked(matScratch[0]);
  let wb = unchecked(matScratch[1]);
  let wc = unchecked(matScratch[2]);
  let wd = unchecked(matScratch[3]);
  let wtx = unchecked(matScratch[4]);
  let wty = unchecked(matScratch[5]);
  let offset = renderListLength * RENDER_LIST_STRIDE;

  unchecked((renderList[offset + 0] = RENDER_KIND_BITMAP as f64));
  unchecked((renderList[offset + 1] = bitmap.assetId as f64));
  unchecked((renderList[offset + 2] = wa as f64));
  unchecked((renderList[offset + 3] = wb as f64));
  unchecked((renderList[offset + 4] = wc as f64));
  unchecked((renderList[offset + 5] = wd as f64));
  unchecked((renderList[offset + 6] = wtx as f64));
  unchecked((renderList[offset + 7] = wty as f64));
  unchecked((renderList[offset + 8] = (parentAlpha * bitmap.alpha) as f64));

  renderListLength++;
}

export function __renderListKindAt(index: i32): f64 {
  return unchecked(renderList[index * RENDER_LIST_STRIDE]);
}
