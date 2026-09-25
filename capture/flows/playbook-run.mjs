// A run analysis, the analysis Perch opens after a member clicks "Run" on a playbook page (PlaybookPageHeader.tsx,
// playbook.execute), once the run has finished: the header reads "<date> • Run N" with the "in <playbook>" badge
// (ThreadHeader.tsx), the canvas shows the step the run created, and the Guide panel holds the run's Insight
// report card. The frame is the content area right of the sidebar, from the header down through the top of the
// canvas and the report card's header and summary, so the reader can recognise a run analysis and where its
// report lands. The fixture run from fixtures.json is used, so nothing is created and nothing is clicked.
//
// The "The AI Guide is working on your first step" canvas message the docs mention is not framed: a run analysis
// already holds its first step when the page opens (the playbook's step is created with the run), so that
// message never appears for the fixture playbook. Starting a real run for this frame was tried and abandoned:
// it leaves one more run analysis in Docs each time, and a run cannot be deleted without breaking the playbook's
// "Last run" link, which resolves through the run's analysis.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { run, playbook } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, run.id);
  const header = page.locator('header').first();
  const title = (await page.locator('header h2').first().innerText()).trim();
  if (!/• Run \d+$/.test(title)) throw new Error(`fixture run is titled "${title}", expected "<date> • Run N"`);
  await header.getByRole('link', { name: playbook.name }).waitFor({ timeout: 60_000 });
  await header.getByText('Loading...').waitFor({ state: 'hidden', timeout: 60_000 });
  log('header ready');

  const panel = page.locator('aside[data-cy="AIChat"]');
  await panel.getByText('Guide', { exact: true }).first().waitFor();
  // the finished report card: "Insight report" label plus a "Copy report" button (InsightReportCard.tsx)
  const card = panel.locator('li')
    .filter({ has: page.getByText('Insight report', { exact: true }) })
    .filter({ has: page.getByTitle('Copy report') })
    .last();
  await card.waitFor({ timeout: 60_000 });
  log('report card found');
  const cardHeader = card.getByRole('button', { name: /Insight report/ }).first();
  await cardHeader.waitFor();
  if ((await cardHeader.getAttribute('aria-expanded')) !== 'true') { await cardHeader.click(); await page.waitForTimeout(400); }
  // put the card header at the top of the conversation so the report's label, title and summary sit right under
  // the Guide panel header
  await cardHeader.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(800);

  // the canvas step: its title row ("Initial Analysis") above the Metrics / Dimensions / Filters chips and the chart
  const stepTitle = page.getByText('Initial Analysis', { exact: true }).first();
  await stepTitle.waitFor({ timeout: 60_000 });
  log('step title found');

  const band = await header.locator('xpath=..').boundingBox();
  const top = await cardHeader.boundingBox();
  const step = await stepTitle.boundingBox();
  if (!band || !top || !step) throw new Error('header band, report card header or step title has no bounding box');
  const pad = frame.padding ?? 12;
  const vp = page.viewportSize();
  const x = Math.max(0, band.x - pad);
  // deep enough to show the report card's header and one-sentence summary on the right and the step's chips plus
  // the top of its chart on the left (the chips end about 120px under the step title)
  const bottom = Math.min(vp.height, Math.max(top.y + 260, step.y + 440));
  return { clip: { x, y: 0, width: vp.width - x, height: bottom } };
}
