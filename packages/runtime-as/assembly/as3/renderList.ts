import { matScratch, pushAffine } from "./affine2d";
import { Bitmap } from "./Bitmap";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Stage } from "./Stage";
import { TextField } from "./TextField";
import { clearRenderStrings, internRenderString } from "./renderStrings";

export const RENDER_KIND_BITMAP: i32 = 1;
export const RENDER_KIND_TEXT: i32 = 2;
/** kind, assetId, a, b, c, d, tx, ty, alpha */
export const RENDER_BITMAP_STRIDE: i32 = 9;
/** kind, displayObjectId, textIndex, fontFamilyIndex, fontWeightIndex, a..ty, alpha, fontSize, color, align, width, height, multiline, wordWrap */
export const RENDER_TEXT_STRIDE: i32 = 19;
/** @deprecated Use RENDER_BITMAP_STRIDE; kept for existing imports. */
export const RENDER_LIST_STRIDE: i32 = RENDER_BITMAP_STRIDE;

const MAX_RENDER_FLOATS: i32 = 1024 * RENDER_TEXT_STRIDE;
const renderList = new StaticArray<f64>(MAX_RENDER_FLOATS);
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
  clearRenderStrings();
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
    } else if (child instanceof TextField) {
      collectTextField(child as TextField, wa, wb, wc, wd, wtx, wty, worldAlpha, visible);
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
  if (!visible || renderListLength + RENDER_BITMAP_STRIDE > MAX_RENDER_FLOATS) {
    return;
  }

  pushAffine(pa, pb, pc, pd, ptx, pty, bitmap.x, bitmap.y, bitmap.rotation, bitmap.scaleX, bitmap.scaleY);
  let wa = unchecked(matScratch[0]);
  let wb = unchecked(matScratch[1]);
  let wc = unchecked(matScratch[2]);
  let wd = unchecked(matScratch[3]);
  let wtx = unchecked(matScratch[4]);
  let wty = unchecked(matScratch[5]);
  let offset = renderListLength;

  unchecked((renderList[offset + 0] = RENDER_KIND_BITMAP as f64));
  unchecked((renderList[offset + 1] = bitmap.assetId as f64));
  unchecked((renderList[offset + 2] = wa as f64));
  unchecked((renderList[offset + 3] = wb as f64));
  unchecked((renderList[offset + 4] = wc as f64));
  unchecked((renderList[offset + 5] = wd as f64));
  unchecked((renderList[offset + 6] = wtx as f64));
  unchecked((renderList[offset + 7] = wty as f64));
  unchecked((renderList[offset + 8] = (parentAlpha * bitmap.alpha) as f64));

  renderListLength += RENDER_BITMAP_STRIDE;
}

function collectTextField(
  textField: TextField,
  pa: f32,
  pb: f32,
  pc: f32,
  pd: f32,
  ptx: f32,
  pty: f32,
  parentAlpha: f32,
  parentVisible: bool
): void {
  let visible = parentVisible && textField.visible;
  if (!visible || renderListLength + RENDER_TEXT_STRIDE > MAX_RENDER_FLOATS) {
    return;
  }

  pushAffine(
    pa,
    pb,
    pc,
    pd,
    ptx,
    pty,
    textField.x,
    textField.y,
    textField.rotation,
    textField.scaleX,
    textField.scaleY
  );
  let wa = unchecked(matScratch[0]);
  let wb = unchecked(matScratch[1]);
  let wc = unchecked(matScratch[2]);
  let wd = unchecked(matScratch[3]);
  let wtx = unchecked(matScratch[4]);
  let wty = unchecked(matScratch[5]);
  let offset = renderListLength;
  let textIndex = internRenderString(textField.text);
  let fontFamilyIndex = internRenderString(textField.fontFamily);
  let fontWeightIndex = internRenderString(textField.fontWeight);

  unchecked((renderList[offset + 0] = RENDER_KIND_TEXT as f64));
  unchecked((renderList[offset + 1] = textField.id as f64));
  unchecked((renderList[offset + 2] = textIndex as f64));
  unchecked((renderList[offset + 3] = fontFamilyIndex as f64));
  unchecked((renderList[offset + 4] = fontWeightIndex as f64));
  unchecked((renderList[offset + 5] = wa as f64));
  unchecked((renderList[offset + 6] = wb as f64));
  unchecked((renderList[offset + 7] = wc as f64));
  unchecked((renderList[offset + 8] = wd as f64));
  unchecked((renderList[offset + 9] = wtx as f64));
  unchecked((renderList[offset + 10] = wty as f64));
  unchecked((renderList[offset + 11] = (parentAlpha * textField.alpha) as f64));
  unchecked((renderList[offset + 12] = textField.fontSize as f64));
  unchecked((renderList[offset + 13] = textField.color as f64));
  unchecked((renderList[offset + 14] = textField.align as f64));
  unchecked((renderList[offset + 15] = textField.width as f64));
  unchecked((renderList[offset + 16] = textField.height as f64));
  unchecked((renderList[offset + 17] = (textField.multiline ? 1 : 0) as f64));
  unchecked((renderList[offset + 18] = (textField.wordWrap ? 1 : 0) as f64));

  renderListLength += RENDER_TEXT_STRIDE;
}

export function __renderListKindAt(index: i32): f64 {
  return unchecked(renderList[index]);
}
