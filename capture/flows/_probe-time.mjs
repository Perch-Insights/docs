// Debugging aid, not a frame: `npm run capture -- --flow _probe-time [analysis-id]`.
// Opens an analysis in Docs (default: the fixture analysis), then opens the granularity picker and the time period
// selector that set-the-time-period documents and prints their visible text in each mode (Range, Period, Compare,
// Compare at Week, Advanced Filters). Switches back to the step's own mode before closing, so nothing is applied;
// if the pending-changes overlay appears anyway, it discards.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const id = frame.args?.[0] ?? loadFixtures().analysis.id;
  const out = [];
  const text = async (loc) => (await loc.innerText().catch(() => '(not found)')).trim().slice(0, 1500);
  try {
    await run();
  } catch (e) {
    out.push('!! ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'capture/_probe-time-fail.png' });
  }
  return out.join('\n');

  async function run() {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${id}`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'View All Steps' }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(4000);

  // Granularity picker
  const gran = page.locator('[data-cy=granularityFilter]').first();
  out.push('== Granularity button ==', await text(gran));
  await gran.click();
  await page.waitForTimeout(1000);
  out.push('== Granularity menu ==', await text(page.getByText('Apply this granularity to all steps').locator('xpath=../..')));
  await page.screenshot({ path: 'capture/_probe-time-gran.png' });
  await page.mouse.click(5, 300);
  await page.waitForTimeout(800);

  // Time period selector
  const dateBtn = page.locator('[data-cy=globalDateRangeSelectorButton]').first();
  out.push('== Date button ==', await text(dateBtn));
  await dateBtn.click();
  const pop = page.locator('[data-cy=globalDateRangeSelectorPopupContent]');
  await pop.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);
  out.push('== Range ==', await text(pop));
  await page.screenshot({ path: 'capture/_probe-time-range.png' });
  const mode = (name) => pop.getByRole('button', { name, exact: true }).or(pop.getByRole('radio', { name, exact: true })).first();
  await mode('Period').click();
  await page.waitForTimeout(1000);
  out.push('== Period ==', await text(pop));
  await page.screenshot({ path: 'capture/_probe-time-period.png' });
  await mode('Compare').click();
  await page.waitForTimeout(1000);
  out.push('== Compare ==', await text(pop));
  await pop.getByRole('button', { name: 'Week', exact: true }).click();
  await page.waitForTimeout(800);
  out.push('== Compare, Week ==', await text(pop));
  await pop.getByText('Last Week', { exact: true }).click();
  await page.waitForTimeout(800);
  out.push('== Compare, Last Week ==', await text(pop));
  await page.screenshot({ path: 'capture/_probe-time-compare.png' });
  await pop.getByRole('button', { name: /^Granularity:/ }).click();
  await pop.getByRole('button', { name: 'Day', exact: true }).click();
  await page.waitForTimeout(500);
  await pop.getByText('Yesterday', { exact: true }).click();
  await page.waitForTimeout(800);
  out.push('== Compare, Day, Yesterday ==', await text(pop));
  await pop.getByRole('button', { name: /^Granularity:/ }).click();
  await pop.getByRole('button', { name: 'Month', exact: true }).click();
  await page.waitForTimeout(500);
  await pop.getByText('Last Month', { exact: true }).click();
  await page.waitForTimeout(800);
  out.push('== Compare, Month, Last Month ==', await text(pop));
  await pop.getByText('Advanced Filters').click();
  await page.waitForTimeout(800);
  out.push('== Advanced Filters ==', await text(pop));
  await page.screenshot({ path: 'capture/_probe-time-filters.png' });
  await mode('Range').click();
  await page.waitForTimeout(800);
  await page.mouse.click(5, 300);
  await page.waitForTimeout(1500);
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  const overlay = await cancel.count();
  out.push('== Overlay after closing ==', String(overlay));
  if (overlay) {
    await cancel.first().click();
    await page.getByRole('button', { name: 'Discard all Changes' }).click();
    await page.waitForTimeout(1000);
  }
  }
}
