import { lz, numFmt, t, tx } from "../i18n";
import { PuzzleRules, DEFAULT_RULES } from "./board";

export type Rarity = "common" | "rare" | "epic" | "legendary";
export interface BeeSpecies {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number; // royal jelly
  ability: string;
  flavor: string;
  effect: Partial<Boosts> & { color?: number };
  /** v1.3: not bought with jelly — assembled from this many fragments from the surprise combs */
  fragments?: number;
}

export interface Boosts {
  prodMult: number; // hive production multiplier add-on (0.1 = +10%)
  puzzleHoneyMult: number; // honey from puzzle add-on
  extraMoves: number; // free play only
  colorMult: number[]; // free play only
  wildChance: number; // add-on, free play only
  bombAt: number; // free play only
  capHours: number; // add-on to hive storage
}

/** v1.4: localized colour names ("Yellow" / "Жовті"); gen = for "collect 50 yellow cells" */
export const colorName = (i: number) => tx(`color.${i}`);
export const colorGen = (i: number) => tx(`color.${i}.gen`);

export const BEES: BeeSpecies[] = [
  { id: "zhuzha", name: "", rarity: "common", cost: 0, ability: "", flavor: "", effect: { prodMult: 0.05 } },
  { id: "pushinka", name: "", rarity: "common", cost: 4, ability: "", flavor: "", effect: { prodMult: 0.1 } },
  { id: "boris", name: "", rarity: "rare", cost: 6, ability: "", flavor: "", effect: { extraMoves: 1 } },
  { id: "solnyshko", name: "", rarity: "common", cost: 6, ability: "", flavor: "", effect: { color: 0 } },
  { id: "klevera", name: "", rarity: "common", cost: 6, ability: "", flavor: "", effect: { color: 1 } },
  { id: "lavanda", name: "", rarity: "common", cost: 6, ability: "", flavor: "", effect: { color: 2 } },
  { id: "vasilek", name: "", rarity: "common", cost: 6, ability: "", flavor: "", effect: { color: 3 } },
  { id: "myatka", name: "", rarity: "common", cost: 6, ability: "", flavor: "", effect: { color: 4 } },
  { id: "iskorka", name: "", rarity: "rare", cost: 14, ability: "", flavor: "", effect: { wildChance: 0.03 } },
  { id: "sonya", name: "", rarity: "rare", cost: 16, ability: "", flavor: "", effect: { capHours: 4 } },
  { id: "zorkaya", name: "", rarity: "epic", cost: 22, ability: "", flavor: "", effect: { puzzleHoneyMult: 0.25 } },
  { id: "margo", name: "", rarity: "legendary", cost: 32, ability: "", flavor: "", effect: { bombAt: 5 } },
  { id: "nochka", name: "", rarity: "legendary", cost: 0, fragments: 10, ability: "", flavor: "", effect: { prodMult: 0.2 } },
];
for (const b of BEES) { lz(b, "name", `bee.${b.id}.name`); lz(b, "flavor", `bee.${b.id}.flavor`); Object.defineProperty(b, "ability", { get: () => baseAbility(b), enumerable: true, configurable: true }); }
export const BEE_BY_ID = Object.fromEntries(BEES.map((b) => [b.id, b]));

// ---------- bee levels (v1.2) ----------
export const MAX_BEE_LEVEL = 10;
/** levels that change the bee's look (shiny wings, crown) and cost royal jelly on top of nectar */
export const MILESTONES: Record<number, number> = { 5: 4, 10: 8 };
export interface LevelCost { nectar: number; jelly: number }
/** cost to go from `level` to `level + 1` (null at max) */
export function levelCost(level: number): LevelCost | null {
  if (level >= MAX_BEE_LEVEL) return null;
  return { nectar: Math.round(14 * Math.pow(1.5, level - 1)), jelly: MILESTONES[level + 1] ?? 0 };
}
/** ability strength multiplier at a level (+12% per level) */
export const levelMult = (level: number) => 1 + 0.12 * (Math.max(1, level) - 1);
/** every level above 1 also adds +1% hive honey */
export const LEVEL_HIVE_BONUS = 0.01;
export const beeLook = (level: number): "base" | "shiny" | "crown" => (level >= 10 ? "crown" : level >= 5 ? "shiny" : "base");

const dec = (v: number) => numFmt(Math.round(v * 100) / 100);
/** ability text for a bee at a level */
export function abilityAt(b: BeeSpecies, level: number): string {
  const e = b.effect, m = levelMult(level);
  const pct = (v: number) => Math.round(v * 100);
  if (e.prodMult) return t("ab.prod", { pct: pct(e.prodMult * m) });
  if (e.extraMoves) return t("ab.moves", { n: e.extraMoves + Math.floor(level / 5) });
  if (e.color !== undefined) return t("ab.color", { color: colorName(e.color), x: dec(2 + 0.05 * (level - 1)) });
  if (e.wildChance) return level > 1 ? t("ab.wildLvl", { pct: pct(e.wildChance * m) }) : t("ab.wild");
  if (e.capHours) return t("ab.cap", { h: dec(Math.round(e.capHours * m * 10) / 10) });
  if (e.puzzleHoneyMult) return t("ab.puzzle", { pct: pct(e.puzzleHoneyMult * m) });
  if (e.bombAt) return level > 1 ? t("ab.bombLvl", { pct: pct(0.02 * (level - 1)) }) : t("ab.bomb");
  return "";
}
/** level-1 ability (the "ability" field) */
function baseAbility(b: BeeSpecies) { return abilityAt(b, 1); }

export function boostsFor(owned: string[], levels: Record<string, number> = {}): Boosts {
  const b: Boosts = { prodMult: 0, puzzleHoneyMult: 0, extraMoves: 0, colorMult: [1, 1, 1, 1, 1], wildChance: 0, bombAt: DEFAULT_RULES.bombAt, capHours: 0 };
  for (const id of owned) {
    const e = BEE_BY_ID[id]?.effect;
    if (!e) continue;
    const lvl = Math.max(1, Math.min(MAX_BEE_LEVEL, levels[id] ?? 1));
    const m = levelMult(lvl);
    b.prodMult += (e.prodMult ?? 0) * m + LEVEL_HIVE_BONUS * (lvl - 1);
    b.puzzleHoneyMult += (e.puzzleHoneyMult ?? 0) * m + (e.bombAt ? 0.02 * (lvl - 1) : 0);
    if (e.extraMoves) b.extraMoves += e.extraMoves + Math.floor(lvl / 5);
    b.wildChance += (e.wildChance ?? 0) * m;
    b.capHours += (e.capHours ?? 0) * m;
    if (e.bombAt) b.bombAt = Math.min(b.bombAt, e.bombAt);
    if (e.color !== undefined) b.colorMult[e.color] = 2 + 0.05 * (lvl - 1);
  }
  return b;
}

/** Daily puzzle = equal conditions (bees only boost the honey reward); free play gets every bonus,
 * including the garden's colour of the day (×1.5 for that colour). */
export function rulesFor(mode: "daily" | "free", boosts: Boosts, dayColor: number | null = null): PuzzleRules {
  if (mode === "daily") return DEFAULT_RULES;
  const colorMult = boosts.colorMult.map((m, i) => (i === dayColor ? m * 1.5 : m));
  return { bombAt: boosts.bombAt, wildChance: DEFAULT_RULES.wildChance + boosts.wildChance, colorMult };
}
