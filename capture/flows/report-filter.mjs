// The Guide panel of the fixture analysis filtered to its reports. The frame shows the panel header (Guide,
// the active Reports pill with its count, the Pinned pill), the "Reports in this conversation" heading with its
// "Show full conversation" button, and the one report card, collapsed to its header (Insight report, title,
// "N pinned"), which is how the filtered list renders (FilteredReportList.tsx, initialExpanded false).
// The after hook clicks the pill again so the panel is back to the full conversation; the filter is view state
// only and nothing on the fixture changes either way.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');
// the filter pills are the buttons in the panel header (ChatFilterPill.tsx: label plus a count badge)
const reportsPill = (page) => panel(page).locator('header button').filter({ hasText: 'Reports' }).first();

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const pill = reportsPill(page);
  await pill.waitFor();
  if ((await pill.getAttribute('aria-pressed')) !== 'true') await pill.click();
  const heading = panel(page).getByText('Reports in this conversation', { exact: true });
  await heading.waitFor();
  // the filtered list shows the finished report collapsed; wait for its header and make sure nothing is loading
  const card = panel(page).locator('li').filter({ has: page.getByText('Insight report', { exact: true }) }).last();
  await card.waitFor();
  await page.getByText('Loading reports…').waitFor({ state: 'hidden' }).catch(() => {});
  await page.waitForTimeout(600);

  const panelBox = await panel(page).boundingBox();
  const cardBox = await card.locator('div.rounded-lg').first().boundingBox();
  if (!panelBox || !cardBox) throw new Error('Guide panel or report card has no bounding box');
  const pad = frame.padding ?? 12;
  // from the top of the panel (its header) to the bottom of the collapsed card; the card is the last thing in
  // the filtered list, so the frame holds the whole filtered view and stops before the empty conversation area
  const bottom = cardBox.y + cardBox.height + pad;
  const clip = { x: panelBox.x, y: panelBox.y, width: panelBox.width, height: bottom - panelBox.y };
  const after = async () => {
    const active = reportsPill(page);
    if ((await active.getAttribute('aria-pressed').catch(() => null)) === 'true') await active.click().catch(() => {});
  };
  if (frame?.args) {
    return { panel: panelBox, card: cardBox, pressed: await pill.getAttribute('aria-pressed'), title: await pill.getAttribute('title'), clip, after };
  }
  return { clip, after };
}
