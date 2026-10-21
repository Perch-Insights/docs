// Debugging aid, not a frame: `npm run capture -- --flow _probe-table [analysis-id] [cleanup]`.
// Checks what compare-and-download documents. In the Docs fixture analysis it duplicates step 1, moves to the copy
// (step 2), adds the first dimension, clicks Update Analysis, and switches to the table. It prints the Download menu,
// a period column's menu, the Table Settings dialog with the first metric expanded, the conditional formatting form,
// and the Summary Statistics header. It toggles nothing and applies nothing. Then it deletes the copy, only after the
// delete dialog names Step 2. Pass 'cleanup' as the second argument to only delete a leftover copy.
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
    if ((await stepNo()) !== '1') throw new Error('expected to start on step 1');
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
    if ((await stepNo()) !== '2') throw new Error('not on the copy (step 2)');
    if (frame.args?.[1] === 'cleanup') throw new Error('cleanup only');

    await page.getByRole('radio', { name: 'Table' }).or(page.getByRole('button', { name: 'Table' })).first().click();
    await page.waitForTimeout(3000);
    // Download menu with no dimension
    await page.getByRole('button', { name: 'Download' }).first().click();
    await page.waitForTimeout(800);
    out.push('== Download menu ==', await text(page.getByRole('menu').last()));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Add the first dimension
    await page.locator('[data-cy=dimensionsFilter]').click();
    const dimsMenu = page.locator('[data-cy=dimensionsFilterMenu]');
    await dimsMenu.waitFor({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await dimsMenu.locator('.min-h-\\[72px\\]').first().click();
    await page.waitForTimeout(800);
    out.push('== Dimensions after pick ==', await text(dimsMenu));
    await page.mouse.click(5, 300);
    await page.waitForTimeout(1000);
    await page.getByText('Update Analysis', { exact: true }).click();
    await page.waitForTimeout(15000);

    // Column menu on the first period column
    const kebab = page.locator('[data-testid^=kebabIcon-]');
    out.push('== Column menus ==', String(await kebab.count()));
    await kebab.first().click({ force: true });
    await page.waitForTimeout(1000);
    out.push('== Column menu ==', await text(page.getByText('Adjust Decimals').locator('xpath=../../..')));
    await page.screenshot({ path: 'capture/_probe-table-column.png' });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 300);
    await page.waitForTimeout(800);

    // Table Settings dialog
    await page.getByRole('button', { name: 'Configure table settings' }).first().click();
    // the dialog is not role=dialog; take the innermost div holding its title and both panels
    await page.getByText('Table Settings', { exact: true }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(3000);
    const dialog = page.locator('div')
      .filter({ has: page.getByText('Table Settings', { exact: true }) })
      .filter({ has: page.getByRole('button', { name: 'Format measure' }) })
      .last();
    out.push('== Table Settings ==', await text(dialog));
    await dialog.getByText('Total Inbound Calls (IJ)', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    out.push('== Table Settings, metric expanded ==', await text(dialog));
    await page.screenshot({ path: 'capture/_probe-table-settings.png' });
    await dialog.getByRole('button', { name: 'Format measure' }).first().click();
    await page.waitForTimeout(1000);
    out.push('== Conditional formatting ==', await text(dialog));
    await page.screenshot({ path: 'capture/_probe-table-format.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Summary Statistics header and Download menu with a dimension
    out.push('== Summary header ==', await text(page.getByText('Summary Statistics', { exact: true }).locator('xpath=../..')));
    await page.getByRole('button', { name: 'Download' }).first().click();
    await page.waitForTimeout(800);
    out.push('== Download menu with dimension ==', await text(page.getByRole('menu').last()));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'capture/_probe-table.png' });
  } catch (e) {
    out.push('!! ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'capture/_probe-table-fail.png' });
  }

  // Clean up: delete the copy, only if this run made it and the dialog names Step 2.
  if (duplicated) {
    try {
      await page.keyboard.press('Escape');
      const discard = page.getByRole('button', { name: 'Cancel', exact: true });
      if (await discard.count()) {
        await discard.first().click();
        await page.getByRole('button', { name: 'Discard all Changes' }).click();
        await page.waitForTimeout(1000);
      }
      if ((await stepNo()) !== '2') throw new Error('not on step 2, not deleting');
      await page.getByTitle('More Options').click();
      await page.waitForTimeout(800);
      await page.getByRole('menu').last().getByText(/^Delete/).first().click();
      const title = page.getByText(/Are you sure you want to delete/);
      await title.waitFor({ timeout: 10000 });
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
