// A finished Insight report card, expanded, in the Guide panel of the fixture analysis: the frame the pin-insights
// page shows for "Open a finished report". It spans the panel's width from the panel header ("Guide", the Reports
// and Pinned pills, AIChat.tsx) through the expanded card header ("Insight report", the report title, the
// "N pinned" line, InsightReportCard.tsx), the one-sentence summary and the first insight's title and badge row
// (SectionSubcard.tsx), so the reader can recognise a finished card: the header carries no "Writing…" spinner,
// which only shows while the report is still being written, and the insights below it carry the pin button.
// The fixture analysis has one finished report with one pinned insight; nothing is clicked, so it is unchanged.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');
// A finished card holds a "Copy report" button; a card still being written shows "Writing…" in its header instead.
const finishedReport = (page) => panel(page).locator('li')
  .filter({ has: page.getByText('Insight report', { exact: true }) })
  .filter({ has: page.getByTitle('Copy report') })
  .last();

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const aside = panel(page);
  const panelHeader = aside.locator('header').filter({ hasText: 'Guide' }).first();
  await panelHeader.waitFor();
  await panelHeader.getByText('Reports', { exact: true }).waitFor();
  await panelHeader.getByText('Pinned', { exact: true }).waitFor();

  const card = finishedReport(page);
  await card.waitFor({ timeout: 60_000 });
  const header = card.getByRole('button', { name: /Insight report/ }).first();
  await header.waitFor();
  if ((await header.innerText()).includes('Writing')) throw new Error('the report card still reads "Writing…"');
  if ((await header.getAttribute('aria-expanded')) !== 'true') { await header.click(); await page.waitForTimeout(400); }
  // the first insight is a SectionSubcard: an h4 title, then the type badge row (with the Pinned badge when pinned)
  const firstTitle = card.locator('h4').first();
  await firstTitle.waitFor();
  const badges = firstTitle.locator('xpath=following-sibling::div[1]');
  await badges.waitFor();
  // the pin button exists on a finished report the member owns (title "Pin insight" / "Unpin insight")
  await card.getByTitle(/^(Pin|Unpin) insight$/).first().waitFor();
  // put the card header at the top of the conversation, right under the panel header
  await header.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);

  const asideBox = await aside.boundingBox();
  const top = await header.boundingBox();
  const badgeBox = await badges.boundingBox();
  if (!asideBox || !top || !badgeBox) throw new Error('panel, report card header or first insight badges have no bounding box');
  const pad = frame.padding ?? 12;
  const vp = page.viewportSize();
  const y = Math.max(0, asideBox.y);
  const bottom = Math.min(vp.height, badgeBox.y + badgeBox.height + pad);
  if (bottom - y < 200) throw new Error('the finished report frame is unexpectedly short');
  const x = Math.max(0, asideBox.x);
  const clip = { x, y, width: Math.min(vp.width, asideBox.x + asideBox.width) - x, height: bottom - y };
  if (frame?.args) return { aside: asideBox, header: top, badges: badgeBox, clip };
  return { clip };
}
