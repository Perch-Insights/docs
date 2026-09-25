// The fixture playbook's page with its name in edit mode: the header band after the owner clicks the name, which
// turns into a text field holding the current name (EditableTitle in PlaybookPageHeader.tsx, accessible name
// "Edit title"). Nothing is typed and nothing is submitted (the page is closed without pressing Enter), so the
// fixture keeps its name. The edit state has no on-screen text of its own, so the flow asserts the field holds the
// fixture's name instead of a frames.json label.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page }) {
  const { playbook } = loadFixtures();
  await page.goto(playbook.url, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Run' }).waitFor({ timeout: 60_000 });
  const title = page.getByRole('button', { name: 'Edit title' });
  await title.waitFor();
  await page.waitForTimeout(1000);
  await title.click();
  const input = page.locator('header input');
  await input.waitFor();
  const value = await input.inputValue();
  if (value !== playbook.name) throw new Error(`name field holds "${value}", expected "${playbook.name}"`);
  await page.waitForTimeout(500);
  // The header band is a thin full-width strip; crop to its left part so the field and its underline stay legible:
  // the home button, the name field, and the "Created at ... by You" line under it.
  const band = await page.locator('header').first().boundingBox();
  const pad = 12;
  // no padding below the band: it would show a truncated sliver of the page body
  return { clip: { x: Math.max(0, band.x - pad), y: Math.max(0, band.y - pad), width: 760, height: band.height + pad + 2 } };
}
