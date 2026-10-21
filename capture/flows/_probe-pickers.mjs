// Debugging aid, not a frame: `npm run capture -- --flow _probe-pickers [analysis-id]`.
// Opens an analysis in Docs (default: the fixture analysis), then opens the Metrics, Dimensions, and Filters
// pickers that build-a-step documents and prints their visible text. Opens pickers, the Business Area list,
// a metric's info dialog, and one dimension's values; never selects or removes anything.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const id = frame.args?.[0] ?? loadFixtures().analysis.id;
  const out = [];
  const text = async (loc) => (await loc.innerText().catch(() => '(not found)')).trim().slice(0, 1500);
  const closePopover = async () => {
    await page.mouse.click(5, 300);
    await page.waitForTimeout(800);
  };
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${id}`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'View All Steps' }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(4000);

  // Metrics picker
  await page.locator('[data-cy=metricsFilter]').click();
  const metricsMenu = page.locator('[data-cy=metricsFilterMenu]');
  await metricsMenu.waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  out.push('== Metrics ==', await text(metricsMenu));
  await page.screenshot({ path: 'capture/_probe-pickers-metrics.png' });
  const ba = metricsMenu.getByRole('button', { name: /^Business Area/ });
  if (await ba.count()) {
    await ba.first().click();
    await page.waitForTimeout(800);
    out.push('== Business Area list ==', await text(page.locator('.w-\\[280px\\]').last()));
    await ba.first().click();
    await page.waitForTimeout(500);
  } else {
    out.push('== Business Area list ==', '(no Business Area button)');
  }
  // info dialog of the first selected metric (right-hand list)
  const selectedCard = metricsMenu.locator('.cursor-grab').first();
  await selectedCard.hover();
  await selectedCard.locator('a').first().click().catch(() => {});
  await page.waitForTimeout(3000);
  out.push('== Metric info dialog ==', await text(page.getByRole('dialog').last()));
  await page.screenshot({ path: 'capture/_probe-pickers-info.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await closePopover();
  out.push('== Overlay after closing Metrics ==', String(await page.getByRole('button', { name: 'Apply Filter Changes' }).count()));

  // Dimensions picker
  await page.locator('[data-cy=dimensionsFilter]').click();
  const dimsMenu = page.locator('[data-cy=dimensionsFilterMenu]');
  await dimsMenu.waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  out.push('== Dimensions ==', await text(dimsMenu));
  await closePopover();

  // Filters picker, then one dimension's values
  await page.locator('[data-cy=filtersSelector]').click();
  const filtersMenu = page.locator('[data-cy=filtersFilterMenu]');
  await filtersMenu.waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  out.push('== Filters ==', await text(filtersMenu));
  await filtersMenu.locator('.min-h-\\[72px\\]').first().click();
  await page.waitForTimeout(4000);
  out.push('== Filter values ==', await text(filtersMenu));
  await page.screenshot({ path: 'capture/_probe-pickers-filters.png' });
  await closePopover();
  out.push('== Overlay after closing Filters ==', String(await page.getByRole('button', { name: 'Apply Filter Changes' }).count()));
  return out.join('\n');
}
