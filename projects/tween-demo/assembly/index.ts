import {
  Bitmap,
  Ease,
  Sprite,
  Stage,
  Tween,
  TweenOptions,
  bindStage,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr,
  registerAssetDimensions
} from "@scenia-runtime/runtime-as/as3";

class Main extends Sprite {
  constructor() {
    super();

    let block = new Bitmap("block.png");
    block.x = 80;
    block.y = 156;

    let opts = new TweenOptions();
    opts.x = 520;
    opts.y = 156;
    opts.duration = 2.0;
    opts.ease = Ease.quadOut;
    Tween.to(block, opts);

    this.addChild(block);
  }
}

const stage = new Stage(640, 360);
let main = new Main();
stage.addChild(main);
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

export { registerAssetDimensions };
