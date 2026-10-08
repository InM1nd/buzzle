import { test } from "node:test";
import assert from "node:assert/strict";
import { capacity, combRate, settle, msUntilFull, newHive, productionPerHour } from "../src/logic/economy";
import { dailySeed, dayKey, dayNumber, starsFor } from "../src/logic/day";
import {
  buyUpgrade, canBuildAt, canClaimLogin, claimBonus, claimLogin, claimTask, collectHive, combAction, dailyStreak, finishRound, migrate,
  newState, rate, cap, tick, today, unlockBee, nextLoginIndex,
} from "../src/logic/game";
import { boostsFor, rulesFor } from "../src/logic/bees";
import { tasksForDay } from "../src/logic/tasks";
import { planNotifications } from "../src/logic/notifyPlan";

const H = 3600_000;
const T0 = new Date(2026, 9, 8, 12, 0, 0).getTime();

test("offline earnings: linear in time, capped by storage hours", () => {
  const h = newHive(T0);
  const r = productionPerHour(h, 0, 0);
  assert.equal(r, 2 * combRate(1));
  assert.equal(Math.round(settle(h, T0 + 2 * H, r, 6).stored), 2 * r);
  assert.equal(settle(h, T0 + 30 * H, r, 6).stored, capacity(r, 6));
  assert.equal(Math.round(msUntilFull(h, r, 6) / H), 6);
});

test("clock rollback: no production, lastTick never moves back, day never goes back", () => {
  const h = { ...newHive(T0), stored: 10 };
  const back = settle(h, T0 - 5 * H, 16, 6);
  assert.equal(back, h);
  // after rolling back, moving forward to the original time again yields nothing extra
  assert.equal(settle(back, T0, 16, 6).stored, 10);
  let s = tick(newState(T0), T0 + 48 * H);
  assert.equal(today(s, T0), dayNumber(new Date(T0 + 48 * H)));
});

test("collect moves honey from the hive to the wallet and counts the task", () => {
  const s0 = newState(T0);
  const { state, amount } = collectHive(s0, T0 + 3 * H);
  assert.equal(amount, Math.floor(rate(s0) * 3));
  assert.equal(state.honey, s0.honey + amount);
  assert.ok(state.hive.stored < 1);
  assert.equal(collectHive(state, T0 + 3 * H).amount, 0);
});

test("building grows outward, upgrades cost honey, bees boost production", () => {
  let s = { ...newState(T0), honey: 10_000, jelly: 100 };
  const slotFar = 18; // outer ring
  assert.ok(!canBuildAt(s, slotFar) || s.hive.combs[slotFar] === 0);
  const before = rate(s);
  s = combAction(s, 0, T0)!; // upgrade centre to level 2
  assert.equal(s.hive.combs[0], 2);
  assert.ok(rate(s) > before);
  const r1 = rate(s);
  s = unlockBee(s, "pushinka", T0)!;
  assert.ok(Math.abs(rate(s) - r1 * (1 + 0.15) / 1.05) < 1e-9);
  assert.equal(unlockBee(s, "pushinka", T0), null, "no double unlock");
  const capBefore = cap(s);
  s = buyUpgrade(s, "storage", T0)!;
  assert.ok(cap(s) > capBefore);
  assert.equal(combAction({ ...s, honey: 0 }, 0, T0), null, "not enough honey");
});

test("daily seed is stable per local date; stars thresholds", () => {
  const d = dayNumber(new Date(2026, 9, 8, 0, 5));
  assert.equal(d, dayNumber(new Date(2026, 9, 8, 23, 55)));
  assert.equal(dayKey(d), "2026-10-08");
  assert.equal(dailySeed(d), dailySeed(d));
  assert.notEqual(dailySeed(d), dailySeed(d + 1));
  assert.equal(starsFor(0), 0);
  assert.equal(starsFor(1000), 1);
  assert.equal(starsFor(5000), 3);
});

test("daily streak: consecutive days grow, a gap resets; jelly only for new stars", () => {
  let s = newState(T0);
  const round = (score: number) => ({ mode: "daily" as const, score, chains: [3], bombs: 0, cellsByColor: [3, 0, 0, 0, 0] });
  let r = finishRound(s, round(1900), T0);
  s = r.state;
  assert.equal(r.reward.stars, 2);
  assert.equal(s.jelly, 2);
  assert.equal(s.daily.streak, 1);
  r = finishRound(s, round(3000), T0 + 1000); // replay same day: +1 star
  assert.equal(r.reward.newStars, 1);
  assert.equal(r.state.daily.streak, 1);
  s = r.state;
  s = finishRound(s, round(1200), T0 + 24 * H).state;
  assert.equal(s.daily.streak, 2);
  assert.equal(dailyStreak(s, T0 + 24 * H), 2);
  assert.equal(dailyStreak(s, T0 + 72 * H), 0, "missed a day");
  s = finishRound(s, round(1200), T0 + 72 * H).state;
  assert.equal(s.daily.streak, 1);
  assert.equal(s.daily.best, 2);
});

test("login calendar: once per day, cycles, resets after a gap, can't re-claim by rolling the clock back", () => {
  let s = newState(T0);
  assert.ok(canClaimLogin(s, T0));
  let c = claimLogin(s, T0)!;
  assert.equal(c.index, 0);
  s = c.state;
  assert.equal(claimLogin(s, T0 + H), null);
  c = claimLogin(s, T0 + 24 * H)!;
  assert.equal(c.index, 1);
  s = c.state;
  assert.equal(claimLogin(s, T0 - 24 * H), null, "clock rolled back a day");
  assert.equal(nextLoginIndex(s, T0 + 4 * 24 * H), 0, "gap resets the calendar");
});

test("daily tasks: deterministic per day, progress from events, claim + bonus", () => {
  const d = dayNumber(new Date(T0));
  assert.deepEqual(tasksForDay(d).map((t) => t.id), tasksForDay(d).map((t) => t.id));
  assert.equal(new Set(tasksForDay(d).map((t) => t.id)).size, 3);
  let s = { ...newState(T0), honey: 1e6 };
  // complete every task by brute force events
  for (let i = 0; i < 5; i++) {
    s = finishRound(s, { mode: "daily", score: 4000, chains: [9, 8, 7, 6], bombs: 2, cellsByColor: [60, 60, 60, 60, 60] }, T0).state;
    s = collectHive(s, T0 + (i + 1) * H).state;
    s = combAction(s, 0, T0 + (i + 1) * H)!;
  }
  for (const t of tasksForDay(s.tasks.day)) {
    const c = claimTask(s, t.id);
    assert.ok(c, t.id);
    s = c!.state;
    assert.equal(claimTask(s, t.id), null);
  }
  const jelly = s.jelly;
  s = claimBonus(s)!.state;
  assert.equal(s.jelly, jelly + 2);
  assert.equal(claimBonus(s), null);
  // next day: fresh tasks
  s = tick(s, T0 + 24 * H);
  assert.deepEqual(s.tasks.claimed, []);
});

test("bee boosts: free play gets rules, daily stays equal", () => {
  const b = boostsFor(["zhuzha", "margo", "lavanda", "iskorka", "boris"]);
  assert.equal(b.bombAt, 5);
  assert.equal(b.colorMult[2], 2);
  assert.equal(b.extraMoves, 1);
  assert.equal(rulesFor("free", b).bombAt, 5);
  assert.equal(rulesFor("daily", b).bombAt, 6);
});

test("migrate: tolerant of garbage, keeps valid progress", () => {
  assert.equal(migrate(null, T0).honey, 50);
  assert.equal(migrate("junk", T0).bees[0], "zhuzha");
  const s = { ...newState(T0), honey: 777, bees: ["zhuzha", "boris", "unknown"] };
  const m = migrate(JSON.parse(JSON.stringify({ ...s, hive: { combs: [3, 2, 1], stored: 5 } })), T0);
  assert.equal(m.honey, 777);
  assert.deepEqual(m.bees, ["zhuzha", "boris"]);
  assert.equal(m.hive.combs.length, 19);
  assert.equal(m.hive.combs[0], 3);
});

test("notification plan: opt-in only; hive-full time matches storage", () => {
  const s = newState(T0);
  assert.deepEqual(planNotifications(s, T0), []);
  const p = planNotifications({ ...s, settings: { ...s.settings, notifications: true } }, T0);
  const full = p.find((x) => x.id === "hive-full")!;
  assert.equal(Math.round((full.at - T0) / H), 6);
  assert.ok(p.some((x) => x.id === "daily-today"));
  assert.ok(p.some((x) => x.id === "daily-next"));
});
