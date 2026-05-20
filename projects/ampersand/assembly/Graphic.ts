import {Sprite, Bitmap} from "@as3-wasm-runtime/runtime-as/as3";

export class Graphic extends Sprite {
  private img:Bitmap;

  constructor() {
    super();
    this.img = new Bitmap("ampersand.png");
    this.img.x = -60;
    this.img.y = -60;
    this.addChild(this.img);
  }
}
