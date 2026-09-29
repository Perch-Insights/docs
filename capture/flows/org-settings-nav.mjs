// READ-ONLY flow (organization settings): no click at all, and so no click on any create, save, delete,
// favorite, run, or toggle control. It opens the Users page of the organization settings by URL and frames only
// the settings navigation (OrganizationSettingsSidebar.tsx: "Organization", then Users, Groups and, for a member
// who manages workspaces, Workspaces). The users table to the right lists real members and is outside the crop.
import { unionClip } from './_util.mjs';
export default async function ({ page, BASE }) {
  await page.goto(`${BASE}/organization/users`, { waitUntil: 'load' });
  const panel = page.locator('[data-cy="settingsNavigationPanel"]');
  await panel.waitFor({ timeout: 60_000 });
  const title = panel.getByText('Organization', { exact: true }).first();
  await title.waitFor();
  const items = panel.getByRole('link');
  await items.first().waitFor();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(800);
  // clip from the title to the last nav item, across the panel's own width, so nothing right of it shows
  const box = await panel.boundingBox();
  const { clip } = await unionClip(page, [title, items.last()], 16);
  const x0 = Math.max(0, box.x);
  return { clip: { x: x0, y: clip.y, width: box.x + box.width - x0, height: clip.height } };
}
