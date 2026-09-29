// The fixture playbook's page from the Description down through the "Latest run report" card
// (PlaybookDetailsPage.tsx, PlaybookLastRunReportCard.tsx): the Description block, the Schedule & delivery card and
// the Latest run report card whose header reads "Latest run report • <run analysis title>" with an "Open run" button
// at its right, followed by the top of the report box. Nothing is clicked, so the fixture is unchanged. The frame
// shows the card sitting below the Description, which is what the "Open the playbook page" step describes.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page }) {
  const { playbook } = loadFixtures();
  await page.goto(playbook.url, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Run' }).waitFor({ timeout: 60_000 });
  const description = page.getByText('Description', { exact: true });
  await description.waitFor();
  // The card header is the clickable, aria-expanded row that starts with "Latest run report".
  const cardHeader = page.locator('[aria-expanded]', { hasText: 'Latest run report' }).first();
  await cardHeader.waitFor();
  const headerText = (await cardHeader.innerText()).trim();
  if (!/Latest run report\s*•\s*.+Run \d+/i.test(headerText)) {
    throw new Error(`latest run report header reads "${headerText}", expected "Latest run report • <run title>"`);
  }
  await cardHeader.getByText('Open run', { exact: true }).waitFor();
  // The report box must hold a rendered report, not the "No report yet" placeholder.
  const card = cardHeader.locator('..');
  if ((await card.innerText()).includes('No report yet')) throw new Error('latest run report card reads "No report yet"');
  const pad = 16;
  // Put the Description near the top of the viewport (with a little headroom) so the card and the top of its
  // report fit in one frame. The page scrolls inside the layout, so back the nearest scrollable ancestor up by pad.
  await description.evaluate((el, pad) => {
    el.scrollIntoView({ block: 'start' });
    let node = el.parentElement;
    while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
    (node ?? document.scrollingElement).scrollTop -= pad;
  }, pad);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  const vp = page.viewportSize();
  const desc = await description.boundingBox();
  const head = await cardHeader.boundingBox();
  const cardBox = await card.boundingBox();
  // End the frame just after the report's first paragraph (title, first heading and its opening text), so the
  // reader sees the report has content without a line cut mid-glyph; fall back to a fixed depth below the header.
  const firstParagraph = await card.locator('p').first().boundingBox();
  const reportCut = firstParagraph ? firstParagraph.y + firstParagraph.height + pad : head.y + head.height + 260;
  const y0 = Math.max(0, desc.y - pad);
  const y1 = Math.min(vp.height, reportCut, cardBox.y + cardBox.height + pad);
  return { clip: { x: Math.max(0, cardBox.x), y: y0, width: cardBox.width, height: y1 - y0 } };
}
