// Debugging aid, not a frame: `npm run capture -- --flow _probe-steps [analysis-id]`.
// Opens an analysis in Docs (default: the fixture analysis), opens the steps panel, then each menu that
// manage-steps documents, and prints the visible text. Opens menus only; never clicks a menu item.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const id = frame.args?.[0] ?? loadFixtures().analysis.id;
  const out = [];
  const menuText = async () => (await page.getByRole('menu').last().innerText().catch(() => '(no menu)')).trim();
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${id}`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'View All Steps' }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(3000);
  // title row: More Options menu
  await page.getByTitle('More Options').click();
  await page.waitForTimeout(800);
  out.push('== More Options ==', await menuText());
  await page.keyboard.press('Escape');
  // steps panel
  await page.getByRole('button', { name: 'View All Steps' }).click();
  const heading = page.getByRole('heading', { name: 'Analysis Steps' });
  await heading.waitFor({ timeout: 15000 });
  const panel = heading.locator('xpath=../../..');
  out.push('== Panel ==', (await panel.innerText()).trim());
  await page.screenshot({ path: 'capture/_probe-steps.png' });
  // first step row's three-dot menu (hidden until hover)
  const row = panel.locator('[aria-selected]').first();
  await row.hover();
  await row.getByRole('button').last().click();
  await page.waitForTimeout(800);
  out.push('== Row menu ==', await menuText());
  await page.keyboard.press('Escape');
  // + New Step menu
  await page.getByRole('button', { name: '+ New Step' }).click();
  await page.waitForTimeout(800);
  out.push('== New Step ==', await menuText());
  await page.keyboard.press('Escape');
  return out.join('\n');
}
