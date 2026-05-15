const MAX_RENDER_STRINGS: i32 = 2048;
const renderStrings = new Array<string>();
let renderStringCount: i32 = 0;

export function clearRenderStrings(): void {
  renderStringCount = 0;
}

export function internRenderString(value: string): i32 {
  if (renderStringCount >= MAX_RENDER_STRINGS) {
    return 0;
  }

  let index = renderStringCount;
  if (index < renderStrings.length) {
    renderStrings[index] = value;
  } else {
    renderStrings.push(value);
  }
  renderStringCount++;
  return index;
}

export function getRenderStringPtr(index: i32): usize {
  if (index < 0 || index >= renderStringCount) {
    return 0;
  }
  return changetype<usize>(renderStrings[index]);
}
