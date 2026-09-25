// Debugging aid, not a frame: `npm run capture -- --flow _probe <what> [arg] [png-suffix]`.
//   analyses            print the Docs analyses list text
//   catalog <term>      print the Metrics Catalog search for a term
//   thread|page <url>   print the page text and save capture/_probe<suffix>.png (page = full page)
//   delete <id>         delete one analysis whose title starts with "Docs:"
export default async function ({ page, BASE, WORKSPACE, frame }) {
  const [what = 'analyses', arg] = frame.args ?? [];
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
    await page.goto(arg, { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `capture/_probe${frame.args[2] ?? ''}.png`, fullPage: what === 'page' });
    return (await page.locator('body').innerText()).slice(0, 6000);
  }
  if (what === 'delete') {
    // delete one analysis by id, through the header menu, after checking its title starts with "Docs:"
    await page.goto(`${BASE}/w/${WORKSPACE}/analyses/${arg}`, { waitUntil: 'load' });
    const title = await page.locator('header h2').first().innerText();
    if (!title.startsWith('Docs:')) throw new Error(`refusing to delete "${title}"`);
    // the thread header's right-hand group: favorite star, Private/Public, then the icon-only menu button
    await page.locator('header').first().locator('xpath=..').getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Delete Analysis' }).or(page.getByText('Delete Analysis')).first().click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL(/\/analyses\/?(\?.*)?$/, { timeout: 30000 });
    return `deleted ${title}`;
  }
  return null;
}
