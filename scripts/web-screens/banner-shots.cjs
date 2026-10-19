/** Pumpkin Night banner at several widths / languages: intro popup, Play tab card, track overlay.
 *  NODE_PATH=/workspace/tools/node_modules node scripts/web-screens/banner-shots.cjs URL OUTDIR TAG "360:ru,412:ru,360:en,360:uk" */
const puppeteer = require("puppeteer-core"); const fs = require("fs");
const [URL, OUT, TAG, SPEC] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MOCK = require("../telegram/tg-mock.cjs"); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeds = JSON.parse(fs.readFileSync(__dirname + "/seeds-v15.json", "utf8"));
const L = { ru: { play: "Играть", track: "Дорожка наград" }, en: { play: "Play", track: "Reward track" }, uk: { play: "Грати", track: "Доріжка нагород" } };
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  for (const sp of SPEC.split(",")) {
    const [w, lang] = sp.split(":");
    const page = await browser.newPage();
    await page.setViewport({ width: +w, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setRequestInterception(true);
    page.on("request", (r) => r.url().startsWith("https://telegram.org/js/telegram-web-app.js") ? r.respond({ status: 200, contentType: "application/javascript", body: MOCK }) : r.continue());
    const now = Date.now();
    const st = { ...seeds.mid, event: { id: "halloween-2026-preview", points: 40, claimed: 1, cine: true }, settings: { ...seeds.mid.settings, ui: "auto", devEvent: "on", lang, langPicked: true, lastVersion: "9.9.9", gardenIntroDone: true, tutorialDone: true },
      login: { ...seeds.mid.login, lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5) } };
    await page.evaluateOnNewDocument((s, lang) => { window.__tgLang = lang; if (sessionStorage.getItem("__i")) return; sessionStorage.setItem("__i", "1"); Object.keys(localStorage).forEach((k) => localStorage.removeItem(k)); localStorage.setItem("bzz:state:v1", s); }, JSON.stringify(st), lang);
    await page.goto(URL + "?event=1", { waitUntil: "load" });
    await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 30000 }); await sleep(3500);
    const tap = async (l, wait = 1300) => { const b = await page.evaluate((l) => { const e = [...document.querySelectorAll(`[aria-label="${l}"]`)].pop(); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, l); if (b) { await page.touchscreen.tap(b.x, b.y); await sleep(wait); } else console.log("no", l); return !!b; };
    await page.screenshot({ path: `${OUT}/${TAG}-${w}-${lang}-1-intro.png` });
    await page.evaluate(() => { const b = [...document.querySelectorAll('[aria-label]')].find((e) => /Закрыть|Close|Закрити/.test(e.getAttribute("aria-label"))); b && b.click(); }); await sleep(1000);
    await tap(L[lang].play);
    await page.evaluate(() => { document.querySelectorAll("div").forEach((d) => { if (d.scrollHeight > d.clientHeight + 50) d.scrollTop = 0; }); }); await sleep(500);
    await page.screenshot({ path: `${OUT}/${TAG}-${w}-${lang}-2-card.png` });
    await tap(L[lang].track);
    await page.screenshot({ path: `${OUT}/${TAG}-${w}-${lang}-3-track.png` });
    await page.close();
  }
  await browser.close();
})();
