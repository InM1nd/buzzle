/** v1.6 tile style setting: calm "soft" by default, kept through save/load, junk values fall back. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate, newState, setSetting } from "../src/logic/game";

test("tile style: default soft, saved, invalid falls back", () => {
  const now = Date.now();
  assert.equal(newState(now).settings.tiles, "soft");
  const s = setSetting(newState(now), "tiles", "wax");
  assert.equal(migrate(JSON.parse(JSON.stringify(s)), now).settings.tiles, "wax");
  assert.equal(migrate({ ...s, settings: { ...s.settings, tiles: "neon" } }, now).settings.tiles, "soft");
  const old = JSON.parse(JSON.stringify(newState(now))); delete old.settings.tiles;
  assert.equal(migrate(old, now).settings.tiles, "soft");
});

test("approved dev tile styles survive save/load without changing progress", () => {
  const now = Date.now();
  for (const style of ["balanced", "faceted"] as const) {
    const original = { ...newState(now), honey: 4321, nectar: 234, jelly: 12 };
    const selected = setSetting(original, "tiles", style);
    const restored = migrate(JSON.parse(JSON.stringify(selected)), now);
    assert.equal(restored.settings.tiles, style);
    assert.equal(restored.honey, original.honey);
    assert.equal(restored.nectar, original.nectar);
    assert.equal(restored.jelly, original.jelly);
    assert.deepEqual(restored.hive.combs, original.hive.combs);
    assert.deepEqual(restored.bees, original.bees);
  }
});
