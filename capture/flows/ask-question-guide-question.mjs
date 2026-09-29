// A pending Guide Question card with more than one question, in place of the composer at the bottom of the
// Guide panel. The frame shows the card header ("Guide Question" or the Guide's own title, "Pending" badge), the
// first question with its options, the "1 of N" counter marked "Required" or "Optional", and the Cancel and
// Next buttons. The counter, Required/Optional and Next only render when the card holds more than one question
// (UserQuestionCard.tsx), so a single-question card such as "Choose a direction" is not enough.
//
// The card lives in its own throwaway analysis, "Docs: Guide Question", found by name or created on first run.
// The Guide is driven until it opens a multi-question card, which then stays pending: the flow picks an answer
// to the first question (local state only, so Next is enabled) but never clicks Next, Submit or Cancel, so the
// same card is there for the next capture.
import {
  findAnalysis, createAnalysis, openAnalysis, settle, send, freeComposer, composerArea, questionIsOpen, expandQuestion,
} from './_fixtures.mjs';

export const NAME = 'Docs: Guide Question';
const MIN = 60_000;
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

// Left to itself the Guide asks one question per card (a "Choose a direction" card whose options differ from one
// analysis to the next, then "confirm the structure", then it starts building), so the flow cancels whatever
// single-question card is open and asks outright for one form with several questions.
const REQUEST =
  'I want to look at inbound call volume. Before you build or run anything, ask me one Guide Question form with three ' +
  'questions in it: which metric to focus on (single choice), which months to compare (multiple choice), and an optional ' +
  'free-text note. Wait for my answers.';

const card = (page) => composerArea(page);
const counter = (page) => card(page).getByText(/^\d+ of \d+$/);

async function multiQuestionOpen(page) {
  if (!(await questionIsOpen(page))) return false;
  await expandQuestion(page);
  return (await counter(page).isVisible().catch(() => false));
}

async function driveToMultiQuestion(page) {
  for (let turn = 0; turn < 4; turn++) {
    await settle(page);
    if (await multiQuestionOpen(page)) { log('a multi-question card is pending'); return; }
    await freeComposer(page); // cancels a single-question card; the Guide may answer the cancellation
    if (await multiQuestionOpen(page)) { log('a multi-question card is pending'); return; }
    await send(page, REQUEST);
  }
  throw new Error('the Guide did not open a Guide Question with more than one question');
}

export default async function ({ page, BASE, WORKSPACE, frame }) {
  page.setDefaultTimeout(30_000);
  let analysis = await findAnalysis(page, BASE, WORKSPACE, NAME);
  if (analysis) { log('found', analysis.url); await openAnalysis(page, BASE, WORKSPACE, analysis.id); }
  else { analysis = await createAnalysis(page, BASE, WORKSPACE, NAME); log('created', analysis.url); }
  await driveToMultiQuestion(page);

  const area = card(page);
  const header = area.getByRole('button', { expanded: true }).first();
  await header.waitFor();
  // answer the first question locally so Next is enabled, the state the step describes; nothing is sent
  const choice = area.locator('label').filter({ has: page.getByRole('radio').or(page.getByRole('checkbox')).first() }).first();
  if (await choice.isVisible().catch(() => false)) await choice.click();
  else { const t = area.getByPlaceholder('Type your answer...'); if (await t.isVisible().catch(() => false)) await t.fill('Inbound call volume and average queue time'); }
  await page.waitForTimeout(400);
  const next = area.getByRole('button', { name: 'Next', exact: true });
  await next.waitFor();
  const text = (await area.innerText()).replace(/\s+/g, ' ').trim();
  log('card:', text.slice(0, 600));
  if (frame?.args) return { url: analysis.url, next: !(await next.isDisabled()), text };

  const panel = page.locator('aside[data-cy="AIChat"]');
  const aside = await panel.boundingBox();
  const top = await header.boundingBox();
  const pad = frame.padding ?? 12;
  const y = Math.max(0, top.y - pad);
  const bottom = Math.min(page.viewportSize().height, aside.y + aside.height);
  return { clip: { x: aside.x, y, width: aside.width, height: bottom - y } };
}
