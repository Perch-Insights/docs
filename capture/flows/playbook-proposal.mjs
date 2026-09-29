// A pending Playbook proposal card in the Guide panel: the answer to "Save this as a playbook". The frame shows
// the card header ("Playbook proposal", the proposed name, the "Pending" badge, PlaybookProposalCard.tsx), the
// description of what the playbook will do, and the reply hint ("save this playbook" / "discard this"). The hint
// renders only while the proposal is pending and the member owns the analysis, so the flow never replies to it.
//
// The card lives in its own throwaway analysis, "Docs: Playbook Proposal", found by name or created on first run.
// The Guide is asked the day-of-week question, driven to a result, then asked to save the analysis as a playbook.
// When the workspace already holds a similar playbook the Guide proposes an update to it instead (the name in
// the header links to that playbook and the hint reads "update <name>" / "save as a new playbook"); the step
// documents a proposal for a new playbook, so the flow then asks once for a standalone proposal and waits for a
// pending card without a playbook link. If the card is ever accepted or rejected, delete the analysis with
// `npm run capture -- --flow _probe delete <id>` and the flow recreates it (several minutes: the Guide runs an
// analysis pass and writes a report before it proposes).
import {
  findAnalysis, createAnalysis, openAnalysis, settle, stopButton, freeComposer, questionIsOpen,
} from './_fixtures.mjs';

export const NAME = 'Docs: Playbook Proposal';
const MIN = 60_000;
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

const QUESTION = 'Which day of the week has the most inbound calls, over the most recent three complete months of data?';
const SAVE_REQUEST = 'Save this as a playbook';
const STANDALONE_REQUEST =
  'Please propose this as a standalone new playbook instead of an update to an existing one. ' +
  'Do not save anything yet; I will confirm after I review the proposal.';

const panel = (page) => page.locator('aside[data-cy="AIChat"]');
// Each proposal card is the rounded white box directly inside its list item (AIChat.tsx renders
// <li><PlaybookProposalCard/></li>); its header button holds "Playbook proposal" and the status badge.
const proposalCards = (page) => panel(page).locator('li > div.rounded-lg')
  .filter({ has: page.getByText('Playbook proposal', { exact: true }) });
const pendingCards = (page) => proposalCards(page).filter({ has: page.getByText('Pending', { exact: true }) });
// A proposal for a new playbook has a plain name in its header; an update proposal's name links to the playbook.
const pendingNew = (page) => pendingCards(page).filter({ hasNot: page.locator('button[aria-expanded] a[href*="/playbooks/"]') });

// The composer on this analysis may carry a different placeholder than a fresh one, so target the field itself.
async function sendHere(page, message) {
  await freeComposer(page);
  const field = panel(page).locator('textarea').first();
  await field.waitFor({ timeout: MIN });
  await field.fill(message);
  const sendButton = page.getByRole('button', { name: 'Send' });
  if (await sendButton.isVisible().catch(() => false)) await sendButton.click(); else await field.press('Enter');
  log('sent:', message);
  await stopButton(page).waitFor({ timeout: 90_000 }).catch(() => log('no Stop button appeared after sending'));
}

// Poll for a pending new-playbook proposal while the Guide works; it plans, runs and reports before proposing.
async function waitForNewProposal(page, timeout = 12 * MIN) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await pendingNew(page).count()) > 0) return true;
    await page.waitForTimeout(3000);
  }
  return false;
}

async function driveToProposal(page) {
  await settle(page);
  if ((await pendingNew(page).count()) > 0) { log('a new-playbook proposal is pending'); return; }
  const asked = (await page.getByText(QUESTION, { exact: false }).count()) > 0;
  const saveSent = (await page.getByText(SAVE_REQUEST, { exact: true }).count()) > 0;
  if (!asked) {
    await freeComposer(page); // cancels the "Choose a direction" card; the Guide may answer the cancellation
    await sendHere(page, QUESTION);
    await settle(page);
    if (await questionIsOpen(page)) throw new Error('the Guide asked a question instead of answering; answer it by hand or delete the analysis');
    const accept = page.getByRole('button', { name: /^Update step/ }).or(page.getByRole('button', { name: 'Add as New Step' })).first();
    if (await accept.isVisible().catch(() => false)) { await accept.click(); log('accepted the query suggestion'); await settle(page); }
  }
  if (!saveSent || (await pendingCards(page).count()) === 0) {
    await sendHere(page, SAVE_REQUEST);
    await waitForNewProposal(page, 15 * MIN);
    await settle(page);
  }
  if ((await pendingNew(page).count()) > 0) { log('a new-playbook proposal is pending'); return; }
  if ((await pendingCards(page).count()) > 0) {
    log('only an update proposal is pending; asking for a standalone playbook');
    await sendHere(page, STANDALONE_REQUEST);
    await waitForNewProposal(page);
    await settle(page);
  }
  if ((await pendingNew(page).count()) === 0) throw new Error('the Guide did not answer with a pending proposal for a new playbook');
  log('a new-playbook proposal is pending');
}

export default async function ({ page, BASE, WORKSPACE, frame }) {
  page.setDefaultTimeout(30_000);
  let analysis = await findAnalysis(page, BASE, WORKSPACE, NAME);
  if (analysis) { log('found', analysis.url); await openAnalysis(page, BASE, WORKSPACE, analysis.id); }
  else { analysis = await createAnalysis(page, BASE, WORKSPACE, NAME); log('created', analysis.url); }
  await driveToProposal(page);

  const card = pendingNew(page).last();
  const header = card.locator('button[aria-expanded]').first();
  await header.waitFor();
  if ((await header.getAttribute('aria-expanded')) !== 'true') { await header.click(); await page.waitForTimeout(400); }
  await card.getByText('Pending', { exact: true }).waitFor();
  const hint = card.getByText('Reply to the Guide', { exact: false });
  await hint.waitFor();
  // put the card header at the top of the conversation, right under the panel header
  await header.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
  log('card:', text.slice(0, 600));
  if (frame?.args) return { url: analysis.url, text };

  const asideBox = await panel(page).boundingBox();
  const top = await header.boundingBox();
  const box = await card.boundingBox();
  // the composer sits below the conversation; keep the frame above it
  const composerBox = await panel(page).locator('> div').last().boundingBox();
  if (!asideBox || !top || !box || !composerBox) throw new Error('panel, proposal card or composer has no bounding box');
  const pad = frame.padding ?? 12;
  const vp = page.viewportSize();
  const y = Math.max(0, top.y - pad);
  // The description is the Guide's full plan and runs far past the panel, so the frame keeps the header, the
  // proposed name and the opening blocks (summary line, first entry, cadence) and ends at the bottom of the last
  // block that fits within MAX_DEPTH of the header, a clean edge rather than a line cut in half.
  const MAX_DEPTH = 520;
  const limit = Math.min(vp.height, box.y + box.height + pad, composerBox.y, top.y + MAX_DEPTH);
  const blockBottom = await card.evaluate((el, lim) => {
    const blocks = el.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li');
    let best = 0;
    for (const b of blocks) { const r = b.getBoundingClientRect(); if (r.height > 0 && r.bottom <= lim) best = Math.max(best, r.bottom); }
    return best;
  }, limit);
  const bottom = blockBottom > top.y + top.height ? blockBottom + 2 : limit;
  if (bottom - y < 200) throw new Error('the proposal frame is unexpectedly short');
  const x = Math.max(0, asideBox.x);
  return { clip: { x, y, width: Math.min(vp.width, asideBox.x + asideBox.width) - x, height: bottom - y } };
}
