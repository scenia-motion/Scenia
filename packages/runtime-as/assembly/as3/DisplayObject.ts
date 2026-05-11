import { EventDispatcher } from "./Event";

export class DisplayObject extends EventDispatcher {
  x: f32 = 0;
  y: f32 = 0;
  rotation: f32 = 0;
  scaleX: f32 = 1;
  scaleY: f32 = 1;
  alpha: f32 = 1;
  visible: bool = true;

  parent: DisplayObjectContainer | null = null;

  protected override bubbleParent(): EventDispatcher | null {
    return this.parent;
  }

  get stage(): Stage | null {
    let node: DisplayObject | null = this;
    while (node != null) {
      if (node instanceof Stage) {
        return node;
      }
      node = node.parent;
    }
    return null;
  }
}

import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Stage } from "./Stage";
