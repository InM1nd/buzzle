/** v1.4.1 grid check: Surprises + Garden at several widths → screens/v1.4.1/<tag>-<w>-{loot,garden}.png
 *  NODE_PATH=<puppeteer-core> node scripts/web-screens/grid-shots.cjs URL TAG */
const puppeteer = require("puppeteer-core"); const fs = require("fs");
const URL = process.argv[2], TAG = process.argv[3] || "after";
const OUT = __dirname + "/../../screens/v1.4.1"; fs.mkdirSync(OUT, { recursive: true });
const MOCK = require("../telegram/tg-mock.cjs"); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeds = JSON.parse(fs.readFileSync("/tmp/bzz-seeds.json", "utf8"));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  for (const w of (process.env.WIDTHS || "360,390,412,480").split(",").map(Number)) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setRequestInterception(true);
    page.on("request", (r) => r.url().startsWith("https://telegram.org/js/telegram-web-app.js") ? r.respond({ status: 200, contentType: "application/javascript", body: MOCK }) : r.continue());
    const now = Date.now();
    const st = { ...seeds.mid, settings: { ...seeds.mid.settings, lang: "ru", langPicked: true, lastVersion: "9.9.9", gardenIntroDone: true }, login: { ...seeds.mid.login, lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5) } };
    await page.evaluateOnNewDocument((s) => { window.__tgLang = "ru"; if (sessionStorage.getItem("__i")) return; sessionStorage.setItem("__i", "1"); Object.keys(localStorage).forEach((k) => localStorage.removeItem(k)); localStorage.setItem("bzz:state:v1", s); }, JSON.stringify(st));
    if (process.env.RESIZE) await page.setViewport({ width: +process.env.RESIZE, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(URL, { waitUntil: "load" });
    if (process.env.RESIZE) { await sleep(2500); await page.setViewport({ width: w, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); }
    await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 20000 }); await sleep(2000);
    const tap = async (l) => { const b = await page.evaluate((l) => { const e = document.querySelector(`[aria-label="${l}"]`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, l); if (b) { await page.touchscreen.tap(b.x, b.y); await sleep(1500); } return !!b; };
    for (const l of ["Забрать награду", "Понятно"]) await tap(l);
    await tap("Сюрпризы"); await page.screenshot({ path: `${OUT}/${TAG}-${w}-loot.png` });
    await tap("Улей"); await tap("Сад"); await page.screenshot({ path: `${OUT}/${TAG}-${w}-garden.png` });
    await page.close();
  }
  await browser.close();
})();
