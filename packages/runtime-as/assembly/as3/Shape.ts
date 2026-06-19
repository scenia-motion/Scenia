import { DisplayObject } from "./DisplayObject";
import { Graphics } from "./Graphics";

export class Shape extends DisplayObject {
  readonly graphics: Graphics;

  constructor() {
    super();
    this.graphics = new Graphics();
  }
}
