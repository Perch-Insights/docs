// Shared helpers for flows.
// unionClip: the smallest viewport rectangle containing all the given locators, padded and stretched
// to the full width between the leftmost and rightmost element, so a band of the page comes out as one frame.
export async function unionClip(page, locators, pad = 16) {
  const boxes = [];
  for (const l of locators) { const b = await l.boundingBox(); if (b) boxes.push(b); }
  if (!boxes.length) throw new Error('unionClip: none of the locators has a bounding box');
  const vp = page.viewportSize();
  const x0 = Math.max(0, Math.min(...boxes.map(b => b.x)) - pad);
  const y0 = Math.max(0, Math.min(...boxes.map(b => b.y)) - pad);
  const x1 = Math.min(vp.width, Math.max(...boxes.map(b => b.x + b.width)) + pad);
  const y1 = Math.min(vp.height, Math.max(...boxes.map(b => b.y + b.height)) + pad);
  return { clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
}
