// The header menu of an open analysis with "Clone Analysis" showing (ThreadHeader/ThreadHeaderMenu.tsx, kit Menu).
// The flow opens the fixture analysis, clicks the menu button at the top right of the header (data-cy thread-menu),
// waits for the menu entries "New Analysis", "Clone Analysis" and "Delete Analysis" (the owner's menu), and crops
// the band that holds the menu button and the open menu panel below it.
// "Clone Analysis" is never clicked: the menu is left open and the page is closed by the harness, so nothing is
// created. The "Viewer Mode" box with its "Clone" button (ThreadCanvas/ViewOnlyPopup.tsx) renders only for a member
// who does not own the analysis; the saved session owns every Docs analysis, so that variant of the step is not
// reachable and is not part of this frame.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';
import { unionClip } from './_util.mjs';
export default async function ({ page, BASE, WORKSPACE }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const bandEl = page.locator('header').first().locator('xpath=..');
  const menuButton = bandEl.locator('[data-cy="thread-menu"]').getByRole('button').first();
  await menuButton.waitFor({ timeout: 60_000 });
  await menuButton.click();
  // the kit menu entries render with role="none", not menuitem, so find the entry by its text
  const clone = page.getByText('Clone Analysis', { exact: true }).first();
  await clone.waitFor({ timeout: 10_000 });
  // the menu panel is the portalled rounded-md box that holds the entries
  const panel = clone.locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]');
  await panel.getByText('New Analysis', { exact: true }).waitFor();
  await panel.getByText('Delete Analysis', { exact: true }).waitFor();
  await page.mouse.move(5, 5); // keep the hover highlight off the entries
  await page.waitForTimeout(500); // let the open transition finish
  const { clip } = await unionClip(page, [menuButton, panel], 12);
  // end just under the panel's shadow so the canvas content below the menu does not peek into the frame
  const panelBox = await panel.boundingBox();
  clip.height = panelBox.y + panelBox.height + 1 - clip.y;
  return { clip };
}
