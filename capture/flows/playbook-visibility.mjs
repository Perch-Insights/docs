// The fixture playbook's header with its visibility button: the right-hand button group (Private, Plan, Edit, Run)
// an owner sees on a playbook page (PlaybookPageHeader.tsx, PlaybookVisibilityButton.tsx). The button reads
// "Private" or "Public" depending on the playbook's current state, so the flow asserts it reads "Private" (the
// fixture is private) rather than clicking it: clicking a private playbook's button opens the "Make Playbook public"
// confirmation dialog, which the docs describe in the next step and which would change the fixture if confirmed.
// The mouse is parked away from the button so its tooltip does not open.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page }) {
  const { playbook } = loadFixtures();
  await page.goto(playbook.url, { waitUntil: 'load' });
  const run = page.getByRole('button', { name: 'Run' });
  await run.waitFor({ timeout: 60_000 });
  const visibility = page.locator('[data-cy="playbookVisibilityStatus"]');
  await visibility.waitFor();
  const text = (await visibility.innerText()).trim();
  if (text !== 'Private') throw new Error(`visibility button reads "${text}", expected "Private"`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1000);
  // Crop the header band from a little left of the visibility button to the band's right edge, so the frame holds
  // the full button group and nothing of the page body below it.
  const band = await page.locator('header').first().boundingBox();
  const btn = await visibility.boundingBox();
  const pad = 12;
  const x = Math.max(0, btn.x - 48);
  return { clip: { x, y: Math.max(0, band.y - pad), width: band.x + band.width - x, height: band.height + pad + 2 } };
}
