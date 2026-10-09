/**
 * Game state model + pure actions (no React Native imports → unit-testable with node:test).
 */
import { boostsFor, BEE_BY_ID, levelCost, MAX_BEE_LEVEL } from "./bees";
import { dayNumber, starsFor } from "./day";
import {
  buildCost, builtCount, capHours, capacity, Hive, hiveLevel, MAX_COMB_LEVEL, newHive, productionPerHour, settle, UpgradeId,
  UPGRADE_BY_ID, upgradeCost,
} from "./economy";
import { HIVE_SLOTS } from "./hex";
import {
  bedCost, dayColor, DAY_COLOR_MULT, FLOWER_BY_ID, Garden, gardenHiveBonus, harvest as harvestBed, hasColor, migrateGarden, newGarden,
  plant as plantBed, seedCost, settleGarden, water as waterBed, waterAll as waterAllBeds, emptyBed,
} from "./garden";
import { bonusReward, loginReward, Reward, TaskEvent, tasksForDay, taskReward } from "./tasks";

/** v2 (Buzzle 1.2): nectar, bee levels, garden. The storage key stays the same; v1 saves are migrated on load
 * (and backed up under bzz:backup:v1 by ui/store). */
export const STATE_VERSION = 2 as const;
export const STORAGE_KEY = "bzz:state:v1";

export interface DailyResult { stars: number; score: number }
export interface GameState {
  version: 2;
  honey: number;
  jelly: number;
  nectar: number;
  hive: Hive;
  upgrades: Record<UpgradeId, number>;
  bees: string[];
  /** level per owned bee (1..10); missing = 1 */
  beeLevels: Record<string, number>;
  garden: Garden;
  daily: { lastDay: number | null; streak: number; best: number; results: Record<string, DailyResult> };
  login: { lastDay: number | null; index: number; streak: number };
  tasks: { day: number; progress: Record<string, number>; claimed: string[]; bonus: boolean };
  stats: { rounds: number; bestScore: number; longestChain: number; totalHoney: number; bombs: number; collects: number; harvests: number; totalNectar: number; levelUps: number };
  settings: { notifications: boolean; haptics: boolean; tutorialDone: boolean; notifPromptDismissed: boolean; gardenReminders: boolean; gardenIntroDone: boolean };
  /** anti clock-rollback bookkeeping */
  clock: { maxSeen: number; maxDay: number };
}

export function newState(now: number): GameState {
  const day = dayNumber(new Date(now));
  return {
    version: STATE_VERSION,
    honey: 50,
    jelly: 0,
    nectar: 0,
    hive: newHive(now),
    upgrades: { workers: 0, storage: 0, flowers: 0, queen: 0 },
    bees: ["zhuzha"],
    beeLevels: { zhuzha: 1 },
    garden: newGarden(now),
    daily: { lastDay: null, streak: 0, best: 0, results: {} },
    login: { lastDay: null, index: -1, streak: 0 },
    tasks: { day, progress: {}, claimed: [], bonus: false },
    stats: { rounds: 0, bestScore: 0, longestChain: 0, totalHoney: 0, bombs: 0, collects: 0, harvests: 0, totalNectar: 0, levelUps: 0 },
    settings: { notifications: false, haptics: true, tutorialDone: false, notifPromptDismissed: false, gardenReminders: true, gardenIntroDone: false },
    clock: { maxSeen: now, maxDay: day },
  };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});

/** Tolerant loader: fills missing fields with defaults, never throws. */
export function migrate(raw: unknown, now: number): GameState {
  const d = newState(now);
  const s = obj(raw);
  if (!Object.keys(s).length) return d;
  const hive = obj(s.hive);
  const combs = Array.isArray(hive.combs) ? HIVE_SLOTS.map((_, i) => Math.max(0, Math.min(MAX_COMB_LEVEL, num(hive.combs[i], 0) | 0))) : d.hive.combs;
  const up = obj(s.upgrades);
  const bees: string[] = Array.isArray(s.bees) ? Array.from(new Set(["zhuzha", ...s.bees.filter((b: unknown) => typeof b === "string" && BEE_BY_ID[b as string])])) : d.bees;
  const rawLv = obj(s.beeLevels);
  const beeLevels: Record<string, number> = {};
  for (const id of bees) beeLevels[id] = Math.max(1, Math.min(MAX_BEE_LEVEL, num(rawLv[id], 1) | 0));
  const clockMax = Math.max(num(obj(s.clock).maxSeen, 0), 0) || now;
  return {
    version: STATE_VERSION,
    honey: Math.max(0, num(s.honey, d.honey)),
    jelly: Math.max(0, num(s.jelly, d.jelly)),
    nectar: Math.max(0, num(s.nectar, 0)),
    hive: { combs, stored: Math.max(0, num(hive.stored, 0)), lastTick: num(hive.lastTick, now) },
    upgrades: {
      workers: num(up.workers, 0), storage: num(up.storage, 0), flowers: num(up.flowers, 0), queen: num(up.queen, 0),
    },
    bees,
    beeLevels,
    // a v1 save has no garden: start it at the newest time the game has seen, so a rolled-back clock can't pre-grow it
    garden: s.garden ? migrateGarden(s.garden, now) : newGarden(Math.max(now, clockMax)),
    daily: { ...d.daily, ...obj(s.daily), results: { ...obj(obj(s.daily).results) } },
    login: { ...d.login, ...obj(s.login) },
    tasks: { ...d.tasks, ...obj(s.tasks), progress: { ...obj(obj(s.tasks).progress) }, claimed: Array.isArray(obj(s.tasks).claimed) ? obj(s.tasks).claimed : [] },
    stats: { ...d.stats, ...obj(s.stats) },
    settings: { ...d.settings, ...obj(s.settings), ...(s.version === 1 || s.version === undefined ? { gardenIntroDone: false } : {}) },
    clock: { maxSeen: clockMax, maxDay: num(obj(s.clock).maxDay, d.clock.maxDay) },
  };
}

// ---------- derived ----------
export const boosts = (s: GameState) => boostsFor(s.bees, s.beeLevels);
/** hive production: combs × (workers + bee bonuses + bee levels + occupied garden beds) */
export const rate = (s: GameState) => productionPerHour(s.hive, s.upgrades.workers, boosts(s).prodMult + gardenHiveBonus(s.garden));
export const cap = (s: GameState) => capacity(rate(s), capHours(s.upgrades.storage, boosts(s).capHours));
export const level = (s: GameState) => hiveLevel(s.hive);
/** Day used for daily keys: never goes back even if the device clock does. */
export const today = (s: GameState, now: number) => Math.max(dayNumber(new Date(now)), s.clock.maxDay);
export const clockRolledBack = (s: GameState, now: number) => now < s.clock.maxSeen - 10 * 60_000;
export const freeMoves = (s: GameState, base = 20) => base + s.upgrades.queen + boosts(s).extraMoves;
export const puzzleHoneyMult = (s: GameState) => 1 + 0.1 * s.upgrades.flowers + boosts(s).puzzleHoneyMult;
export const beeLevel = (s: GameState, id: string) => (s.bees.includes(id) ? Math.max(1, s.beeLevels[id] ?? 1) : 0);
/** colour of the day and whether the garden switches it on (a flower of that colour is planted) */
export function dayColorInfo(s: GameState, now: number): { color: number; active: boolean } {
  const color = dayColor(today(s, now));
  return { color, active: hasColor(s.garden, color) };
}

function add(s: GameState, r: Reward): GameState {
  return { ...s, honey: s.honey + (r.honey ?? 0), jelly: s.jelly + (r.jelly ?? 0) };
}

// ---------- actions ----------
/** Advance time: clock bookkeeping, hive production, daily task reset. */
export function tick(s: GameState, now: number): GameState {
  const day = today(s, now);
  const hours = capHours(s.upgrades.storage, boosts(s).capHours);
  let n: GameState = {
    ...s, hive: settle(s.hive, now, rate(s), hours), garden: settleGarden(s.garden, now),
    clock: { maxSeen: Math.max(s.clock.maxSeen, now), maxDay: day },
  };
  if (n.tasks.day !== day) n = { ...n, tasks: { day, progress: {}, claimed: [], bonus: false } };
  return n;
}

export function taskEvent(s: GameState, e: TaskEvent): GameState {
  const progress = { ...s.tasks.progress };
  for (const t of tasksForDay(s.tasks.day)) {
    const inc = t.progress(e);
    if (inc > 0) progress[t.id] = Math.min(t.target, (progress[t.id] ?? 0) + inc);
  }
  return { ...s, tasks: { ...s.tasks, progress } };
}

export function collectHive(s0: GameState, now: number): { state: GameState; amount: number } {
  const s = tick(s0, now);
  const amount = Math.floor(s.hive.stored);
  if (amount <= 0) return { state: s, amount: 0 };
  let n: GameState = { ...s, honey: s.honey + amount, hive: { ...s.hive, stored: s.hive.stored - amount }, stats: { ...s.stats, collects: s.stats.collects + 1 } };
  n = taskEvent(n, { type: "collect" });
  return { state: n, amount };
}

export function combActionCost(s: GameState, slot: number): number | null {
  const l = s.hive.combs[slot];
  if (l >= MAX_COMB_LEVEL) return null;
  return l === 0 ? buildCost(builtCount(s.hive)) : upgradeCost(l);
}
/** Slot can be built only next to an existing comb (the hive grows outward). */
export function canBuildAt(s: GameState, slot: number): boolean {
  if (s.hive.combs[slot] > 0) return false;
  const a = HIVE_SLOTS[slot];
  return HIVE_SLOTS.some((b, i) => s.hive.combs[i] > 0 && Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r)) === 1);
}

export function combAction(s0: GameState, slot: number, now: number): GameState | null {
  const s = tick(s0, now); // settle at the old rate first
  const cost = combActionCost(s, slot);
  if (cost === null || s.honey < cost) return null;
  if (s.hive.combs[slot] === 0 && !canBuildAt(s, slot)) return null;
  const combs = s.hive.combs.slice();
  combs[slot] += 1;
  return taskEvent({ ...s, honey: s.honey - cost, hive: { ...s.hive, combs } }, { type: "build" });
}

export function upgradeCostFor(s: GameState, id: UpgradeId): number | null {
  const d = UPGRADE_BY_ID[id];
  const l = s.upgrades[id];
  return l >= d.max ? null : d.cost(l);
}
export function buyUpgrade(s0: GameState, id: UpgradeId, now: number): GameState | null {
  const s = tick(s0, now);
  const cost = upgradeCostFor(s, id);
  if (cost === null || s.honey < cost) return null;
  return { ...s, honey: s.honey - cost, upgrades: { ...s.upgrades, [id]: s.upgrades[id] + 1 } };
}

export function unlockBee(s0: GameState, id: string, now: number): GameState | null {
  const bee = BEE_BY_ID[id];
  if (!bee || s0.bees.includes(id) || s0.jelly < bee.cost) return null;
  const s = tick(s0, now); // production at the old rate up to now
  return { ...s, jelly: s.jelly - bee.cost, bees: [...s.bees, id], beeLevels: { ...s.beeLevels, [id]: 1 } };
}

// ---------- bee levels ----------
export function beeLevelCost(s: GameState, id: string) {
  return s.bees.includes(id) ? levelCost(beeLevel(s, id)) : null;
}
export function levelUpBee(s0: GameState, id: string, now: number): GameState | null {
  const cost = beeLevelCost(s0, id);
  if (!cost || s0.nectar < cost.nectar || s0.jelly < cost.jelly) return null;
  const s = tick(s0, now); // settle at the old rate first
  return {
    ...s, nectar: s.nectar - cost.nectar, jelly: s.jelly - cost.jelly,
    beeLevels: { ...s.beeLevels, [id]: beeLevel(s, id) + 1 },
    stats: { ...s.stats, levelUps: s.stats.levelUps + 1 },
  };
}

// ---------- garden ----------
export const nextBedCost = (s: GameState) => bedCost(s.garden.beds.length);
export function unlockBed(s0: GameState, now: number): GameState | null {
  const cost = nextBedCost(s0);
  if (cost === null || s0.honey < cost) return null;
  const s = tick(s0, now);
  return { ...s, honey: s.honey - cost, garden: { ...s.garden, beds: [...s.garden.beds, emptyBed()] } };
}
export const seedPrice = (s: GameState, flower: string) => seedCost(FLOWER_BY_ID[flower], level(s));
export const flowerUnlocked = (s: GameState, flower: string) => level(s) >= (FLOWER_BY_ID[flower]?.minLevel ?? Infinity);
export function plantFlower(s0: GameState, bed: number, flower: string, now: number): GameState | null {
  if (!FLOWER_BY_ID[flower] || !flowerUnlocked(s0, flower)) return null;
  const cost = seedPrice(s0, flower);
  if (s0.honey < cost) return null;
  const s = tick(s0, now); // settles hive at the old rate (the new bed raises the bonus from now on)
  const g = plantBed(s.garden, bed, flower);
  return g ? { ...s, honey: s.honey - cost, garden: g } : null;
}
export function waterBedAction(s0: GameState, bed: number, now: number): GameState | null {
  const s = tick(s0, now);
  const g = waterBed(s.garden, bed);
  return g ? { ...s, garden: g } : null;
}
export function waterAllAction(s0: GameState, now: number): { state: GameState; n: number } | null {
  const s = tick(s0, now);
  const r = waterAllBeds(s.garden);
  return r ? { state: { ...s, garden: r.garden }, n: r.n } : null;
}
export function harvestAction(s0: GameState, bed: number, now: number): { state: GameState; nectar: number; flower: string } | null {
  const s = tick(s0, now);
  const r = harvestBed(s.garden, bed);
  if (!r) return null;
  return {
    state: { ...s, garden: r.garden, nectar: s.nectar + r.nectar, stats: { ...s.stats, harvests: s.stats.harvests + 1, totalNectar: s.stats.totalNectar + r.nectar } },
    nectar: r.nectar, flower: r.flower,
  };
}

export interface RoundSummary {
  mode: "daily" | "free";
  score: number;
  chains: number[];
  bombs: number;
  cellsByColor: number[];
}
export interface RoundReward { honey: number; stars: number; newStars: number; jelly: number; record: boolean; streak: number }

export function finishRound(s0: GameState, r: RoundSummary, now: number): { state: GameState; reward: RoundReward } {
  let s = tick(s0, now);
  // colour of the day: free play already scores that colour ×1.5 (rulesFor); the daily puzzle keeps equal
  // conditions for the stars and pays +50% honey for that colour's share of the score instead.
  const dc = dayColorInfo(s, now);
  const cells = r.cellsByColor.reduce((a, b) => a + b, 0);
  const share = r.mode === "daily" && dc.active && cells > 0 ? (r.cellsByColor[dc.color] ?? 0) / cells : 0;
  const honey = Math.round((r.score / 10) * puzzleHoneyMult(s) * (1 + (DAY_COLOR_MULT - 1) * share));
  const record = r.score > s.stats.bestScore;
  s = {
    ...s,
    honey: s.honey + honey,
    stats: {
      ...s.stats,
      rounds: s.stats.rounds + 1,
      bestScore: Math.max(s.stats.bestScore, r.score),
      longestChain: Math.max(s.stats.longestChain, ...r.chains, 0),
      totalHoney: s.stats.totalHoney + honey,
      bombs: s.stats.bombs + r.bombs,
    },
  };
  let stars = 0, newStars = 0;
  if (r.mode === "daily") {
    const day = today(s, now);
    stars = starsFor(r.score);
    const prev = s.daily.results[day] ?? { stars: 0, score: 0 };
    newStars = Math.max(0, stars - prev.stars);
    const results: Record<string, DailyResult> = { ...s.daily.results, [day]: { stars: Math.max(prev.stars, stars), score: Math.max(prev.score, r.score) } };
    // keep the last 60 days only
    for (const k of Object.keys(results)) if (Number(k) < day - 60) delete results[k];
    let { streak, lastDay, best } = s.daily;
    if (stars > 0 && lastDay !== day) {
      streak = lastDay === day - 1 ? streak + 1 : 1;
      lastDay = day;
      best = Math.max(best, streak);
    }
    s = { ...s, jelly: s.jelly + newStars, daily: { lastDay, streak, best, results } };
    if (stars > 0) s = taskEvent(s, { type: "daily" });
  }
  for (const len of r.chains) s = taskEvent(s, { type: "chain", len });
  if (r.bombs) s = taskEvent(s, { type: "bomb", n: r.bombs });
  r.cellsByColor.forEach((n, color) => { if (n) s = taskEvent(s, { type: "cells", color, n }); });
  s = taskEvent(s, { type: "round", score: r.score, mode: r.mode, honey });
  return { state: s, reward: { honey, stars, newStars, jelly: newStars, record, streak: s.daily.streak } };
}

export function claimTask(s: GameState, id: string): { state: GameState; reward: Reward } | null {
  const t = tasksForDay(s.tasks.day).find((x) => x.id === id);
  if (!t || s.tasks.claimed.includes(id) || (s.tasks.progress[id] ?? 0) < t.target) return null;
  const reward = taskReward(level(s));
  return { state: add({ ...s, tasks: { ...s.tasks, claimed: [...s.tasks.claimed, id] } }, reward), reward };
}
export function claimBonus(s: GameState): { state: GameState; reward: Reward } | null {
  if (s.tasks.bonus || s.tasks.claimed.length < 3) return null;
  const reward = bonusReward(level(s));
  return { state: add({ ...s, tasks: { ...s.tasks, bonus: true } }, reward), reward };
}

export const canClaimLogin = (s: GameState, now: number) => s.login.lastDay === null || today(s, now) > s.login.lastDay;
/** Index (0..6) of the reward that would be claimed today. */
export function nextLoginIndex(s: GameState, now: number): number {
  const day = today(s, now);
  return s.login.lastDay === day - 1 ? (s.login.index + 1) % 7 : 0;
}
export function claimLogin(s0: GameState, now: number): { state: GameState; reward: Reward; index: number } | null {
  const s = tick(s0, now);
  if (!canClaimLogin(s, now)) return null;
  const day = today(s, now);
  const index = nextLoginIndex(s, now);
  const streak = s.login.lastDay === day - 1 ? s.login.streak + 1 : 1;
  const reward = loginReward(index, level(s));
  return { state: add({ ...s, login: { lastDay: day, index, streak } }, reward), reward, index };
}

/** Daily puzzle streak as shown today (0 if yesterday was missed). */
export function dailyStreak(s: GameState, now: number): number {
  const d = today(s, now);
  return s.daily.lastDay !== null && s.daily.lastDay >= d - 1 ? s.daily.streak : 0;
}
