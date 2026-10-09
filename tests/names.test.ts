/** v1.2.1: custom bee names, cleaning / limits, reset, save migration v2 -> v3. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beeDisplayName, cleanBeeName, graphemes, MAX_BEE_NAME, migrate, newState, renameBee, STATE_VERSION, unlockBee } from "../src/logic/game";

const T = 1_760_000_000_000;

test("rename an owned bee; the display name follows, species stays the default", () => {
  const s = newState(T);
  assert.equal(beeDisplayName(s, "zhuzha"), "Жужа");
  const r = renameBee(s, "zhuzha", "  Мёдик  ")!;
  assert.equal(r.beeNames.zhuzha, "Мёдик");
  assert.equal(beeDisplayName(r, "zhuzha"), "Мёдик");
  assert.equal(beeDisplayName(r, "boris"), "Шмель Борис");
});

test("cannot rename a bee you don't own", () => {
  assert.equal(renameBee(newState(T), "margo", "Королева"), null);
  assert.equal(renameBee(newState(T), "nope", "X"), null);
});

test("empty name or the species name resets to default", () => {
  let s = renameBee(newState(T), "zhuzha", "Бзз")!;
  s = renameBee(s, "zhuzha", "   ")!;
  assert.equal(s.beeNames.zhuzha, undefined);
  s = renameBee(renameBee(s, "zhuzha", "Бзз")!, "zhuzha", "Жужа")!;
  assert.deepEqual(s.beeNames, {});
});

test("cleaning: whitespace collapsed, control characters removed, max 16 characters", () => {
  assert.equal(cleanBeeName("  Пчёлка \n\t Майя  "), "Пчёлка Майя");
  assert.equal(cleanBeeName("A\u0000B\u200BC"), "A B C");
  assert.equal(cleanBeeName("абвгдеёжзийклмнопрст"), "абвгдеёжзийклмно");
  assert.equal(graphemes(cleanBeeName("x".repeat(40))).length, MAX_BEE_NAME);
  // no trailing space after cutting
  assert.equal(cleanBeeName("abcdefghijklmno pqrs"), "abcdefghijklmno");
});

test("emoji are allowed and count as one character each (ZWJ, skin tones, flags)", () => {
  assert.equal(cleanBeeName("Бзз 🐝"), "Бзз 🐝");
  assert.equal(graphemes("👩‍👩‍👧🐝👍🏽🇺🇦").length, 4);
  const many = "🐝".repeat(20);
  assert.equal(cleanBeeName(many), "🐝".repeat(16));
  const fam = "👩‍👩‍👧".repeat(18);
  assert.equal(graphemes(cleanBeeName(fam)).length, 16);
  assert.ok(cleanBeeName(fam).endsWith("👧"), "a ZWJ sequence is never cut in half");
});

test("names survive a round trip and are re-validated on load", () => {
  let s = unlockBee({ ...newState(T), jelly: 99 }, "pushinka", T)!;
  s = renameBee(renameBee(s, "zhuzha", "Королева 👑")!, "pushinka", "Пух")!;
  const back = migrate(JSON.parse(JSON.stringify(s)), T);
  assert.deepEqual(back.beeNames, { zhuzha: "Королева 👑", pushinka: "Пух" });
  const bad = migrate({ ...JSON.parse(JSON.stringify(s)), beeNames: { zhuzha: 42, ghost: "Призрак", boris: "  Шмель Борис ", pushinka: "x".repeat(99) } }, T);
  assert.deepEqual(bad.beeNames, { pushinka: "x".repeat(16) });
});

test("migration v2 (1.2.0) -> v3: no names, everything else kept", () => {
  const v2 = { ...newState(T), version: 2, honey: 4321, beeLevels: { zhuzha: 7 } } as Record<string, unknown>;
  delete v2.beeNames;
  const m = migrate(JSON.parse(JSON.stringify(v2)), T);
  assert.equal(STATE_VERSION, 3);
  assert.equal(m.version, 3);
  assert.deepEqual(m.beeNames, {});
  assert.equal(m.honey, 4321);
  assert.equal(m.beeLevels.zhuzha, 7);
  assert.equal(m.settings.gardenIntroDone, newState(T).settings.gardenIntroDone); // v2 already saw the garden intro default
});

test("grapheme fallback without Intl.Segmenter (older Hermes) gives the same answers", () => {
  const I = Intl as unknown as { Segmenter?: unknown };
  const saved = I.Segmenter;
  I.Segmenter = undefined;
  try {
    assert.equal(graphemes("👩‍👩‍👧🐝👍🏽🇺🇦").length, 4);
    assert.equal(graphemes("Ёжик").length, 4);
    assert.equal(graphemes("e\u0301").length, 1);
    assert.equal(graphemes("1️⃣").length, 1);
    assert.equal(cleanBeeName("🐝".repeat(20)), "🐝".repeat(16));
  } finally {
    I.Segmenter = saved;
  }
});
