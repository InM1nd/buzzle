import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateLoot, openComb, newLoot, buyItem, PAGES, DUP_POLLEN, LOOT_ITEMS, RETIRED, ITEM_BY_ID } from "../src/logic/loot";
import { migrate, newState } from "../src/logic/game";

test("retired headphones never come out of combs and are not in the album or shop", () => {
  assert.ok(!LOOT_ITEMS().some((i) => RETIRED.includes(i.id)));
  assert.ok(!PAGES.some((p) => p.items.includes("headphones")));
  assert.equal(buyItem({ ...newLoot(1), pollen: 9999 }, "headphones"), null);
  let l = { ...newLoot(7), boxes: { wood: 0, wax: 0, gold: 1500, royal: 0 } };
  const ctx = { hiveLvl: 10, flowers: ["sunflower"], hasNightBee: false };
  for (let i = 0; i < 1500; i++) {
    const r = openComb(l, "gold", ctx)!;
    for (const d of r.drops) if (d.t === "item") assert.notEqual(d.id, "headphones");
    l = { ...r.loot, owned: [] };
  }
});

test("owners keep the headphones and get the epic duplicate pollen exactly once", () => {
  const raw = { ...newLoot(3), owned: ["headphones", "scarf"], pollen: 10 };
  delete (raw as any).retired;
  const a = migrateLoot(raw, 1);
  const p = DUP_POLLEN[ITEM_BY_ID.headphones.rarity];
  assert.equal(p, 30);
  assert.equal(a.pollen, 10 + p);
  assert.ok(a.owned.includes("headphones"));
  const b = migrateLoot(JSON.parse(JSON.stringify(a)), 1);
  assert.equal(b.pollen, a.pollen);
  const none = migrateLoot({ ...newLoot(3), owned: ["scarf"], pollen: 10 }, 1);
  assert.equal(none.pollen, 10);
});

test("a bee wearing the headphones is undressed by the migration", () => {
  const s: any = JSON.parse(JSON.stringify(newState(Date.now())));
  s.loot.owned = ["headphones"]; delete s.loot.retired; s.beeSkins = { zhuzha: "headphones" };
  const m = migrate(s, Date.now());
  assert.equal(m.beeSkins.zhuzha, undefined);
  assert.equal(migrate(JSON.parse(JSON.stringify(m)), Date.now()).loot.pollen, m.loot.pollen);
});
