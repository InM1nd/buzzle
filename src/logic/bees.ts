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

export const COLOR_NAMES = ["жёлтые", "розовые", "фиолетовые", "голубые", "зелёные"];

export const BEES: BeeSpecies[] = [
  { id: "zhuzha", name: "Жужа", rarity: "common", cost: 0, ability: "+5% к мёду улья", flavor: "Первая пчела твоего улья. Всё знает и всем помогает.", effect: { prodMult: 0.05 } },
  { id: "pushinka", name: "Пушинка", rarity: "common", cost: 4, ability: "+10% к мёду улья", flavor: "Самая пушистая. Пыльца липнет к ней сама.", effect: { prodMult: 0.1 } },
  { id: "boris", name: "Шмель Борис", rarity: "rare", cost: 6, ability: "+1 ход в свободной игре", flavor: "Большой, громкий и очень надёжный.", effect: { extraMoves: 1 } },
  { id: "solnyshko", name: "Солнышко", rarity: "common", cost: 6, ability: "Жёлтые соты ×2 очков", flavor: "Дружит с подсолнухами.", effect: { color: 0 } },
  { id: "klevera", name: "Клеверина", rarity: "common", cost: 6, ability: "Розовые соты ×2 очков", flavor: "Ищет четырёхлистный клевер. Пока не нашла.", effect: { color: 1 } },
  { id: "lavanda", name: "Лаванда", rarity: "common", cost: 6, ability: "Фиолетовые соты ×2 очков", flavor: "Пахнет так, что все засыпают.", effect: { color: 2 } },
  { id: "vasilek", name: "Василёк", rarity: "common", cost: 6, ability: "Голубые соты ×2 очков", flavor: "Мечтает увидеть море.", effect: { color: 3 } },
  { id: "myatka", name: "Мятка", rarity: "common", cost: 6, ability: "Зелёные соты ×2 очков", flavor: "Свежая, бодрая, всегда первая.", effect: { color: 4 } },
  { id: "iskorka", name: "Искорка", rarity: "rare", cost: 14, ability: "Джокеры появляются чаще", flavor: "Где она — там блёстки.", effect: { wildChance: 0.03 } },
  { id: "sonya", name: "Соня", rarity: "rare", cost: 16, ability: "Хранилище улья +4 ч", flavor: "Спит днём, но мёд стережёт.", effect: { capHours: 4 } },
  { id: "zorkaya", name: "Разведчица Зоркая", rarity: "epic", cost: 22, ability: "+25% мёда из головоломки", flavor: "Видит цветы за три луга.", effect: { puzzleHoneyMult: 0.25 } },
  { id: "margo", name: "Королева Марго", rarity: "legendary", cost: 32, ability: "Бомба уже из 5 сот", flavor: "Её величество любит, когда всё взрывается.", effect: { bombAt: 5 } },
  { id: "nochka", name: "Ночная пчела", rarity: "legendary", cost: 0, fragments: 10, ability: "+20% к мёду улья", flavor: "Работает, пока все спят. Пришла на свет лунного мака.", effect: { prodMult: 0.2 } },
];
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

const dec = (v: number) => String(Math.round(v * 100) / 100).replace(".", ",");
/** ability text for a bee at a level */
export function abilityAt(b: BeeSpecies, level: number): string {
  const e = b.effect, m = levelMult(level);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  if (e.prodMult) return `+${pct(e.prodMult * m)} к мёду улья`;
  if (e.extraMoves) { const n = e.extraMoves + Math.floor(level / 5); return `+${n} ход${n === 1 ? "" : "а"} в свободной игре`; }
  if (e.color !== undefined) return `${COLOR_NAMES[e.color][0].toUpperCase()}${COLOR_NAMES[e.color].slice(1)} соты ×${dec(2 + 0.05 * (level - 1))} очков`;
  if (e.wildChance) return level > 1 ? `Джокеры чаще (+${pct(e.wildChance * m)})` : b.ability;
  if (e.capHours) return `Хранилище улья +${dec(Math.round(e.capHours * m * 10) / 10)} ч`;
  if (e.puzzleHoneyMult) return `+${pct(e.puzzleHoneyMult * m)} мёда из головоломки`;
  if (e.bombAt) return level > 1 ? `Бомба из 5 сот, +${pct(0.02 * (level - 1))} мёда из головоломки` : b.ability;
  return b.ability;
}

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
