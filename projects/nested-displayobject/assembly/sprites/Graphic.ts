import {Sprite, Bitmap} from "@scenia-runtime/runtime-as/as3";

export class Graphic extends Sprite {
  private img:Bitmap;

  constructor() {
    super();
    this.img = new Bitmap("ampersand.png");
    this.img.x = -24;
    this.img.y = -24;
    this.addChild(this.img);
  }
}
