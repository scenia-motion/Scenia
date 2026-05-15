import { DisplayObject } from "./DisplayObject";

export enum TextAlign {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2
}

export class TextField extends DisplayObject {
  text: string = "";
  fontFamily: string = "sans-serif";
  fontSize: f32 = 16;
  fontWeight: string = "normal";
  color: u32 = 0x000000;
  align: TextAlign = TextAlign.LEFT;
  width: f32 = 100;
  height: f32 = 24;
  multiline: bool = false;
  wordWrap: bool = false;
}
