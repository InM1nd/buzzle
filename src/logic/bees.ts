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
  { id: "iskorka", name: "Искорка", rarity: "rare", cost: 10, ability: "Джокеры появляются чаще", flavor: "Где она — там блёстки.", effect: { wildChance: 0.03 } },
  { id: "sonya", name: "Соня", rarity: "rare", cost: 12, ability: "Хранилище улья +4 ч", flavor: "Спит днём, но мёд стережёт.", effect: { capHours: 4 } },
  { id: "zorkaya", name: "Разведчица Зоркая", rarity: "epic", cost: 16, ability: "+25% мёда из головоломки", flavor: "Видит цветы за три луга.", effect: { puzzleHoneyMult: 0.25 } },
  { id: "margo", name: "Королева Марго", rarity: "legendary", cost: 24, ability: "Бомба уже из 5 сот", flavor: "Её величество любит, когда всё взрывается.", effect: { bombAt: 5 } },
];
export const BEE_BY_ID = Object.fromEntries(BEES.map((b) => [b.id, b]));

export function boostsFor(owned: string[]): Boosts {
  const b: Boosts = { prodMult: 0, puzzleHoneyMult: 0, extraMoves: 0, colorMult: [1, 1, 1, 1, 1], wildChance: 0, bombAt: DEFAULT_RULES.bombAt, capHours: 0 };
  for (const id of owned) {
    const e = BEE_BY_ID[id]?.effect;
    if (!e) continue;
    b.prodMult += e.prodMult ?? 0;
    b.puzzleHoneyMult += e.puzzleHoneyMult ?? 0;
    b.extraMoves += e.extraMoves ?? 0;
    b.wildChance += e.wildChance ?? 0;
    b.capHours += e.capHours ?? 0;
    if (e.bombAt) b.bombAt = Math.min(b.bombAt, e.bombAt);
    if (e.color !== undefined) b.colorMult[e.color] = 2;
  }
  return b;
}

/** Daily puzzle = equal conditions (bees only boost the honey reward); free play gets every bonus. */
export function rulesFor(mode: "daily" | "free", boosts: Boosts): PuzzleRules {
  if (mode === "daily") return DEFAULT_RULES;
  return { bombAt: boosts.bombAt, wildChance: DEFAULT_RULES.wildChance + boosts.wildChance, colorMult: boosts.colorMult };
}
