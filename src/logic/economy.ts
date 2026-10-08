import { HIVE_SLOTS } from "./hex";

export const MAX_COMB_LEVEL = 20;
export const BASE_CAP_HOURS = 6;
const HOUR = 3600_000;

/** honey/hour of one comb */
export const combRate = (level: number) => (level <= 0 ? 0 : 8 * level * Math.pow(1.1, level - 1));
/** cost to build the next comb when `built` combs exist */
export const buildCost = (built: number) => Math.round(60 * Math.pow(1.6, Math.max(0, built - 2)));
/** cost to go from `level` to `level+1` */
export const upgradeCost = (level: number) => Math.round(30 * Math.pow(1.5, level - 1));

export type UpgradeId = "workers" | "storage" | "flowers" | "queen";
export interface UpgradeDef { id: UpgradeId; name: string; desc: (lvl: number) => string; max: number; cost: (lvl: number) => number }
export const UPGRADES: UpgradeDef[] = [
  { id: "workers", name: "Рабочие пчёлы", desc: (l) => `+${l * 10}% к мёду улья`, max: 15, cost: (l) => Math.round(250 * Math.pow(1.8, l)) },
  { id: "storage", name: "Восковое хранилище", desc: (l) => `запас на ${BASE_CAP_HOURS + l} ч`, max: 6, cost: (l) => Math.round(200 * Math.pow(2, l)) },
  { id: "flowers", name: "Цветочный луг", desc: (l) => `+${l * 10}% мёда из головоломки`, max: 15, cost: (l) => Math.round(150 * Math.pow(1.7, l)) },
  { id: "queen", name: "Покои матки", desc: (l) => `+${l} ход${l === 1 ? "" : l < 5 && l > 1 ? "а" : "ов"} в свободной игре`, max: 5, cost: (l) => Math.round(400 * Math.pow(3, l)) },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

export interface Hive {
  combs: number[]; // level per slot (0 = empty), length = HIVE_SLOTS.length
  stored: number; // honey waiting in the hive
  lastTick: number; // ms; never moves backwards
}

export const newHive = (now: number): Hive => {
  const combs = HIVE_SLOTS.map(() => 0);
  combs[0] = 1;
  combs[1] = 1;
  return { combs, stored: 0, lastTick: now };
};

export const builtCount = (h: Hive) => h.combs.filter((l) => l > 0).length;
export const hiveLevel = (h: Hive) => 1 + Math.floor((h.combs.reduce((a, b) => a + b, 0) - 2) / 4);

export function productionPerHour(h: Hive, workers: number, beeProd: number): number {
  const base = h.combs.reduce((a, l) => a + combRate(l), 0);
  return base * (1 + 0.1 * workers + beeProd);
}
export const capHours = (storageLvl: number, beeCap: number) => BASE_CAP_HOURS + storageLvl + beeCap;
export const capacity = (rate: number, hours: number) => Math.round(rate * hours);

/**
 * Accrue offline production. Elapsed time is clamped to ≥ 0 (clock moved back → nothing,
 * and lastTick is kept so the rollback can't be exploited later) and storage is capped.
 */
export function settle(h: Hive, now: number, rate: number, hours: number): Hive {
  if (now <= h.lastTick) return h;
  const cap = capacity(rate, hours);
  const gained = (rate * (now - h.lastTick)) / HOUR;
  return { ...h, stored: Math.max(h.stored, Math.min(cap, h.stored + gained)), lastTick: now };
}

/** ms until the storage is full (0 if already full or rate 0). */
export function msUntilFull(h: Hive, rate: number, hours: number): number {
  const cap = capacity(rate, hours);
  if (rate <= 0 || h.stored >= cap) return 0;
  return ((cap - h.stored) / rate) * HOUR;
}
