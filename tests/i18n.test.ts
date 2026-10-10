/** v1.4 i18n: plural rules, number formatting, complete & consistent translations, live data names. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Entry, LANGS, numFmt, pluralCat, render, setLang, STRINGS, t, tx } from "../src/i18n";
import { BEES } from "../src/logic/bees";
import { FLOWERS } from "../src/logic/garden";
import { ITEMS, PAGES, RARE_ENTRIES, BOX_INFO, BOOSTERS } from "../src/logic/loot";
import { UPGRADES } from "../src/logic/economy";
import { taskById } from "../src/logic/tasks";
import { duration, dateLong } from "../src/ui/format";

const ALL = STRINGS as Record<string, Entry>;
const vals = (v: Entry[keyof Entry]) => (typeof v === "string" ? [v] : Object.values(v));
const ph = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(",");

test("plural categories: en one/other, uk & ru one/few/many (CLDR)", () => {
  assert.deepEqual([0, 1, 2, 5, 11, 21].map((n) => pluralCat("en", n)), ["other", "one", "other", "other", "other", "other"]);
  for (const l of ["uk", "ru"] as const) {
    assert.deepEqual([1, 21, 101].map((n) => pluralCat(l, n)), ["one", "one", "one"]);
    assert.deepEqual([2, 3, 4, 22, 34].map((n) => pluralCat(l, n)), ["few", "few", "few", "few", "few"]);
    assert.deepEqual([0, 5, 11, 12, 14, 19, 25, 100, 111].map((n) => pluralCat(l, n)), Array(9).fill("many"));
  }
});

test("plural words: 1 бджола / 2 бджоли / 5 бджіл, 1 пчела / 2 пчелы / 5 пчёл, 1 bee / 2 bees", () => {
  const b = (l: "en" | "uk" | "ru", n: number) => render(ALL["unit.bees"], l, { n });
  assert.deepEqual([1, 2, 5, 11, 21, 22].map((n) => b("uk", n)), ["1 бджола", "2 бджоли", "5 бджіл", "11 бджіл", "21 бджола", "22 бджоли"]);
  assert.deepEqual([1, 2, 5, 11, 21, 22].map((n) => b("ru", n)), ["1 пчела", "2 пчелы", "5 пчёл", "11 пчёл", "21 пчела", "22 пчелы"]);
  assert.deepEqual([1, 2, 5].map((n) => b("en", n)), ["1 bee", "2 bees", "5 bees"]);
  assert.equal(render(ALL["drop.fragment"], "ru", { n: 3 }), "3 фрагмента");
  assert.equal(render(ALL["unit.days"], "uk", { n: 14 }), "14 днів");
});

test("numbers: 12,345 in English, 12 345 in Ukrainian/Russian; decimal comma", () => {
  assert.equal(numFmt(12345, "en"), "12,345");
  assert.equal(numFmt(12345, "uk"), "12\u00A0345");
  assert.equal(numFmt(1234, "ru"), "1234");
  assert.equal(numFmt(1234, "en"), "1,234");
  assert.equal(numFmt(2.5, "en"), "2.5");
  assert.equal(numFmt(2.5, "ru"), "2,5");
  assert.equal(render(ALL["hive.collectN"], "en", { n: 15000 }), "Collect 15,000");
});

test("every key has all three languages, non-empty, same placeholders, correct plural shapes", () => {
  const problems: string[] = [];
  for (const [k, e] of Object.entries(ALL)) {
    for (const l of LANGS) {
      const v = e[l];
      if (v === undefined) { problems.push(`${k}: missing ${l}`); continue; }
      if (typeof v !== "string") {
        const want = l === "en" ? ["one", "other"] : ["few", "many", "one"];
        if (Object.keys(v).sort().join() !== want.sort().join()) problems.push(`${k}: ${l} plural forms ${Object.keys(v)}`);
      }
      for (const s of vals(v)) if (!s.trim()) problems.push(`${k}: empty ${l}`);
    }
    const ref = ph(vals(e.en).join(" "));
    for (const l of ["uk", "ru"] as const) if (ph(vals(e[l]).join(" ")) !== ref) problems.push(`${k}: ${l} placeholders differ from en`);
  }
  assert.deepEqual(problems, []);
});

test("English and Ukrainian texts contain no Russian-only letters; English has no Cyrillic", () => {
  const bad: string[] = [];
  for (const [k, e] of Object.entries(ALL)) {
    if (/[А-Яа-яЁёІіЇїЄєҐґ]/.test(vals(e.en).join(" "))) bad.push(`${k}: en`);
    if (/[ЫыЭэЁёЪъ]/.test(vals(e.uk).join(" "))) bad.push(`${k}: uk`);
    if (/[ІіЇїЄєҐґ]/.test(vals(e.ru).join(" "))) bad.push(`${k}: ru`);
  }
  assert.deepEqual(bad, []);
});

test("every game-data name resolves to a real translation in every language (no raw keys)", () => {
  for (const l of LANGS) {
    setLang(l);
    const names = [
      ...BEES.flatMap((b) => [b.name, b.flavor, b.ability]), ...FLOWERS.map((f) => f.name),
      ...[...ITEMS, ...RARE_ENTRIES].flatMap((i) => [i.name, i.desc]), ...PAGES.flatMap((p) => [p.title, p.bonus]),
      ...Object.values(BOX_INFO).flatMap((b) => [b.name, b.how]), ...Object.values(BOOSTERS).flatMap((b) => [b.name, b.desc]),
      ...UPGRADES.flatMap((u) => [u.name, u.desc(1)]),
      ...["chain6", "chain8", "score", "rounds", "bomb", "collect", "build", "daily", "honey", "harvest2", "water3", "plant2", "nectar20", "levelup", "cells0", "cells4"].map((id) => taskById(id)!.text),
      ...["box.howShort.wood", "box.howShort.wax", "box.howShort.gold", "rarityShort.epic", "ls.kind.item", "wn.1.4.0", "month.0", "wd.6"].map((k) => tx(k)),
    ];
    for (const n of names) {
      assert.ok(n && n.length > 0, `${l}: empty`);
      assert.ok(!/^(bee|flower|item|page|box|boost|up|task|color|ls|wn|month|wd|rarity)\./.test(n), `${l}: untranslated ${n}`);
      assert.ok(!/\{\w+\}/.test(n), `${l}: placeholder left in "${n}"`);
    }
  }
  setLang("en");
});

test("localized creative bee names differ per language and switch live", () => {
  setLang("en"); const en = BEES.map((b) => b.name);
  setLang("uk"); const uk = BEES.map((b) => b.name);
  setLang("ru"); const ru = BEES.map((b) => b.name);
  assert.equal(en[0], "Buzzy"); assert.equal(uk[0], "Дзизя"); assert.equal(ru[0], "Жужа");
  assert.equal(new Set(en).size, BEES.length); assert.equal(new Set(uk).size, BEES.length); assert.equal(new Set(ru).size, BEES.length);
  setLang("uk");
  assert.equal(taskById("cells0")!.text, "Збери 50 жовтих сот");
  assert.equal(duration(90 * 60_000), "1 год 30 хв");
  assert.equal(dateLong(new Date(2026, 9, 10)), "10 жовтня");
  setLang("en");
  assert.equal(dateLong(new Date(2026, 9, 10)), "October 10");
  assert.equal(t("game.streak", { n: 1 }), "Streak: 1 day");
});
