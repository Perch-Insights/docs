// An open analysis with its title in edit mode: the header band after the owner clicks the title, which turns
// into a text field holding the current name. Nothing is typed and nothing is submitted (the page is closed
// without pressing Enter), so the fixture keeps its name. The edit state has no on-screen text of its own,
// so the flow asserts the field holds the fixture's name instead of a frames.json label.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';
export default async function ({ page, BASE, WORKSPACE }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const title = page.locator('header h2[role="button"]').first();
  await title.waitFor();
  await title.click();
  const input = page.locator('header input');
  await input.waitFor();
  const value = await input.inputValue();
  if (value !== analysis.name) throw new Error(`title field holds "${value}", expected "${analysis.name}"`);
  await page.waitForTimeout(500);
  // The header band is a thin 1376px strip; crop to its left part so the field and its underline stay legible:
  // the home button, the title field, and the "Created at ... in <playbook> by You" line under it.
  const band = await page.locator('header').first().locator('xpath=..').boundingBox();
  const pad = 12;
  // no padding below the band: it would show a truncated sliver of the canvas and the Guide panel
  return { clip: { x: Math.max(0, band.x - pad), y: Math.max(0, band.y - pad), width: 760, height: band.height + pad + 2 } };
}
