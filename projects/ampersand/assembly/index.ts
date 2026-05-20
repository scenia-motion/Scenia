import {
  Event,
  POINTER_KIND_DOWN,
  POINTER_KIND_MOVE,
  Stage,
  StagePointerListener,
  TextField,
  bindStage,
  dispatchPointerFromHost,
  getRenderListLength as runtimeGetRenderListLength,
  getRenderListPtr as runtimeGetRenderListPtr,
  getRenderStringPtr as runtimeGetRenderStringPtr,
  registerAssetDimensions,
  setStagePointerListener,
  Sprite,
} from "@scenia-runtime/runtime-as/as3";

import { Graphic } from "./Graphic";

class Ampersand extends Sprite {
  private img: Graphic;
  private label: TextField;
  private frameCount: i32 = 0;
  private clickCount: i32 = 0;
  private pointerX: f32 = 0;
  private pointerY: f32 = 0;

  constructor() {
    super();

    this.img = new Graphic();
    this.label = new TextField();
    this.img.x = 200;
    this.img.y = 200;
    this.label.text = "Hello from TextField";
    this.label.x = 20;
    this.label.y = 20;
    this.label.fontSize = 18;
    this.label.color = 0xffffff;
    this.label.width = 400;
    this.label.height = 80;
    this.label.multiline = true;

    this.addChild(this.img);
    this.addChild(this.label);
    this.addEventListener<Ampersand>(Event.ENTER_FRAME, this.onFrame);
  }

  handlePointer(stageX: f32, stageY: f32, kind: i32): void {
    this.pointerX = stageX;
    this.pointerY = stageY;
    if (kind == POINTER_KIND_DOWN) {
      this.clickCount++;
    }
  }

  onFrame(_event: Event): void {
    this.img.rotation += 1;
    this.frameCount++;
    this.label.text =
      "Hello from TextField\n" +
      "Score: " +
      this.clickCount.toString() +
      "  Frames: " +
      this.frameCount.toString() +
      "\nMouse: " +
      this.pointerX.toString() +
      ", " +
      this.pointerY.toString();
  }
}

const stage = new Stage(640, 360);
let ampersand = new Ampersand();
stage.addChild(ampersand);

function onStagePointer(stageX: f32, stageY: f32, kind: i32): void {
  ampersand.handlePointer(stageX, stageY, kind);
}

setStagePointerListener(changetype<StagePointerListener>(onStagePointer));
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

export { dispatchPointerFromHost, registerAssetDimensions };
