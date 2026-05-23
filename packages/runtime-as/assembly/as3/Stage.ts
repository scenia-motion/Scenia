import { Event } from "./Event";
import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { collectStage } from "./renderList";
import { getDefaultTweenManager } from "./tween/TweenManager";

export class Stage extends DisplayObjectContainer {
  stageWidth: f32;
  stageHeight: f32;

  constructor(stageWidth: f32, stageHeight: f32) {
    super();
    this.stageWidth = stageWidth;
    this.stageHeight = stageHeight;
  }

  tick(deltaTime: f32): void {
    getDefaultTweenManager().update(deltaTime);
    let event = new Event(Event.ENTER_FRAME, deltaTime);
    this.__broadcastEnterFrame(event);
    collectStage(this);
  }
}
