/**
 * Balance simulation (v1.2): bots play Buzzle day by day through the real game actions
 * (hive, puzzle rewards, tasks, login, garden, bee unlocks and levels) for 30/60/90 days.
 *   npx tsx scripts/simulate.ts            → table for the casual and active bot
 *   npx tsx scripts/simulate.ts --json     → raw numbers
 */
import {
  GameState, newState, tick, collectHive, combActionCost, combAction, canBuildAt, buyUpgrade, upgradeCostFor, finishRound,
  claimLogin, claimTask, claimBonus, unlockBee, levelUpBee, beeLevelCost, unlockBed, nextBedCost, plantFlower, seedPrice,
  flowerUnlocked, waterAllAction, harvestAction, rate, cap, level, freeMoves,
} from "../src/logic/game";
import { BEES, MAX_BEE_LEVEL } from "../src/logic/bees";
import { FLOWERS, isReady, FLOWER_BY_ID, WATER_HOURS } from "../src/logic/garden";
import { tasksForDay } from "../src/logic/tasks";
import { HIVE_SLOTS } from "../src/logic/hex";
import { Rng } from "../src/logic/rng";
import { UpgradeId } from "../src/logic/economy";

const H = 3600_000;
interface Profile { name: string; sessions: number[]; dailyScore: [number, number]; freeRounds: number; freeScore: [number, number]; tasks: number }
export const PROFILES: Profile[] = [
  // casual: 3 visits a day, average daily puzzle (≈1 star), 2 of 3 tasks
  { name: "casual", sessions: [9, 13.5, 20.5], dailyScore: [900, 200], freeRounds: 0.5, freeScore: [900, 200], tasks: 2 },
  // active: 6 visits a day, strong daily (≈2 stars), 2 free rounds, all tasks + chest
  { name: "active", sessions: [8, 11, 14, 17, 20, 23], dailyScore: [2200, 500], freeRounds: 2, freeScore: [1700, 400], tasks: 3 },
];

function round(s: GameState, mode: "daily" | "free", mean: number, sd: number, rng: Rng, now: number) {
  const score = Math.max(200, Math.round(mean + sd * (rng.next() + rng.next() + rng.next() - 1.5) * 1.4));
  const cells = Math.round(score / 28);
  const by = [0, 0, 0, 0, 0];
  for (let i = 0; i < cells; i++) by[rng.int(5)]++;
  const chains = [6, 5, 4, 3, 7, 3, 4];
  return finishRound(s, { mode, score, chains, bombs: 2, cellsByColor: by }, now).state;
}

function spendHoney(s: GameState, now: number, gapH: number): GameState {
  for (let guard = 0; guard < 200; guard++) {
    // keep enough honey to replant every bed with the best unlocked flower
    const best = [...FLOWERS].reverse().find((f) => flowerUnlocked(s, f.id))!;
    const reserve = seedPrice(s, best.id) * s.garden.beds.length * 0.6;
    const opts: { cost: number; act: () => GameState | null; w: number }[] = [];
    for (let i = 0; i < HIVE_SLOTS.length; i++) {
      const c = combActionCost(s, i);
      if (c !== null && (s.hive.combs[i] > 0 || canBuildAt(s, i))) opts.push({ cost: c, act: () => combAction(s, i, now), w: 1 });
    }
    for (const id of ["workers", "flowers", "storage", "queen"] as UpgradeId[]) {
      const c = upgradeCostFor(s, id);
      if (c === null) continue;
      if (id === "storage" && 6 + s.upgrades.storage >= gapH + 2) continue;
      opts.push({ cost: c, act: () => buyUpgrade(s, id, now), w: id === "workers" ? 0.8 : id === "queen" ? 1.6 : 1.1 });
    }
    const bc = nextBedCost(s);
    if (bc !== null) opts.push({ cost: bc, act: () => unlockBed(s, now), w: 0.55 });
    opts.sort((a, b) => a.cost * a.w - b.cost * b.w);
    const o = opts[0];
    if (!o || s.honey - o.cost < reserve) break;
    const n = o.act();
    if (!n) break;
    s = n;
  }
  return s;
}

function garden(s: GameState, now: number, nextGapH: number): GameState {
  for (let i = 0; i < s.garden.beds.length; i++) {
    const r = harvestAction(s, i, now);
    if (r) s = r.state;
  }
  const w = waterAllAction(s, now);
  if (w) s = w.state;
  // plant: the biggest flower that blooms within the wet hours until the next visit (or the best one overnight)
  const wet = Math.min(WATER_HOURS, nextGapH);
  for (let i = 0; i < s.garden.beds.length; i++) {
    if (s.garden.beds[i].flower) continue;
    const ok = FLOWERS.filter((f) => flowerUnlocked(s, f.id) && s.honey >= seedPrice(s, f.id));
    const fits = ok.filter((f) => f.growHours <= wet + 1e-9);
    const pick = (nextGapH > 6 ? ok[ok.length - 1] : fits[fits.length - 1]) ?? ok[0];
    if (!pick) break;
    const n = plantFlower(s, i, pick.id, now);
    if (n) s = n;
  }
  return s;
}

function spendJellyNectar(s: GameState, now: number): GameState {
  for (let guard = 0; guard < 100; guard++) {
    const locked = BEES.filter((b) => !s.bees.includes(b.id)).sort((a, b) => a.cost - b.cost);
    if (locked.length && s.jelly >= locked[0].cost) { s = unlockBee(s, locked[0].id, now) ?? s; continue; }
    // level the bee with the cheapest next level; while bees are still locked, keep jelly for them
    const opts = s.bees.map((id) => ({ id, c: beeLevelCost(s, id) })).filter((o) => o.c && s.nectar >= o.c.nectar && s.jelly >= o.c.jelly && !(o.c.jelly && locked.length))
      .sort((a, b) => a.c!.nectar - b.c!.nectar);
    if (!opts.length) break;
    s = levelUpBee(s, opts[0].id, now) ?? s;
  }
  return s;
}

export function simulate(p: Profile, days: number, seed = 7) {
  const rng = new Rng(seed);
  const start = new Date(2026, 9, 12, 0, 0, 0).getTime();
  let s = newState(start + p.sessions[0] * H);
  s = { ...s, settings: { ...s.settings, tutorialDone: true } };
  const marks: Record<string, number | null> = { allBees: null, firstL5: null, firstL10: null, allL5: null, allL10: null, beds6: null };
  const snaps: Record<number, any> = {};
  let honeyEarned = 0, jellyEarned = 0;
  for (let d = 0; d < days; d++) {
    for (let k = 0; k < p.sessions.length; k++) {
      const now = start + d * 24 * H + p.sessions[k] * H + rng.next() * 0.4 * H;
      const nextH = k + 1 < p.sessions.length ? p.sessions[k + 1] - p.sessions[k] : 24 - p.sessions[k] + p.sessions[0];
      s = tick(s, now);
      const h0 = s.honey, j0 = s.jelly;
      if (k === 0) { const l = claimLogin(s, now); if (l) s = l.state; s = round(s, "daily", p.dailyScore[0], p.dailyScore[1], rng, now); }
      const c = collectHive(s, now); s = c.state;
      if (rng.next() < p.freeRounds / p.sessions.length) s = round(s, "free", p.freeScore[0], p.freeScore[1], rng, now);
      if (k === p.sessions.length - 1) {
        const ts = tasksForDay(s.tasks.day);
        for (let t = 0; t < p.tasks; t++) {
          s = { ...s, tasks: { ...s.tasks, progress: { ...s.tasks.progress, [ts[t].id]: ts[t].target } } };
          const r = claimTask(s, ts[t].id); if (r) s = r.state;
        }
        const b = claimBonus(s); if (b) s = b.state;
      }
      honeyEarned += Math.max(0, s.honey - h0); jellyEarned += Math.max(0, s.jelly - j0);
      s = garden(s, now, nextH);
      s = spendJellyNectar(s, now);
      s = spendHoney(s, now, nextH);
      s = garden(s, now, nextH);
    }
    const lv = s.bees.map((id) => s.beeLevels[id] ?? 1);
    const day = d + 1;
    if (marks.allBees === null && s.bees.length === BEES.length) marks.allBees = day;
    if (marks.firstL5 === null && lv.some((l) => l >= 5)) marks.firstL5 = day;
    if (marks.firstL10 === null && lv.some((l) => l >= 10)) marks.firstL10 = day;
    if (marks.allL5 === null && s.bees.length === BEES.length && lv.every((l) => l >= 5)) marks.allL5 = day;
    if (marks.allL10 === null && s.bees.length === BEES.length && lv.every((l) => l >= MAX_BEE_LEVEL)) marks.allL10 = day;
    if (marks.beds6 === null && s.garden.beds.length >= 6) marks.beds6 = day;
    if ([7, 14, 30, 45, 60, 90].includes(day)) {
      snaps[day] = {
        hiveLvl: level(s), rate: Math.round(rate(s)), cap: cap(s), beds: s.garden.beds.length, bees: s.bees.length,
        levelSum: lv.reduce((a, b) => a + b, 0), atL5: lv.filter((l) => l >= 5).length, atL10: lv.filter((l) => l >= 10).length,
        nectarEarned: s.stats.totalNectar, nectarPerDay: Math.round(s.stats.totalNectar / day), harvests: s.stats.harvests,
        jellyEarned, honeyEarned: Math.round(honeyEarned), honey: Math.round(s.honey), jelly: s.jelly, nectar: s.nectar,
        freeMoves: freeMoves(s),
      };
    }
  }
  return { profile: p.name, days, marks, snaps };
}

const isMain = process.argv[1]?.endsWith("simulate.ts");
if (isMain) {
  const days = 90;
  const res = PROFILES.map((p) => simulate(p, days));
  if (process.argv.includes("--json")) console.log(JSON.stringify(res, null, 1));
  else {
    for (const r of res) {
      console.log(`\n== ${r.profile} bot (${days} days) — milestones (day):`, JSON.stringify(r.marks));
      console.log("day | hive lvl | honey/h | beds | bees | Σlevels | ≥L5 | L10 | nectar/day | nectar total | jelly earned | honey earned");
      for (const [d, x] of Object.entries(r.snaps) as [string, any][]) {
        console.log([d, x.hiveLvl, x.rate, x.beds, x.bees, x.levelSum, x.atL5, x.atL10, x.nectarPerDay, x.nectarEarned, x.jellyEarned, x.honeyEarned].join(" | "));
      }
    }
  }
}
