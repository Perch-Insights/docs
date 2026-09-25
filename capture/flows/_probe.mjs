// Debugging aid, not a frame: `npm run capture -- --flow _probe <what> [arg] [png-suffix]`.
//   analyses            print the Docs analyses list text
//   catalog <term>      print the Metrics Catalog search for a term
//   thread|page <url> [suffix] [wait-ms]   print the page text and save capture/_probe<suffix>.png (page = full page)
//                       after wait-ms (default 8000)
//   find <title>        print the id and URL of the analysis with that exact title (or null)
//   delete <id>         delete one analysis whose title starts with "Docs:" or ends with "• Playbook Edit"
//                       (the transient analysis a playbook's Edit button creates)
import { findAnalysis } from './_fixtures.mjs';
const deletable = (title) => title.startsWith('Docs:') || title.endsWith('• Playbook Edit');
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const [what = 'analyses', arg] = frame.args ?? [];
  if (what === 'find') {
    return JSON.stringify(await findAnalysis(page, BASE, WORKSPACE, arg));
  }
  if (what === 'catalog') {
    await page.goto(`${BASE}/w/${WORKSPACE}/metrics-catalog`, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.count()) { await search.fill(arg ?? 'abandon'); await page.waitForTimeout(3000); }
    return (await page.locator('body').innerText()).slice(0, 4000);
  }
  if (what === 'analyses') {
    await page.goto(`${BASE}/w/${WORKSPACE}/analyses`, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    return (await page.locator('body').innerText()).slice(0, 2500);
  }
  if (what === 'thread' || what === 'page') {
    // log console errors and failed requests to stderr: the Guide panel loads its history over a live connection,
    // and an empty panel is usually that connection failing
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.type(), m.text().slice(0, 300)); });
    page.on('requestfailed', r => console.error('requestfailed', r.url().slice(0, 200), r.failure()?.errorText));
    page.on('response', r => { if (r.status() >= 400) console.error('response', r.status(), r.url().slice(0, 200)); });
    page.on('websocket', ws => { console.error('websocket', ws.url().slice(0, 200)); ws.on('socketerror', e => console.error('socketerror', e)); ws.on('close', () => console.error('websocket closed', ws.url().slice(0, 120))); });
    await page.goto(arg, { waitUntil: 'load' });
    await page.waitForTimeout(Number(frame.args[3] ?? 8000));
    await page.screenshot({ path: `capture/_probe${frame.args[2] ?? ''}.png`, fullPage: what === 'page' });
    return (await page.locator('body').innerText()).slice(0, 6000);
  }
  if (what === 'delete') {
    // delete one analysis by id, through the header menu, after checking its title is one the flows own
    await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${arg}`, { waitUntil: 'load' });
    const title = (await page.locator('header h2').first().innerText()).trim();
    if (!deletable(title)) throw new Error(`refusing to delete "${title}"`);
    // the thread header's right-hand group: favorite star, Private/Public, then the icon-only menu button
    await page.locator('header').first().locator('xpath=..').getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Delete Analysis' }).or(page.getByText('Delete Analysis')).first().click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/analyses\/?(\?.*)?$/, { timeout: 30000 });
    return `deleted ${title}`;
  }
  return null;
}
