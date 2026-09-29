// The "Make Analysis public" confirmation dialog, opened by clicking the Private button in the header of an analysis
// you own (ThreadHeader/PrivateButton.tsx, VisibilityToggleButton.tsx, kit ConfirmationDialog). The flow opens the
// private fixture analysis, asserts the visibility button (data-cy analysisStatus) reads "Private", clicks it, and
// crops to the dialog panel: the info icon, the title "Make Analysis public", the description "All users with access
// to this workspace will be able to view this analysis", and the Confirm and Cancel buttons.
// Confirm is never clicked: the dialog is left open and the page is closed by the harness, so the fixture stays
// private. If the button reads "Public" (a previous run changed the fixture) the flow throws instead of clicking,
// because clicking a public analysis's button toggles it back to private immediately with no dialog.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const visibility = page.locator('[data-cy="analysisStatus"]');
  await visibility.waitFor({ timeout: 60_000 });
  const text = (await visibility.innerText()).trim();
  if (text !== 'Private') throw new Error(`visibility button reads "${text}", expected "Private"`);
  await visibility.click();
  const description = page.getByText('All users with access to this workspace will be able to view this analysis', { exact: true });
  await description.waitFor({ timeout: 10_000 });
  // the panel is the white rounded box holding the description (the role="dialog" element is the full-screen root)
  const panel = description.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await panel.getByText('Make Analysis public', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Confirm', exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Cancel', exact: true }).waitFor();
  await page.mouse.move(5, 5); // keep the hover state off the buttons
  await page.waitForTimeout(500); // let the open transition finish
  return panel;
}
