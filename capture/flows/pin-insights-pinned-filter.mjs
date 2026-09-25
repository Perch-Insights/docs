// The Guide panel of the fixture analysis filtered to pinned insights: the frame the pin-insights page shows for
// "Click Pinned". The flow clicks the Pinned pill in the panel header (ChatFilterPill.tsx, aria-pressed flips to
// true and the pill turns solid), waits for the "Pinned insights" heading and its "Show full conversation" button
// (AIChat.tsx), and for the first report card, which FilteredReportList.tsx opens expanded with only its pinned
// insights. The crop spans the panel's width from the panel header through the heading row, the card header,
// the summary and the first pinned insight's title and badge row. Nothing else is clicked; the filter is a local
// view state, so the fixture is unchanged.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const aside = panel(page);
  const panelHeader = aside.locator('header').filter({ hasText: 'Guide' }).first();
  await panelHeader.waitFor();
  const pill = panelHeader.getByRole('button', { name: /^Pinned/ });
  await pill.waitFor();
  // wait for history replay so the pinned count is real before filtering
  await aside.locator('li').filter({ has: page.getByText('Insight report', { exact: true }) }).first().waitFor({ timeout: 60_000 });
  const count = (await pill.innerText()).replace(/\D/g, '');
  if (!count || Number(count) < 1) throw new Error(`the Pinned pill shows no pinned insights (${count})`);

  await pill.click();
  await page.waitForFunction((el) => el.getAttribute('aria-pressed') === 'true', await pill.elementHandle());
  const heading = aside.getByText('Pinned insights', { exact: true });
  await heading.waitFor();
  await aside.getByRole('button', { name: 'Show full conversation' }).waitFor();
  const card = aside.locator('li').filter({ has: page.getByText('Insight report', { exact: true }) }).first();
  await card.waitFor();
  const cardHeader = card.getByRole('button', { name: /Insight report/ }).first();
  await cardHeader.waitFor();
  if ((await cardHeader.getAttribute('aria-expanded')) !== 'true') throw new Error('the first pinned report is not expanded');
  const firstTitle = card.locator('h4').first();
  await firstTitle.waitFor();
  const badges = firstTitle.locator('xpath=following-sibling::div[1]');
  await badges.waitFor();
  await badges.getByText('Pinned', { exact: true }).waitFor();
  // park the mouse so the pill's native tooltip does not open
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);

  const asideBox = await aside.boundingBox();
  const headingBox = await heading.boundingBox();
  const badgeBox = await badges.boundingBox();
  if (!asideBox || !headingBox || !badgeBox) throw new Error('panel, heading or first insight badges have no bounding box');
  const pad = frame.padding ?? 12;
  const vp = page.viewportSize();
  const y = Math.max(0, asideBox.y);
  const bottom = Math.min(vp.height, badgeBox.y + badgeBox.height + pad);
  if (bottom - y < 200) throw new Error('the pinned filter frame is unexpectedly short');
  const x = Math.max(0, asideBox.x);
  const clip = { x, y, width: Math.min(vp.width, asideBox.x + asideBox.width) - x, height: bottom - y };
  if (frame?.args) return { aside: asideBox, heading: headingBox, badges: badgeBox, clip };
  return { clip };
}
