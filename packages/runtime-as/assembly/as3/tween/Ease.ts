export type EaseFn = (t: f32) => f32;

function clamp01(t: f32): f32 {
  if (t < 0) {
    return 0;
  }
  if (t > 1) {
    return 1;
  }
  return t;
}

export class Ease {
  static linear(t: f32): f32 {
    return clamp01(t);
  }

  static quadIn(t: f32): f32 {
    t = clamp01(t);
    return t * t;
  }

  static quadOut(t: f32): f32 {
    t = clamp01(t);
    return t * (2 - t);
  }

  static quadInOut(t: f32): f32 {
    t = clamp01(t);
    if (t < 0.5) {
      return 2 * t * t;
    }
    return -1 + (4 - 2 * t) * t;
  }
}
