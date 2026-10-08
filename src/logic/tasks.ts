import { COLOR_NAMES } from "./bees";
import { Rng, hashString } from "./rng";

export type TaskEvent =
  | { type: "chain"; len: number }
  | { type: "round"; score: number; mode: "daily" | "free"; honey: number }
  | { type: "collect" }
  | { type: "build" }
  | { type: "daily" }
  | { type: "bomb"; n: number }
  | { type: "cells"; color: number; n: number };

export interface TaskDef {
  id: string;
  group: "puzzle" | "hive" | "any";
  target: number;
  text: string;
  progress: (e: TaskEvent) => number;
}

function colorTask(color: number): TaskDef {
  return {
    id: `cells${color}`, group: "puzzle", target: 50, text: `Собери 50 сот: ${COLOR_NAMES[color]}`,
    progress: (e) => (e.type === "cells" && e.color === color ? e.n : 0),
  };
}

const POOL: TaskDef[] = [
  { id: "chain6", group: "puzzle", target: 3, text: "Собери 3 цепочки из 6+ сот", progress: (e) => (e.type === "chain" && e.len >= 6 ? 1 : 0) },
  { id: "chain8", group: "puzzle", target: 1, text: "Собери цепочку из 8+ сот", progress: (e) => (e.type === "chain" && e.len >= 8 ? 1 : 0) },
  { id: "score", group: "puzzle", target: 1, text: "Набери 1500 очков за одну игру", progress: (e) => (e.type === "round" && e.score >= 1500 ? 1 : 0) },
  { id: "rounds", group: "any", target: 3, text: "Сыграй 3 игры", progress: (e) => (e.type === "round" ? 1 : 0) },
  { id: "bomb", group: "puzzle", target: 2, text: "Взорви 2 бомбы маточного молочка", progress: (e) => (e.type === "bomb" ? e.n : 0) },
  { id: "collect", group: "hive", target: 2, text: "Собери мёд в улье 2 раза", progress: (e) => (e.type === "collect" ? 1 : 0) },
  { id: "build", group: "hive", target: 2, text: "Построй или улучши соты 2 раза", progress: (e) => (e.type === "build" ? 1 : 0) },
  { id: "daily", group: "any", target: 1, text: "Пройди ежедневную головоломку", progress: (e) => (e.type === "daily" ? 1 : 0) },
  { id: "honey", group: "any", target: 400, text: "Заработай 400 мёда в головоломке", progress: (e) => (e.type === "round" ? e.honey : 0) },
];

/** Three tasks for a given day (deterministic): one puzzle, one hive, one more from the rest. */
export function tasksForDay(day: number): TaskDef[] {
  const rng = new Rng(hashString(`bzz-tasks-${day}`));
  const pool = [...POOL, colorTask(rng.int(5))];
  const pick = (f: (t: TaskDef) => boolean, taken: TaskDef[]) => {
    const opts = pool.filter((t) => f(t) && !taken.includes(t));
    return opts[rng.int(opts.length)];
  };
  const out: TaskDef[] = [];
  out.push(pick((t) => t.group === "puzzle", out));
  out.push(pick((t) => t.group === "hive", out));
  out.push(pick(() => true, out));
  return out;
}

export interface Reward { honey?: number; jelly?: number }
export const taskReward = (hiveLvl: number): Reward => ({ honey: 40 * hiveLvl, jelly: 1 });
export const bonusReward = (hiveLvl: number): Reward => ({ honey: 150 * hiveLvl, jelly: 2 });

/** 7-day login calendar; honey scales with hive level. */
export const LOGIN_REWARDS: Reward[] = [
  { honey: 100 }, { jelly: 1 }, { honey: 200 }, { jelly: 2 }, { honey: 300, jelly: 1 }, { jelly: 3 }, { honey: 600, jelly: 5 },
];
export function loginReward(index: number, hiveLvl: number): Reward {
  const r = LOGIN_REWARDS[index % 7];
  return { honey: r.honey ? Math.round(r.honey * (1 + 0.5 * (hiveLvl - 1))) : undefined, jelly: r.jelly };
}
