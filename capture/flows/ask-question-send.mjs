// The Guide composer with a question typed and the Send button ready, at the bottom of the Guide panel.
// The frame shows the last exchange above it (the member's message on the right, the Guide's reply on the
// left) so the reader sees where a sent question lands, then the field with a typed question, the microphone
// button, and Send. Send is icon-only (aria-label "Send", no tooltip), so the harness matches it by aria-label.
// The question is typed but never sent, so the fixture analysis is unchanged.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';
const QUESTION = 'Which day of the week has the most inbound calls?';
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const panel = page.locator('aside[data-cy="AIChat"]');
  const field = panel.getByPlaceholder('Ask about your data...');
  await field.waitFor();
  await field.fill(QUESTION);
  const send = panel.getByRole('button', { name: 'Send', exact: true });
  await send.waitFor();
  if (await send.isDisabled()) throw new Error('Send stayed disabled after typing');
  // the last member message in the fixture conversation; the Guide's reply follows it, then the composer
  const lastMessage = panel.getByText('save this playbook', { exact: true }).last();
  await lastMessage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const aside = await panel.boundingBox();
  const top = await lastMessage.boundingBox();
  const pad = frame.padding ?? 12;
  const y = Math.max(0, top.y - pad);
  const bottom = Math.min(page.viewportSize().height, aside.y + aside.height);
  return { clip: { x: aside.x, y, width: aside.width, height: bottom - y } };
}
