/** Builds seeded GameStates for the web screenshot harness (fake clock: 2026-10-08 08:40 local). */
import { writeFileSync } from "node:fs";
import { newState, tick, GameState } from "../../src/logic/game";
import { dayNumber, dailySeed } from "../../src/logic/day";
import { applyPath, createBoard, findBestPath } from "../../src/logic/board";
import { DAILY_MOVES } from "../../src/logic/day";
import { tasksForDay } from "../../src/logic/tasks";

const NOW = new Date(2026, 9, 8, 8, 40, 0).getTime();
const DAY = dayNumber(new Date(NOW));
const H = 3600_000;

function mid(): GameState {
  let s = newState(NOW - 9 * 24 * H);
  const combs = s.hive.combs.slice();
  [4, 3, 3, 2, 2, 2, 1, 1, 1].forEach((l, i) => (combs[i] = l));
  const t = tasksForDay(DAY);
  s = {
    ...s,
    honey: 1240,
    jelly: 7,
    hive: { combs, stored: 0, lastTick: NOW - 3.2 * H },
    upgrades: { workers: 2, storage: 1, flowers: 2, queen: 0 },
    bees: ["zhuzha", "pushinka", "boris", "solnyshko", "lavanda"],
    daily: { lastDay: DAY - 1, streak: 4, best: 6, results: { [DAY - 1]: { stars: 2, score: 2140 }, [DAY - 2]: { stars: 3, score: 3010 } } },
    login: { lastDay: DAY, index: 3, streak: 4 },
    tasks: { day: DAY, progress: { [t[0].id]: t[0].target, [t[1].id]: Math.ceil(t[1].target / 2) }, claimed: [], bonus: false },
    stats: { rounds: 23, bestScore: 3420, longestChain: 11, totalHoney: 5230, bombs: 17, collects: 31 },
    settings: { notifications: true, haptics: true, tutorialDone: true, notifPromptDismissed: true },
    clock: { maxSeen: NOW - 3.2 * H, maxDay: DAY },
  };
  return tick(s, NOW - 1000);
}
const m = mid();
const loginDue: GameState = { ...m, login: { lastDay: DAY - 1, index: 3, streak: 4 } };
const full: GameState = tick({ ...m, hive: { ...m.hive, stored: 0, lastTick: NOW - 30 * H } }, NOW - 1000);
// greedy playthrough of today's daily puzzle (the board evolves deterministically)
let b = createBoard(dailySeed(DAY));
const moves = [];
let score = 0;
for (let i = 0; i < DAILY_MOVES; i++) {
  const p = findBestPath(b, 12, 40000);
  const r = applyPath(b, p);
  score += r.score;
  moves.push(p);
  b = r.board;
}
writeFileSync("/tmp/bzz-seeds.json", JSON.stringify({ mid: m, loginDue, full, moves }));
console.log("seeds ok; greedy daily ≈", score, "lens", moves.map((p) => p.length).join(","));
