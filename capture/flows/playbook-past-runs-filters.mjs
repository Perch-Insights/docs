// The fixture playbook page's Past Runs section (PlaybookDetailsPage.tsx): the "Past Runs" heading with its
// "Showing N of N runs" count, the Filters row (ThreadListTableFilters: the favorite filter reading All, the owner
// filter reading All owners, and the Search... field), the runs table's column headers (Name, Owner, Reports,
// Created At; click one to sort) and the first rows, one of which carries the green "Latest report" badge.
// Nothing is clicked or typed, so the filters stay at their defaults and the fixture is unchanged.
import { loadFixtures } from './_fixtures.mjs';
export default async function ({ page }) {
  const { playbook } = loadFixtures();
  await page.goto(playbook.url, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Run' }).waitFor({ timeout: 60_000 });
  const heading = page.getByRole('heading', { name: 'Past Runs' });
  await heading.waitFor();
  // The count renders once the runs query resolves; the table rows arrive with it.
  await page.getByText(/Showing \d+ of \d+ runs/).waitFor();
  const favorite = page.locator('[data-cy="favoriteFilterButton"]').first();
  await favorite.waitFor();
  const favoriteText = (await favorite.innerText()).trim();
  if (favoriteText !== 'All') throw new Error(`favorite filter reads "${favoriteText}", expected "All"`);
  const owners = page.getByText('All owners', { exact: true }).first();
  await owners.waitFor();
  const search = page.getByPlaceholder('Search').first();
  await search.waitFor();
  // Column headers of the runs table (DataGrid renders a plain <table>) and the Latest report badge on the newest run.
  const table = page.locator('table').filter({ has: page.locator('th', { hasText: 'Name' }) }).first();
  await table.waitFor();
  await table.locator('th', { hasText: 'Created At' }).waitFor();
  const latestBadge = page.getByText('Latest report', { exact: true }).first();
  await latestBadge.waitFor();
  const pad = 16;
  // Put the heading near the top of the layout's scroll container with a little headroom.
  await heading.evaluate((el, pad) => {
    el.scrollIntoView({ block: 'start' });
    let node = el.parentElement;
    while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
    (node ?? document.scrollingElement).scrollTop -= pad;
  }, pad);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  const vp = page.viewportSize();
  // The table spans the page content's width (the layout's left rail is outside it), so it sets the frame's x extent.
  const tableBox = await table.boundingBox();
  const head = await heading.boundingBox();
  const badge = await latestBadge.boundingBox();
  // Rows are the table's data rows; end the frame on the second row's bottom border (or the Latest report row if
  // lower) so the reader sees the headers and a couple of runs without the next row peeking in.
  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  const lastRow = await rows.nth(Math.min(1, Math.max(0, rowCount - 1))).boundingBox();
  const cut = Math.max(lastRow ? lastRow.y + lastRow.height : 0, badge.y + badge.height + pad) + 1;
  const y0 = Math.max(0, head.y - pad);
  const y1 = Math.min(vp.height, cut, tableBox.y + tableBox.height);
  return { clip: { x: Math.max(0, tableBox.x), y: y0, width: tableBox.width, height: y1 - y0 } };
}
