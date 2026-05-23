import { Ease, Stage, TextField, Tween, TweenOptions, getRenderListLength } from "./as3";

export function smoke(): i32 {
  let stage = new Stage(1, 1);
  let label = new TextField();
  label.text = "smoke";
  stage.addChild(label);

  let opts = new TweenOptions();
  opts.x = 1;
  opts.duration = 0.5;
  opts.ease = Ease.quadOut;
  Tween.to(label, opts);

  stage.tick(0);
  return getRenderListLength();
}
