import { NativeMath } from "~lib/math";

/** Scratch for last `pushAffine` result: a, b, c, d, tx, ty (Flash / Canvas column order). */
export const matScratch = new StaticArray<f32>(6);

const DEG_TO_RAD: f32 = <f32>NativeMath.PI / 180.0;

/** Compose `parent * local` where `local` is built from display x, y, rotation (deg), scaleX, scaleY. */
export function pushAffine(
  pa: f32,
  pb: f32,
  pc: f32,
  pd: f32,
  ptx: f32,
  pty: f32,
  x: f32,
  y: f32,
  rotation: f32,
  scaleX: f32,
  scaleY: f32
): void {
  let rad = rotation * DEG_TO_RAD;
  let cosv = <f32>NativeMath.cos(<f64>rad);
  let sinv = <f32>NativeMath.sin(<f64>rad);
  let la = cosv * scaleX;
  let lb = sinv * scaleX;
  let lc = -sinv * scaleY;
  let ld = cosv * scaleY;
  let ltx = x;
  let lty = y;
  unchecked((matScratch[0] = pa * la + pc * lb));
  unchecked((matScratch[1] = pb * la + pd * lb));
  unchecked((matScratch[2] = pa * lc + pc * ld));
  unchecked((matScratch[3] = pb * lc + pd * ld));
  unchecked((matScratch[4] = pa * ltx + pc * lty + ptx));
  unchecked((matScratch[5] = pb * ltx + pd * lty + pty));
}
