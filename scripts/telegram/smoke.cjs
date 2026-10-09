/**
 * Headless smoke test of the web build at a phone viewport, with a mocked Telegram.WebApp and without it.
 *   NODE_PATH=<dir with puppeteer-core> node scripts/telegram/smoke.cjs [URL]   (default http://127.0.0.1:8098/buzzle/)
 * Screenshots go to screens/telegram/. Exits non-zero on a failed check.
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const URL = process.argv[2] || "http://127.0.0.1:8098/buzzle/";
const OUT = __dirname + "/../../screens/telegram";
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) failed++; };

// Minimal Telegram.WebApp (Bot API 8.0 client on Android), records calls; CloudStorage persists in localStorage "__cloud__:*"
const MOCK = `(() => {
  const calls = []; const ev = {}; let backCb = [];
  const ls = window.localStorage;
  const cs = {
    setItem(k, v, cb) { calls.push("cloud.set:" + k); if (v.length > 4096) return cb && cb("VALUE_TOO_LONG"); ls.setItem("__cloud__:" + k, v); setTimeout(() => cb && cb(null, true), 30); },
    getItem(k, cb) { setTimeout(() => cb(null, ls.getItem("__cloud__:" + k) || ""), 30); },
    getItems(ks, cb) { const r = {}; ks.forEach((k) => r[k] = ls.getItem("__cloud__:" + k) || ""); setTimeout(() => cb(null, r), 30); },
    removeItems(ks, cb) { ks.forEach((k) => ls.removeItem("__cloud__:" + k)); setTimeout(() => cb && cb(null, true), 30); },
    getKeys(cb) { setTimeout(() => cb(null, Object.keys(ls).filter((k) => k.startsWith("__cloud__:")).map((k) => k.slice(10))), 30); },
  };
  const rec = (n) => (...a) => calls.push(n + (a.length ? ":" + a.join(",") : ""));
  window.Telegram = { WebApp: {
    initData: "query_id=TEST&user=%7B%22id%22%3A1%7D&auth_date=1&hash=x", platform: "android", version: "8.0",
    isVersionAtLeast: (v) => parseFloat(v) <= 8.0,
    ready: rec("ready"), expand: rec("expand"), requestFullscreen: () => { calls.push("requestFullscreen"); }, lockOrientation: rec("lockOrientation"),
    disableVerticalSwipes: rec("disableVerticalSwipes"), setHeaderColor: rec("setHeaderColor"), setBackgroundColor: rec("setBackgroundColor"), setBottomBarColor: rec("setBottomBarColor"),
    safeAreaInset: { top: 24, bottom: 16, left: 0, right: 0 }, contentSafeAreaInset: { top: 46, bottom: 0, left: 0, right: 0 },
    onEvent: (e, f) => { (ev[e] = ev[e] || []).push(f); }, offEvent: (e, f) => { ev[e] = (ev[e] || []).filter((x) => x !== f); },
    BackButton: { isVisible: false, show() { this.isVisible = true; calls.push("back.show"); }, hide() { this.isVisible = false; calls.push("back.hide"); },
      onClick(f) { backCb.push(f); }, offClick(f) { backCb = backCb.filter((x) => x !== f); } },
    HapticFeedback: { impactOccurred: rec("haptic.impact"), notificationOccurred: rec("haptic.notify"), selectionChanged: rec("haptic.select") },
    CloudStorage: cs,
  } };
  window.__tg = { calls, press: () => backCb.slice().forEach((f) => f()) };
})();`;

async function open(browser, { telegram, seed, clearLocal = true }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    if (telegram && r.url().startsWith("https://telegram.org/js/telegram-web-app.js")) return r.respond({ status: 200, contentType: "application/javascript", body: MOCK });
    r.continue();
  });
  page.on("pageerror", (e) => { console.log("PAGEERROR", e.message); failed++; });
  await page.evaluateOnNewDocument((clearLocal, seed) => {
    if (sessionStorage.getItem("__init")) return;
    sessionStorage.setItem("__init", "1");
    if (clearLocal) Object.keys(localStorage).filter((k) => k.startsWith("bzz:")).forEach((k) => localStorage.removeItem(k));
    if (seed) localStorage.setItem("bzz:state:v1", seed);
  }, clearLocal, seed || null);
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 20000 });
  const ms = Date.now() - t0;
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
  return { page, ms };
}
const byLabel = (page, l) => page.evaluate((l) => { const el = document.querySelector(`[aria-label="${l}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top }; }, l);
const byText = (page, t) => page.evaluate((t) => {
  const el = [...document.querySelectorAll("div,span")].find((e) => e.textContent.trim() === t && [...e.children].every((c) => c.textContent.trim() !== t));
  if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, t);
async function tap(page, sel, wait = 600) {
  const b = sel.label ? await byLabel(page, sel.label) : await byText(page, sel.text);
  if (!b) throw new Error("not found: " + JSON.stringify(sel));
  await page.touchscreen.tap(b.x, b.y);
  await sleep(wait);
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` }).then(() => console.log("     saved screens/telegram/" + n + ".png"));

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--force-color-profile=srgb"] });
  try {
    // 1) inside (mocked) Telegram, fresh player
    let { page, ms } = await open(browser, { telegram: true });
    console.log(`     boot (mock Telegram, fresh): ${ms} ms`);
    let calls = await page.evaluate(() => window.__tg.calls.slice());
    for (const c of ["ready", "expand", "disableVerticalSwipes", "requestFullscreen", "setHeaderColor:#FFF6E3"]) check(calls.includes(c), "Telegram " + c);
    await shot(page, "tg-01-tutorial");
    await tap(page, { text: "Пропустить" }, 900);
    await tap(page, { label: "Забрать награду" }, 2200);
    const gear = await byLabel(page, "Настройки");
    check(gear && gear.top >= 70, `top bar below Telegram header (gear top ${gear && Math.round(gear.top)} px)`);
    await shot(page, "tg-02-hive");
    await tap(page, { label: "Пчёлы" }, 900);
    check(await page.evaluate(() => window.Telegram.WebApp.BackButton.isVisible), "BackButton shown off the home screen");
    await page.evaluate(() => window.__tg.press()); await sleep(700);
    check(!!(await byText(page, "Мёд в улье")), "BackButton returns to the hive");
    check(!(await page.evaluate(() => window.Telegram.WebApp.BackButton.isVisible)), "BackButton hidden on the home screen");
    await tap(page, { label: "Настройки" }, 700);
    check(!!(await byText(page, "скоро")), "reminders marked «скоро» on web");
    await shot(page, "tg-03-settings");
    await page.evaluate(() => window.__tg.press()); await sleep(600);
    await tap(page, { label: "Головоломка" }, 700);
    await tap(page, { label: "Играть ежедневную головоломку" }, 2200);
    const board = await page.evaluate(() => { const el = document.querySelector('[aria-label="Игровое поле"]'); const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, ta: getComputedStyle(el).touchAction }; });
    check(board.ta === "none", "puzzle board has touch-action: none");
    // drag across the board (whatever it hits; the game ignores invalid steps)
    const s = board.w / 11, h = Math.sqrt(3) * s;
    const pt = (c, r) => ({ x: board.l + s + c * 1.5 * s, y: board.t + h / 2 + r * h + (c & 1 ? h / 2 : 0) });
    await page.mouse.move(pt(3, 3).x, pt(3, 3).y); await page.mouse.down();
    for (const [c, r] of [[3, 4], [4, 4], [4, 3], [5, 3]]) { await page.mouse.move(pt(c, r).x, pt(c, r).y, { steps: 4 }); await sleep(40); }
    await shot(page, "tg-04-puzzle");
    await page.mouse.up(); await sleep(900);
    await page.evaluate(() => window.__tg.press()); await sleep(600);
    check(!!(await byText(page, "Закончить раунд?")), "BackButton in a round asks before leaving");
    await shot(page, "tg-04b-puzzle-back");
    calls = await page.evaluate(() => window.__tg.calls.slice());
    check(calls.some((c) => c.startsWith("haptic.")), "Telegram HapticFeedback used");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); // not hidden -> no flush; wait for debounce instead
    await sleep(5500);
    const cloudKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("__cloud__:")));
    check(cloudKeys.includes("__cloud__:bzz_meta"), `save written to CloudStorage (${cloudKeys.length} keys)`);
    const honey = await page.evaluate(() => JSON.parse(localStorage.getItem("bzz:state:v1")).honey);
    await page.close();

    // 2) new device: empty local cache, same cloud -> progress restored
    ({ page, ms } = await open(browser, { telegram: true, clearLocal: true }));
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("bzz:state:v1") || "{}"));
    check(restored.honey === honey && restored.settings?.tutorialDone, `progress restored from CloudStorage (honey ${restored.honey})`);
    await page.close();

    // 3) existing browser save + empty cloud -> migrated into the cloud; screenshot of a played hive
    await (async () => {
      const p0 = await browser.newPage(); await p0.goto(URL); await p0.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("__cloud__:")).forEach((k) => localStorage.removeItem(k))); await p0.close();
    })();
    const seeds = fs.existsSync("/tmp/bzz-seeds.json") ? JSON.parse(fs.readFileSync("/tmp/bzz-seeds.json", "utf8")) : null;
    if (seeds) {
      const mid = { ...seeds.mid, hive: { ...seeds.mid.hive, lastTick: Date.now() - 3 * 3600e3 }, garden: { ...seeds.mid.garden, lastTick: Date.now() - 3 * 3600e3 }, clock: { ...seeds.mid.clock, maxSeen: Date.now() - 3 * 3600e3 } };
      ({ page, ms } = await open(browser, { telegram: true, seed: JSON.stringify(mid) }));
      console.log(`     boot (mock Telegram, played save): ${ms} ms`);
      await sleep(1500);
      const hasLogin = await byLabel(page, "Забрать награду"); if (hasLogin) await tap(page, { label: "Забрать награду" }, 2200);
      await sleep(1800);
      await shot(page, "tg-05-hive-played");
      await tap(page, { label: "Сад" }, 900);
      await shot(page, "tg-06-garden");
      const meta = await page.evaluate(() => localStorage.getItem("__cloud__:bzz_meta"));
      check(!!meta, "existing local save migrated to CloudStorage");
      await page.close();
    }

    // 4) normal mobile browser (real telegram-web-app.js loads but reports no Telegram) -> localStorage only
    ({ page, ms } = await open(browser, { telegram: false }));
    console.log(`     boot (plain browser): ${ms} ms`);
    check(!!(await byText(page, "Привет, я Жужа!")), "boots in a plain browser (tutorial)");
    await shot(page, "web-01-browser");
    await page.close();
  } finally {
    await browser.close();
  }
  console.log(failed ? `${failed} check(s) failed` : "all checks passed");
  process.exit(failed ? 1 : 0);
})();
