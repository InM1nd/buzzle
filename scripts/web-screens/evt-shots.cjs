/** v1.6 seasonal / event backdrops + night-falls transition shots.
 *  NODE_PATH=/workspace/tools/node_modules node scripts/web-screens/evt-shots.cjs http://localhost:8124/ /home/box/rv/evt */
const puppeteer = require("puppeteer-core"); const fs = require("fs");
const URL = process.argv[2]; const OUT = process.argv[3]; fs.mkdirSync(OUT + "/cine", { recursive: true });
const MOCK = require("../telegram/tg-mock.cjs"); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeds = JSON.parse(fs.readFileSync(__dirname + "/seeds-v15.json", "utf8"));
const MODE = process.argv[4] || "all";
async function open(browser, q, event, dpr = 2) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on("request", (r) => r.url().startsWith("https://telegram.org/js/telegram-web-app.js") ? r.respond({ status: 200, contentType: "application/javascript", body: MOCK }) : r.continue());
  const now = Date.now();
  const st = { ...seeds.mid, event, settings: { ...seeds.mid.settings, ui: "auto", devEvent: "calendar", lang: "ru", langPicked: true, lastVersion: "9.9.9", gardenIntroDone: true, tutorialDone: true },
    login: { ...seeds.mid.login, lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5) } };
  await page.evaluateOnNewDocument((s) => { window.__tgLang = "ru"; if (sessionStorage.getItem("__i")) return; sessionStorage.setItem("__i", "1"); Object.keys(localStorage).forEach((k) => localStorage.removeItem(k)); localStorage.setItem("bzz:state:v1", s); }, JSON.stringify(st));
  return page;
}
const tapper = (page) => async (l, wait = 1300) => { const b = await page.evaluate((l) => { const e = [...document.querySelectorAll(`[aria-label="${l}"]`)].pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, l); if (b) { await page.touchscreen.tap(b.x, b.y); await sleep(wait); } else console.log("no", l); return !!b; };
async function scenes(browser, tag, q, event) {
  const page = await open(browser, q, event);
  await page.goto(URL + q, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 }); await sleep(2500);
  const tap = tapper(page);
  for (const l of ["Забрать награду", "Понятно", "Закрыть"]) await tap(l, 900);
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  await shot("1-hive"); await tap("Сад"); await shot("2-garden"); await tap("Соты");
  await tap("Играть"); await shot("3-play");
  await page.evaluate(() => { const e = [...document.querySelectorAll('[aria-label^="Ночной полёт"]')].pop(); if (e) e.scrollIntoView({ block: "center" }); }); await sleep(700); await shot("4-play-flight");
  const labels = await page.evaluate(() => [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")));
  fs.writeFileSync(`${OUT}/${tag}-labels.txt`, labels.join("\n"));
  await page.close();
}
async function puzzle(browser, tag, q, event) {
  const page = await open(browser, q, event);
  await page.goto(URL + q, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 }); await sleep(2500);
  const tap = tapper(page);
  for (const l of ["Забрать награду", "Понятно", "Закрыть"]) await tap(l, 900);
  await tap("Играть");
  await page.evaluate(() => { const e = [...document.querySelectorAll('[aria-label="Свободная игра"]')].pop(); if (e) e.scrollIntoView({ block: "center" }); }); await sleep(600);
  await tap("Свободная игра");
  const labels = await page.evaluate(() => [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")));
  fs.writeFileSync(`${OUT}/${tag}-pick-labels.txt`, labels.join("\n"));
  await tap("Начать свободную игру", 3000);
  await page.screenshot({ path: `${OUT}/${tag}-5-puzzle.png` });
  await page.close();
}
async function cine(browser) {
  const page = await open(browser, "?event=1", { id: "", points: 0, claimed: 0 }, 2);
  const cdp = await page.target().createCDPSession();
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => { frames.push({ t: f.metadata.timestamp, d: f.data }); await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await page.goto(URL + "?event=1", { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, everyNthFrame: 1 });
  await sleep(6500);
  await cdp.send("Page.stopScreencast");
  frames.forEach((f, i) => fs.writeFileSync(`${OUT}/cine/f${String(i).padStart(4, "0")}.jpg`, Buffer.from(f.d, "base64")));
  fs.writeFileSync(`${OUT}/cine/times.json`, JSON.stringify(frames.map((f) => f.t)));
  console.log("frames", frames.length);
  await page.close();
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  const seen = { id: "halloween-2026-preview", points: 40, claimed: 1, intro: true, cine: true };
  if (MODE === "all" || MODE === "scenes") {
    await scenes(browser, "autumn", "?dev=1", { id: "", points: 0, claimed: 0 });
    await scenes(browser, "event", "?event=1", seen);
  }
  if (MODE === "all" || MODE === "puzzle") {
    await puzzle(browser, "autumn", "?dev=1", { id: "", points: 0, claimed: 0 });
    await puzzle(browser, "event", "?event=1", seen);
  }
  if (MODE === "all" || MODE === "cine") await cine(browser);
  await browser.close();
})();
