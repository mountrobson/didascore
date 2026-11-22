import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { route } from './mock-espn.mjs';
const base = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'screens';
const browser = await chromium.launch();
const shots = [
  ['home', '#/'], ['match', '#/match/soccer/all/401878755'], ['league', '#/league/soccer/eng.1'], ['team', '#/team/soccer/eng.1/364'], ['leagues', '#/leagues'], ['following', '#/following'],
];
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme });
  await ctx.route(/espn(cdn)?\.com|fonts\.(googleapis|gstatic)\.com/, (r) => {
    const url = r.request().url();
    if (url.includes('site.api.espn.com')) return r.fulfill({ json: route(url), headers: { 'access-control-allow-origin': '*' } });
    return r.abort();
  });
  await ctx.addInitScript(() => localStorage.setItem('dida.favorites', JSON.stringify({ teams: [{ id: '364', name: 'Liverpool', league: 'eng.1', sport: 'soccer' }], leagues: [], matches: [] })));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const [name, hash] of shots) {
    await page.goto(base + hash);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${scheme}-${name}.png`, fullPage: name !== 'leagues' });
  }
  if (scheme === 'dark') {
    await page.goto(base + '#/match/soccer/all/401878755');
    for (const tab of ['Stats', 'Lineups', 'Table', 'Form & H2H']) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/dark-match-${tab.split(' ')[0].toLowerCase()}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto(base + '#/');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/desktop-home.png` });
  }
  console.log(scheme, 'errors:', errors.filter((e) => !e.includes('ERR_FAILED')).slice(0, 5));
  await ctx.close();
}
await browser.close();
