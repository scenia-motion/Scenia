import {
  Event,
  Stage,
  bindStage,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr,
  Bitmap,
  Sprite,
} from "@as3-wasm-runtime/runtime-as/as3";

import {Graphic} from "./Graphic";


class Ampersand extends Sprite {
  private img:Graphic;

  constructor() {
    super();

    this.img = new Graphic();
    this.img.x = 200;
    this.img.y = 200;

    this.addChild(this.img);
    this.addEventListener<Ampersand>(Event.ENTER_FRAME, this.onFrame);
  }

  onFrame(event: Event): void {
    this.img.rotation += 1;
  }
}

const stage = new Stage(640, 360);
let ampersand = new Ampersand();
stage.addChild(ampersand);
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
