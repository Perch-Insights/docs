// Debugging aid, not a frame: `npm run capture -- --flow _probe-all [analysis-id]`.
// Checks how the All granularity lays out a compare selection. In the Docs fixture analysis it duplicates step 1,
// moves to the copy (step 2), sets the table view, All granularity, and Compare: Last Week vs the prior 4 weeks,
// clicks Update Analysis, and prints the table. Then it deletes the copy, only after the delete dialog names Step 2.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const id = frame.args?.[0] ?? loadFixtures().analysis.id;
  const out = [];
  const text = async (loc) => (await loc.innerText().catch(() => '(not found)')).trim().slice(0, 2500);
  const stepNo = async () => (await page.getByRole('button', { name: 'View All Steps' }).innerText()).trim();
  let duplicated = false;
  try {
    await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${id}`, { waitUntil: 'load' });
    await page.getByRole('button', { name: 'View All Steps' }).waitFor({ timeout: 60000 });
    await page.waitForTimeout(4000);
    out.push('== Step before ==', await stepNo());
    if ((await stepNo()) !== '1') throw new Error('expected to start on step 1');
    // a copy left by an earlier interrupted run is reused, not duplicated again
    const hasNext = await page.getByRole('button', { name: 'Go to next step' }).isEnabled().catch(() => false);
    out.push('== Leftover step 2 ==', String(hasNext));
    if (!hasNext) {
      await page.getByRole('button', { name: 'Duplicate Analysis Step' }).click();
      await page.waitForTimeout(5000);
    }
    duplicated = true;
    if ((await stepNo()) !== '2') {
      await page.getByRole('button', { name: 'Go to next step' }).click();
      await page.waitForTimeout(4000);
    }
    out.push('== Step after duplicate ==', await stepNo());
    if ((await stepNo()) !== '2') throw new Error('not on the copy (step 2)');
    if (frame.args?.[1] === 'cleanup') throw new Error('cleanup only');

    await page.getByRole('radio', { name: 'Table' }).or(page.getByRole('button', { name: 'Table' })).first().click();
    await page.waitForTimeout(3000);
    await page.locator('[data-cy=globalDateRangeSelectorButton]').first().click();
    const pop = page.locator('[data-cy=globalDateRangeSelectorPopupContent]');
    await pop.waitFor({ timeout: 15000 });
    await pop.getByRole('button', { name: 'Compare', exact: true }).or(pop.getByRole('radio', { name: 'Compare', exact: true })).first().click();
    await page.waitForTimeout(800);
    await pop.getByRole('button', { name: 'Week', exact: true }).click();
    await page.waitForTimeout(800);
    await pop.getByText('Last Week', { exact: true }).click();
    await page.waitForTimeout(800);
    await pop.getByRole('checkbox').first().check({ force: true });
    await page.waitForTimeout(500);
    const sel = pop.locator('select').first();
    if (await sel.count()) await sel.selectOption('4');
    else {
      await pop.getByText('1', { exact: true }).first().click();
      await page.getByRole('option', { name: '4', exact: true }).click();
    }
    await page.waitForTimeout(800);
    out.push('== Compare popover ==', await text(pop));
    await page.mouse.click(5, 300);
    await page.waitForTimeout(1500);
    out.push('== Granularity after compare ==', await text(page.locator('[data-cy=granularityFilter]').first()));
    await page.locator('[data-cy=granularityFilter]').first().click();
    await page.waitForTimeout(800);
    await page.getByText('All', { exact: true }).last().click();
    await page.waitForTimeout(800);
    await page.mouse.click(5, 300);
    await page.waitForTimeout(800);
    out.push('== Granularity / date buttons ==', await text(page.locator('[data-cy=granularityFilter]').first()), await text(page.locator('[data-cy=globalDateRangeSelectorButton]').first()));
    await page.getByText('Update Analysis', { exact: true }).click();
    await page.waitForTimeout(15000);
    const table = page.locator('table').first();
    out.push('== Table ==', await text(table));
    await page.screenshot({ path: 'capture/_probe-all.png' });
  } catch (e) {
    out.push('!! ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'capture/_probe-all-fail.png' });
  }

  // Clean up: delete the copy, only if this run made it and the dialog names Step 2.
  if (duplicated) {
    try {
      const discard = page.getByRole('button', { name: 'Cancel', exact: true });
      if (await discard.count()) {
        await discard.first().click();
        await page.getByRole('button', { name: 'Discard all Changes' }).click();
        await page.waitForTimeout(1000);
      }
      if ((await stepNo()) !== '2') throw new Error('not on step 2, not deleting');
      await page.getByTitle('More Options').click();
      await page.waitForTimeout(800);
      out.push('== More Options ==', await text(page.getByRole('menu').last()));
      await page.getByRole('menu').last().getByText(/^Delete/).first().click();
      const title = page.getByText(/Are you sure you want to delete/);
      await title.waitFor({ timeout: 10000 });
      out.push('== Delete dialog ==', await text(title));
      if (!/delete Step 2\?/.test(await text(title))) throw new Error('dialog does not name Step 2, not deleting');
      await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
      await page.waitForTimeout(3000);
      out.push('== Step after delete ==', await stepNo());
    } catch (e) {
      out.push('!! cleanup: ' + e.message.split('\n')[0]);
    }
  }
  return out.join('\n');
}
