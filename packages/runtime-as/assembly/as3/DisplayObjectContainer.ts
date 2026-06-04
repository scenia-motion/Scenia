import { Event } from "./Event";
import { DisplayObject } from "./DisplayObject";

export class DisplayObjectContainer extends DisplayObject {
  protected children: Array<DisplayObject> = new Array<DisplayObject>();

  get numChildren(): i32 {
    return this.children.length;
  }

  addChild(child: DisplayObject): DisplayObject {
    if (child.parent != null) {
      child.parent!.removeChild(child);
    }

    child.parent = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: DisplayObject): DisplayObject {
    let index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return child;
  }

  getChildAt(index: i32): DisplayObject {
    return this.children[index];
  }

  __broadcastEnterFrame(event: Event): void {
    if (this.stage != null && this.hasEventListener(Event.ENTER_FRAME)) {
      this.dispatchEvent(event);
    }

    for (let i = 0; i < this.children.length; i++) {
      let child = this.children[i];
      if (child.stage == null) {
        continue;
      }

      if (child instanceof DisplayObjectContainer) {
        (child as DisplayObjectContainer).__broadcastEnterFrame(event);
      } else if (child.hasEventListener(Event.ENTER_FRAME)) {
        child.dispatchEvent(event);
      }
    }
  }
}
