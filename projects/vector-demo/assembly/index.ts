import {
  Ease,
  Shape,
  Sprite,
  Stage,
  TextField,
  Tween,
  TweenOptions,
  bindStage,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr,
  getRenderStringPtr as runtimeGetRenderStringPtr
} from "@scenia-runtime/runtime-as/as3";

class OrbitGroup extends Sprite {
  readonly ring: Shape = new Shape();

  constructor() {
    super();

    this.ring.graphics.lineStyle(3, 0x66ccff, 0.9);
    this.ring.graphics.drawCircle(0, 0, 48);
    this.addChild(this.ring);
  }
}

class Main extends Sprite {
  private tri: Shape = new Shape();
  private compound: Shape = new Shape();
  private orbit: OrbitGroup = new OrbitGroup();
  private label: TextField = new TextField();

  constructor() {
    super();

    this.tri.graphics.beginFill(0x4488ff);
    this.tri.graphics.moveTo(0, -40);
    this.tri.graphics.lineTo(35, 30);
    this.tri.graphics.lineTo(-35, 30);
    this.tri.graphics.endFill();
    this.tri.x = 200;
    this.tri.y = 180;
    this.addChild(this.tri);

    this.compound.graphics.beginFill(0x334455, 0.6);
    this.compound.graphics.drawRect(-60, -30, 120, 60);
    this.compound.graphics.endFill();
    this.compound.graphics.lineStyle(2, 0xffaa44);
    this.compound.graphics.moveTo(-40, 0);
    this.compound.graphics.lineTo(40, 0);
    this.compound.graphics.moveTo(0, -15);
    this.compound.graphics.lineTo(0, 15);
    this.compound.x = 480;
    this.compound.y = 180;
    this.addChild(this.compound);

    this.orbit.x = 320;
    this.orbit.y = 180;
    this.addChild(this.orbit);

    this.label.text = "vector demo";
    this.label.x = 12;
    this.label.y = 12;
    this.label.fontSize = 14;
    this.label.color = 0xa8b4c8;
    this.label.width = 200;
    this.label.height = 24;
    this.addChild(this.label);

    this.startTweens();
  }

  private startTweens(): void {
    let triOpts = new TweenOptions();
    triOpts.rotation = 360;
    triOpts.alpha = 0.5;
    triOpts.duration = 4.0;
    triOpts.ease = Ease.linear;
    Tween.to(this.tri, triOpts);

    let compoundOpts = new TweenOptions();
    compoundOpts.x = 420;
    compoundOpts.y = 120;
    compoundOpts.duration = 3.0;
    compoundOpts.ease = Ease.quadInOut;
    Tween.to(this.compound, compoundOpts);

    let orbitOpts = new TweenOptions();
    orbitOpts.rotation = -360;
    orbitOpts.duration = 6.0;
    orbitOpts.ease = Ease.linear;
    Tween.to(this.orbit, orbitOpts);
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

export function getRenderStringPtr(index: i32): usize {
  return runtimeGetRenderStringPtr(index);
}
