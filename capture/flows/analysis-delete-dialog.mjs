// The "Delete Analysis" confirmation dialog, opened from the menu at the top right of an open analysis header.
// The flow opens the fixture analysis, opens the header menu (data-cy thread-menu), chooses "Delete Analysis",
// and crops to the dialog panel (title, "This analysis will be permanently deleted", Delete, Cancel).
// Delete is never clicked: the dialog is left open and the page is closed by the harness, so the fixture survives.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const bandEl = page.locator('header').first().locator('xpath=..');
  await bandEl.locator('[data-cy="thread-menu"]').getByRole('button').first().click();
  // the kit menu entries render with role="none", not menuitem, so find the entry by its text
  const item = page.getByText('Delete Analysis', { exact: true }).first();
  await item.waitFor({ timeout: 10_000 });
  await item.click();
  const description = page.getByText('This analysis will be permanently deleted', { exact: true });
  await description.waitFor({ timeout: 10_000 });
  // the panel is the white rounded box holding the description (the role="dialog" element is the full-screen root)
  const panel = description.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await panel.getByRole('button', { name: 'Delete', exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Cancel', exact: true }).waitFor();
  await page.waitForTimeout(500); // let the open transition finish
  return panel;
}
