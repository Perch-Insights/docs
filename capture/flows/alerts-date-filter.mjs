// READ-ONLY flow (Pnc Ins, READONLY_WORKSPACE): no click on any create, save, delete, favorite, run, or toggle
// control. The only click opens the Alerts screen's Date filter menu (DateFilterButton.tsx: Today, Yesterday,
// Last week, Last month); no menu item is picked, so the filter stays unset. Never click Manage.
// The frame is the Filters row with the open menu under it, so the empty notification list stays out of it.
import { unionClip } from './_util.mjs';
export default async function ({ page, BASE, READONLY_WORKSPACE }) {
  await page.goto(`${BASE}/w/${READONLY_WORKSPACE}/alerts`, { waitUntil: 'load' });
  await page.getByText(/Showing \d+ of \d+ alert notifications/).waitFor({ timeout: 60_000 });
  const button = page.locator('[data-cy="dateFilterButton"]').first();
  await button.waitFor();
  const filters = page.getByText('Filters:', { exact: true }).first();
  await filters.waitFor();
  await button.click();
  const menu = page.locator('[data-cy="dateFilterMenu"]').first();
  await menu.waitFor();
  await menu.getByText('Last month', { exact: true }).waitFor();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  // the Search... box closes the Filters row on the right; include it so the row is not cut mid-field
  const search = page.getByPlaceholder('Search').first();
  return unionClip(page, [filters, button, menu, search], 16);
}
