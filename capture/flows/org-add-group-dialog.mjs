// READ-ONLY flow (organization settings): its only click is the "Add Group" button (data-cy addGroupButton), which
// opens the "New Group" dialog (GroupCreateOrUpdateForm.tsx). No create, save, delete, favorite, run, or toggle control
// is clicked: nothing is typed, Create is never clicked, and the harness closes the page with the dialog still open.
// The crop is the dialog panel only, so the groups table behind it stays out of frame.
export default async function ({ page, BASE }) {
  await page.goto(`${BASE}/organization/groups`, { waitUntil: 'load' });
  const button = page.locator('[data-cy="addGroupButton"]');
  await button.waitFor({ timeout: 60_000 });
  await button.click();
  const heading = page.getByRole('heading', { name: 'New Group', exact: true });
  await heading.waitFor({ timeout: 10_000 });
  // the panel is the white rounded box holding the form (the role="dialog" element is the full-screen root)
  const panel = heading.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await panel.getByRole('button', { name: 'Create', exact: true }).waitFor();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500); // let the open transition finish
  // clip flush to the panel: padding would show slivers of the table behind the dialog
  const box = await panel.boundingBox();
  return { clip: { x: box.x, y: box.y, width: box.width, height: box.height } };
}
