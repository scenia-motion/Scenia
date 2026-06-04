import { EventDispatcher } from "./Event";

let nextDisplayObjectId: i32 = 1;

export class DisplayObject extends EventDispatcher {
  readonly id: i32;

  x: f32 = 0;
  y: f32 = 0;
  rotation: f32 = 0;
  scaleX: f32 = 1;
  scaleY: f32 = 1;
  alpha: f32 = 1;
  visible: bool = true;

  parent: DisplayObjectContainer | null = null;

  constructor() {
    super();
    this.id = nextDisplayObjectId++;
  }

  protected override bubbleParent(): EventDispatcher | null {
    return this.parent;
  }

  get stage(): Stage | null {
    let node: DisplayObject | null = this;
    while (node != null) {
      if (node instanceof Stage) {
        return changetype<Stage>(node);
      }
      node = node.parent;
    }
    return null;
  }
}

import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { Stage } from "./Stage";
