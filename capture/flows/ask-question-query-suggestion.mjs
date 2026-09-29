// A pending Query Suggestion card in the Guide panel. The frame shows the card header ("Query Suggestion", the
// Guide's title for the query, "Pending" badge), the description, the Metrics / Grain / Dates pills, and the three
// choices: "Update step N" (green), "Add as New Step" and "Reject". The buttons only render while the suggestion
// is pending (QueryProposalCard.tsx), so the flow never accepts or rejects it.
//
// The card lives in its own throwaway analysis, "Docs: Query Suggestion", found by name or created on first run.
// The Guide's opening "Choose a direction" card is cancelled and one concrete question is sent; the Guide answers
// with a Query Suggestion about a minute later and then waits for a decision, so the same card is there for the
// next capture. If the card is ever accepted or rejected, delete the analysis with
// `npm run capture -- --flow _probe delete <id>` and the flow recreates it.
import {
  findAnalysis, createAnalysis, openAnalysis, settle, send, freeComposer,
} from './_fixtures.mjs';

export const NAME = 'Docs: Query Suggestion';
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

const QUESTION = 'How did total inbound calls trend by month over the most recent three complete months of data?';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');
// The card root is the rounded white box holding the "Query Suggestion" header; the choice buttons exist only
// while it is pending, so a card that has them is the pending one.
const pendingCard = (page) => panel(page).locator('div.rounded-lg')
  .filter({ has: page.getByText('Query Suggestion', { exact: true }) })
  .filter({ has: page.getByRole('button', { name: 'Add as New Step' }) })
  .last();

async function suggestionPending(page) {
  return (await pendingCard(page).count()) > 0;
}

async function driveToSuggestion(page) {
  for (let turn = 0; turn < 3; turn++) {
    await settle(page);
    if (await suggestionPending(page)) { log('a Query Suggestion is pending'); return; }
    await freeComposer(page); // cancels the "Choose a direction" card; the Guide may answer the cancellation
    if (await suggestionPending(page)) { log('a Query Suggestion is pending'); return; }
    await send(page, QUESTION);
    // the Guide plans first, then sends the suggestion; poll rather than wait for its whole turn
    const deadline = Date.now() + 8 * 60_000;
    while (Date.now() < deadline && !(await suggestionPending(page))) await page.waitForTimeout(3000);
  }
  await settle(page);
  if (!(await suggestionPending(page))) throw new Error('the Guide did not send a Query Suggestion');
}

export default async function ({ page, BASE, WORKSPACE, frame }) {
  page.setDefaultTimeout(30_000);
  let analysis = await findAnalysis(page, BASE, WORKSPACE, NAME);
  if (analysis) { log('found', analysis.url); await openAnalysis(page, BASE, WORKSPACE, analysis.id); }
  else { analysis = await createAnalysis(page, BASE, WORKSPACE, NAME); log('created', analysis.url); }
  await driveToSuggestion(page);
  await settle(page); // the choice buttons are disabled while the Guide is still working

  const card = pendingCard(page);
  const header = card.getByRole('button', { expanded: false }).first();
  if (await header.isVisible().catch(() => false)) { await header.click(); await page.waitForTimeout(400); }
  const add = card.getByRole('button', { name: 'Add as New Step' });
  const update = card.getByRole('button', { name: /^Update step \d+$/ });
  const reject = card.getByRole('button', { name: 'Reject' });
  await add.waitFor();
  await update.waitFor();
  await reject.waitFor();
  if (await add.isDisabled()) throw new Error('the Query Suggestion buttons are disabled');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
  log('card:', text.slice(0, 600));
  if (frame?.args) return { url: analysis.url, update: (await update.innerText()).trim(), text };

  const aside = await panel(page).boundingBox();
  const box = await card.boundingBox();
  const pad = frame.padding ?? 12;
  const y = Math.max(aside.y, box.y - pad);
  const bottom = Math.min(aside.y + aside.height, box.y + box.height + pad);
  return { clip: { x: aside.x, y, width: aside.width, height: bottom - y } };
}
