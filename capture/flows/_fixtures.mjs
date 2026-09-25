// Creates, once, the Docs-workspace content the frames rely on, and finds it again on later runs.
// Run: `npm run capture -- --flow _fixtures`. Idempotent: every fixture is looked up by its `Docs:` name
// before anything is created, so a re-run after a partial failure only does the missing steps.
// Writes capture/fixtures.json (ids and URLs) for the frame flows; `loadFixtures()` reads it back.
//
// Fixtures:
//   analysis      "Docs: Inbound call volume trend": a question the Guide answered with a finished Insight report,
//                 one insight pinned, and the analysis saved as a playbook
//   playbook      "Docs: Inbound call volume playbook", saved from that analysis, with at least one completed run
//   run           the run analysis of that playbook ("<date> • Run N", named by Perch, so no Docs: prefix)
//   publicAnalysis "Docs: Shared analysis": an analysis made Public so viewer and clone frames have something to open
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_FILE = path.join(here, '..', 'fixtures.json');

export const NAMES = {
  analysis: 'Docs: Inbound call volume trend',
  playbook: 'Docs: Inbound call volume playbook',
  publicAnalysis: 'Docs: Shared analysis',
};
// Abandoned chats and abandoned calls are all zeros in the Docs data, so the question is about inbound call
// volume and queue time, which are populated (about 22K calls a month).
export const QUESTION =
  'How did total inbound calls and total queue time trend over the most recent three complete months of data, and which month stood out?';

const MIN = 60_000;
const GUIDE_TURN_TIMEOUT = 25 * MIN; // one Guide turn, including a full report or a playbook run
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

export function loadFixtures() {
  if (!fs.existsSync(FIXTURES_FILE)) throw new Error('capture/fixtures.json missing: run `npm run capture -- --flow _fixtures` first');
  return JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8'));
}

const threadIdFromUrl = (url) => Number((url.match(/\/analyses\/(\d+)/) ?? [])[1]);
const playbookIdFromUrl = (url) => Number((url.match(/\/playbooks\/(\d+)/) ?? [])[1]);

// ---------- analyses list ----------

export async function findAnalysis(page, BASE, WORKSPACE, title) {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'load' });
  const search = page.getByPlaceholder('Search...');
  await search.waitFor();
  await search.fill(title);
  await page.waitForTimeout(2500); // debounced search plus the list refetch
  const row = page.getByRole('link', { name: title, exact: true }).first();
  if (!(await row.isVisible().catch(() => false))) return null;
  const href = await row.getAttribute('href');
  return { id: threadIdFromUrl(href), url: `${BASE}${href}` };
}

export async function openAnalysis(page, BASE, WORKSPACE, id) {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${id}`, { waitUntil: 'load' });
  await page.locator('header h2').first().waitFor();
  // the composer holds Send, or Stop while the Guide works, or a Guide Question card with Submit/Next
  await page.getByRole('button', { name: /^(Send|Stop|Submit|Next)$/ }).first().waitFor({ timeout: MIN });
  await page.waitForTimeout(3000); // history replay
}

async function createAnalysis(page, BASE, WORKSPACE, title) {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'New Analysis' }).click();
  await page.waitForURL(/\/analyses\/\d+/, { timeout: MIN });
  await page.locator('header h2').first().waitFor();
  await renameAnalysis(page, title);
  return { id: threadIdFromUrl(page.url()), url: page.url().split('?')[0] };
}

async function renameAnalysis(page, title) {
  await page.locator('header h2[role="button"]').click();
  const input = page.locator('header input');
  await input.waitFor();
  await input.fill(title);
  await input.press('Enter');
  await page.getByText('Title updated successfully').waitFor({ timeout: 30_000 });
  log('renamed analysis to', title);
}

// ---------- the Guide ----------

const stopButton = (page) => page.getByRole('button', { name: 'Stop' });
const composer = (page) => page.getByPlaceholder('Ask about your data...');
// The Guide panel is a grid of header, conversation, composer; a pending Guide Question replaces the composer.
const composerArea = (page) => page.locator('aside[data-cy="AIChat"] > div').last();

// Wait until the Guide has been idle for a few seconds (no Stop button in the composer).
async function settle(page, timeout = GUIDE_TURN_TIMEOUT) {
  const deadline = Date.now() + timeout;
  let quietSince = null;
  let lastLog = 0;
  while (Date.now() < deadline) {
    const busy = await stopButton(page).isVisible().catch(() => false);
    if (busy) {
      quietSince = null;
      if (Date.now() - lastLog > 60_000) { lastLog = Date.now(); log('Guide working...'); }
    } else {
      quietSince ??= Date.now();
      if (Date.now() - quietSince > 6000) return;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error('the Guide did not finish its turn in time');
}

async function send(page, message) {
  await freeComposer(page);
  const field = composer(page);
  await field.waitFor({ timeout: MIN });
  await field.fill(message);
  await page.getByRole('button', { name: 'Send' }).click();
  log('sent:', message);
  await stopButton(page).waitFor({ timeout: 90_000 }).catch(() => log('no Stop button appeared after sending'));
}

const reportIsFinal = async (page) => (await page.getByTitle('Copy report').count()) > 0;

// The composer is replaced by a Guide Question card (badge "Pending", possibly collapsed) while one is open.
async function questionIsOpen(page) {
  if (await composer(page).isVisible().catch(() => false)) return false;
  return (await composerArea(page).getByText('Pending', { exact: true }).count()) > 0;
}

async function expandQuestion(page) {
  const area = composerArea(page);
  const collapsed = area.getByRole('button', { expanded: false }).first();
  if (await collapsed.isVisible().catch(() => false)) { await collapsed.click(); await page.waitForTimeout(400); }
}

// Cancel whatever Guide Question is open so the message field comes back (a follow-up question the Guide
// asks after a report, for example). The Guide may answer the cancellation, so let it settle.
async function freeComposer(page) {
  for (let i = 0; i < 3 && (await questionIsOpen(page)); i++) {
    await expandQuestion(page);
    log('cancelling an open Guide Question');
    await composerArea(page).getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForTimeout(3000);
    await settle(page);
  }
}

// Options the Guide tends to offer on a fresh analysis ("Choose a direction"); pick the one that leads to a question.
const PREFERRED_OPTIONS = [/investigate a specific question/i, /specific question/i, /investigate/i];

// Answer every question in the open card: a preferred or first option for choices, the fixture question itself
// for the first free-text question, a short default for later ones. Returns true when QUESTION was used.
async function answerQuestion(page, asked) {
  log('answering a Guide Question');
  let usedQuestion = false;
  for (let i = 0; i < 8; i++) {
    const submit = page.getByRole('button', { name: 'Submit' });
    const next = page.getByRole('button', { name: 'Next' });
    if (!(await submit.or(next).first().isVisible().catch(() => false))) await expandQuestion(page);
    const text = page.getByPlaceholder('Type your answer...');
    if (await text.isVisible().catch(() => false)) {
      if (!asked && !usedQuestion) { await text.fill(QUESTION); usedQuestion = true; }
      else await text.fill('Use the most recent three complete months of data and your best judgment.');
    } else {
      const inputs = page.getByRole('radio').or(page.getByRole('checkbox'));
      let picked = false;
      for (const re of PREFERRED_OPTIONS) {
        const opt = page.locator('label').filter({ hasText: re }).first();
        if (await opt.isVisible().catch(() => false)) { await opt.click(); picked = true; log('chose option', await opt.innerText()); break; }
      }
      if (!picked && (await inputs.first().isVisible().catch(() => false))) {
        const first = page.locator('label').filter({ has: inputs.first() }).first();
        if (await first.isVisible().catch(() => false)) await first.click(); else await inputs.first().check({ force: true });
        log('chose the first option');
      }
    }
    await page.waitForTimeout(400);
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      log('submitted the Guide Question');
      await stopButton(page).waitFor({ timeout: 90_000 }).catch(() => {});
      return usedQuestion;
    }
    if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(400); continue; }
    break;
  }
  throw new Error('could not answer the Guide Question');
}

// Accept a pending Query Suggestion: the first one updates the blank first step, later ones become new steps.
async function acceptProposal(page, { first }) {
  const update = page.getByRole('button', { name: /^Update step/ }).first();
  const add = page.getByRole('button', { name: 'Add as New Step' }).first();
  const target = first && (await update.isVisible().catch(() => false)) ? update : add;
  await target.scrollIntoViewIfNeeded();
  const label = await target.innerText();
  await target.click();
  log('accepted query suggestion via', label.trim());
  await page.waitForTimeout(3000);
  await stopButton(page).waitFor({ timeout: 90_000 }).catch(() => {});
}

const NUDGES = [
  'Yes, go ahead with that plan.',
  'Please run the analysis on the accepted steps and write the insight report.',
  'Yes, write the insight report now.',
];

// Drive the conversation to a finished Insight report. The Guide starts on its own in a new analysis and
// usually opens a "Choose a direction" Guide Question first, so every turn starts by letting it settle.
async function driveToReport(page) {
  if (await reportIsFinal(page)) { log('report already finished'); return; }
  let asked = (await page.getByText(QUESTION, { exact: false }).count()) > 0;
  let accepted = 0;
  let nudges = 0;
  for (let turn = 0; turn < 18; turn++) {
    await settle(page);
    if (await reportIsFinal(page)) { log('report finished'); return; }
    if (await questionIsOpen(page)) { if (await answerQuestion(page, asked)) asked = true; continue; }
    if ((await page.getByRole('button', { name: 'Add as New Step' }).count()) > 0) {
      await acceptProposal(page, { first: accepted === 0 });
      accepted++;
      continue;
    }
    if (!asked) { await send(page, QUESTION); asked = true; continue; }
    if (nudges >= 5) break;
    await send(page, NUDGES[Math.min(nudges, NUDGES.length - 1)]);
    nudges++;
  }
  throw new Error('no finished Insight report after driving the Guide');
}

async function pinFirstInsight(page) {
  if ((await page.getByTitle('Unpin insight').count()) > 0) { log('an insight is already pinned'); return; }
  const pin = page.getByTitle('Pin insight').first();
  await pin.scrollIntoViewIfNeeded();
  await pin.click();
  await page.getByTitle('Unpin insight').first().waitFor({ timeout: 30_000 });
  log('pinned the first insight');
}

const parentPlaybookLink = (page) => page.locator('header a[href*="/playbooks/"]').first();

async function saveAsPlaybook(page) {
  if (await parentPlaybookLink(page).isVisible().catch(() => false)) { log('analysis already belongs to a playbook'); return; }
  const pendingProposal = page.locator('li').filter({ hasText: 'Playbook proposal' }).filter({ hasText: 'Pending' });
  if ((await pendingProposal.count()) === 0) {
    await send(page, 'Save this as a playbook');
    await settle(page);
  }
  if ((await pendingProposal.count()) === 0) throw new Error('the Guide did not answer with a Playbook proposal');
  await send(page, 'save this playbook');
  await settle(page);
  await parentPlaybookLink(page).waitFor({ timeout: 2 * MIN });
  log('playbook saved');
}

// ---------- playbook page ----------

async function findPlaybookCard(page, BASE, WORKSPACE, name) {
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'New Analysis' }).waitFor();
  await page.waitForTimeout(2000);
  const card = page.locator('div.group').filter({ has: page.locator('h3', { hasText: name }) }).first();
  if (!(await card.isVisible().catch(() => false))) return null;
  const href = await card.getByRole('link', { name: 'Link to playbook' }).getAttribute('href');
  return { id: playbookIdFromUrl(href), url: `${BASE}${href}` };
}

async function openPlaybook(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Run' }).waitFor({ timeout: MIN });
  await page.getByText('Past Runs').waitFor({ timeout: MIN });
  await page.waitForTimeout(2000);
}

async function renamePlaybook(page, name) {
  const current = (await page.locator('header h2').first().innerText()).trim();
  if (current === name) return;
  await page.getByRole('button', { name: 'Edit title' }).click();
  const input = page.locator('header input');
  await input.waitFor();
  await input.fill(name);
  await input.press('Enter');
  await page.getByText('Playbook renamed').waitFor({ timeout: 30_000 });
  log('renamed playbook to', name);
}

async function ensureRun(page, BASE) {
  const existing = page.getByRole('link', { name: /Run \d+$/ }).first();
  if (await existing.isVisible().catch(() => false)) {
    const href = await existing.getAttribute('href');
    log('playbook already has a run');
    return { id: threadIdFromUrl(href), url: `${BASE}${href}`, title: (await existing.innerText()).trim() };
  }
  await page.getByRole('button', { name: 'Run' }).click();
  await page.waitForURL(/\/analyses\/\d+/, { timeout: 2 * MIN });
  log('run started', page.url());
  await page.locator('header h2').first().waitFor();
  await page.waitForTimeout(5000);
  const deadline = Date.now() + GUIDE_TURN_TIMEOUT;
  while (Date.now() < deadline) {
    const working = await page.getByText('The AI Guide is working on your first step').isVisible().catch(() => false);
    const busy = await stopButton(page).isVisible().catch(() => false);
    if (!working && !busy && (await reportIsFinal(page))) break;
    await page.waitForTimeout(5000);
  }
  await settle(page);
  if (!(await reportIsFinal(page))) throw new Error('the run did not produce a finished report');
  const title = (await page.locator('header h2').first().innerText()).trim();
  log('run finished:', title);
  return { id: threadIdFromUrl(page.url()), url: page.url().split('?')[0], title };
}

// ---------- public analysis ----------

async function ensurePublic(page) {
  if (await page.getByRole('button', { name: 'Public' }).isVisible().catch(() => false)) { log('already public'); return; }
  await page.getByRole('button', { name: 'Private' }).click();
  await page.getByText('Make Analysis public').waitFor();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByText('Analysis status updated').waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Public' }).waitFor();
  log('made public');
}

// ---------- entry point ----------

export default async function ({ page, BASE, WORKSPACE }) {
  page.setDefaultTimeout(30_000);
  const out = {};

  // 1. the analysis with a question, a finished report, a pinned insight, and a saved playbook
  let analysis = await findAnalysis(page, BASE, WORKSPACE, NAMES.analysis);
  if (analysis) { log('found analysis', analysis.url); await openAnalysis(page, BASE, WORKSPACE, analysis.id); }
  else { analysis = await createAnalysis(page, BASE, WORKSPACE, NAMES.analysis); log('created analysis', analysis.url); }
  await driveToReport(page);
  await pinFirstInsight(page);
  await saveAsPlaybook(page);
  const playbookHref = await parentPlaybookLink(page).getAttribute('href');
  out.analysis = { name: NAMES.analysis, id: analysis.id, url: `${BASE}/w/${WORKSPACE}/analyses/${analysis.id}` };

  // 2. the playbook, renamed, with one completed run
  const playbookUrl = `${BASE}${playbookHref}`;
  await openPlaybook(page, playbookUrl);
  await renamePlaybook(page, NAMES.playbook);
  out.playbook = { name: NAMES.playbook, id: playbookIdFromUrl(playbookHref), url: playbookUrl };
  out.run = await ensureRun(page, BASE);

  // 3. the public analysis
  let shared = await findAnalysis(page, BASE, WORKSPACE, NAMES.publicAnalysis);
  if (shared) { log('found public analysis', shared.url); await openAnalysis(page, BASE, WORKSPACE, shared.id); }
  else { shared = await createAnalysis(page, BASE, WORKSPACE, NAMES.publicAnalysis); log('created public analysis', shared.url); }
  await ensurePublic(page);
  out.publicAnalysis = { name: NAMES.publicAnalysis, id: shared.id, url: `${BASE}/w/${WORKSPACE}/analyses/${shared.id}` };

  fs.writeFileSync(FIXTURES_FILE, JSON.stringify(out, null, 2) + '\n');
  return out;
}
