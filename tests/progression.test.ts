import { test } from "node:test";
import assert from "node:assert/strict";
import { UpgradeId } from "../src/logic/economy";
import { buyUpgrade, combAction, combActionCost, migrate, newState, rate, upgradeCostFor } from "../src/logic/game";
import { decodeSave, encodeSave } from "../src/logic/saveCode";

const NOW = new Date(2026, 9, 15, 12).getTime();
const LIMITS = { workers: [15, 30], storage: [6, 12], flowers: [15, 30], queen: [5, 10] } as const;

test("previously maxed comb can reach 40, charges honey and stops at 40", () => {
  let s = newState(NOW);
  s.honey = 1e12;
  s.hive.combs[0] = 20;
  const before = rate(s);
  for (let level = 20; level < 40; level++) {
    const price = combActionCost(s, 0)!;
    assert.ok(Number.isSafeInteger(price) && price > 0);
    assert.equal(combAction({ ...s, honey: price - 1 }, 0, NOW), null);
    const next = combAction(s, 0, NOW)!;
    assert.equal(next.honey, s.honey - price);
    assert.equal(next.hive.combs[0], level + 1);
    s = next;
  }
  assert.ok(rate(s) > before);
  assert.equal(combActionCost(s, 0), null);
  assert.equal(combAction(s, 0, NOW), null);
});

for (const id of Object.keys(LIMITS) as UpgradeId[]) {
  test(`previously maxed ${id} can continue to its doubled limit`, () => {
    const [oldMax, newMax] = LIMITS[id];
    let s = newState(NOW);
    s.honey = 1e12;
    s.upgrades[id] = oldMax;
    for (let level = oldMax; level < newMax; level++) {
      const price = upgradeCostFor(s, id)!;
      assert.ok(Number.isSafeInteger(price) && price > 0);
      assert.equal(buyUpgrade({ ...s, honey: price - 1 }, id, NOW), null);
      const next = buyUpgrade(s, id, NOW)!;
      assert.equal(next.honey, s.honey - price);
      assert.equal(next.upgrades[id], level + 1);
      s = next;
    }
    assert.equal(upgradeCostFor(s, id), null);
    assert.equal(buyUpgrade(s, id, NOW), null);
  });
}

test("old progress is preserved and higher levels survive save export/import", () => {
  const old = newState(NOW);
  old.hive.combs[0] = 20;
  old.upgrades = { workers: 15, storage: 6, flowers: 15, queen: 5 };
  const loaded = migrate(JSON.parse(JSON.stringify(old)), NOW);
  assert.deepEqual(loaded.hive.combs, old.hive.combs);
  assert.deepEqual(loaded.upgrades, old.upgrades);
  assert.equal(rate(loaded), rate(old));
  loaded.hive.combs[0] = 40;
  loaded.upgrades = { workers: 30, storage: 12, flowers: 30, queen: 10 };
  const result = decodeSave(encodeSave(loaded), NOW);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.state.version, old.version);
  assert.deepEqual(result.state.hive.combs, loaded.hive.combs);
  assert.deepEqual(result.state.upgrades, loaded.upgrades);
  assert.equal(rate(result.state), rate(loaded));
});
