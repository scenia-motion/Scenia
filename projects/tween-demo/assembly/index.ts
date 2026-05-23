import {
  Bitmap,
  Ease,
  Sprite,
  Stage,
  Tween,
  TweenOptions,
  TweenStatus,
  bindStage,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr,
  registerAssetDimensions
} from "@scenia-runtime/runtime-as/as3";

let sketchMain: Main | null = null;

function onOutboundComplete(status: i32): void {
  if (status == TweenStatus.COMPLETE) {
    let main = sketchMain;
    if (main != null) {
      main.startReturnTween();
    }
  }
}

class Main extends Sprite {
  private block: Bitmap;

  constructor() {
    super();

    this.block = new Bitmap("block.png");
    this.block.x = 80;
    this.block.y = 156;
    this.addChild(this.block);

    sketchMain = this;
    this.startOutboundTween();
  }

  startOutboundTween(): void {
    let opts = new TweenOptions();
    opts.x = 520;
    opts.y = 156;
    opts.duration = 2.0;
    opts.ease = Ease.quadOut;
    opts.onComplete = onOutboundComplete;
    Tween.to(this.block, opts);
  }

  startReturnTween(): void {
    let opts = new TweenOptions();
    opts.x = 80;
    opts.y = 156;
    opts.scaleX = 1.0;
    opts.duration = 2.0;
    opts.delay = 0.3;
    opts.ease = Ease.quadIn;
    Tween.to(this.block, opts);
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
