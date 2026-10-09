/**
 * Stress test for the bottom tab bar icons in the web / Telegram build:
 * repeated tab switching, entering/leaving a puzzle round (tab bar remounts), backgrounding
 * (visibilitychange + pagehide), viewport / fullscreen resizes and a flaky network.
 * After every step each tab icon must be visibly painted (pixel check) — exits 1 otherwise.
 *   NODE_PATH=<dir with puppeteer-core> node scripts/telegram/tabs-stress.cjs [URL] [rounds]
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const MOCK = require("./tg-mock.cjs");
const URL = process.argv[2] || "http://127.0.0.1:8098/buzzle/";
const ROUNDS = +(process.argv[3] || 6);
const OUT = __dirname + "/../../screens/telegram";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TABS = ["Улей", "Головоломка", "Пчёлы", "Задания"];

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  await page.setCacheEnabled(true);   // interception turns the HTTP cache off by default; a real webview has one
  let flaky = false, failedReq = 0;
  let booted = false, imgReqAfterBoot = 0;
  page.on("request", (r) => {
    const u = r.url();
    if (booted && /\.(png|webp)(\?|$)/.test(u)) imgReqAfterBoot++;
    if (u.startsWith("https://telegram.org/js/telegram-web-app.js")) return r.respond({ status: 200, contentType: "application/javascript", body: MOCK });
    // flaky mobile network: image requests fail half of the time
    if (flaky && /\.(png|webp)(\?|$)/.test(u) && Math.random() < 0.5) { failedReq++; return r.abort("failed"); }
    r.continue();
  });
  await page.evaluateOnNewDocument(() => {
    if (sessionStorage.getItem("__init")) return; sessionStorage.setItem("__init", "1");
    Object.keys(localStorage).filter((k) => k.startsWith("bzz:")).forEach((k) => localStorage.removeItem(k));
    const now = Date.now();
    // a returning player: tutorial done, login already claimed today (no modal over the tab bar)
    localStorage.setItem("bzz:state:v1", JSON.stringify({ version: 3, honey: 500, jelly: 3, settings: { tutorialDone: true, haptics: true }, login: { lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5), index: 1, streak: 1 }, clock: { maxSeen: now, maxDay: 0 } }));
  });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 20000 });
  await sleep(3000);   // art pinning finishes
  booted = true;
  const close = await page.$('[aria-label="Закрыть"]'); if (close) { await close.tap(); await sleep(500); }

  const tabBox = (l) => page.evaluate((l) => {
    const el = [...document.querySelectorAll('[role="tab"]')].find((e) => e.getAttribute("aria-label") === l);
    if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, l);
  /** painted pixels in the icon area of each tab (the icon sits in the upper part of the tab) */
  async function iconsPainted() {
    const res = {};
    for (const l of TABS) {
      const b = await tabBox(l);
      if (!b) { res[l] = -1; continue; }
      const png = await page.screenshot({ clip: { x: b.x + b.w / 2 - 13, y: b.y + 6, width: 26, height: 26 }, encoding: "base64" });
      res[l] = await page.evaluate(async (src) => {
        const img = new Image(); img.src = "data:image/png;base64," + src; await img.decode();
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const x = c.getContext("2d"); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        // background of the bar is white / honey pill; icon pixels are the brown or white glyph that differs from both
        const bg = [d[0], d[1], d[2]];
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60) n++;
        return n;
      }, png);
    }
    return res;
  }
  let bad = 0, checks = 0;
  async function verify(step) {
    await sleep(350);
    const r = await iconsPainted();
    checks++;
    const missing = Object.entries(r).filter(([, n]) => n < 25).map(([k]) => k);
    if (missing.length) {
      bad++;
      console.log(`MISSING after ${step}: ${missing.join(", ")} ${JSON.stringify(r)}`);
      if (bad <= 3) await page.screenshot({ path: `${OUT}/tabs-missing-${bad}.png` });
    }
  }
  const tap = async (l) => { const b = await tabBox(l); await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2); };
  await verify("boot");
  for (let round = 0; round < ROUNDS; round++) {
    flaky = round % 2 === 1;
    for (const l of [...TABS, ...TABS.slice().reverse()]) { await tap(l); await verify(`tab ${l} (round ${round}${flaky ? ", flaky net" : ""})`); }
    // into a puzzle round and back (the tab bar unmounts while playing)
    await tap("Головоломка"); await sleep(500);
    const play = await page.$('[aria-label="Играть ежедневную головоломку"]');
    if (play) {
      await play.tap(); await sleep(1500);
      await page.evaluate(() => window.__tg.press()); await sleep(500);   // BackButton -> "Закончить раунд?"
      const quit = await page.evaluateHandle(() => [...document.querySelectorAll("div")].find((e) => e.textContent.trim() === "Закончить" && !e.children.length));
      if (quit && (await quit.evaluate((e) => !!e))) { const bb = await quit.boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }
      await sleep(3500);
      const done = await page.evaluateHandle(() => [...document.querySelectorAll("div")].find((e) => ["Готово", "В меню"].includes(e.textContent.trim()) && !e.children.length));
      if (done && (await done.evaluate((e) => !!e))) { const bb = await done.boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }
      await sleep(600);
      await verify(`after a puzzle round (round ${round}${flaky ? ", flaky net" : ""})`);
    }
    // background / foreground
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide"))); await sleep(1500);
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await verify(`background/foreground (round ${round})`);
    // fullscreen / viewport resize (Telegram expands, rotates insets)
    await page.setViewport({ width: 390, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluate(() => { const w = window.Telegram.WebApp; w.contentSafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 }; });
    await sleep(300);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluate(() => { const w = window.Telegram.WebApp; w.contentSafeAreaInset = { top: 46, bottom: 0, left: 0, right: 0 }; window.dispatchEvent(new Event("resize")); });
    await verify(`resize (round ${round})`);
    await tap(TABS[round % 4]); await verify(`tab after resize (round ${round})`);
  }
  console.log(`${checks} checks, ${bad} with missing icons; ${imgReqAfterBoot} image requests after boot (${failedReq} failed on purpose)`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
