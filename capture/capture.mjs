// Deterministic screenshot capture for the Perch docs. See capture/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const pwPkg = process.env.PW_PKG ?? 'playwright';
const pw = await import(pwPkg.startsWith('/') ? pwPkg + '/index.mjs' : pwPkg);

const BASE = 'https://demo.perchinsights.com';
const WORKSPACE = process.env.PERCH_DOCS_WORKSPACE ?? 'b904ad6a-a64e-42d5-bd39-83996be9b279'; // Docs
const state = process.env.PERCH_DOCS_STATE;
if (!state || !fs.existsSync(state)) { console.error('PERCH_DOCS_STATE must point at the saved session file'); process.exit(2); }

const frames = JSON.parse(fs.readFileSync(path.join(here, 'frames.json'), 'utf8'));
const args = process.argv.slice(2);
const CONTEXT = { storageState: state, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

// A flow module may export `launch` (extra Chromium launch options) and `context` (extra browser context options)
// when the state it documents needs them: the dictation frame needs a fake microphone, which is a launch flag plus
// a microphone permission. Such a flow runs in its own browser, launched and closed around that one flow.
async function openPage(mod, shared) {
  if (!mod.launch && !mod.context) return { page: await shared.newPage(), close: async (page) => page.close() };
  const own = await pw.chromium.launch(mod.launch ?? {});
  const ctx = await own.newContext({ ...CONTEXT, ...(mod.context ?? {}) });
  return { page: await ctx.newPage(), close: async () => own.close() };
}

// `--flow <name> [args...]` runs one flow module on its own, without a frame or a PNG, and prints what
// it returns. Used for `_fixtures` (creates the Docs: fixtures the frames rely on) and for debugging a flow.
const flowIdx = args.indexOf('--flow');
if (flowIdx !== -1) {
  const name = args[flowIdx + 1];
  if (!name) { console.error('--flow needs a flow name'); process.exit(2); }
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext(CONTEXT);
  let code = 0, opened = null;
  try {
    const mod = await import(path.join(here, 'flows', name + '.mjs'));
    opened = await openPage(mod, ctx);
    const result = await mod.default({ page: opened.page, BASE, WORKSPACE, frame: { id: name, args: args.slice(flowIdx + 2) } });
    if (result !== undefined && result !== null) console.log(JSON.stringify(result, null, 2));
    if (result && typeof result.after === 'function') await result.after();
    console.log(`ok   --flow ${name}`);
  } catch (e) {
    code = 1; console.log(`FAIL --flow ${name}: ${e.message.split('\n')[0]}`);
  } finally { if (opened) await opened.close(opened.page).catch(() => {}); await browser.close(); }
  process.exit(code);
}

const wanted = args;
const selected = wanted.length ? frames.filter(f => wanted.includes(f.id)) : frames;
if (!selected.length) { console.error('no frames selected'); process.exit(2); }

const browser = await pw.chromium.launch();
const ctx = await browser.newContext(CONTEXT);
let failed = 0;
for (const frame of selected) {
  let opened = null, page = null;
  let shot = null; // the page the frame is taken from; a flow may hand back another one (see below)
  let after = null; // a flow may return `after`, run once the PNG is saved, to leave the state it reached (end a recording)
  try {
    const mod = await import(path.join(here, 'flows', frame.flow + '.mjs'));
    opened = await openPage(mod, ctx);
    page = shot = opened.page;
    let target = await mod.default({ page, BASE, WORKSPACE, frame });
    if (target && typeof target === 'object' && typeof target.after === 'function') after = target.after;
    // A flow may return { page, target } to frame a page it opened in another browser context, for states the
    // signed-in session cannot show (the login page redirects signed-in members). That context is closed after the shot.
    // (a Locator has a page() method, so check for a real Page object, not just the key)
    if (target && typeof target === 'object' && target.page && typeof target.page.screenshot === 'function') { shot = target.page; target = target.target ?? null; }
    for (const label of frame.labels) {
      // on-screen text, a field placeholder (the login fields have no label other than their placeholder), or an
      // accessible name (icon-only buttons such as the composer's Send carry their label as aria-label)
      const loc = shot.getByText(label, { exact: false }).or(shot.getByPlaceholder(label, { exact: false }))
        .or(shot.getByLabel(label, { exact: true })).first();
      if (!(await loc.isVisible().catch(() => false))) throw new Error(`required label not visible: "${label}"`);
    }
    const out = path.join(repo, frame.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (target && typeof target === 'object' && 'clip' in target) {
      await shot.screenshot({ path: out, clip: target.clip }); // flow computed its own region
    } else if (target && typeof target.boundingBox === 'function') {
      // crop to the returned element plus padding; padding keeps the surrounding context readable
      const pad = frame.padding ?? 16;
      const box = await target.boundingBox();
      if (!box) throw new Error('crop target has no bounding box');
      const vp = shot.viewportSize();
      const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
        width: Math.min(vp.width, box.x + box.width + pad) - Math.max(0, box.x - pad),
        height: Math.min(vp.height, box.y + box.height + pad) - Math.max(0, box.y - pad) };
      await shot.screenshot({ path: out, clip });
    } else {
      await shot.screenshot({ path: out }); // full viewport: only when the shot list justifies it
    }
    console.log(`ok   ${frame.id} -> ${frame.file}`);
  } catch (e) {
    failed++; console.log(`FAIL ${frame.id}: ${e.message.split('\n')[0]}`);
  } finally {
    if (after) await after().catch(e => console.log(`warn ${frame.id}: after hook failed: ${e.message.split('\n')[0]}`));
    if (shot && shot !== page) await shot.context().close().catch(() => {});
    if (opened) await opened.close(page).catch(() => {});
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
