/**
 * v1.4 screenshots in every language → screens/v1.4/<lang>-{1-language,2-hive,3-settings,4-update}.png
 *   NODE_PATH=<puppeteer-core> node scripts/web-screens/v14-shots.cjs [URL]
 * The update dialog is Android-only; here it is rendered on web with a mocked GitHub release (window.__BZZ_DEMO_UPDATE).
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const URL = process.argv[2] || "http://127.0.0.1:8098/buzzle/";
const OUT = __dirname + "/../../screens/v1.4";
fs.mkdirSync(OUT, { recursive: true });
const MOCK = require("../telegram/tg-mock.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seeds = JSON.parse(fs.readFileSync("/tmp/bzz-seeds.json", "utf8"));
const L = {
  en: { settings: "Settings", check: "Check for updates", claim: "Collect reward", notes: "Bug fixes, smoother garden watering and two new outfits for your bees.\n\n- Faster loading in Telegram\n- Fixed a rare crash when opening many combs" },
  uk: { settings: "Налаштування", check: "Перевірити оновлення", claim: "Забрати нагороду", notes: "Виправлення помилок, плавніший полив саду й два нові вбрання для бджілок.\n\n- Швидше завантаження в Telegram\n- Виправлено рідкісний виліт під час відкриття багатьох сот" },
  ru: { settings: "Настройки", check: "Проверить обновления", claim: "Забрать награду", notes: "Исправления ошибок, более плавный полив сада и два новых наряда для пчёл.\n\n- Быстрее загрузка в Telegram\n- Исправлен редкий вылет при открытии многих сот" },
};

async function open(browser, lang, seed, demo) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on("request", (r) => r.url().startsWith("https://telegram.org/js/telegram-web-app.js") ? r.respond({ status: 200, contentType: "application/javascript", body: MOCK }) : r.continue());
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluateOnNewDocument((lang, seed, demo) => {
    window.__tgLang = lang;
    if (demo) window.__BZZ_DEMO_UPDATE = demo;
    if (sessionStorage.getItem("__init")) return; sessionStorage.setItem("__init", "1");
    Object.keys(localStorage).forEach((k) => localStorage.removeItem(k));
    if (seed) localStorage.setItem("bzz:state:v1", seed);
  }, lang, seed, demo);
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("bzz-boot"), { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);
  return page;
}
const tapLabel = async (page, l, wait = 900) => {
  const b = await page.evaluate((l) => { const el = document.querySelector(`[aria-label="${l}"]`); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, l);
  if (!b) throw new Error("not found " + l);
  await sleep(200); await page.touchscreen.tap(b.x, b.y); await sleep(wait);
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--force-color-profile=srgb"] });
  try {
    for (const lang of ["en", "uk", "ru"]) {
      // 1) first launch: the picker, pre-selected from the (mocked) Telegram account language
      let page = await open(browser, lang, null, null);
      await page.screenshot({ path: `${OUT}/${lang}-1-language.png` });
      await page.close();
      // 2) a played hive in that language (+ a pending update: badge on the gear)
      const now = Date.now();
      const mid = { ...seeds.mid, settings: { ...seeds.mid.settings, lang, langPicked: true, lastVersion: "1.4.0" }, login: { ...seeds.mid.login, lastDay: Math.floor((now - new Date().getTimezoneOffset() * 6e4) / 864e5) },
        hive: { ...seeds.mid.hive, lastTick: now - 3 * 3600e3 }, garden: { ...seeds.mid.garden, lastTick: now - 3 * 3600e3 }, clock: { ...seeds.mid.clock, maxSeen: now - 3 * 3600e3 } };
      const demo = { version: "1.4.1", code: 7, body: L[lang].notes, apkUrl: "https://github.com/InM1nd/buzzle/releases/download/v1.4.1/Buzzle-v1.4.1.apk", apkSize: 31_400_000, page: "https://github.com/InM1nd/buzzle/releases", publishedAt: "" };
      page = await open(browser, lang, JSON.stringify(mid), demo);
      if (await page.$(`[aria-label="${L[lang].claim}"]`)) await tapLabel(page, L[lang].claim, 2200);
      await sleep(1200);
      await page.screenshot({ path: `${OUT}/${lang}-2-hive.png` });
      // 3) settings
      await tapLabel(page, `${L[lang].settings} · ${{ en: "Update available", uk: "Є оновлення", ru: "Есть обновление" }[lang]}`, 900);
      await page.screenshot({ path: `${OUT}/${lang}-3-settings.png` });
      // 4) update dialog
      await tapLabel(page, L[lang].check, 1500);
      await page.screenshot({ path: `${OUT}/${lang}-4-update.png` });
      await page.close();
      console.log("saved", lang);
    }
  } finally { await browser.close(); }
})();
