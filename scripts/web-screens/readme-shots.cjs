/** English README screenshots → screens/v1.5/*.png (390×844 @2x) from an exported web build.
 *   NODE_PATH=<playwright> node scripts/web-screens/readme-shots.cjs http://127.0.0.1:8099/buzzle/
 * Uses the review fixture save (scripts/web-screens/v15-review-seed.json) inside the browser only.
 */
const { chromium } = require('playwright');
const path = require('node:path');
const seed = require('./v15-review-seed.json');
const mock = require('../telegram/tg-mock.cjs');
const base = process.argv[2] || 'http://127.0.0.1:8099/buzzle/';
const out = path.resolve(__dirname, '../../screens/v1.5');
const W = +(process.env.W || 390);
(async () => {
  const b = await chromium.launch(process.env.BZZ_CHROME ? { executablePath: process.env.BZZ_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/telegram-web-app.js*', (r) => r.fulfill({ contentType: 'application/javascript', body: mock }));
  await p.addInitScript((s) => {
    if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1);
    const st = JSON.parse(s), now = Date.now(), day = Math.floor((now - new Date().getTimezoneOffset() * 60000) / 86400000);
    st.settings = { ...st.settings, lang: 'en', langPicked: true, lastVersion: '9.9.9', gardenIntroDone: true, tutorialDone: true, autoUpdate: false };
    st.hive.lastTick = st.garden.lastTick = now; st.login.lastDay = day; st.tasks.day = day; st.week.id = Math.floor((day + 3) / 7); st.clock = { maxSeen: now, maxDay: day };
    st.loot.owned = [...new Set([...(st.loot.owned || []), 'flags', 'barrel', 'pinwheel'])]; st.loot.hidden = [];
    window.__tgLang = 'en'; localStorage.setItem('bzz:state:v1', JSON.stringify(st));
  }, JSON.stringify(seed));
  const load = async () => { await p.goto(base); await p.waitForFunction(() => !document.querySelector('#bzz-boot')); await p.waitForTimeout(900); };
  const tap = async (l, w = 600) => { await p.locator('[aria-label=' + JSON.stringify(l) + ']').last().click({ timeout: 6000 }); await p.waitForTimeout(w); };
  const scroll = async (y) => { await p.evaluate((y) => document.querySelectorAll('div').forEach((e) => { if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY.match(/auto|scroll/)) e.scrollTop = y; }), y); await p.waitForTimeout(400); };
  const shot = async (n) => { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
  await load();
  await shot('01-hive'); await scroll(460); await shot('02-hive-upgrades'); await scroll(0);
  await tap('Garden'); await shot('03-garden'); await tap('Combs');
  await tap('Play'); await shot('04-play');
  await tap('Free Play'); await shot('05-boosters'); await tap('Start free play', 2600); await shot('06-round');
  await load(); await tap('Bees'); await shot('07-bees');
  await tap('Buzzy'); await shot('08-bee-detail'); await tap('Close');
  await tap('Surprises'); await shot('09-chests'); await tap('Shop'); await shot('10-shop'); await tap('Album'); await shot('11-album');
  await tap('Tasks'); await shot('12-tasks');
  await tap('Settings'); await shot('13-settings');
  console.log('errors', errs);
  await b.close();
})();
