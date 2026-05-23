import { Ease, Stage, TextField, Tween, TweenOptions, TweenStatus, getRenderListLength } from "./as3";

let completeStatus: i32 = -1;

export function smoke(): i32 {
  completeStatus = -1;

  let stage = new Stage(1, 1);
  let label = new TextField();
  label.text = "smoke";
  stage.addChild(label);

  let opts = new TweenOptions();
  opts.x = 1;
  opts.duration = 0.5;
  opts.ease = Ease.quadOut;
  opts.onComplete = (status: i32): void => {
    completeStatus = status;
  };
  Tween.to(label, opts);

  stage.tick(0.5);

  if (completeStatus != TweenStatus.COMPLETE) {
    return -1;
  }

  return getRenderListLength();
}
