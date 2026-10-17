/** v1.5 extra shots: language picker, puzzle HUD, chest open, bee detail (390) */
const puppeteer = require("puppeteer-core"); const fs = require("fs");
const URL = process.argv[2]; const UI = process.argv[3]; const OUT = process.argv[4]; fs.mkdirSync(OUT, { recursive: true });
const MOCK = require("../telegram/tg-mock.cjs"); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeds = JSON.parse(fs.readFileSync(__dirname + "/seeds-v15.json", "utf8"));
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  async function run(name, patch, steps) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.setRequestInterception(true);
    page.on("request", (r) => r.url().startsWith("https://telegram.org/js/telegram-web-app.js") ? r.respond({ status: 200, contentType: "application/javascript", body: MOCK }) : r.continue());
    const now = Date.now(); const m = seeds.mid;
    const st = { ...m, ...patch(m), settings: { ...m.settings, lang: "ru", langPicked: true, lastVersion: "9.9.9", ...(patch(m).settings || {}) }, login: { ...m.login, lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5) } };
    await page.evaluateOnNewDocument((s) => { window.__tgLang = "ru"; Object.keys(localStorage).forEach((k) => localStorage.removeItem(k)); localStorage.setItem("bzz:state:v1", s); }, JSON.stringify(st));
    await page.goto(URL, { waitUntil: "load" });
    await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 }); await sleep(2500);
    const tap = async (l) => { const b = await page.evaluate((l) => { const e = [...document.querySelectorAll(`[aria-label^="${l}"]`)].pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, l); if (b) { await page.touchscreen.tap(b.x, b.y); await sleep(1500); } return !!b; };
    const shot = (n) => page.screenshot({ path: `${OUT}/390-${n}.png` });
    if (name !== "lang") for (const l of ["Забрать награду", "Понятно"]) await tap(l);
    await steps(tap, shot, page);
    await page.close();
  }
  await run("lang", () => ({ settings: { langPicked: false, ui: UI } }), async (tap, shot) => { await shot("11-language"); });
  await run("puzzle", () => ({ settings: { ui: UI } }), async (tap, shot) => { await tap("Играть"); await tap("Играть ежедневную"); await sleep(1500); await shot("12-puzzle-hud"); });
  await run("box", (m) => ({ settings: { ui: UI }, loot: { ...m.loot, boxes: { wood: 1, wax: 1, gold: 0, royal: 0 } } }), async (tap, shot, page) => {
    await tap("Сюрпризы"); await tap("Открыть: Деревянная"); await sleep(1200); await shot("13-chest-open-0");
    await page.touchscreen.tap(195, 430); await sleep(900); await shot("14-chest-open-1");
    await page.touchscreen.tap(195, 430); await sleep(900); await shot("15-chest-open-2");
    await page.touchscreen.tap(195, 430); await sleep(2500); await shot("16-chest-open-drops"); });
  await run("plant", (m) => ({ settings: { ui: UI }, garden: { ...m.garden, beds: m.garden.beds.map((b, i) => i === 3 ? { flower: null, growth: 0, water: 0 } : b) } }), async (tap, shot) => { await tap("Сад"); await sleep(600); await tap("Грядка 4"); await sleep(700); await shot("17-garden-plant"); });
  await run("bee", () => ({ settings: { ui: UI } }), async (tap, shot) => { await tap("Пчёлы"); await tap("Жужа"); await sleep(800); await shot("04c-bee-detail"); });
  await browser.close();
})();
