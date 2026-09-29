// The finished Insight report card in the Guide panel of the fixture analysis. The frame shows the card
// header (document icon, "Insight report" label, the report's title, the "N pinned" line, the collapse chevron),
// the one-sentence summary, and the first insight card below it, so the reader can recognise the card in a
// conversation. The card is taller than the viewport, so the flow scrolls its header to the top of the panel
// and crops from the header to the bottom of the first insight. Nothing is clicked, so the fixture is unchanged.
import { loadFixtures, openAnalysis, composerArea } from './_fixtures.mjs';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');
// A finished report card holds a "Copy report" button (InsightReportCard.tsx); a card still being written shows
// "Writing…" instead. The fixture has one report, so the last finished card is the one the docs describe.
const finishedReport = (page) => panel(page).locator('li')
  .filter({ has: page.getByText('Insight report', { exact: true }) })
  .filter({ has: page.getByTitle('Copy report') })
  .last();

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const card = finishedReport(page);
  await card.waitFor();
  const header = card.getByRole('button', { name: /Insight report/ }).first();
  await header.waitFor();
  if ((await header.getAttribute('aria-expanded')) !== 'true') { await header.click(); await page.waitForTimeout(400); }
  // each insight is a SectionSubcard: an h4 title inside a bordered block; the first one follows the summary
  const firstBlock = card.locator('h4').first().locator('xpath=ancestor::div[contains(@class,"border")][1]');
  await firstBlock.waitFor();
  // put the card header at the top of the conversation so the header, summary and first insight fit the viewport
  await header.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(600);

  const box = await card.locator('div.rounded-lg').first().boundingBox();
  const top = await header.boundingBox();
  const blockBox = await firstBlock.boundingBox();
  // the conversation ends where the composer begins; the first insight is longer than the viewport, so the
  // frame ends there, the way the card shows on screen before the reader scrolls
  const composerTop = (await composerArea(page).boundingBox()).y;
  if (!box || !top || !blockBox) throw new Error('report card header or first insight has no bounding box');
  const pad = frame.padding ?? 12;
  const y = Math.max(0, top.y - pad);
  const bottom = Math.min(composerTop - pad, blockBox.y + blockBox.height + pad);
  if (bottom - y < 200) throw new Error('the report card frame is unexpectedly short');
  // the message's "Show thinking" button (absolute, right-1) starts 2px right of the card, so the frame ends at
  // the card's right edge instead of padding into it
  const clip = { x: box.x - pad, y, width: box.width + pad + 1, height: bottom - y };
  if (frame?.args) return { card: box, header: top, composerTop, clip };
  return { clip };
}
