/** v1.5 dev shots: each tab at 390 and 360 → screens/v1.5-dev/<w>-<name>.png
 *  NODE_PATH=/workspace/tools/node_modules node scripts/web-screens/v15-shots.cjs http://localhost:8115/ */
const puppeteer = require("puppeteer-core"); const fs = require("fs");
const URL = process.argv[2]; const UI = process.argv[3]; const OUT = process.argv[4]; fs.mkdirSync(OUT, { recursive: true });
const MOCK = require("../telegram/tg-mock.cjs"); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeds = JSON.parse(fs.readFileSync(__dirname + "/seeds-v15.json", "utf8"));
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  for (const w of [390]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.setRequestInterception(true);
    page.on("request", (r) => r.url().startsWith("https://telegram.org/js/telegram-web-app.js") ? r.respond({ status: 200, contentType: "application/javascript", body: MOCK }) : r.continue());
    const now = Date.now();
    const st = { ...seeds.mid, settings: { ...seeds.mid.settings, ui: UI, lang: "ru", langPicked: true, lastVersion: "9.9.9", gardenIntroDone: true, tutorialDone: true }, login: { ...seeds.mid.login, lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5) } };
    await page.evaluateOnNewDocument((s) => { window.__tgLang = "ru"; if (sessionStorage.getItem("__i")) return; sessionStorage.setItem("__i", "1"); Object.keys(localStorage).forEach((k) => localStorage.removeItem(k)); localStorage.setItem("bzz:state:v1", s); }, JSON.stringify(st));
    await page.goto(URL, { waitUntil: "load" });
    await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 }); await sleep(2500);
    const tap = async (l) => { const b = await page.evaluate((l) => { const e = [...document.querySelectorAll(`[aria-label="${l}"]`)].pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, l); if (b) { await page.touchscreen.tap(b.x, b.y); await sleep(1500); } return !!b; };
    for (const l of ["Забрать награду", "Понятно"]) await tap(l);
    const shot = (n) => page.screenshot({ path: `${OUT}/${w}-${n}.png` });
    await shot("01-hive"); await tap("Сад"); await shot("02-garden"); await tap("Соты");
    await tap("Играть"); await shot("03-play");
    await tap("Пчёлы"); await shot("04-bees");
    await tap("Сюрпризы"); await shot("05-chests"); await tap("Лавка"); await shot("06-shop"); await tap("Альбом"); await shot("07-album");
    await tap("Задания"); await shot("08-tasks"); await page.evaluate(() => { document.querySelectorAll("div").forEach((d) => { if (d.scrollHeight > d.clientHeight + 50) d.scrollTop = 99999; }); }); await sleep(800); await shot("09-tasks-bottom");
    await tap("Настройки"); await shot("10-settings");
    await page.goto(URL, { waitUntil: "load" }); await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 }); await sleep(2500);
    for (const l of ["Забрать награду", "Понятно"]) await tap(l);
    await tap("Пчёлы"); await tap("Наряды"); await shot("04b-outfits"); await tap("Все"); await tap("Жужа"); await sleep(800); await shot("04c-bee-detail");
    await page.close();
  }
  await browser.close();
})();
