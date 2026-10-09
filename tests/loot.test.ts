/** v1.3 surprise combs: seeded determinism, visible odds, pity, duplicates → pollen, shop, night bee, album. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOX_ODDS, BoxKind, Drop, DUP_POLLEN, ITEMS, KIND_ODDS, Loot, newLoot, openComb, OpenCtx, PITY_EPIC, PITY_LEGENDARY, RARITIES,
  SHOP_PRICE, buyItem, FRAGMENTS_FOR_BEE, albumBonus, PAGES, migrateLoot, BONUS_GOLD,
} from "../src/logic/loot";
import { addBoxes, assembleNightBee, canAssembleNightBee, harvestAction, newState, openAllBoxes, openBox, plantFlower, setSkin, shopBuyItem, waterBedAction, unlockBee, migrate, rate, puzzleHoneyMult } from "../src/logic/game";
import { BEE_BY_ID } from "../src/logic/bees";

const T = 1_760_000_000_000;
const CTX: OpenCtx = { hiveLvl: 3, flowers: ["sunflower", "clover"], hasNightBee: false };
const withBoxes = (l: Loot, kind: BoxKind, n: number): Loot => ({ ...l, boxes: { ...l.boxes, [kind]: n } });

function openMany(kind: BoxKind, n: number, seed = 42, ctx = CTX) {
  let l = withBoxes(newLoot(seed), kind, n);
  const all: Drop[][] = [];
  for (let i = 0; i < n; i++) { const r = openComb(l, kind, ctx)!; l = r.loot; all.push(r.drops); }
  return { loot: l, all };
}

test("same seed → same contents; opening advances the stored PRNG (reload can't re-roll)", () => {
  const a = openMany("wax", 50, 7), b = openMany("wax", 50, 7), c = openMany("wax", 50, 8);
  assert.deepEqual(a.all, b.all);
  assert.notDeepEqual(a.all, c.all);
  const l = withBoxes(newLoot(7), "wax", 1);
  const r1 = openComb(l, "wax", CTX)!, r2 = openComb(l, "wax", CTX)!;
  assert.deepEqual(r1.drops, r2.drops, "pure: the same state always opens the same way");
  assert.notEqual(r1.loot.rng, l.rng);
  assert.equal(r1.loot.boxes.wax, 0);
  assert.equal(openComb(r1.loot, "wax", CTX), null, "no comb left");
});

test("rarity of item slots matches the odds shown in the game (±0.6%)", () => {
  for (const kind of ["wood", "wax"] as BoxKind[]) {
    const { all } = openMany(kind, 40000, 99);
    const slots = all.flat().filter((d) => d.slot);
    assert.equal(slots.length, 40000 * BOX_ODDS[kind].slots);
    RARITIES.forEach((r, i) => {
      const f = (100 * slots.filter((d) => d.rarity === r).length) / slots.length;
      assert.ok(Math.abs(f - BOX_ODDS[kind].odds[i]) < 0.6, `${kind} ${r}: ${f.toFixed(2)}% vs ${BOX_ODDS[kind].odds[i]}%`);
    });
  }
});

test("what a slot turns into follows KIND_ODDS; bonus golden comb chance matches", () => {
  const { all } = openMany("wax", 40000, 5);
  const common = all.flat().filter((d) => d.slot && d.rarity === "common");
  const share = (t: string) => (100 * common.filter((d) => d.t === t).length) / common.length;
  for (const [k, w] of KIND_ODDS.common) assert.ok(Math.abs(share(k) - w) < 1.2, `${k}: ${share(k).toFixed(2)} vs ${w}`);
  const gold = (100 * all.filter((ds) => ds.some((d) => d.t === "box" && d.kind === "gold")).length) / all.length;
  assert.ok(Math.abs(gold - BONUS_GOLD.wax) < 0.5, `bonus gold ${gold}`);
});

test("golden comb: the first slot is always rare or better", () => {
  const { all } = openMany("gold", 5000, 3);
  for (const ds of all) {
    const slots = ds.filter((d) => d.slot);
    assert.equal(slots.length, 3);
    assert.ok(slots.some((d) => d.rarity !== "common"));
  }
});

test("pity: epic+ at least every 10 golden combs, legendary at least every 30", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const { all } = openMany("gold", 3000, seed);
    let noEpic = 0, noLeg = 0, maxE = 0, maxL = 0;
    for (const ds of all) {
      const s = ds.filter((d) => d.slot);
      noEpic = s.some((d) => d.rarity === "epic" || d.rarity === "legendary") ? 0 : noEpic + 1;
      noLeg = s.some((d) => d.rarity === "legendary") ? 0 : noLeg + 1;
      maxE = Math.max(maxE, noEpic); maxL = Math.max(maxL, noLeg);
    }
    assert.ok(maxE <= PITY_EPIC - 1, `seed ${seed}: ${maxE} golden combs in a row without epic`);
    assert.ok(maxL <= PITY_LEGENDARY - 1, `seed ${seed}: ${maxL} golden combs in a row without legendary`);
  }
});

test("pity counters force the guaranteed item and reset", () => {
  for (let seed = 0; seed < 200; seed++) {
    const l = { ...withBoxes(newLoot(seed), "gold", 1), pity: { sinceEpic: PITY_EPIC - 1, sinceLeg: 0 } };
    const r = openComb(l, "gold", CTX)!;
    assert.ok(r.drops.some((d) => d.slot && (d.rarity === "epic" || d.rarity === "legendary")));
    assert.equal(r.loot.pity.sinceEpic, 0);
    const l2 = { ...withBoxes(newLoot(seed), "gold", 1), pity: { sinceEpic: 0, sinceLeg: PITY_LEGENDARY - 1 } };
    const r2 = openComb(l2, "gold", CTX)!;
    assert.ok(r2.drops.some((d) => d.slot && d.rarity === "legendary"));
    assert.equal(r2.loot.pity.sinceLeg, 0);
  }
  // wood / wax never touch the golden pity
  const w = openComb({ ...withBoxes(newLoot(1), "wax", 1), pity: { sinceEpic: 4, sinceLeg: 7 } }, "wax", CTX)!;
  assert.deepEqual(w.loot.pity, { sinceEpic: 4, sinceLeg: 7 });
});

test("royal combs are locked until seasons exist", () => {
  assert.equal(openComb(withBoxes(newLoot(1), "royal", 3), "royal", CTX), null);
});

test("duplicates turn into collection pollen; the shop sells a specific item", () => {
  const { loot, all } = openMany("gold", 400, 11);
  const dups = all.flat().filter((d) => d.t === "item" && d.dup);
  assert.ok(dups.length > 0);
  const pollen = all.flat().reduce((a, d) => a + (d.t === "item" || d.t === "fragment" ? d.pollen : 0), 0);
  assert.equal(loot.pollen, pollen);
  for (const d of dups) if (d.t === "item") assert.equal(d.pollen, DUP_POLLEN[d.rarity]);
  assert.equal(new Set(loot.owned).size, loot.owned.length, "owned has no duplicates");
  const l = { ...newLoot(1), pollen: SHOP_PRICE.legendary };
  const b = buyItem(l, "halo")!;
  assert.ok(b.owned.includes("halo"));
  assert.equal(b.pollen, 0);
  assert.equal(buyItem(b, "halo"), null, "already owned");
  assert.equal(buyItem({ ...newLoot(1), pollen: 10 }, "scarf"), null, "not enough pollen");
});

test("fragments: 10 assemble the night bee (not for jelly); extra fragments become pollen", () => {
  let s = newState(T);
  s = { ...s, jelly: 999 };
  assert.equal(unlockBee(s, "nochka", T), null, "the night bee can't be bought");
  assert.equal(BEE_BY_ID.nochka.fragments, FRAGMENTS_FOR_BEE);
  s = { ...s, loot: { ...s.loot, fragments: FRAGMENTS_FOR_BEE - 1 } };
  assert.equal(canAssembleNightBee(s), false);
  s = { ...s, loot: { ...s.loot, fragments: FRAGMENTS_FOR_BEE } };
  const n = assembleNightBee(s, T)!;
  assert.ok(n.bees.includes("nochka"));
  assert.equal(n.loot.fragments, 0);
  assert.ok(rate(n) > rate(s), "the night bee boosts the hive");
  // fragments never overflow 10 before assembling
  const many = openMany("gold", 300, 2);
  assert.ok(many.loot.fragments <= FRAGMENTS_FOR_BEE);
  // once she is home every fragment is pollen
  const after = openMany("gold", 200, 2, { ...CTX, hasNightBee: true });
  assert.equal(after.loot.fragments, 0);
});

test("openBox credits resources; open all; golden combs found inside stay", () => {
  let s = addBoxes(addBoxes(newState(T), ["wax", "wax", "wax"]), ["wood"]);
  const r = openBox(s, "wood", T)!;
  const honey = r.drops.find((d) => d.t === "honey")!;
  assert.equal(r.state.honey, s.honey + (honey.t === "honey" ? honey.n : 0));
  assert.ok(r.drops.some((d) => d.t === "seed"), "wood comb has seeds");
  s = r.state;
  const all = openAllBoxes(s, "wax", T)!;
  assert.equal(all.drops.length, 3);
  assert.equal(all.state.loot.boxes.wax, 0);
  assert.equal(all.state.loot.opened.wax, 3);
});

test("rare seeds: rare flowers are planted only from pocket seeds; a pocket seed is free", () => {
  let s = { ...newState(T), honey: 99999 };
  assert.equal(plantFlower(s, 0, "moonpoppy", T), null);
  s = { ...s, loot: { ...s.loot, seeds: { moonpoppy: 1, sunflower: 1 } } };
  const p = plantFlower(s, 0, "moonpoppy", T)!;
  assert.equal(p.honey, s.honey);
  assert.equal(p.loot.seeds.moonpoppy, undefined);
  // grow & harvest gives the rare flower's nectar
  const watered = waterBedAction(p, 0, T + 4 * 3600_000)!; // soil dries after 4 h, moonpoppy needs 6 wet hours
  const h = harvestAction(watered, 0, T + 6 * 3600_000 + 1)!;
  assert.equal(h.nectar, 34);
});

test("skins: only owned skins on owned bees; any bee can wear one; migration drops bad ones", () => {
  let s = newState(T);
  assert.equal(setSkin(s, "zhuzha", "scarf"), null);
  s = { ...s, loot: { ...s.loot, owned: ["scarf"] } };
  s = setSkin(s, "zhuzha", "scarf")!;
  assert.equal(s.beeSkins.zhuzha, "scarf");
  assert.equal(setSkin(s, "boris", "scarf"), null, "bee not owned");
  assert.equal(setSkin(s, "zhuzha", null)!.beeSkins.zhuzha, undefined);
  const m = migrate({ ...JSON.parse(JSON.stringify(s)), beeSkins: { zhuzha: "scarf", boris: "scarf", pushinka: "nope" } }, T);
  assert.deepEqual(m.beeSkins, { zhuzha: "scarf" });
});

test("album: a complete page gives its permanent bonus", () => {
  const s = newState(T);
  const skins = PAGES.find((p) => p.id === "skins")!.items;
  const full = { ...s, loot: { ...s.loot, owned: [...skins] } };
  assert.equal(albumBonus(full.loot.owned, false).puzzleHoney, 0.1);
  assert.ok(puzzleHoneyMult(full) > puzzleHoneyMult(s));
  assert.equal(albumBonus([...skins.slice(1)], false).puzzleHoney, 0);
  assert.equal(albumBonus(["moonpoppy", "goldsun"], true).capHours, 3);
  // every box item is on a page
  for (const it of ITEMS) assert.ok(PAGES.some((p) => p.items.includes(it.id)), it.id);
  assert.ok(shopBuyItem({ ...s, loot: { ...s.loot, pollen: 30 } }, "scarf")!.loot.owned.includes("scarf"));
});

test("loot migration is tolerant (garbage in → sane loot out)", () => {
  const l = migrateLoot({ boxes: { wood: 2, wax: -3, gold: "x" }, rng: 5, owned: ["scarf", "scarf", "nope", 3], pollen: 12.7, fragments: 99, hidden: ["flags", "x"] }, 1);
  assert.deepEqual(l.boxes, { wood: 2, wax: 0, gold: 0, royal: 0 });
  assert.deepEqual(l.owned, ["scarf"]);
  assert.equal(l.pollen, 12);
  assert.equal(l.fragments, FRAGMENTS_FOR_BEE);
  assert.deepEqual(l.hidden, ["flags"]);
  assert.equal(migrateLoot(undefined, 77).rng, 77);
});
