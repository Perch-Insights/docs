// The Docs workspace's analyses list with its Playbooks section: the band from the Playbooks heading
// (title, count, subtitle), through the carousel (Previous playbooks arrow, the fixture playbook card with its
// owner badge and Last run link, Next playbooks arrow), down to the Analyses heading and its New Analysis button.
// Shows that the Playbooks section sits above the Analyses section (AiHomePage.tsx renders it first, only when
// the workspace has at least one playbook). Nothing on the page changes.
import { unionClip } from './_util.mjs';
import { loadFixtures } from './_fixtures.mjs';

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { playbook } = loadFixtures();
  await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'networkidle' });
  const newAnalysis = page.getByRole('button', { name: 'New Analysis' });
  await newAnalysis.waitFor();
  const playbooksTitle = page.getByRole('heading', { name: 'Playbooks' }).first();
  await playbooksTitle.waitFor();
  // the fixture playbook's card must have rendered, with its Last run link (the fixture has one completed run)
  const card = page.locator('div.group').filter({ has: page.locator('h3', { hasText: playbook.name }) }).first();
  await card.waitFor();
  await card.getByRole('link', { name: /^Last run/ }).waitFor();
  await page.waitForTimeout(500);
  if (frame.full) return null;
  const next = page.getByRole('button', { name: 'Next playbooks' });
  const analysesTitle = page.getByRole('heading', { name: 'Analyses' }).first();
  const analysesSubtitle = page.getByText('All saved analyses in this workspace.', { exact: true });
  return unionClip(page, [playbooksTitle, card, next, analysesTitle, newAnalysis, analysesSubtitle], frame.padding ?? 16);
}
