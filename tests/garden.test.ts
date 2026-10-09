/** v1.2: garden timers, nectar, bee levels, colour of the day, reminders, save migration v1 → v2. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BED_COSTS, BED_HIVE_BONUS, canWater, dayColor, FLOWER_BY_ID, FLOWERS, harvest, isReady, migrateGarden, newGarden, nextGardenEvent,
  plant, settleGarden, stageOf, water, waterAll, WATER_HOURS,
} from "../src/logic/garden";
import {
  beeLevelCost, collectHive, dayColorInfo, finishRound, harvestAction, levelUpBee, migrate, newState, plantFlower, rate, STATE_VERSION,
  tick, unlockBed, unlockBee, waterAllAction, waterBedAction, GameState,
} from "../src/logic/game";
import { abilityAt, BEE_BY_ID, beeLook, boostsFor, levelCost, MAX_BEE_LEVEL, rulesFor } from "../src/logic/bees";
import { planNotifications, quiet } from "../src/logic/notifyPlan";
import { dayNumber } from "../src/logic/day";

const H = 3600_000;
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const rich = (s: GameState): GameState => ({ ...s, honey: 1e9, jelly: 1000, nectar: 1e6 });

// ---------------- garden timers ----------------
test("garden: a flower grows only while the soil is wet (offline, from timestamps)", () => {
  let g = plant(newGarden(T0), 0, "clover")!; // 4 h flower, planting waters for 4 h
  assert.equal(g.beds[0].water, WATER_HOURS);
  g = settleGarden(g, T0 + 1.5 * H);
  assert.ok(Math.abs(g.beds[0].growth - 1.5) < 1e-9);
  assert.equal(stageOf(g.beds[0]), "sprout");
  g = settleGarden(g, T0 + 3 * H);
  assert.equal(stageOf(g.beds[0]), "bud");
  g = settleGarden(g, T0 + 10 * H); // only 4 wet hours → exactly ready, not more
  assert.ok(isReady(g.beds[0]));
  assert.ok(Math.abs(g.beds[0].growth - 4) < 1e-9);
});

test("garden: dry soil pauses growth until watered; watering needs a gap", () => {
  let g = plant(newGarden(T0), 0, "mint")!; // 12 h
  assert.equal(canWater(g.beds[0]), false, "just planted = wet");
  assert.equal(water(g, 0), null);
  g = settleGarden(g, T0 + 30 * H); // a whole day away: still only 4 wet hours
  assert.ok(Math.abs(g.beds[0].growth - 4) < 1e-9);
  assert.equal(g.beds[0].water, 0);
  assert.equal(canWater(g.beds[0]), true);
  g = water(g, 0)!;
  g = settleGarden(g, T0 + 34 * H);
  assert.ok(Math.abs(g.beds[0].growth - 8) < 1e-9);
  const all = waterAll(g)!;
  assert.equal(all.n, 1);
  g = settleGarden(all.garden, T0 + 40 * H);
  assert.ok(isReady(g.beds[0]));
});

test("garden: clock rollback freezes growth; forward jumps are capped by the water", () => {
  let g = plant(newGarden(T0), 0, "lavender")!; // 6 h
  g = settleGarden(g, T0 + 2 * H);
  const back = settleGarden(g, T0 - 5 * H);
  assert.equal(back, g, "rollback: unchanged, lastTick kept");
  // watering while rolled back doesn't help: the water starts at lastTick (the newest time seen)
  const w = settleGarden(water(settleGarden(g, T0 + 3.5 * H), 0)!, T0 + 1 * H);
  assert.ok(Math.abs(w.beds[0].growth - 3.5) < 1e-9);
  assert.equal(w.lastTick, T0 + 3.5 * H);
  // jumping a week ahead gives at most the remaining wet hours
  const fwd = settleGarden(g, T0 + 7 * 24 * H);
  assert.ok(Math.abs(fwd.beds[0].growth - 4) < 1e-9);
});

test("garden: harvest gives nectar and frees the bed; only ready flowers", () => {
  let g = plant(newGarden(T0), 0, "sunflower")!;
  assert.equal(harvest(g, 0), null);
  g = settleGarden(g, T0 + 2 * H);
  const r = harvest(g, 0)!;
  assert.equal(r.nectar, FLOWER_BY_ID.sunflower.nectar);
  assert.equal(r.garden.beds[0].flower, null);
  assert.equal(plant(r.garden, 0, "nope"), null);
  assert.equal(plant(r.garden, 3, "sunflower"), null, "bed doesn't exist yet");
});

test("game: planting costs honey, beds unlock with honey, occupied beds boost the hive", () => {
  let s = newState(T0);
  const base = rate(s);
  s = plantFlower(s, 0, "sunflower", T0)!;
  assert.equal(s.honey, 50 - 30);
  assert.ok(Math.abs(rate(s) / base - (1 + 0.05 + BED_HIVE_BONUS) / 1.05) < 1e-9);
  assert.equal(plantFlower(s, 0, "sunflower", T0), null, "occupied");
  assert.equal(plantFlower(rich(s), 0, "mint", T0), null, "mint needs a higher hive level");
  assert.equal(unlockBed(s, T0), null, "not enough honey");
  const s2 = unlockBed({ ...s, honey: 1000 }, T0)!;
  assert.equal(s2.garden.beds.length, 2);
  assert.equal(s2.honey, 1000 - BED_COSTS[1]);
});

test("game: water + harvest through the game state (nectar and stats)", () => {
  let s = plantFlower(newState(T0), 0, "sunflower", T0)!;
  assert.equal(harvestAction(s, 0, T0 + H), null);
  assert.equal(waterBedAction(s, 0, T0 + 0.1 * H), null, "still wet");
  const w = waterBedAction(s, 0, T0 + 1 * H)!;
  assert.equal(w.garden.beds[0].water, WATER_HOURS);
  assert.equal(waterAllAction(w, T0 + 1.1 * H), null);
  const r = harvestAction(w, 0, T0 + 3 * H)!;
  assert.equal(r.state.nectar, 4);
  assert.equal(r.state.stats.harvests, 1);
  assert.equal(r.state.stats.totalNectar, 4);
});

// ---------------- bee levels ----------------
test("levels: nectar cost grows, milestones 5 and 10 also cost royal jelly", () => {
  assert.deepEqual(levelCost(1), { nectar: 14, jelly: 0 });
  assert.equal(levelCost(4)!.jelly, 4);
  assert.equal(levelCost(9)!.jelly, 8);
  assert.equal(levelCost(MAX_BEE_LEVEL), null);
  let total = 0;
  for (let l = 1; l < MAX_BEE_LEVEL; l++) { const c = levelCost(l)!; assert.ok(l === 1 || c.nectar > levelCost(l - 1)!.nectar); total += c.nectar; }
  assert.ok(total > 900 && total < 1200, `one bee to max ≈ 1000 nectar (${total})`);
  assert.equal(beeLook(4), "base"); assert.equal(beeLook(5), "shiny"); assert.equal(beeLook(10), "crown");
});

test("levels: level-up spends nectar (+jelly), bonuses grow, locked bees can't level", () => {
  let s = rich(newState(T0));
  assert.equal(levelUpBee(s, "boris", T0), null, "not owned");
  assert.equal(beeLevelCost(s, "boris"), null);
  const r0 = rate(s);
  for (let l = 1; l < 5; l++) s = levelUpBee(s, "zhuzha", T0)!;
  assert.equal(s.beeLevels.zhuzha, 5);
  assert.equal(s.jelly, 1000 - 4);
  assert.ok(rate(s) > r0);
  assert.equal(levelUpBee({ ...s, nectar: 0 }, "zhuzha", T0), null);
  assert.equal(levelUpBee({ ...s, jelly: 0 }, "zhuzha", T0)?.beeLevels.zhuzha, 6, "levels 6..9 cost no jelly");
  // abilities scale with level
  const b1 = boostsFor(["zhuzha", "boris", "solnyshko", "sonya"], {});
  const b10 = boostsFor(["zhuzha", "boris", "solnyshko", "sonya"], { zhuzha: 10, boris: 10, solnyshko: 10, sonya: 10 });
  assert.ok(b10.prodMult > b1.prodMult);
  assert.equal(b1.extraMoves, 1); assert.equal(b10.extraMoves, 3);
  assert.equal(b1.colorMult[0], 2); assert.ok(Math.abs(b10.colorMult[0] - 2.45) < 1e-9);
  assert.ok(b10.capHours > b1.capHours);
  assert.equal(abilityAt(BEE_BY_ID.boris, 5), "+2 хода в свободной игре");
  assert.equal(abilityAt(BEE_BY_ID.solnyshko, 1), "Жёлтые соты ×2 очков");
});

test("unlocking a bee starts it at level 1", () => {
  const s = unlockBee({ ...newState(T0), jelly: 10 }, "pushinka", T0)!;
  assert.equal(s.beeLevels.pushinka, 1);
});

// ---------------- colour of the day ----------------
test("colour of the day: deterministic, active only with a matching flower, ×1.5 in free play, honey bonus in the daily", () => {
  const day = dayNumber(new Date(T0));
  assert.equal(dayColor(day), dayColor(day));
  const seen = new Set(Array.from({ length: 30 }, (_, i) => dayColor(day + i)));
  assert.ok(seen.size >= 4, "all colours come around");
  let s = rich(newState(T0));
  s = { ...s, hive: { ...s.hive, combs: s.hive.combs.map(() => 20) } }; // every flower unlocked
  const dc = dayColorInfo(s, T0);
  assert.equal(dc.active, false);
  const flower = FLOWERS.find((f) => f.color === dc.color)!;
  const sp = plantFlower(s, 0, flower.id, T0)!;
  assert.equal(dayColorInfo(sp, T0).active, true);
  // free play rules
  const rules = rulesFor("free", boostsFor(sp.bees, sp.beeLevels), dc.color);
  assert.equal(rules.colorMult[dc.color], 1.5);
  assert.deepEqual(rulesFor("daily", boostsFor([], {}), dc.color).colorMult, [1, 1, 1, 1, 1], "daily keeps equal rules");
  // daily: +50% honey for that colour's share
  const cells = [0, 0, 0, 0, 0]; cells[dc.color] = 50; cells[(dc.color + 1) % 5] = 50;
  const sum = { mode: "daily" as const, score: 2000, chains: [3], bombs: 0, cellsByColor: cells };
  const off = finishRound(s, sum, T0).reward.honey;
  const on = finishRound(sp, sum, T0).reward.honey;
  assert.ok(Math.abs(on / off - 1.25) < 0.02, `${on} vs ${off}`);
});

// ---------------- reminders ----------------
test("garden reminder: next bloom or dry-out, opt-in, never at night", () => {
  let g = plant(newGarden(T0), 0, "sunflower")!;
  assert.deepEqual(nextGardenEvent(g), { at: T0 + 2 * H, kind: "bloom" });
  g = plant({ ...g, beds: [...g.beds, { flower: null, growth: 0, water: 0 }] }, 1, "mint")!;
  assert.equal(nextGardenEvent(g)!.at, T0 + 2 * H);
  const mintOnly = { ...g, beds: [g.beds[1]] };
  assert.deepEqual(nextGardenEvent(mintOnly), { at: T0 + 4 * H, kind: "dry" });
  let s = plantFlower(newState(T0), 0, "sunflower", T0)!;
  assert.equal(planNotifications(s, T0).length, 0, "notifications off");
  s = { ...s, settings: { ...s.settings, notifications: true } };
  assert.equal(planNotifications(s, T0).find((n) => n.id === "garden")?.at, T0 + 2 * H);
  s = { ...s, settings: { ...s.settings, gardenReminders: false } };
  assert.equal(planNotifications(s, T0).find((n) => n.id === "garden"), undefined);
  // 23:30 → next morning 09:00, 03:00 → same day 09:00, daytime unchanged
  const d = new Date(2026, 9, 12, 23, 30).getTime();
  assert.equal(quiet(d), new Date(2026, 9, 13, 9, 0).getTime());
  assert.equal(quiet(new Date(2026, 9, 13, 3, 0).getTime()), new Date(2026, 9, 13, 9, 0).getTime());
  assert.equal(quiet(T0), T0);
});

// ---------------- save migration ----------------
const V1_SAVE = {
  version: 1, honey: 1240, jelly: 7,
  hive: { combs: [4, 3, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], stored: 120, lastTick: T0 - 2 * H },
  upgrades: { workers: 2, storage: 1, flowers: 2, queen: 0 },
  bees: ["zhuzha", "pushinka", "boris", "solnyshko", "lavanda"],
  daily: { lastDay: 20372, streak: 4, best: 6, results: { 20372: { stars: 2, score: 2140 } } },
  login: { lastDay: 20372, index: 3, streak: 4 },
  tasks: { day: 20372, progress: { rounds: 2 }, claimed: [], bonus: false },
  stats: { rounds: 23, bestScore: 3420, longestChain: 11, totalHoney: 5230, bombs: 17, collects: 31 },
  settings: { notifications: true, haptics: false, tutorialDone: true, notifPromptDismissed: true },
  clock: { maxSeen: T0 - 2 * H, maxDay: 20372 },
};

test("migration v1 → v2 keeps all progress and adds nectar, levels and the garden", () => {
  const m = migrate(JSON.parse(JSON.stringify(V1_SAVE)), T0);
  assert.equal(m.version, STATE_VERSION);
  assert.equal(STATE_VERSION, 2);
  assert.equal(m.honey, 1240); assert.equal(m.jelly, 7); assert.equal(m.nectar, 0);
  assert.deepEqual(m.hive.combs, V1_SAVE.hive.combs);
  assert.equal(m.hive.stored, 120);
  assert.deepEqual(m.bees, V1_SAVE.bees);
  assert.deepEqual(m.beeLevels, { zhuzha: 1, pushinka: 1, boris: 1, solnyshko: 1, lavanda: 1 });
  assert.equal(m.garden.beds.length, 1);
  assert.equal(m.garden.beds[0].flower, null);
  assert.equal(m.daily.streak, 4); assert.equal(m.login.index, 3);
  assert.equal(m.stats.rounds, 23); assert.equal(m.stats.harvests, 0);
  assert.equal(m.settings.haptics, false); assert.equal(m.settings.notifications, true);
  assert.equal(m.settings.gardenReminders, true); assert.equal(m.settings.gardenIntroDone, false);
  // hive production accrues normally after migration (same rate formula, empty garden adds nothing)
  const c = collectHive(m, T0 + H);
  assert.ok(c.amount > 120);
});

test("migration: a v1 save from a device with a rolled-back clock can't pre-grow the garden", () => {
  const raw = { ...V1_SAVE, clock: { maxSeen: T0 + 10 * H, maxDay: 20372 } };
  const m = migrate(raw, T0);
  assert.equal(m.garden.lastTick, T0 + 10 * H);
  const s = tick(plantFlower(m, 0, "sunflower", T0)!, T0 + 5 * H);
  assert.equal(s.garden.beds[0].growth, 0);
});

test("migration v2: round-trips and repairs bad garden / level data", () => {
  let s = rich(newState(T0));
  s = plantFlower(s, 0, "sunflower", T0)!;
  s = levelUpBee(s, "zhuzha", T0)!;
  const back = migrate(JSON.parse(JSON.stringify(s)), T0 + H);
  assert.deepEqual(back, s);
  const bad = migrate({
    ...JSON.parse(JSON.stringify(s)),
    nectar: "x", beeLevels: { zhuzha: 99, ghost: 3 },
    garden: { beds: [{ flower: "weed", growth: 3 }, { flower: "mint", growth: 999, water: -4 }, 7, null, {}, {}, {}, {}], lastTick: "?" },
  }, T0);
  assert.equal(bad.nectar, 0);
  assert.equal(bad.beeLevels.zhuzha, MAX_BEE_LEVEL);
  assert.equal((bad.beeLevels as Record<string, number>).ghost, undefined);
  assert.equal(bad.garden.beds.length, 6);
  assert.equal(bad.garden.beds[0].flower, null);
  assert.equal(bad.garden.beds[1].growth, 12);
  assert.equal(bad.garden.beds[1].water, 0);
  assert.equal(bad.garden.lastTick, T0);
  assert.deepEqual(migrateGarden(undefined, T0), newGarden(T0));
});
