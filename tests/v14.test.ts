/** v1.4: language picker flow, migration to v5 (language, settings, early-player flag), update version compare, notifications. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseLanguage, isSpeciesName, migrate, newState, renameBee, setSetting, STATE_VERSION, unlockBee } from "../src/logic/game";
import { changelogText, compareVersions, isNewer, parseRelease, parseVersionCode, shouldAutoCheck } from "../src/logic/update";
import { planNotifications, quiet } from "../src/logic/notifyPlan";
import { decodeSave, encodeSave } from "../src/logic/saveCode";
import { getLang, setLang } from "../src/i18n";
import { APP_VERSION, APP_VERSION_CODE } from "../src/version";
import { existsSync, readFileSync } from "node:fs";

const T = new Date(2026, 9, 10, 12, 0).getTime();

test("new player: English by default, picker not yet confirmed, early-player mark from today", () => {
  const s = newState(T);
  assert.equal(s.version, STATE_VERSION);
  assert.equal(STATE_VERSION, 5);
  assert.equal(s.settings.lang, "en");
  assert.equal(s.settings.langPicked, false);
  assert.deepEqual(s.early, { firstSeen: "2026-10-10", version: APP_VERSION, early: true });
  assert.equal(s.settings.lastVersion, APP_VERSION); // no "What's new" for a brand-new player
});

test("language picker flow: confirming stores the language and is never asked again; it survives save/load", () => {
  let s = newState(T);
  s = chooseLanguage(s, "uk");
  assert.equal(s.settings.lang, "uk");
  assert.equal(s.settings.langPicked, true);
  const back = migrate(JSON.parse(JSON.stringify(s)), T + 1000);
  assert.equal(back.settings.lang, "uk");
  assert.equal(back.settings.langPicked, true);
  const code = decodeSave(encodeSave(s), T + 2000);
  assert.ok(code.ok && code.state.settings.lang === "uk" && code.state.settings.langPicked);
  // a broken language value falls back to English but keeps the confirmation
  const weird = migrate({ ...JSON.parse(JSON.stringify(s)), settings: { ...s.settings, lang: "de" } }, T);
  assert.equal(weird.settings.lang, "en");
});

test("migration ≤1.3 (v4) → v5: keeps Russian, shows the picker once, What's new for 1.4, early mark from the oldest known day", () => {
  const v4 = JSON.parse(JSON.stringify(newState(T))) as Record<string, any>;
  v4.version = 4;
  v4.settings = { notifications: true, haptics: false, tutorialDone: true, notifPromptDismissed: true, gardenReminders: false, gardenIntroDone: true };
  delete v4.early;
  const d0 = Math.floor(Date.UTC(2026, 6, 1) / 86400000);
  v4.daily.results = { [d0]: { stars: 2, score: 2000 }, [d0 + 5]: { stars: 1, score: 1200 } };
  const m = migrate(v4, T);
  assert.equal(m.version, 5);
  assert.equal(m.settings.lang, "ru");
  assert.equal(m.settings.langPicked, false);
  assert.equal(m.settings.haptics, false);          // old settings kept
  assert.equal(m.settings.gardenReminders, false);
  assert.equal(m.settings.notifHive, true);          // new ones get defaults
  assert.equal(m.settings.quietOn, true);
  assert.equal(m.settings.lastVersion, "1.3.0");
  assert.deepEqual(m.early, { firstSeen: "2026-07-01", version: "≤1.3", early: true });
  // after the picker the flag stays and the choice sticks
  const again = migrate(JSON.parse(JSON.stringify(chooseLanguage(m, "ru"))), T + 5000);
  assert.equal(again.settings.langPicked, true);
  assert.deepEqual(again.early, m.early);
});

test("custom bee names: the species name in any language counts as no custom name", () => {
  let s = unlockBee({ ...newState(T), jelly: 99 }, "pushinka", T)!;
  assert.ok(isSpeciesName("pushinka", "Пушинка") && isSpeciesName("pushinka", "Fuzzle") && isSpeciesName("pushinka", "Пухнастик"));
  s = renameBee(s, "pushinka", "Fuzzle")!;
  assert.deepEqual(s.beeNames, {});
  s = renameBee(s, "pushinka", "Пчёлка Майя")!;
  assert.equal(s.beeNames.pushinka, "Пчёлка Майя");
});

test("version compare: semver, versionCode wins, pre-releases below releases", () => {
  assert.equal(compareVersions("1.4.0", "1.3.9"), 1);
  assert.equal(compareVersions("v1.10.0", "1.9.3"), 1);
  assert.equal(compareVersions("1.4", "1.4.0"), 0);
  assert.equal(compareVersions("1.4.0-beta", "1.4.0"), -1);
  assert.equal(compareVersions("1.3.0", "1.4.0"), -1);
  assert.equal(parseVersionCode("Buzzle 1.4.1 (versionCode 7)"), 7);
  assert.equal(parseVersionCode("versionCode: 12"), 12);
  assert.equal(parseVersionCode("no code"), null);
  const rel = (tag: string, body = "") => parseRelease({ tag_name: tag, body, html_url: "https://x", assets: [{ name: `Buzzle-${tag}.apk`, browser_download_url: "https://dl/apk", size: 30_000_000 }] })!;
  assert.equal(isNewer(rel("v1.4.1"), "1.4.0", 6), true);
  assert.equal(isNewer(rel("v1.4.0"), "1.4.0", 6), false);
  assert.equal(isNewer(rel("v1.3.0"), "1.4.0", 6), false);
  assert.equal(isNewer(rel("v1.4.0", "versionCode 7 (hotfix)"), "1.4.0", 6), true);   // same name, newer build
  assert.equal(isNewer(rel("v1.3.9", "versionCode 5"), "1.4.0", 6), false);           // older build
  assert.equal(rel("v1.4.1").apkUrl, "https://dl/apk");
  assert.equal(rel("v1.4.1").apkSize, 30_000_000);
  assert.equal(parseRelease({ tag_name: "v2.0.0", prerelease: true }), null);
  assert.equal(parseRelease({ tag_name: "nightly" }), null);
  assert.equal(parseRelease(null), null);
});

test("changelog text: English part only, markdown stripped; daily auto-check", () => {
  const body = "## What's new\n- **Languages**: `en`/`uk`/`ru`\n- [Privacy](https://x)\n\n---\nКоротко: ...";
  assert.equal(changelogText(body), "What's new\n• Languages: en/uk/ru\n• Privacy");
  assert.equal(shouldAutoCheck(0, T), true);
  assert.equal(shouldAutoCheck(T - 3600_000, T), false);
  assert.equal(shouldAutoCheck(T - 25 * 3600_000, T), true);
  assert.equal(shouldAutoCheck(T + 3600_000, T), true); // clock went back
});

test("app version is the same everywhere (app.json, package.json, build.gradle)", (t) => {
  const app = JSON.parse(readFileSync("app.json", "utf8")).expo;
  assert.equal(app.version, APP_VERSION);
  assert.equal(app.android.versionCode, APP_VERSION_CODE);
  assert.equal(JSON.parse(readFileSync("package.json", "utf8")).version, APP_VERSION);
  // android/ is a gitignored prebuild output: checked only when present; a dev build may name itself "1.5.5-dev",
  // and a prebuild older than the last versionCode bump is reported, not failed (re-run `expo prebuild --clean`)
  if (!existsSync("android/app/build.gradle")) return;
  const g = readFileSync("android/app/build.gradle", "utf8");
  assert.match(g, new RegExp(`versionName "${APP_VERSION.replace(/\\./g, "\\\\.")}(-dev)?"`));
  const code = Number(/versionCode (\d+)/.exec(g)?.[1]);
  if (code !== APP_VERSION_CODE) t.diagnostic(`android/ prebuild is stale: versionCode ${code}, app.json ${APP_VERSION_CODE}`);
});

test("notifications: per type, quiet hours, localized texts", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 10, h, m).getTime();
  assert.equal(quiet(at(23), 22, 9), new Date(2026, 9, 11, 9).getTime());
  assert.equal(quiet(at(3), 22, 9), at(9));
  assert.equal(quiet(at(12), 22, 9), at(12));
  assert.equal(quiet(at(14), 13, 15), at(15)); // a daytime window works too
  let s = { ...newState(T), settings: { ...newState(T).settings, notifications: true } };
  s.hive = { ...s.hive, combs: s.hive.combs.map((c, i) => (i < 3 ? 2 : c)), stored: 0, lastTick: T };
  setLang("uk");
  const all = planNotifications(s, T);
  assert.ok(all.some((n) => n.id === "hive-full"));
  assert.ok(all.every((n) => !/[ЫыЭэЁё]/.test(n.title + n.body)));
  assert.ok(all.find((n) => n.id === "daily-next")!.title.includes("головоломка дня"));
  s = setSetting(s, "notifHive", false);
  s = setSetting(s, "notifDaily", false);
  const some = planNotifications(s, T);
  assert.ok(!some.some((n) => n.id === "hive-full" || n.id.startsWith("daily")));
  s = { ...s, loot: { ...s.loot, boxes: { ...s.loot.boxes, wood: 2 } } };
  const combs = planNotifications(s, T).find((n) => n.id === "combs")!;
  assert.equal(combs.body, "2 невідкриті соти чекають у вкладці «Сюрпризи».");
  assert.equal(planNotifications(setSetting(s, "notifChests", false), T).find((n) => n.id === "combs"), undefined);
  // every reminder respects quiet hours
  s = setSetting(setSetting(s, "notifDaily", true), "notifHive", true);
  for (const n of planNotifications(s, T)) { const h = new Date(n.at).getHours(); assert.ok(h >= 9 && h < 22, `${n.id} at ${h}`); }
  setLang("en");
  assert.equal(getLang(), "en");
});
