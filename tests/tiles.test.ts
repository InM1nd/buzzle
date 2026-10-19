/** Selected glyph styles and backwards-compatible cosmetic save migration. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate, newState, setSetting, TILE_STYLES } from "../src/logic/game";

test("tile style: selected lineup, default mellow, saved, invalid falls back", () => {
  const now = Date.now();
  assert.deepEqual(TILE_STYLES, ["classic", "pastel", "wax", "balanced", "mellow"]);
  assert.equal(newState(now).settings.tiles, "mellow");
  const s = setSetting(newState(now), "tiles", "wax");
  assert.equal(migrate(JSON.parse(JSON.stringify(s)), now).settings.tiles, "wax");
  assert.equal(migrate({ ...s, settings: { ...s.settings, tiles: "neon" } }, now).settings.tiles, "mellow");
  const old = JSON.parse(JSON.stringify(newState(now))); delete old.settings.tiles;
  assert.equal(migrate(old, now).settings.tiles, "mellow");
});

test("all selected tile styles survive save/load without changing progress", () => {
  const now = Date.now();
  for (const style of TILE_STYLES) {
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

test("archived cosmetic choices migrate to retained styles and preserve the rest of the save", () => {
  const now = Date.now();
  for (const [archived, replacement] of [["soft", "mellow"], ["faceted", "balanced"]]) {
    const current = migrate({ ...newState(now), honey: 4321, nectar: 234, jelly: 12 }, now);
    const raw = JSON.parse(JSON.stringify(current));
    raw.settings.tiles = archived;
    const restored = migrate(raw, now);
    assert.deepEqual(restored, { ...current, settings: { ...current.settings, tiles: replacement } });
  }
});
