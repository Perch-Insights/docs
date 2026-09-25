// The login page: the "Login" card with the Email and Password fields and the Login button.
// A signed-in member is redirected away from /login, so the page is opened in a fresh browser context with no
// session at all. Nothing is typed and nothing is submitted. The frame is the card, returned as { page, target }.
export default async function ({ page, BASE }) {
  const ctx = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const login = await ctx.newPage();
  await login.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const heading = login.getByRole('heading', { name: 'Login' });
  await heading.waitFor();
  await login.getByPlaceholder('Email').waitFor();
  await login.getByPlaceholder('Password').waitFor();
  await login.waitForTimeout(500);
  return { page: login, target: heading.locator('xpath=..') }; // the white card around heading, fields, and button
}
