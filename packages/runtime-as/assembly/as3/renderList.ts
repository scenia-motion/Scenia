import { Bitmap } from "./Bitmap";
import { DisplayObject } from "./DisplayObject";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Stage } from "./Stage";

export const RENDER_KIND_BITMAP: i32 = 1;
export const RENDER_LIST_STRIDE: i32 = 8;

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
  collectContainer(stage, 0, 0, 0, 1, 1, 1, true);
}

function collectContainer(
  container: DisplayObjectContainer,
  parentX: f32,
  parentY: f32,
  parentRotation: f32,
  parentScaleX: f32,
  parentScaleY: f32,
  parentAlpha: f32,
  parentVisible: bool
): void {
  let visible = parentVisible && container.visible;
  if (!visible) {
    return;
  }

  let worldX = parentX + container.x * parentScaleX;
  let worldY = parentY + container.y * parentScaleY;
  let worldRotation = parentRotation + container.rotation;
  let worldScaleX = parentScaleX * container.scaleX;
  let worldScaleY = parentScaleY * container.scaleY;
  let worldAlpha = parentAlpha * container.alpha;

  for (let i = 0; i < container.numChildren; i++) {
    let child = container.getChildAt(i);
    if (child instanceof DisplayObjectContainer) {
      collectContainer(child as DisplayObjectContainer, worldX, worldY, worldRotation, worldScaleX, worldScaleY, worldAlpha, visible);
    } else if (child instanceof Bitmap) {
      collectBitmap(child as Bitmap, worldX, worldY, worldRotation, worldScaleX, worldScaleY, worldAlpha, visible);
    }
  }
}

function collectBitmap(
  bitmap: Bitmap,
  parentX: f32,
  parentY: f32,
  parentRotation: f32,
  parentScaleX: f32,
  parentScaleY: f32,
  parentAlpha: f32,
  parentVisible: bool
): void {
  let visible = parentVisible && bitmap.visible;
  if (!visible || renderListLength >= MAX_RENDER_ITEMS) {
    return;
  }

  let worldX = parentX + bitmap.x * parentScaleX;
  let worldY = parentY + bitmap.y * parentScaleY;
  let offset = renderListLength * RENDER_LIST_STRIDE;

  unchecked((renderList[offset + 0] = RENDER_KIND_BITMAP as f64));
  unchecked((renderList[offset + 1] = bitmap.assetId as f64));
  unchecked((renderList[offset + 2] = worldX as f64));
  unchecked((renderList[offset + 3] = worldY as f64));
  unchecked((renderList[offset + 4] = (parentRotation + bitmap.rotation) as f64));
  unchecked((renderList[offset + 5] = (parentScaleX * bitmap.scaleX) as f64));
  unchecked((renderList[offset + 6] = (parentScaleY * bitmap.scaleY) as f64));
  unchecked((renderList[offset + 7] = (parentAlpha * bitmap.alpha) as f64));

  renderListLength++;
}

export function __renderListKindAt(index: i32): f64 {
  return unchecked(renderList[index * RENDER_LIST_STRIDE]);
}
