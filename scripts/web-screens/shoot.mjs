import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
const seeds = JSON.parse(readFileSync("/tmp/bzz-seeds.json", "utf8"));
const OUT = "/workspace/apps/bee-game/screens";
mkdirSync(OUT, { recursive: true });
const URL = "http://127.0.0.1:8099/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv[2];
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none"] });

async function open(seed) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 3 });
  const data = seed ? JSON.stringify(seeds[seed]) : null;
  await page.evaluateOnNewDocument((data) => {
    const target = new Date(2026, 9, 8, 8, 40, 0).getTime();
    const shift = target - Date.now();
    const RealDate = Date;
    class FakeDate extends RealDate {
      constructor(...a) { if (a.length === 0) super(RealDate.now() + shift); else super(...a); }
      static now() { return RealDate.now() + shift; }
    }
    window.Date = FakeDate;
    localStorage.clear();
    if (data) localStorage.setItem("bzz:state:v1", data);
  }, data);
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
  return page;
}
async function find(page, text, { label = false, nth = 0 } = {}) {
  const box = await page.evaluate(({ text, label, nth }) => {
    const all = [...document.querySelectorAll(label ? `[aria-label="${text}"]` : "div,span")];
    const hits = label ? all : all.filter((el) => el.textContent.trim() === text && [...el.children].every((c) => c.textContent.trim() !== text));
    const el = hits[nth];
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, left: r.x, top: r.y };
  }, { text, label, nth });
  if (!box) throw new Error("not found: " + text);
  return box;
}
async function tap(page, text, opts = {}) {
  const b = await find(page, text, opts);
  await page.mouse.click(b.x, b.y);
  await sleep(opts.wait ?? 500);
}
async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("saved", name);
}
async function scrollTop(page) { await page.evaluate(() => document.querySelectorAll("div").forEach((d) => { if (d.scrollTop) d.scrollTop = 0; })); }
async function boardPts(page, path) {
  const b = await find(page, "Игровое поле", { label: true });
  const s = b.w / 11, h = Math.sqrt(3) * s;
  return path.map(({ c, r }) => ({ x: b.left + s + c * 1.5 * s, y: b.top + h / 2 + r * h + (c & 1 ? h / 2 : 0) }));
}
const want = (n) => !only || only.split(",").includes(n);

try {
  let p;
  if (want("tutorial")) {
    p = await open(null);
    await sleep(500);
    await shot(p, "01-tutorial");
    await tap(p, "Дальше", { wait: 700 });
    await shot(p, "02-tutorial-puzzle");
    await p.close();
  }
  if (want("login")) {
    p = await open("loginDue");
    await sleep(500);
    await shot(p, "03-login-reward");
    await p.close();
  }
  if (want("hive")) {
    p = await open("mid");
    await shot(p, "04-hive");
    await tap(p, "Сота 2, уровень 3", { label: true, wait: 600 });
    await p.mouse.move(206, 600); await p.mouse.wheel({ deltaY: 380 }); await sleep(600);
    await shot(p, "05-hive-comb-upgrade");
    await p.close();
    p = await open("full");
    await p.mouse.move(206, 600); await p.mouse.wheel({ deltaY: 300 }); await sleep(600);
    await shot(p, "06-hive-full");
    await tap(p, "Собрать мёд", { label: true, wait: 380 });
    await shot(p, "07-hive-collect-flight");
    await p.close();
  }
  if (want("flight")) {
    // v1.1: bees on curved flight paths, some resting on combs; then the collect swarm
    p = await open("mid");
    await sleep(2600);
    await shot(p, "17-hive-bees-flight");
    await sleep(1900);
    await shot(p, "18-hive-bees-flight-2");
    await p.close();
    p = await open("full");
    await p.mouse.move(206, 600); await p.mouse.wheel({ deltaY: 300 }); await sleep(600);
    await tap(p, "Собрать мёд", { label: true, wait: 820 });
    await shot(p, "19-hive-collect-swarm");
    await p.close();
  }
  if (want("zip")) {
    p = await open("mid");
    await tap(p, "Головоломка", { label: true, wait: 700 });
    await tap(p, "Играть ежедневную головоломку", { label: true, wait: 2200 });
    const best = seeds.moves.reduce((bi, m, i) => (m.length > seeds.moves[bi].length ? i : bi), 0);
    for (let i = 0; i <= best; i++) {
      const pts = await boardPts(p, seeds.moves[i]);
      await p.mouse.move(pts[0].x, pts[0].y); await p.mouse.down();
      for (const q of pts.slice(1)) { await p.mouse.move(q.x, q.y, { steps: 4 }); await sleep(40); }
      await p.mouse.up();
      if (i === best) { await sleep(620); await shot(p, "20-game-combo-zip"); }
      else await sleep(750);
    }
    await p.close();
  }
  if (want("puzzle")) {
    p = await open("mid");
    await tap(p, "Головоломка", { label: true, wait: 700 });
    await shot(p, "08-puzzle-hub");
    await tap(p, "Играть ежедневную головоломку", { label: true, wait: 2200 });
    await shot(p, "09-game-board");
    const best = seeds.moves.reduce((bi, m, i) => (m.length > seeds.moves[bi].length ? i : bi), 0);
    for (let i = 0; i < seeds.moves.length; i++) {
      const pts = await boardPts(p, seeds.moves[i]);
      await p.mouse.move(pts[0].x, pts[0].y); await p.mouse.down();
      for (const q of pts.slice(1)) { await p.mouse.move(q.x, q.y, { steps: 4 }); await sleep(40); }
      if (i === best) { await sleep(250); await shot(p, "10-game-drag"); }
      await p.mouse.up();
      if (i === best) { await sleep(160); await shot(p, "11-game-pop"); }
      await sleep(i === best ? 900 : 750);
    }
    await sleep(3200);
    await shot(p, "12-round-result");
    await p.close();
  }
  if (want("bees")) {
    p = await open("mid");
    await tap(p, "Пчёлы", { label: true, wait: 800 });
    await shot(p, "13-bees");
    await tap(p, "Шмель Борис", { label: true, wait: 700 });
    await shot(p, "14-bee-detail");
    await p.close();
  }
  if (want("tasks")) {
    p = await open("mid");
    await tap(p, "Задания", { label: true, wait: 800 });
    await shot(p, "15-tasks");
    await p.close();
  }
  if (want("settings")) {
    p = await open("mid");
    await tap(p, "Настройки", { label: true, wait: 700 });
    await shot(p, "16-settings");
    await p.close();
  }
} finally {
  await browser.close();
}
