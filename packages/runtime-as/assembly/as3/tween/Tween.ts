import { DisplayObject } from "../DisplayObject";
import { Ease, EaseFn } from "./Ease";
import { getDefaultTweenManager } from "./TweenManager";

export class TweenStatus {
  static readonly COMPLETE: i32 = 0;
  static readonly CANCELLED: i32 = 1;
}

export type TweenCompleteCallback = (status: i32) => void;

export class TweenOptions {
  x: f32 = NaN;
  y: f32 = NaN;
  scaleX: f32 = NaN;
  scaleY: f32 = NaN;
  rotation: f32 = NaN;
  alpha: f32 = NaN;
  duration: f32 = 1.0;
  delay: f32 = 0;
  ease: EaseFn = Ease.linear;
  onComplete: TweenCompleteCallback | null = null;
}

export class Tween {
  readonly target: DisplayObject;
  readonly duration: f32;
  readonly ease: EaseFn;

  elapsed: f32 = 0;
  delay: f32 = 0;
  complete: bool = false;

  private onComplete: TweenCompleteCallback | null = null;
  private onCompleteInvoked: bool = false;

  private tweenX: bool = false;
  private tweenY: bool = false;
  private tweenScaleX: bool = false;
  private tweenScaleY: bool = false;
  private tweenRotation: bool = false;
  private tweenAlpha: bool = false;

  private startX: f32 = 0;
  private startY: f32 = 0;
  private startScaleX: f32 = 1;
  private startScaleY: f32 = 1;
  private startRotation: f32 = 0;
  private startAlpha: f32 = 1;

  private endX: f32 = 0;
  private endY: f32 = 0;
  private endScaleX: f32 = 1;
  private endScaleY: f32 = 1;
  private endRotation: f32 = 0;
  private endAlpha: f32 = 1;

  constructor(target: DisplayObject, options: TweenOptions) {
    this.target = target;
    this.duration = options.duration;
    this.ease = options.ease;
    this.delay = options.delay;
    this.onComplete = options.onComplete;

    if (!isNaN(options.x)) {
      this.tweenX = true;
      this.startX = target.x;
      this.endX = options.x;
    }
    if (!isNaN(options.y)) {
      this.tweenY = true;
      this.startY = target.y;
      this.endY = options.y;
    }
    if (!isNaN(options.scaleX)) {
      this.tweenScaleX = true;
      this.startScaleX = target.scaleX;
      this.endScaleX = options.scaleX;
    }
    if (!isNaN(options.scaleY)) {
      this.tweenScaleY = true;
      this.startScaleY = target.scaleY;
      this.endScaleY = options.scaleY;
    }
    if (!isNaN(options.rotation)) {
      this.tweenRotation = true;
      this.startRotation = target.rotation;
      this.endRotation = options.rotation;
    }
    if (!isNaN(options.alpha)) {
      this.tweenAlpha = true;
      this.startAlpha = target.alpha;
      this.endAlpha = options.alpha;
    }
  }

  static to(target: DisplayObject, options: TweenOptions): Tween {
    let tween = new Tween(target, options);
    getDefaultTweenManager().add(tween);
    return tween;
  }

  stop(): void {
    if (this.complete) {
      return;
    }
    this.complete = true;
    this.invokeComplete(TweenStatus.CANCELLED);
    getDefaultTweenManager().remove(this);
  }

  update(dt: f32): void {
    if (this.complete) {
      return;
    }

    if (this.delay > 0) {
      if (dt >= this.delay) {
        dt -= this.delay;
        this.delay = 0;
      } else {
        this.delay -= dt;
        return;
      }
    }

    this.elapsed += dt;
    let t: f32 = this.elapsed >= this.duration ? 1 : this.elapsed / this.duration;
    let eased = this.ease(t);

    if (this.tweenX) {
      this.target.x = this.startX + (this.endX - this.startX) * eased;
    }
    if (this.tweenY) {
      this.target.y = this.startY + (this.endY - this.startY) * eased;
    }
    if (this.tweenScaleX) {
      this.target.scaleX = this.startScaleX + (this.endScaleX - this.startScaleX) * eased;
    }
    if (this.tweenScaleY) {
      this.target.scaleY = this.startScaleY + (this.endScaleY - this.startScaleY) * eased;
    }
    if (this.tweenRotation) {
      this.target.rotation = this.startRotation + (this.endRotation - this.startRotation) * eased;
    }
    if (this.tweenAlpha) {
      this.target.alpha = this.startAlpha + (this.endAlpha - this.startAlpha) * eased;
    }

    if (this.elapsed >= this.duration) {
      this.snapToEnd();
      this.complete = true;
      this.invokeComplete(TweenStatus.COMPLETE);
    }
  }

  private invokeComplete(status: i32): void {
    if (this.onCompleteInvoked) {
      return;
    }
    this.onCompleteInvoked = true;
    if (this.onComplete != null) {
      this.onComplete(status);
    }
  }

  private snapToEnd(): void {
    if (this.tweenX) {
      this.target.x = this.endX;
    }
    if (this.tweenY) {
      this.target.y = this.endY;
    }
    if (this.tweenScaleX) {
      this.target.scaleX = this.endScaleX;
    }
    if (this.tweenScaleY) {
      this.target.scaleY = this.endScaleY;
    }
    if (this.tweenRotation) {
      this.target.rotation = this.endRotation;
    }
    if (this.tweenAlpha) {
      this.target.alpha = this.endAlpha;
    }
  }
}
