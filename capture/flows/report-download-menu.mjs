// The download menu of the finished Insight report card in the fixture analysis. The frame shows the card's
// bottom button row (Copy report, feedback thumbs, Download report) with the download menu open and its four
// format entries (Markdown, PDF Document, Plain Text, Word Document), so the reader can pick a format. The menu
// is only opened, never chosen from, so nothing is downloaded and the fixture is unchanged.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

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
  const download = card.getByTitle('Download report');
  await download.waitFor();
  // the button row is the flex row holding Copy report and Download report at the bottom of the card
  const row = download.locator('xpath=ancestor::div[contains(@class,"justify-end")][1]');
  // the menu anchors below the button, so put the row in the upper half of the panel to leave it room
  await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(600);
  await download.click();
  // the menu is portaled (kit Menu); its entries are the presentation formats from the Guide
  const menu = page.locator('[role="menu"]').filter({ hasText: 'Word Document' });
  await menu.waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);

  const cardBox = await card.locator('div.rounded-lg').first().boundingBox();
  const rowBox = await row.boundingBox();
  const menuBox = await menu.boundingBox();
  if (!cardBox || !rowBox || !menuBox) throw new Error('report card, button row or download menu has no bounding box');
  const pad = frame.padding ?? 12;
  // the frame spans the button row and the open menu; horizontally it runs from the leftmost of the menu and
  // the row's buttons to the menu's right edge exactly, because the menu reaches past the card and the next
  // message's "Show thinking" sparkle starts right after it
  const left = Math.min(menuBox.x, rowBox.x + rowBox.width - 200) - pad;
  const right = Math.max(cardBox.x + cardBox.width + 1, menuBox.x + menuBox.width + 1);
  const top = Math.min(rowBox.y, menuBox.y) - pad;
  const bottom = Math.max(rowBox.y + rowBox.height, menuBox.y + menuBox.height) + pad;
  const clip = { x: Math.max(0, left), y: Math.max(0, top), width: right - Math.max(0, left), height: bottom - Math.max(0, top) };
  const after = async () => { await page.keyboard.press('Escape').catch(() => {}); };
  if (frame?.args) {
    const items = await menu.locator('button, a').allInnerTexts();
    return { card: cardBox, row: rowBox, menu: menuBox, items, clip, after };
  }
  return { clip, after };
}
