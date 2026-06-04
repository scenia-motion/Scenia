import {
  Bitmap,
  Ease,
  Event,
  Sprite,
  Stage,
  TextField,
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
  private accent: Bitmap;
  private frameLabel: TextField;
  private frameCount: i32 = 0;

  constructor() {
    super();

    this.block = new Bitmap("block.png");
    this.accent = new Bitmap("block.png");
    this.frameLabel = new TextField();

    this.block.x = 80;
    this.block.y = 156;
    this.addChild(this.block);

    this.accent.x = 80;
    this.accent.y = 220;
    this.accent.scaleX = 0.55;
    this.accent.scaleY = 0.55;
    this.accent.alpha = 0.85;
    this.addChild(this.accent);

    this.frameLabel = new TextField();
    this.frameLabel.text = "frame 0";
    this.frameLabel.x = 12;
    this.frameLabel.y = 12;
    this.frameLabel.fontSize = 14;
    this.frameLabel.color = 0xa8b4c8;
    this.addChild(this.frameLabel);

    this.addEventListener<Main>(Event.ENTER_FRAME, this.onFrame);

    sketchMain = this;
    this.startOutboundTween();
    this.startAccentTween();
  }

  private onFrame(_event: Event): void {
    this.frameCount++;
    this.frameLabel.text = "frame " + this.frameCount.toString();
    this.accent.rotation += 45 * _event.deltaTime;
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

  startAccentTween(): void {
    let opts = new TweenOptions();
    opts.x = 520;
    opts.y = 220;
    opts.duration = 3.5;
    opts.ease = Ease.linear;
    Tween.to(this.accent, opts);
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
