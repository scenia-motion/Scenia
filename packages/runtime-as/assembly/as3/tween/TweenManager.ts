import { Tween } from "./Tween";

export class TweenManager {
  private tweens: Tween[] = [];

  add(tween: Tween): void {
    this.tweens.push(tween);
  }

  remove(tween: Tween): void {
    for (let i = 0; i < this.tweens.length; i++) {
      if (this.tweens[i] == tween) {
        this.tweens.splice(i, 1);
        return;
      }
    }
  }

  update(dt: f32): void {
    for (let i = 0; i < this.tweens.length; i++) {
      this.tweens[i].update(dt);
    }

    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (this.tweens[i].complete) {
        this.tweens.splice(i, 1);
      }
    }
  }
}

const defaultTweenManager = new TweenManager();

export function getDefaultTweenManager(): TweenManager {
  return defaultTweenManager;
}
