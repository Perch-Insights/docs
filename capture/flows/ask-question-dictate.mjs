// The Guide composer while dictating: the recording bar (red dot, live waveform, elapsed time against the
// two-minute cap) with the Cancel recording and Accept recording buttons, at the bottom of the Guide panel.
// The frame shows the last exchange above it for context, like the send-it frame. Both buttons are icon-only
// (aria-labels "Cancel recording" / "Accept recording"), so the harness matches them by accessible name.
// Starting dictation calls getUserMedia, so this flow runs in its own browser with Chromium's fake microphone
// (a launch flag) and the microphone permission granted. The recording is cancelled once the PNG is saved, so
// nothing is transcribed into the composer and the fixture analysis is unchanged.
import { loadFixtures, openAnalysis } from './_fixtures.mjs';

export const launch = { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] };
export const context = { permissions: ['microphone'] };

export default async function ({ page, BASE, WORKSPACE, frame }) {
  const { analysis } = loadFixtures();
  await openAnalysis(page, BASE, WORKSPACE, analysis.id);
  const panel = page.locator('aside[data-cy="AIChat"]');
  const field = panel.getByPlaceholder('Ask about your data...');
  await field.waitFor();
  await panel.getByRole('button', { name: 'Start dictation', exact: true }).click();

  const recording = panel.locator('[data-cy="QuestionFieldRecording"]');
  const micError = page.getByText('Unable to access the microphone', { exact: false });
  await recording.or(micError).first().waitFor({ timeout: 30_000 });
  if (await micError.isVisible().catch(() => false)) throw new Error('the browser could not open the (fake) microphone');
  const cancel = recording.getByRole('button', { name: 'Cancel recording', exact: true });
  const accept = recording.getByRole('button', { name: 'Accept recording', exact: true });
  await cancel.waitFor();
  await accept.waitFor();
  try {
    // the waveform appears once dictation has started on the server and the microphone stream is live; the start
    // request alone can take a while on demo, so give it a full minute
    await recording.locator('canvas').waitFor({ timeout: 60_000 });
  } catch (e) {
    await page.screenshot({ path: new URL('../_probe-dictate.png', import.meta.url).pathname });
    throw new Error(`waveform did not appear; recording bar says "${(await recording.textContent()) ?? ''}"`);
  }
  // let the clock tick so the frame shows a recording in progress rather than 0:00
  const elapsed = recording.getByLabel('Elapsed recording time', { exact: true });
  await page.waitForTimeout(2500);
  const clock = (await elapsed.textContent()) ?? '';
  if (!/^0:0[2-9] \/ 2:00$/.test(clock.trim())) throw new Error(`recording clock did not advance: "${clock}"`);

  // the last member message in the fixture conversation; the Guide's reply follows it, then the recording bar
  const lastMessage = panel.getByText('save this playbook', { exact: true }).last();
  await lastMessage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const aside = await panel.boundingBox();
  const top = await lastMessage.boundingBox();
  const pad = frame.padding ?? 12;
  const y = Math.max(0, top.y - pad);
  const bottom = Math.min(page.viewportSize().height, aside.y + aside.height);
  return {
    clip: { x: aside.x, y, width: aside.width, height: bottom - y },
    after: async () => { await cancel.click(); await field.waitFor({ timeout: 15_000 }); }, // end the recording, nothing is kept
  };
}
