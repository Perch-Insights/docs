// READ-ONLY flow (Pnc Ins, READONLY_WORKSPACE): no click at all, and so no click on any create, save, delete,
// favorite, run, or toggle control. It opens a measure's page in the Metrics Catalog by URL and frames the header
// (with the Back to Metrics Catalog button), the Description and Formula, and the "Dimensions" group of related
// fields, each card labelled "Dimension" (CubeFieldDetails.tsx, CubeFieldDrillMembers.tsx).
// No Pnc Ins measure has measures among its drill members, so the "Related Metrics" group never renders there.
import { unionClip } from './_util.mjs';
const FIELD = 'pnc_lead_journey.adherence_ratio_day_1';
export default async function ({ page, BASE, READONLY_WORKSPACE }) {
  await page.goto(`${BASE}/w/${READONLY_WORKSPACE}/metrics-catalog/${FIELD}`, { waitUntil: 'load' });
  const group = page.getByRole('heading', { name: 'Dimensions', exact: true });
  await group.waitFor({ timeout: 60_000 });
  const back = page.getByLabel('Back to Metrics Catalog').first();
  await back.waitFor();
  const crumb = page.getByText('Metrics Catalog', { exact: true }).first();
  // the breadcrumb icon, the Description heading and the group's round "D" badge sit left of the breadcrumb text
  const crumbRow = crumb.locator('xpath=..');
  const description = page.getByRole('heading', { name: 'Description', exact: true });
  const badge = page.getByText('D', { exact: true }).first();
  // the group's cards sit in the column to the right of its heading; the last one closes the frame
  const cards = page.getByText('Dimension', { exact: true });
  await cards.first().waitFor();
  const lastCard = cards.last().locator('xpath=ancestor::a[1]');
  await lastCard.scrollIntoViewIfNeeded();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(800);
  return unionClip(page, [crumb, crumbRow, description, badge, back, group, lastCard], 16);
}
