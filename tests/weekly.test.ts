/** v1.3 weekly layer + daily combs: rollback safety, streak freeze, weekend puzzle, new tasks, boosters, save codes. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GameState, newState, tick, finishRound, claimTask, claimBonus, claimWeekly, canClaimWeekly, buyFreeze, FREEZE_COST, dailyStreak,
  currentTasks, taskEvent, harvestAction, levelUpBee, migrate, startFreeRound, useShuffle, weekendOpen, RoundMode, plantFlower, today,
} from "../src/logic/game";
import { isWeekend, weekOf, weekdayOf, dayNumber, WEEKEND_STARS, DAILY_STARS } from "../src/logic/day";
import { tasksForDay, WEEKLY_TASKS } from "../src/logic/tasks";
import { adoptImported, decodeSave, encodeSave } from "../src/logic/saveCode";

const H = 3600_000;
const at = (d: number, h = 10) => new Date(2026, 9, d, h, 0, 0).getTime(); // October 2026: 10th = Saturday
const round = (s: GameState, mode: RoundMode, score: number, now: number) =>
  finishRound(s, { mode, score, chains: [], bombs: 0, cellsByColor: [0, 0, 0, 0, 0] }, now);
const fresh = (now: number) => ({ ...newState(now), settings: { ...newState(now).settings, tutorialDone: true } });

test("calendar weeks are Monday-based; Sat/Sun are the weekend", () => {
  assert.equal(weekdayOf(dayNumber(new Date(2026, 9, 12))), 0); // Monday
  assert.equal(weekdayOf(dayNumber(new Date(2026, 9, 11))), 6); // Sunday
  assert.ok(isWeekend(dayNumber(new Date(2026, 9, 10))) && !isWeekend(dayNumber(new Date(2026, 9, 9))));
  assert.equal(weekOf(dayNumber(new Date(2026, 9, 12))), weekOf(dayNumber(new Date(2026, 9, 18))));
  assert.equal(weekOf(dayNumber(new Date(2026, 9, 11))) + 1, weekOf(dayNumber(new Date(2026, 9, 12))));
});

function claimAll(s: GameState): GameState {
  for (const t of currentTasks(s)) {
    s = { ...s, tasks: { ...s.tasks, progress: { ...s.tasks.progress, [t.id]: t.target } } };
    s = claimTask(s, t.id)!.state;
  }
  return s;
}

test("3 tasks → the daily wooden comb, once per day — also with the clock rolled back", () => {
  let s = claimAll(fresh(at(12)));
  const b = claimBonus(s)!;
  assert.equal(b.box, "wood");
  s = b.state;
  assert.equal(s.loot.boxes.wood, 1);
  assert.equal(claimBonus(s), null);
  // device clock back one day: the game day never goes back, tasks stay claimed
  s = tick(s, at(11));
  assert.equal(claimBonus(s), null);
  assert.equal(s.tasks.day, today(s, at(12)));
});

test("weekly chest at 15 claimed tasks; can't be re-opened by rolling the clock back", () => {
  let s = fresh(at(12));
  for (let d = 12; d <= 16; d++) { s = tick(s, at(d)); s = claimAll(s); }
  assert.equal(s.week.tasks, 15);
  assert.ok(canClaimWeekly(s));
  s = claimWeekly(s, at(16, 12))!;
  assert.equal(s.loot.boxes.wax, 2);
  assert.equal(claimWeekly(s, at(16, 13)), null);
  const back = tick(s, at(5)); // a week earlier on the device
  assert.equal(back.week.id, s.week.id);
  assert.equal(claimWeekly(back, at(5)), null);
  const next = tick(s, at(19)); // real next Monday: a new week
  assert.equal(next.week.tasks, 0);
  assert.equal(next.week.chest, false);
  assert.equal(WEEKLY_TASKS, 15);
});

test("daily puzzle: 3 stars → one wax comb per day (replays don't add), streak of 7 → golden comb", () => {
  let s = fresh(at(5));
  const r = round(s, "daily", DAILY_STARS[2], at(5));
  assert.deepEqual(r.reward.boxes, ["wax"]);
  s = round(r.state, "daily", DAILY_STARS[2] + 500, at(5, 12)).state;
  assert.equal(s.loot.boxes.wax, 1);
  for (let d = 6; d <= 11; d++) s = round(tick(s, at(d)), "daily", DAILY_STARS[0], at(d)).state;
  assert.equal(s.daily.streak, 7);
  assert.equal(s.loot.boxes.gold, 1);
  // replays on the 7th day don't add another golden comb
  s = round(s, "daily", DAILY_STARS[0], at(11, 15)).state;
  assert.equal(s.loot.boxes.gold, 1);
});

test("streak freeze: bought for jelly once a week, saves one missed day", () => {
  let s = { ...fresh(at(12)), jelly: 20 };
  s = round(s, "daily", DAILY_STARS[0], at(12)).state;
  s = buyFreeze(s, at(12))!;
  assert.equal(s.jelly, 20 + 1 - FREEZE_COST);
  assert.equal(s.daily.freeze, 1);
  assert.equal(buyFreeze(s, at(12)), null, "one per week");
  // miss the 13th; on the 14th the streak is still shown and continues
  assert.equal(dailyStreak(s, at(14)), 1);
  const r = round(tick(s, at(14)), "daily", DAILY_STARS[0], at(14));
  assert.equal(r.reward.froze, true);
  assert.equal(r.state.daily.streak, 2);
  assert.equal(r.state.daily.freeze, 0);
  // without a freeze a missed day resets
  const r2 = round(tick(r.state, at(16)), "daily", DAILY_STARS[0], at(16));
  assert.equal(r2.state.daily.streak, 1);
  // a new week allows buying again, the clock rolled back doesn't
  assert.equal(buyFreeze({ ...tick(r.state, at(13)), jelly: 50 }, at(13)), null);
  assert.ok(buyFreeze({ ...tick(r.state, at(19)), jelly: 50 }, at(19)));
});

test("weekend puzzle: open Sat/Sun, own stars and rewards, once per weekend", () => {
  let s = fresh(at(9));
  assert.equal(weekendOpen(s, at(9)), false);
  const fri = round(s, "weekend", WEEKEND_STARS[2], at(9));
  assert.deepEqual(fri.reward.boxes, [], "no weekend rewards on a weekday");
  s = tick(s, at(10));
  assert.ok(weekendOpen(s, at(10)));
  const r1 = round(s, "weekend", WEEKEND_STARS[0], at(10));
  assert.equal(r1.reward.stars, 1);
  assert.deepEqual(r1.reward.boxes, ["wax"]);
  const r3 = round(r1.state, "weekend", WEEKEND_STARS[2], at(11));
  assert.deepEqual(r3.reward.boxes, ["gold"]);
  assert.equal(r3.reward.jelly, 2, "2 stars on the way pay jelly");
  const again = round(r3.state, "weekend", WEEKEND_STARS[2] + 900, at(11, 16));
  assert.deepEqual(again.reward.boxes, []);
  assert.equal(again.state.week.weekendBest, WEEKEND_STARS[2] + 900);
  // next weekend starts fresh
  const next = round(tick(again.state, at(17)), "weekend", WEEKEND_STARS[0], at(17));
  assert.deepEqual(next.reward.boxes, ["wax"]);
});

test("new task types: garden & bee levels join the pool as the player grows", () => {
  const base = new Set<string>();
  const grown = new Set<string>();
  for (let d = 20000; d < 20200; d++) {
    tasksForDay(d).forEach((t) => base.add(t.id));
    tasksForDay(d, { garden: true, levels: true }).forEach((t) => grown.add(t.id));
  }
  for (const id of ["harvest2", "water3", "plant2", "nectar20", "levelup"]) { assert.ok(!base.has(id)); assert.ok(grown.has(id), id); }
  // the v1.2 pick is unchanged without the new pool (a migrated save keeps today's tasks)
  assert.deepEqual(tasksForDay(20123, {}).map((t) => t.id), tasksForDay(20123).map((t) => t.id));
  // events
  let s = fresh(at(12));
  s = { ...s, stats: { ...s.stats, harvests: 5, levelUps: 2 }, tasks: { ...s.tasks, ids: ["harvest2", "plant2", "levelup"], progress: {} } };
  s = { ...s, honey: 9999, nectar: 999 };
  s = plantFlower(s, 0, "sunflower", at(12))!;
  s = harvestAction(tick(s, at(12, 13)), 0, at(12, 13))!.state;
  s = levelUpBee(s, "zhuzha", at(12, 13))!;
  assert.equal(s.tasks.progress.plant2, 1);
  assert.equal(s.tasks.progress.harvest2, 1);
  assert.equal(s.tasks.progress.levelup, 1);
  // a fresh day picks from the grown pool and stores the ids
  const n = tick(s, at(13));
  assert.equal(n.tasks.ids!.length, 3);
  assert.deepEqual(n.tasks.ids, tasksForDay(n.tasks.day, { garden: true, levels: true }).map((t) => t.id));
  void taskEvent;
});

test("boosters: consumed when chosen for free play; shuffle has its own stock", () => {
  let s = fresh(at(12));
  s = { ...s, loot: { ...s.loot, boosters: { moves: 1, bomb: 0, shuffle: 1 } } };
  const r = startFreeRound(s, { moves: true, bomb: true });
  assert.equal(r.extraMoves, 3);
  assert.equal(r.bomb, false, "no bomb in stock");
  assert.equal(r.state.loot.boosters.moves, 0);
  assert.equal(startFreeRound(r.state, { moves: true, bomb: false }).extraMoves, 0);
  const u = useShuffle(r.state)!;
  assert.equal(u.loot.boosters.shuffle, 0);
  assert.equal(useShuffle(u), null);
});

test("save code: round trip, emoji names, whitespace-tolerant, damaged/foreign codes rejected", () => {
  let s = fresh(at(12));
  s = { ...s, honey: 4321, beeNames: { zhuzha: "Мёдик 🐝👩‍🚀" }, loot: { ...s.loot, owned: ["scarf"], pollen: 17 }, beeSkins: { zhuzha: "scarf" } };
  const code = encodeSave(s);
  assert.match(code, /^BUZZLE1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
  const d = decodeSave(code, at(12));
  assert.ok(d.ok);
  if (d.ok) assert.deepEqual(d.state, migrate(JSON.parse(JSON.stringify(s)), at(12)));
  const wrapped = code.replace(/(.{60})/g, "$1\n  ");
  assert.ok(decodeSave(wrapped, at(12)).ok, "line breaks from messengers are ignored");
  const bad = code.slice(0, 30) + (code[30] === "A" ? "B" : "A") + code.slice(31);
  assert.equal(decodeSave(bad, at(12)).ok, false);
  assert.equal(decodeSave(code.slice(0, code.length - 20), at(12)).ok, false);
  assert.equal(decodeSave("hello", at(12)).ok, false);
  // a newer version is refused, an older one migrates
  const newer = encodeSave({ ...s, version: 99 as never });
  assert.equal(decodeSave(newer, at(12)).ok, false);
  const v3 = JSON.parse(JSON.stringify(s)); v3.version = 3; delete v3.loot; delete v3.week; delete v3.beeSkins;
  const old = decodeSave(encodeSave(v3), at(12));
  assert.ok(old.ok && old.state.version === 4 && old.state.honey === 4321);
});

test("importing an old save never moves the game clock back", () => {
  const cur = tick(fresh(at(20)), at(20));
  const old = fresh(at(5));
  const a = adoptImported(cur, old);
  assert.equal(a.clock.maxDay, cur.clock.maxDay);
  assert.equal(a.clock.maxSeen, cur.clock.maxSeen);
  assert.equal(today(a, at(5)), today(cur, at(20)));
  void H;
});
