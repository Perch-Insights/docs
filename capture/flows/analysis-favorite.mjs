// The star at the top right of an open analysis header, hovered so its tooltip reads "Add to Favorites".
// The label lives in the button's tooltip and aria-label, not in visible text, so the flow hovers the star
// (the Tooltip component opens after a 400ms hover delay) and the harness then finds the tooltip text.
// The star is not clicked, so the fixture stays a non-favorite; if an earlier run left it favorited, the flow
// clicks once to remove the favorite and waits for the confirmation toast to go away before hovering.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const bandEl = page.locator('header').first().locator('xpath=..');
  const remove = bandEl.getByRole('button', { name: 'Remove from Favorites' });
  if (await remove.isVisible().catch(() => false)) {
    await remove.click();
    await page.getByText('Removed from Favorites').waitFor({ timeout: 30_000 });
    await page.getByText('Removed from Favorites').waitFor({ state: 'hidden', timeout: 30_000 });
    await page.mouse.move(400, 500); // off the star so the hover below is a fresh one
  }
  // Collapse the Guide panel first: the tooltip opens below the star (the header is at the top of the page), and
  // with the panel open it would sit over the panel's filter pills, leaving a cut-off pill in the frame.
  const collapse = page.getByRole('button', { name: 'Collapse panel' });
  if (await collapse.isVisible().catch(() => false)) { await collapse.click(); await page.waitForTimeout(800); }
  const star = bandEl.getByRole('button', { name: 'Add to Favorites' });
  await star.waitFor();
  await star.hover();
  // the floating wrapper and the styled box both carry role="tooltip"; the first match is the outer wrapper
  const tooltip = page.getByRole('tooltip').filter({ hasText: 'Add to Favorites' }).first();
  await tooltip.waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  // Crop to the right end of the header band (star, Private, menu) plus the tooltip, with enough of the band
  // to the left that the reader can tell it is the header. The header sits at the top of the page, so the
  // tooltip opens below the star, over the top edge of the canvas; the clip includes it whole.
  const band = await bandEl.boundingBox();
  const tip = await tooltip.boundingBox();
  const pad = frame.padding ?? 12;
  const width = 520;
  const x = Math.max(0, band.x + band.width - width);
  const y = Math.max(0, Math.min(band.y, tip.y) - pad);
  const bottom = Math.max(band.y + band.height, tip.y + tip.height) + pad;
  return { clip: { x, y, width: Math.min(width, page.viewportSize().width - x), height: bottom - y } };
}
