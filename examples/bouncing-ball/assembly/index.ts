import {
  Bitmap,
  Event,
  Sprite,
  Stage,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr
} from "@as3-wasm-runtime/runtime-as/as3";

class Main extends Sprite {
  private ball: Bitmap;
  private velocityX: f32 = 170;
  private velocityY: f32 = 115;

  constructor() {
    super();

    this.ball = new Bitmap("ball.png");
    this.ball.x = 80;
    this.ball.y = 80;
    this.ball.scaleX = 0.75;
    this.ball.scaleY = 0.75;

    this.addChild(this.ball);
    this.addEventListener<Main>(Event.ENTER_FRAME, this.onFrame);
  }

  onFrame(event: Event): void {
    this.ball.x += this.velocityX * event.deltaTime;
    this.ball.y += this.velocityY * event.deltaTime;
    this.ball.rotation += 180 * event.deltaTime;

    if (this.ball.x < 0 || this.ball.x > 576) {
      this.velocityX = -this.velocityX;
    }

    if (this.ball.y < 0 || this.ball.y > 296) {
      this.velocityY = -this.velocityY;
    }
  }
}

const stage = new Stage(640, 360);
stage.addChild(new Main());

export function update(deltaTime: f32): void {
  stage.tick(deltaTime);
}

export function getRenderListPtr(): usize {
  return runtimeGetRenderListPtr();
}

export function getRenderListLength(): i32 {
  return runtimeGetRenderListLength();
}
