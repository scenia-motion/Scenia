import { DisplayObjectContainer } from "./DisplayObjectContainer";
import { getDefaultRuntimeTimeline } from "./RuntimeTimeline";

export class Stage extends DisplayObjectContainer {
  stageWidth: f32;
  stageHeight: f32;

  constructor(stageWidth: f32, stageHeight: f32) {
    super();
    this.stageWidth = stageWidth;
    this.stageHeight = stageHeight;
  }

  tick(deltaTime: f32): void {
    getDefaultRuntimeTimeline().tick(deltaTime);
  }
}
