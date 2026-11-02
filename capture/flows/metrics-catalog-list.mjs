// READ-ONLY flow (Pnc Ins, READONLY_WORKSPACE): no click at all, and so no click on any create, save, delete,
// favorite, run, or toggle control. It opens the Metrics Catalog URL and frames the header, the Filters row, the
// NAME / DESCRIPTION / TYPE column headers and the first rows of the list, enough to show both a MEASURE and a
// DIMENSION badge (MetricsCatalogPage.tsx, CubeFieldsTable).
import { unionClip } from './_util.mjs';
export default async function ({ page, BASE, READONLY_WORKSPACE }) {
  await page.goto(`${BASE}/w/${READONLY_WORKSPACE}/metrics-catalog`, { waitUntil: 'load' });
  await page.getByText(/Showing [1-9]\d* fields/).waitFor({ timeout: 60_000 });
  const title = page.getByText('Metrics Catalog', { exact: true }).first();
  await title.waitFor();
  const rows = page.getByRole('row');
  await rows.nth(4).waitFor();
  // walk down the list until a MEASURE and a DIMENSION badge have both been passed, keeping at least four rows
  // (row 0 is the column header row)
  const texts = await rows.evaluateAll(els => els.map(e => e.innerText.toUpperCase()));
  let last = 4;
  for (let i = 4; i < texts.length; i++) {
    const seen = texts.slice(1, i + 1);
    if (seen.some(t => t.includes('MEASURE')) && seen.some(t => t.includes('DIMENSION'))) { last = i; break; }
  }
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  // the rows span the main panel edge to edge; padding past them would pull in the sidebar edge on the left and
  // the top of the next row below, so clip the sides and bottom to the rows and pad only above the title
  const { clip } = await unionClip(page, [title, rows.nth(0), rows.nth(last)], 16);
  const first = await rows.nth(0).boundingBox();
  const end = await rows.nth(last).boundingBox();
  const right = first.x + first.width;
  return { clip: { x: first.x, y: clip.y, width: right - first.x, height: end.y + end.height - clip.y } };
}
