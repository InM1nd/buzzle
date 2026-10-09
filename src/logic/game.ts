/**
 * Game state model + pure actions (no React Native imports → unit-testable with node:test).
 */
import { boostsFor, BEE_BY_ID, levelCost, MAX_BEE_LEVEL } from "./bees";
import { dayNumber, isWeekend, starsFor, weekOf, WEEKEND_STARS } from "./day";
import {
  buildCost, builtCount, capHours, capacity, Hive, hiveLevel, MAX_COMB_LEVEL, newHive, productionPerHour, settle, UpgradeId,
  UPGRADE_BY_ID, upgradeCost,
} from "./economy";
import { HIVE_SLOTS } from "./hex";
import {
  bedCost, dayColor, DAY_COLOR_MULT, FLOWER_BY_ID, Garden, gardenHiveBonus, harvest as harvestBed, hasColor, migrateGarden, newGarden,
  plant as plantBed, seedCost, settleGarden, water as waterBed, waterAll as waterAllBeds, emptyBed,
} from "./garden";
import { bonusReward, loginReward, Reward, TaskDef, TaskEvent, taskById, tasksForDay, taskReward, WEEKLY_TASKS } from "./tasks";
import {
  albumBonus, BoosterId, BoxKind, buyBooster, buyFragment, buyItem, Drop, FRAGMENTS_FOR_BEE, Loot, migrateLoot, newLoot, NIGHT_BEE,
  openComb, SKIN_BY_ID, DECOS,
} from "./loot";
import { hashString } from "./rng";

/** v2 (Buzzle 1.2): nectar, bee levels, garden. The storage key stays the same; v1 saves are migrated on load
 * (and backed up under bzz:backup:v1 by ui/store). */
export const STATE_VERSION = 4 as const;
export const STORAGE_KEY = "bzz:state:v1";

export interface DailyResult { stars: number; score: number }
/** v1.3 weekly layer (calendar week Mon–Sun, from the never-decreasing game day) */
export interface Week {
  id: number;
  /** tasks claimed this week → weekly chest at WEEKLY_TASKS */
  tasks: number;
  chest: boolean;
  weekendBest: number;
  weekendStars: number;
  freezeBought: boolean;
}
export const newWeek = (id: number): Week => ({ id, tasks: 0, chest: false, weekendBest: 0, weekendStars: 0, freezeBought: false });
/** streak freeze price (royal jelly); one per week, at most one in stock */
export const FREEZE_COST = 4;
export interface GameState {
  version: 4;
  honey: number;
  jelly: number;
  nectar: number;
  hive: Hive;
  upgrades: Record<UpgradeId, number>;
  bees: string[];
  /** level per owned bee (1..10); missing = 1 */
  beeLevels: Record<string, number>;
  /** v3 (1.2.1): player-given bee names; missing = species name */
  beeNames: Record<string, string>;
  /** v4 (1.3): skin worn by a bee (any owned skin, on any bee) */
  beeSkins: Record<string, string>;
  garden: Garden;
  /** freeze: streak freezes in stock (0..1), used up automatically when one day is missed */
  daily: { lastDay: number | null; streak: number; best: number; results: Record<string, DailyResult>; freeze: number };
  login: { lastDay: number | null; index: number; streak: number };
  /** ids: today's three tasks (picked at the day change); missing in a migrated save = the v1.2 pick */
  tasks: { day: number; progress: Record<string, number>; claimed: string[]; bonus: boolean; ids?: string[] };
  loot: Loot;
  week: Week;
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
    beeNames: {},
    beeSkins: {},
    garden: newGarden(now),
    daily: { lastDay: null, streak: 0, best: 0, results: {}, freeze: 0 },
    login: { lastDay: null, index: -1, streak: 0 },
    tasks: { day, progress: {}, claimed: [], bonus: false, ids: tasksForDay(day).map((t) => t.id) },
    loot: newLoot(hashString(`bzz-loot-${now}`)),
    week: newWeek(weekOf(day)),
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
  const rawNames = obj(s.beeNames);
  const beeNames: Record<string, string> = {};
  for (const id of Object.keys(rawNames)) {
    if (!BEE_BY_ID[id] || typeof rawNames[id] !== "string") continue;
    const n = cleanBeeName(rawNames[id]);
    if (n && n !== BEE_BY_ID[id].name) beeNames[id] = n;
  }
  const clockMax = Math.max(num(obj(s.clock).maxSeen, 0), 0) || now;
  const maxDay = num(obj(s.clock).maxDay, d.clock.maxDay);
  const loot = migrateLoot(s.loot, hashString(`bzz-loot-${clockMax}-${bees.join(",")}`));
  const rawSkins = obj(s.beeSkins);
  const beeSkins: Record<string, string> = {};
  for (const id of bees) if (typeof rawSkins[id] === "string" && SKIN_BY_ID[rawSkins[id]] && loot.owned.includes(rawSkins[id])) beeSkins[id] = rawSkins[id];
  const w = obj(s.week);
  const week: Week = typeof w.id === "number"
    ? { id: w.id, tasks: Math.max(0, num(w.tasks, 0) | 0), chest: !!w.chest, weekendBest: Math.max(0, num(w.weekendBest, 0)), weekendStars: Math.max(0, Math.min(3, num(w.weekendStars, 0) | 0)), freezeBought: !!w.freezeBought }
    : newWeek(weekOf(Math.max(maxDay, dayNumber(new Date(now)))));
  const rawTasks = obj(s.tasks);
  const ids = Array.isArray(rawTasks.ids) && rawTasks.ids.length === 3 && rawTasks.ids.every((x: unknown) => typeof x === "string" && taskById(x)) ? (rawTasks.ids as string[]) : undefined;
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
    beeNames,
    beeSkins,
    loot,
    week,
    // a v1 save has no garden: start it at the newest time the game has seen, so a rolled-back clock can't pre-grow it
    garden: s.garden ? migrateGarden(s.garden, now) : newGarden(Math.max(now, clockMax)),
    daily: { ...d.daily, ...obj(s.daily), results: { ...obj(obj(s.daily).results) }, freeze: Math.max(0, Math.min(1, num(obj(s.daily).freeze, 0) | 0)) },
    login: { ...d.login, ...obj(s.login) },
    tasks: { day: num(rawTasks.day, d.tasks.day), progress: { ...obj(rawTasks.progress) }, claimed: Array.isArray(rawTasks.claimed) ? rawTasks.claimed : [], bonus: !!rawTasks.bonus, ids },
    stats: { ...d.stats, ...obj(s.stats) },
    settings: { ...d.settings, ...obj(s.settings), ...(s.version === 1 || s.version === undefined ? { gardenIntroDone: false } : {}) },
    clock: { maxSeen: clockMax, maxDay },
  };
}

// ---------- derived ----------
export const boosts = (s: GameState) => boostsFor(s.bees, s.beeLevels);
/** v1.3 permanent bonuses of completed album pages */
export const album = (s: GameState) => albumBonus(s.loot.owned, s.bees.includes(NIGHT_BEE));
/** hive production: combs × (workers + bee bonuses + bee levels + occupied garden beds + album) */
export const rate = (s: GameState) => productionPerHour(s.hive, s.upgrades.workers, boosts(s).prodMult + gardenHiveBonus(s.garden) + album(s).hiveProd);
const storeHours = (s: GameState) => capHours(s.upgrades.storage, boosts(s).capHours + album(s).capHours);
export const cap = (s: GameState) => capacity(rate(s), storeHours(s));
export const level = (s: GameState) => hiveLevel(s.hive);
/** Day used for daily keys: never goes back even if the device clock does. */
export const today = (s: GameState, now: number) => Math.max(dayNumber(new Date(now)), s.clock.maxDay);
export const clockRolledBack = (s: GameState, now: number) => now < s.clock.maxSeen - 10 * 60_000;
export const freeMoves = (s: GameState, base = 20) => base + s.upgrades.queen + boosts(s).extraMoves;
export const puzzleHoneyMult = (s: GameState) => 1 + 0.1 * s.upgrades.flowers + boosts(s).puzzleHoneyMult + album(s).puzzleHoney;
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
  const hours = storeHours(s);
  let n: GameState = {
    ...s, hive: settle(s.hive, now, rate(s), hours), garden: settleGarden(s.garden, now),
    clock: { maxSeen: Math.max(s.clock.maxSeen, now), maxDay: day },
  };
  if (n.tasks.day !== day) n = { ...n, tasks: { day, progress: {}, claimed: [], bonus: false, ids: tasksForDay(day, taskPool(n)).map((t) => t.id) } };
  const wk = weekOf(day);
  if (n.week.id < wk) n = { ...n, week: newWeek(wk) };
  return n;
}

/** the daily task pool grows with the player (v1.3) */
export const taskPool = (s: GameState) => ({ garden: s.stats.harvests >= 2, levels: s.stats.levelUps >= 1 });
/** today's three tasks */
export function currentTasks(s: GameState): TaskDef[] {
  const ts = s.tasks.ids?.map(taskById).filter((t): t is TaskDef => !!t);
  return ts && ts.length === 3 ? ts : tasksForDay(s.tasks.day);
}

export function taskEvent(s: GameState, e: TaskEvent): GameState {
  const progress = { ...s.tasks.progress };
  for (const t of currentTasks(s)) {
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
  if (!bee || bee.fragments || s0.bees.includes(id) || s0.jelly < bee.cost) return null;
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
  return taskEvent({
    ...s, nectar: s.nectar - cost.nectar, jelly: s.jelly - cost.jelly,
    beeLevels: { ...s.beeLevels, [id]: beeLevel(s, id) + 1 },
    stats: { ...s.stats, levelUps: s.stats.levelUps + 1 },
  }, { type: "levelup" });
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
/** seeds in the pocket (from the surprise combs) */
export const seedsOwned = (s: GameState, flower: string) => s.loot.seeds[flower] ?? 0;
export const flowerUnlocked = (s: GameState, flower: string) =>
  FLOWER_BY_ID[flower]?.rare ? seedsOwned(s, flower) > 0 : level(s) >= (FLOWER_BY_ID[flower]?.minLevel ?? Infinity) || seedsOwned(s, flower) > 0;
/** plant: a pocket seed is used first (free), otherwise the seed is bought; rare flowers only from pocket seeds */
export function plantFlower(s0: GameState, bed: number, flower: string, now: number): GameState | null {
  const f = FLOWER_BY_ID[flower];
  if (!f || !flowerUnlocked(s0, flower)) return null;
  const pocket = seedsOwned(s0, flower) > 0;
  const cost = pocket ? 0 : seedPrice(s0, flower);
  if (f.rare && !pocket) return null;
  if (s0.honey < cost) return null;
  const s = tick(s0, now); // settles hive at the old rate (the new bed raises the bonus from now on)
  const g = plantBed(s.garden, bed, flower);
  if (!g) return null;
  const seeds = { ...s.loot.seeds };
  if (pocket) { seeds[flower] -= 1; if (seeds[flower] <= 0) delete seeds[flower]; }
  return taskEvent({ ...s, honey: s.honey - cost, garden: g, loot: { ...s.loot, seeds } }, { type: "plant" });
}
export function waterBedAction(s0: GameState, bed: number, now: number): GameState | null {
  const s = tick(s0, now);
  const g = waterBed(s.garden, bed);
  return g ? taskEvent({ ...s, garden: g }, { type: "water", n: 1 }) : null;
}
export function waterAllAction(s0: GameState, now: number): { state: GameState; n: number } | null {
  const s = tick(s0, now);
  const r = waterAllBeds(s.garden);
  return r ? { state: taskEvent({ ...s, garden: r.garden }, { type: "water", n: r.n }), n: r.n } : null;
}
export function harvestAction(s0: GameState, bed: number, now: number): { state: GameState; nectar: number; flower: string } | null {
  const s = tick(s0, now);
  const r = harvestBed(s.garden, bed);
  if (!r) return null;
  const nectar = r.nectar + album(s).harvestNectar;
  return {
    state: taskEvent({ ...s, garden: r.garden, nectar: s.nectar + nectar, stats: { ...s.stats, harvests: s.stats.harvests + 1, totalNectar: s.stats.totalNectar + nectar } }, { type: "harvest", nectar }),
    nectar, flower: r.flower,
  };
}

export type RoundMode = "daily" | "free" | "weekend";
export interface RoundSummary {
  mode: RoundMode;
  score: number;
  chains: number[];
  bombs: number;
  cellsByColor: number[];
}
export interface RoundReward {
  honey: number; stars: number; newStars: number; jelly: number; record: boolean; streak: number;
  /** v1.3: surprise combs earned by this round (3 stars, streak of 7, weekend stars) */
  boxes: BoxKind[];
  /** a streak freeze saved the daily streak */
  froze?: boolean;
}

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
  let stars = 0, newStars = 0, froze = false;
  const boxes: BoxKind[] = [];
  let extraJelly = 0;
  if (r.mode === "weekend" && isWeekend(today(s, now))) {
    stars = starsFor(r.score, WEEKEND_STARS);
    const prev = s.week.weekendStars;
    newStars = Math.max(0, stars - prev);
    if (prev < 1 && stars >= 1) boxes.push("wax");
    if (prev < 2 && stars >= 2) extraJelly += 2;
    if (prev < 3 && stars >= 3) boxes.push("gold");
    s = { ...s, jelly: s.jelly + extraJelly, week: { ...s.week, weekendStars: Math.max(prev, stars), weekendBest: Math.max(s.week.weekendBest, r.score) } };
  } else if (r.mode === "daily") {
    const day = today(s, now);
    stars = starsFor(r.score);
    const prev = s.daily.results[day] ?? { stars: 0, score: 0 };
    newStars = Math.max(0, stars - prev.stars);
    const results: Record<string, DailyResult> = { ...s.daily.results, [day]: { stars: Math.max(prev.stars, stars), score: Math.max(prev.score, r.score) } };
    // keep the last 60 days only
    for (const k of Object.keys(results)) if (Number(k) < day - 60) delete results[k];
    let { streak, lastDay, best, freeze } = s.daily;
    if (stars > 0 && lastDay !== day) {
      if (lastDay === day - 1) streak += 1;
      else if (lastDay === day - 2 && freeze > 0 && streak > 0) { streak += 1; freeze -= 1; froze = true; }  // one missed day, frozen
      else streak = 1;
      lastDay = day;
      best = Math.max(best, streak);
      if (streak % 7 === 0) boxes.push("gold");
    }
    if (prev.stars < 3 && stars === 3) boxes.push("wax");
    s = { ...s, jelly: s.jelly + newStars, daily: { lastDay, streak, best, results, freeze } };
    if (stars > 0) s = taskEvent(s, { type: "daily" });
  }
  for (const len of r.chains) s = taskEvent(s, { type: "chain", len });
  if (r.bombs) s = taskEvent(s, { type: "bomb", n: r.bombs });
  r.cellsByColor.forEach((n, color) => { if (n) s = taskEvent(s, { type: "cells", color, n }); });
  s = taskEvent(s, { type: "round", score: r.score, mode: r.mode === "daily" ? "daily" : "free", honey });
  if (boxes.length) s = addBoxes(s, boxes);
  return { state: s, reward: { honey, stars, newStars, jelly: r.mode === "daily" ? newStars : extraJelly, record, streak: s.daily.streak, boxes, froze } };
}

export function claimTask(s: GameState, id: string): { state: GameState; reward: Reward } | null {
  const t = currentTasks(s).find((x) => x.id === id);
  if (!t || s.tasks.claimed.includes(id) || (s.tasks.progress[id] ?? 0) < t.target) return null;
  const reward = taskReward(level(s));
  return { state: add({ ...s, tasks: { ...s.tasks, claimed: [...s.tasks.claimed, id] }, week: { ...s.week, tasks: s.week.tasks + 1 } }, reward), reward };
}
/** all three tasks: the daily chest — honey, jelly and the free wooden comb of the day */
export function claimBonus(s: GameState): { state: GameState; reward: Reward; box: BoxKind } | null {
  if (s.tasks.bonus || s.tasks.claimed.length < 3) return null;
  const reward = bonusReward(level(s));
  return { state: addBoxes(add({ ...s, tasks: { ...s.tasks, bonus: true } }, reward), ["wood"]), reward, box: "wood" };
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
  if (s.daily.lastDay === null) return 0;
  if (s.daily.lastDay >= d - 1) return s.daily.streak;
  // one missed day is covered by a streak freeze (used when the next daily puzzle is solved)
  return s.daily.lastDay === d - 2 && s.daily.freeze > 0 ? s.daily.streak : 0;
}

// ---------------------------------------------------------------- bee names (v1.2.1)
export const MAX_BEE_NAME = 16;
/** split into user-perceived characters (emoji with ZWJ / skin tones / flags count as one) */
export function graphemes(t: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(t), (x) => x.segment);
  // fallback (older Hermes): attach combining marks, variation selectors, skin tones, ZWJ sequences, tag chars and flag pairs
  const out: string[] = [];
  let joinNext = false;
  for (const ch of Array.from(t)) {
    const cp = ch.codePointAt(0)!;
    const extend = (cp >= 0x300 && cp <= 0x36f) || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x1f3fb && cp <= 0x1f3ff) || (cp >= 0xe0020 && cp <= 0xe007f) || cp === 0x20e3;
    const ri = cp >= 0x1f1e6 && cp <= 0x1f1ff;
    const last = out[out.length - 1];
    const lastRi = last !== undefined && Array.from(last).length === 1 && last.codePointAt(0)! >= 0x1f1e6 && last.codePointAt(0)! <= 0x1f1ff;
    if (out.length && (joinNext || extend || cp === 0x200d || (ri && lastRi))) out[out.length - 1] += ch;
    else out.push(ch);
    joinNext = cp === 0x200d;
  }
  return out;
}
/** trim, single spaces, no control / invisible line characters, at most MAX_BEE_NAME characters */
export function cleanBeeName(raw: string): string {
  const t = String(raw).replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u200B\uFEFF]/g, " ").replace(/\s+/g, " ").trim();
  const g = graphemes(t);
  return (g.length > MAX_BEE_NAME ? g.slice(0, MAX_BEE_NAME).join("") : t).trim();
}
export const beeNameLength = (raw: string) => graphemes(raw.replace(/\s+/g, " ").trim()).length;
/** the name shown for a bee: the player's name or the species name */
export const beeDisplayName = (s: GameState, id: string) => s.beeNames?.[id] || BEE_BY_ID[id]?.name || id;
/** rename an owned bee; an empty name or the species name resets to the default */
export function renameBee(s: GameState, id: string, name: string): GameState | null {
  if (!s.bees.includes(id) || !BEE_BY_ID[id]) return null;
  const n = cleanBeeName(name);
  const beeNames = { ...s.beeNames };
  if (!n || n === BEE_BY_ID[id].name) delete beeNames[id];
  else beeNames[id] = n;
  return { ...s, beeNames };
}

// ---------------------------------------------------------------- v1.3: surprise combs, weekly layer, skins
export function addBoxes(s: GameState, kinds: BoxKind[]): GameState {
  const boxes = { ...s.loot.boxes };
  for (const k of kinds) boxes[k] += 1;
  return { ...s, loot: { ...s.loot, boxes } };
}
export const WEEKLY_REWARD = { wax: 2, jelly: 3 };
export const canClaimWeekly = (s: GameState) => !s.week.chest && s.week.tasks >= WEEKLY_TASKS;
export function claimWeekly(s0: GameState, now: number): GameState | null {
  const s = tick(s0, now);
  if (!canClaimWeekly(s)) return null;
  return addBoxes({ ...s, jelly: s.jelly + WEEKLY_REWARD.jelly, week: { ...s.week, chest: true } }, Array(WEEKLY_REWARD.wax).fill("wax"));
}
export const canBuyFreeze = (s: GameState) => !s.week.freezeBought && s.daily.freeze < 1 && s.jelly >= FREEZE_COST;
export function buyFreeze(s0: GameState, now: number): GameState | null {
  const s = tick(s0, now);
  if (!canBuyFreeze(s)) return null;
  return { ...s, jelly: s.jelly - FREEZE_COST, daily: { ...s.daily, freeze: 1 }, week: { ...s.week, freezeBought: true } };
}
/** the weekend puzzle is open on Saturday and Sunday (game day, never goes back) */
export const weekendOpen = (s: GameState, now: number) => isWeekend(today(s, now));

const openCtx = (s: GameState) => ({
  hiveLvl: level(s),
  flowers: FLOWERS_FOR_SEEDS.filter((f) => level(s) >= FLOWER_BY_ID[f].minLevel),
  hasNightBee: s.bees.includes(NIGHT_BEE),
});
const FLOWERS_FOR_SEEDS = Object.values(FLOWER_BY_ID).filter((f) => !f.rare).map((f) => f.id);
function credit(s: GameState, drops: Drop[]): GameState {
  let honey = 0, nectar = 0, jelly = 0;
  for (const d of drops) { if (d.t === "honey") honey += d.n; else if (d.t === "nectar") nectar += d.n; else if (d.t === "jelly") jelly += d.n; }
  return { ...s, honey: s.honey + honey, nectar: s.nectar + nectar, jelly: s.jelly + jelly, stats: { ...s.stats, totalNectar: s.stats.totalNectar + nectar } };
}
/** open one comb of a kind */
export function openBox(s0: GameState, kind: BoxKind, now: number): { state: GameState; drops: Drop[] } | null {
  const s = tick(s0, now);
  const r = openComb(s.loot, kind, openCtx(s));
  if (!r) return null;
  return { state: credit({ ...s, loot: r.loot }, r.drops), drops: r.drops };
}
/** «Открыть все»: every comb of that kind (bonus golden combs found inside stay for later) */
export function openAllBoxes(s0: GameState, kind: BoxKind, now: number, max = 60): { state: GameState; drops: Drop[][] } | null {
  let s = tick(s0, now);
  const all: Drop[][] = [];
  for (let i = 0; i < max && s.loot.boxes[kind] > 0; i++) {
    const r = openComb(s.loot, kind, openCtx(s));
    if (!r) break;
    s = credit({ ...s, loot: r.loot }, r.drops);
    all.push(r.drops);
  }
  return all.length ? { state: s, drops: all } : null;
}
export const canAssembleNightBee = (s: GameState) => !s.bees.includes(NIGHT_BEE) && s.loot.fragments >= FRAGMENTS_FOR_BEE;
export function assembleNightBee(s0: GameState, now: number): GameState | null {
  if (!canAssembleNightBee(s0)) return null;
  const s = tick(s0, now); // production at the old rate up to now
  return { ...s, bees: [...s.bees, NIGHT_BEE], beeLevels: { ...s.beeLevels, [NIGHT_BEE]: 1 }, loot: { ...s.loot, fragments: 0 } };
}
export function shopBuyItem(s: GameState, id: string): GameState | null {
  const l = buyItem(s.loot, id); return l ? { ...s, loot: l } : null;
}
export function shopBuyBooster(s: GameState, b: BoosterId): GameState | null {
  const l = buyBooster(s.loot, b); return l ? { ...s, loot: l } : null;
}
export function shopBuyFragment(s: GameState): GameState | null {
  const l = buyFragment(s.loot, s.bees.includes(NIGHT_BEE)); return l ? { ...s, loot: l } : null;
}
/** put an owned skin on an owned bee (null = take it off); one skin can be worn by several bees */
export function setSkin(s: GameState, bee: string, skin: string | null): GameState | null {
  if (!s.bees.includes(bee)) return null;
  const beeSkins = { ...s.beeSkins };
  if (skin === null) delete beeSkins[bee];
  else { if (!SKIN_BY_ID[skin] || !s.loot.owned.includes(skin)) return null; beeSkins[bee] = skin; }
  return { ...s, beeSkins };
}
/** show / put away a decoration */
export function toggleDeco(s: GameState, id: string): GameState | null {
  if (!DECOS.some((d) => d.id === id) || !s.loot.owned.includes(id)) return null;
  const hidden = s.loot.hidden.includes(id) ? s.loot.hidden.filter((x) => x !== id) : [...s.loot.hidden, id];
  return { ...s, loot: { ...s.loot, hidden } };
}
export const shownDecos = (s: GameState, place: "hive" | "garden") =>
  DECOS.filter((d) => d.place === place && s.loot.owned.includes(d.id) && !s.loot.hidden.includes(d.id)).map((d) => d.id);

/** free play boosters, chosen before the round (the daily and weekend puzzles keep equal conditions: no boosters) */
export interface RoundBoosters { moves: boolean; bomb: boolean }
export function startFreeRound(s: GameState, use: RoundBoosters): { state: GameState; extraMoves: number; bomb: boolean } {
  const b = { ...s.loot.boosters };
  const m = use.moves && b.moves > 0; if (m) b.moves -= 1;
  const bomb = use.bomb && b.bomb > 0; if (bomb) b.bomb -= 1;
  return { state: { ...s, loot: { ...s.loot, boosters: b } }, extraMoves: m ? 3 : 0, bomb };
}
export function useShuffle(s: GameState): GameState | null {
  if (s.loot.boosters.shuffle <= 0) return null;
  return { ...s, loot: { ...s.loot, boosters: { ...s.loot.boosters, shuffle: s.loot.boosters.shuffle - 1 } } };
}
