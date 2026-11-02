// The analyses list's favorite filter (the star button in the Filters row) opened, showing All / Favorites / No Favorites.
// Cropped to the Filters row plus the open menu, from the "Filters:" label to the right edge of the search field.
// Nothing is selected, so the list's filter state is left as it was.
import { unionClip } from './_util.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'New Analysis' }).waitFor();
  const filters = page.getByText('Filters:').locator('xpath=..');
  const star = page.locator('[data-cy="favoriteFilterButton"]').first();
  await star.waitFor();
  await star.click();
  const menu = page.locator('[data-cy="favoriteFilterMenu"]');
  await menu.waitFor();
  await menu.getByText('No Favorites').waitFor();
  await page.waitForTimeout(500);
  // The Filters row element spans the full page width (pagination sits at its right end), so the horizontal
  // extent comes from the label and the search field only; the vertical extent from the row and the open menu.
  const label = page.getByText('Filters:');
  const search = page.getByPlaceholder('Search').first();
  const width = await unionClip(page, [label, search], frame.padding ?? 12);
  const tall = await unionClip(page, [filters, menu], frame.padding ?? 12);
  return { clip: { x: width.clip.x, y: tall.clip.y, width: width.clip.width, height: tall.clip.height } };
}
