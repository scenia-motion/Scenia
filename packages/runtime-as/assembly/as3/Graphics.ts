const CIRCLE_SEGMENTS: i32 = 24;
const TAU: f32 = 6.2831855;

class SvgPathBuilder {
  private parts: string = "";
  private hasGeometry: bool = false;

  clear(): void {
    this.parts = "";
    this.hasGeometry = false;
  }

  isEmpty(): bool {
    return !this.hasGeometry;
  }

  moveTo(x: f32, y: f32): void {
    this.parts = this.parts + "M" + x.toString() + " " + y.toString() + " ";
    this.hasGeometry = true;
  }

  lineTo(x: f32, y: f32): void {
    this.parts = this.parts + "L" + x.toString() + " " + y.toString() + " ";
    this.hasGeometry = true;
  }

  closePath(): void {
    this.parts = this.parts + "Z ";
  }

  build(): string {
    return this.parts;
  }
}

export class Graphics {
  private path: SvgPathBuilder = new SvgPathBuilder();
  fillColor: u32 = 0;
  fillAlpha: f32 = 1;
  fillActive: bool = false;
  strokeColor: u32 = 0;
  strokeAlpha: f32 = 1;
  strokeWidth: f32 = 0;

  clear(): void {
    this.path.clear();
    this.fillActive = false;
    this.fillAlpha = 1;
    this.strokeWidth = 0;
  }

  isEmpty(): bool {
    return this.path.isEmpty();
  }

  buildPath(): string {
    return this.path.build();
  }

  beginFill(color: u32, alpha: f32 = 1): void {
    this.fillColor = color;
    this.fillAlpha = alpha;
    this.fillActive = true;
  }

  endFill(): void {
    if (this.fillActive) {
      this.path.closePath();
    }
  }

  lineStyle(width: f32, color: u32, alpha: f32 = 1): void {
    this.strokeWidth = width;
    this.strokeColor = color;
    this.strokeAlpha = alpha;
  }

  moveTo(x: f32, y: f32): void {
    this.path.moveTo(x, y);
  }

  lineTo(x: f32, y: f32): void {
    this.path.lineTo(x, y);
  }

  drawRect(x: f32, y: f32, width: f32, height: f32): void {
    this.path.moveTo(x, y);
    this.path.lineTo(x + width, y);
    this.path.lineTo(x + width, y + height);
    this.path.lineTo(x, y + height);
    this.path.closePath();
  }

  drawCircle(x: f32, y: f32, radius: f32): void {
    let step = TAU / (CIRCLE_SEGMENTS as f32);
    let angle: f32 = 0;
    this.path.moveTo(x + radius, y);
    for (let i = 1; i < CIRCLE_SEGMENTS; i++) {
      angle += step;
      this.path.lineTo(x + Mathf.cos(angle) * radius, y + Mathf.sin(angle) * radius);
    }
    this.path.closePath();
  }
}
