// The Docs workspace's analyses list header: title, subtitle, filters row, and the New Analysis button.
// Cropped to the band from the page title down to the filters row; { "full": true } in frames.json shoots the page.
import { unionClip } from './_util.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'networkidle' });
  const button = page.getByRole('button', { name: 'New Analysis' });
  await button.waitFor();
  await page.waitForTimeout(500);
  if (frame.full) return null;
  const title = page.getByRole('heading', { name: 'Analyses' }).first();
  const filters = page.getByText('Filters:').locator('xpath=..');
  return unionClip(page, [title, button, filters], frame.padding ?? 16);
}
