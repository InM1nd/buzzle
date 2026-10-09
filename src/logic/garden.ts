/**
 * Flower garden next to the hive (v1.2). Pure + deterministic, like the hive economy.
 *
 * A bed holds one flower. A flower grows only while its soil is wet: watering fills the soil for
 * WATER_HOURS, planting waters once. Growth is accrued from timestamps (works offline); time never
 * runs backwards (clock rollback freezes the garden until real time catches up with lastTick), and an
 * unattended bed can gain at most WATER_HOURS of growth, which also caps forward clock jumps.
 */
import { hashString } from "./rng";

export const WATER_HOURS = 4;
/** watering is allowed once the soil has dried for at least this long */
export const WATER_MIN_GAP_H = 0.75;
export const MAX_BEDS = 6;
/** honey to unlock bed i (bed 0 is free) */
export const BED_COSTS = [0, 300, 1500, 6000, 18000, 45000];
/** passive hive bonus per occupied bed (growing or ready) */
export const BED_HIVE_BONUS = 0.04;
/** colour of the day multiplier (needs a flower of that colour in the garden) */
export const DAY_COLOR_MULT = 1.5;
const HOUR = 3600_000;

export interface FlowerDef {
  id: string;
  name: string;
  color: number;      // puzzle colour index (0 yellow, 1 pink, 2 purple, 3 blue, 4 green)
  growHours: number;  // wet-soil hours until it blooms
  nectar: number;     // nectar per harvest
  seed: number;       // base seed price in honey (scaled by hive level)
  minLevel: number;   // hive level needed
  /** v1.3: rare flowers are not sold — their seeds come only from the surprise combs */
  rare?: boolean;
}
export const FLOWERS: FlowerDef[] = [
  { id: "sunflower", name: "Подсолнух", color: 0, growHours: 2, nectar: 4, seed: 30, minLevel: 1 },
  { id: "clover", name: "Клевер", color: 1, growHours: 4, nectar: 9, seed: 90, minLevel: 2 },
  { id: "lavender", name: "Лаванда", color: 2, growHours: 6, nectar: 14, seed: 220, minLevel: 3 },
  { id: "cornflower", name: "Василёк", color: 3, growHours: 8, nectar: 19, seed: 450, minLevel: 5 },
  { id: "mint", name: "Мята", color: 4, growHours: 12, nectar: 28, seed: 800, minLevel: 7 },
  { id: "moonpoppy", name: "Лунный мак", color: 3, growHours: 6, nectar: 34, seed: 0, minLevel: 1, rare: true },
  { id: "goldsun", name: "Золотой подсолнух", color: 0, growHours: 10, nectar: 70, seed: 0, minLevel: 1, rare: true },
];
export const SHOP_FLOWERS = FLOWERS.filter((f) => !f.rare);
export const FLOWER_BY_ID: Record<string, FlowerDef> = Object.fromEntries(FLOWERS.map((f) => [f.id, f]));

export interface Bed { flower: string | null; growth: number; water: number }
export interface Garden { beds: Bed[]; lastTick: number }

export const emptyBed = (): Bed => ({ flower: null, growth: 0, water: 0 });
export const newGarden = (now: number): Garden => ({ beds: [emptyBed()], lastTick: now });

export const seedCost = (f: FlowerDef, hiveLvl: number) => Math.round(f.seed * (1 + 0.2 * Math.max(0, hiveLvl - 1)));
export const bedCost = (unlocked: number): number | null => (unlocked >= MAX_BEDS ? null : BED_COSTS[unlocked]);

export const isReady = (b: Bed) => !!b.flower && b.growth >= (FLOWER_BY_ID[b.flower]?.growHours ?? Infinity) - 1e-9;
export const progress = (b: Bed) => (b.flower ? Math.min(1, b.growth / (FLOWER_BY_ID[b.flower]?.growHours ?? 1)) : 0);
export type Stage = "empty" | "sprout" | "bud" | "bloom";
export const stageOf = (b: Bed): Stage => (!b.flower ? "empty" : isReady(b) ? "bloom" : progress(b) < 0.4 ? "sprout" : "bud");
export const canWater = (b: Bed) => !!b.flower && !isReady(b) && b.water <= WATER_HOURS - WATER_MIN_GAP_H + 1e-9;

/** Accrue growth up to `now`. Never moves lastTick backwards. */
export function settleGarden(g: Garden, now: number): Garden {
  if (!(now > g.lastTick)) return g;
  const dt = (now - g.lastTick) / HOUR;
  const beds = g.beds.map((b) => {
    if (!b.flower || isReady(b) || b.water <= 0) return b;
    const need = FLOWER_BY_ID[b.flower].growHours - b.growth;
    const use = Math.min(dt, b.water, need);
    return { ...b, growth: b.growth + use, water: b.water - use };
  });
  return { beds, lastTick: now };
}

export function plant(g: Garden, i: number, flower: string): Garden | null {
  const b = g.beds[i];
  if (!b || b.flower || !FLOWER_BY_ID[flower]) return null;
  const beds = g.beds.slice();
  beds[i] = { flower, growth: 0, water: WATER_HOURS };
  return { ...g, beds };
}
export function water(g: Garden, i: number): Garden | null {
  const b = g.beds[i];
  if (!b || !canWater(b)) return null;
  const beds = g.beds.slice();
  beds[i] = { ...b, water: WATER_HOURS };
  return { ...g, beds };
}
/** Water every bed that can be watered; null if none. */
export function waterAll(g: Garden): { garden: Garden; n: number } | null {
  let n = 0;
  const beds = g.beds.map((b) => (canWater(b) ? (n++, { ...b, water: WATER_HOURS }) : b));
  return n ? { garden: { ...g, beds }, n } : null;
}
export function harvest(g: Garden, i: number): { garden: Garden; nectar: number; flower: string } | null {
  const b = g.beds[i];
  if (!b || !isReady(b)) return null;
  const beds = g.beds.slice();
  beds[i] = emptyBed();
  return { garden: { ...g, beds }, nectar: FLOWER_BY_ID[b.flower!].nectar, flower: b.flower! };
}

export const occupied = (g: Garden) => g.beds.filter((b) => !!b.flower).length;
export const gardenHiveBonus = (g: Garden) => BED_HIVE_BONUS * occupied(g);

/** Colour of the day (same for everyone on a calendar day). */
export const dayColor = (day: number) => hashString(`bzz-color-${day}`) % 5;
export const hasColor = (g: Garden, color: number) => g.beds.some((b) => b.flower && FLOWER_BY_ID[b.flower]?.color === color);

/** Next garden event for reminders: a flower blooms or a growing bed dries out. */
export function nextGardenEvent(g: Garden): { at: number; kind: "bloom" | "dry" } | null {
  let best: { at: number; kind: "bloom" | "dry" } | null = null;
  for (const b of g.beds) {
    if (!b.flower || isReady(b)) continue;
    const need = FLOWER_BY_ID[b.flower].growHours - b.growth;
    const ev = b.water >= need - 1e-9
      ? { at: g.lastTick + need * HOUR, kind: "bloom" as const }
      : { at: g.lastTick + b.water * HOUR, kind: "dry" as const };
    if (!best || ev.at < best.at) best = ev;
  }
  return best;
}

/** Tolerant loader for the garden part of a save. */
export function migrateGarden(raw: unknown, now: number): Garden {
  const g = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const beds: Bed[] = Array.isArray(g.beds)
    ? g.beds.slice(0, MAX_BEDS).map((b: any) => {
        const flower = b && typeof b.flower === "string" && FLOWER_BY_ID[b.flower] ? b.flower : null;
        return flower
          ? { flower, growth: Math.max(0, Math.min(FLOWER_BY_ID[flower].growHours, num(b.growth, 0))), water: Math.max(0, Math.min(WATER_HOURS, num(b.water, 0))) }
          : emptyBed();
      })
    : [];
  if (!beds.length) beds.push(emptyBed());
  return { beds, lastTick: num(g.lastTick, now) };
}
