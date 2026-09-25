// The analysis Perch opens after the owner clicks "Edit" on a playbook page (PlaybookPageHeader.tsx, playbook.edit):
// a new analysis titled "<today's date> • Playbook Edit" (createPlaybookEditTitle) whose header line reads
// "Created at <date> in <playbook name> by You" (ThreadHeader.tsx), created without running the playbook.
// The flow clicks Edit in the header of the fixture playbook, waits for the new analysis to open with the
// playbook badge, and crops the left part of the header band. The analysis the click created is deleted again
// (through the header menu's "Delete Analysis"), guarded by its id and title, once the PNG is saved or as soon as
// a later wait fails, so each capture leaves the Docs workspace as it found it. Leftovers can be removed with
// `--flow _probe find "<date> • Playbook Edit"` and `--flow _probe delete <id>`.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page }) {
  const { playbook } = loadFixtures();
  await page.goto(playbook.url, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Run' }).waitFor({ timeout: 60_000 });
  const edit = page.locator('header').first().getByRole('button', { name: 'Edit', exact: true });
  await edit.waitFor();
  await edit.click();
  await page.waitForURL(/\/analyses\/\d+/, { timeout: 60_000 });
  const createdId = Number(page.url().match(/\/analyses\/(\d+)/)[1]);
  const header = page.locator('header').first();

  const deleteCreated = async () => {
    if (!page.url().includes(`/analyses/${createdId}`)) throw new Error(`not on analysis ${createdId}, refusing to delete`);
    const current = (await page.locator('header h2').first().innerText()).trim();
    if (!current.endsWith('• Playbook Edit')) throw new Error(`refusing to delete "${current}"`);
    await page.keyboard.press('Escape').catch(() => {});
    // the header's right-hand group: favorite star, Private/Public, then the icon-only menu button
    await header.locator('xpath=..').getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Delete Analysis' }).or(page.getByText('Delete Analysis')).first().click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/analyses\/?(\?.*)?$/, { timeout: 30_000 });
    console.log(`deleted transient analysis ${createdId} "${current}"`);
  };

  try {
    const title = page.locator('header h2').first();
    await title.waitFor({ timeout: 60_000 });
    const text = (await title.innerText()).trim();
    if (!text.endsWith('• Playbook Edit')) throw new Error(`new analysis is titled "${text}", expected "<date> • Playbook Edit"`);
    // the "in <playbook>" badge under the title resolves from the parent-playbook query, and the date badge
    // briefly reads "Loading..."; wait for both so the line is complete
    await header.getByRole('link', { name: playbook.name }).waitFor({ timeout: 60_000 });
    await header.getByText('Loading...').waitFor({ state: 'hidden', timeout: 60_000 });
    await header.getByText('Created at').first().waitFor({ timeout: 60_000 });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1500);
  } catch (e) {
    await deleteCreated().catch(err => console.log(`warn: could not delete transient analysis ${createdId}: ${err.message.split('\n')[0]}`));
    throw e;
  }
  // Same crop as the rename frame: the header band's left 760px, holding the home button, the title, and the
  // "Created at ... in <playbook> by You" line under it.
  // The band sits at the very top of the analysis page, so the top padding is clamped; the clip's bottom is
  // computed from the band's bottom edge so no canvas content shows under the border.
  const band = await header.locator('xpath=..').boundingBox();
  const pad = 12;
  const y = Math.max(0, band.y - pad);
  const clip = { x: Math.max(0, band.x - pad), y, width: 760, height: band.y + band.height + 2 - y };
  return { clip, after: deleteCreated };
}
