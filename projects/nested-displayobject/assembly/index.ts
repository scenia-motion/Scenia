import {
  Sprite,
  Stage,
  bindStage,
  Event,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr
} from "@scenia-runtime/runtime-as/as3";

import { Graphic } from "./sprites/Graphic";

class NestedDisplayObject extends Sprite {
  
  private img:Graphic;

  constructor() { 
    super();
    this.img = new Graphic();
    this.addEventListener<NestedDisplayObject>(Event.ENTER_FRAME, this.onFrame);  
    this.img.x = (320 - 24);
    this.img.y = (180 - 24);
    this.addChild(this.img);
  }


  onFrame(_event: Event): void {
    this.img.rotation += 1;
  }
}

const stage = new Stage(640, 360);  
let nestedDisplayObject = new NestedDisplayObject();
stage.addChild(nestedDisplayObject);
bindStage(stage);

export function update(deltaTime: f32): void {
  stage.tick(deltaTime);
}

export function getRenderListPtr(): usize {
  return runtimeGetRenderListPtr();
}

export function getRenderListLength(): i32 {
  return runtimeGetRenderListLength();
}
