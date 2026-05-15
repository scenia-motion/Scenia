import { Stage, TextField, getRenderListLength } from "./as3";

export function smoke(): i32 {
  let stage = new Stage(1, 1);
  let label = new TextField();
  label.text = "smoke";
  stage.addChild(label);
  stage.tick(0);
  return getRenderListLength();
}
