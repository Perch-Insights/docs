// The fixture insight just after "Unpin insight" was clicked: the frame the pin-insights page shows for "Check the
// insight is unpinned". The flow opens the fixture analysis, finds the pinned insight in the finished Insight report
// card (its pin button is titled "Unpin insight", SectionSubcard.tsx), notes the Pinned pill's count in the panel
// header (AIChat.tsx), clicks the button and waits for the unpinned state: the Pinned badge and the primary left
// border are gone from the insight, its button now reads "Pin insight", the pill's count has gone down by one and
// the card's "N pinned" line (InsightReportCard.tsx) is gone when no pins are left. The crop spans the panel's
// width from the panel header through the card header, the summary and the insight's title and badge row.
// The unpin is persisted, so the flow pins the same insight again in its after hook, and immediately if any wait
// after the click fails, so the fixture keeps its pinned insight for the other pin-insights frames. If it finds no
// pinned insight at all (a previous attempt left the fixture unpinned) it first pins the first insight, as the
// fixtures flow does, and then proceeds.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');
const finishedReport = (page) => panel(page).locator('li')
  .filter({ has: page.getByText('Insight report', { exact: true }) })
  .filter({ has: page.getByTitle('Copy report') })
  .last();
const pillCount = async (pill) => Number((await pill.innerText()).replace(/\D/g, '') || '0');
// poll the pill until its count badge reads n (waitForFunction takes a single argument, so a loop is simpler)
async function waitForPillCount(page, pill, n, timeout = 30_000) {
  const until = Date.now() + timeout;
  while ((await pillCount(pill)) !== n) {
    if (Date.now() > until) throw new Error(`the Pinned pill did not reach ${n} (reads ${await pillCount(pill)})`);
    await page.waitForTimeout(200);
  }
}

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const log = (...a) => { if (frame?.args) console.log('  ', ...a); };
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const aside = panel(page);
  const panelHeader = aside.locator('header').filter({ hasText: 'Guide' }).first();
  await panelHeader.waitFor();
  const pill = panelHeader.getByRole('button', { name: /^Pinned/ });
  await pill.waitFor();

  const card = finishedReport(page);
  await card.waitFor({ timeout: 60_000 });
  const header = card.getByRole('button', { name: /Insight report/ }).first();
  await header.waitFor();
  if ((await header.getAttribute('aria-expanded')) !== 'true') { await header.click(); await page.waitForTimeout(400); }
  // each insight is a SectionSubcard (div.group) with an h4 title, then the badge row, the content and the button row
  const insights = card.locator('div.group').filter({ has: page.locator('h4') });
  await insights.first().waitFor();
  await card.getByTitle(/^(Pin|Unpin) insight$/).first().waitFor({ timeout: 30_000 });
  const n = await insights.count();
  let index = -1;
  for (let i = 0; i < n; i++) if ((await insights.nth(i).getByTitle('Unpin insight').count()) > 0) { index = i; break; }
  if (index < 0) {
    // restore the fixture state first: the fixtures flow pins the first insight
    log('no insight is pinned; pinning the first insight');
    const pin = insights.first().getByTitle('Pin insight');
    await pin.scrollIntoViewIfNeeded();
    await pin.click();
    await insights.first().getByTitle('Unpin insight').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    index = 0;
  }
  const insight = insights.nth(index); // stable across the pin state change
  const title = (await insight.locator('h4').first().innerText()).trim();
  log('pinned insight', index, title);
  const badges = insight.locator('h4').first().locator('xpath=following-sibling::div[1]');
  await badges.getByText('Pinned', { exact: true }).waitFor();
  const before = await pillCount(pill);
  log('Pinned pill count before:', before);
  if (before < 1) throw new Error(`the Pinned pill shows no pinned insights (${before})`);

  const repin = async () => {
    const pin = insight.getByTitle('Pin insight');
    if ((await pin.count()) === 0) { log('insight is already pinned again'); return; }
    await pin.scrollIntoViewIfNeeded();
    await pin.click();
    await insight.getByTitle('Unpin insight').waitFor({ timeout: 30_000 });
    await waitForPillCount(page, pill, before);
    log('re-pinned', title, '; Pinned pill count', await pillCount(pill));
  };

  await insight.getByTitle('Unpin insight').click();
  log('clicked Unpin insight');
  try {
    await insight.getByTitle('Pin insight').waitFor({ timeout: 30_000 });
    log('button now reads Pin insight');
    await badges.getByText('Pinned', { exact: true }).waitFor({ state: 'hidden' });
    log('Pinned badge gone');
    await waitForPillCount(page, pill, before - 1);
    log('Pinned pill count now', await pillCount(pill));
    if (before === 1) await card.getByText(/\d+ pinned/).waitFor({ state: 'hidden' });
    log('N pinned line gone');
    // put the card header at the top of the conversation, right under the panel header
    await header.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(600);

    const asideBox = await aside.boundingBox();
    const top = await header.boundingBox();
    const badgeBox = await badges.boundingBox();
    if (!asideBox || !top || !badgeBox) throw new Error('panel, report card header or insight badges have no bounding box');
    const pad = frame.padding ?? 12;
    const vp = page.viewportSize();
    const y = Math.max(0, asideBox.y);
    const bottom = Math.min(vp.height, badgeBox.y + badgeBox.height + pad);
    if (bottom - y < 200) throw new Error('the unpinned insight frame is unexpectedly short');
    const x = Math.max(0, asideBox.x);
    const clip = { x, y, width: Math.min(vp.width, asideBox.x + asideBox.width) - x, height: bottom - y };
    if (frame?.args) { await repin(); return { aside: asideBox, header: top, badges: badgeBox, clip }; }
    return { clip, after: repin };
  } catch (e) {
    await repin().catch((err) => console.log(`warn: could not re-pin "${title}": ${err.message.split('\n')[0]}`));
    throw e;
  }
}
