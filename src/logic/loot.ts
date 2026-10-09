/**
 * Соты-сюрпризы (v1.3): surprise combs for in-game resources only — no real money anywhere.
 * Pure and deterministic: every opening draws from a seeded PRNG whose state lives in the save
 * (loot.rng), so reloading / reinstalling / rolling the clock back can never re-roll a result.
 * Odds are data (shown in the game), pity guarantees epic+ within 10 golden combs and legendary
 * within 30, duplicates turn into «пыльца коллекции» that buys specific items in the shop.
 */
import { Rng } from "./rng";

export type BoxKind = "wood" | "wax" | "gold" | "royal";
export const BOX_KINDS: BoxKind[] = ["wood", "wax", "gold", "royal"];
export type Rarity = "common" | "rare" | "epic" | "legendary";
export const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];
export const RARITY_NAME: Record<Rarity, string> = { common: "обычное", rare: "редкое", epic: "эпическое", legendary: "легендарное" };
export type BoosterId = "moves" | "bomb" | "shuffle";
export const BOOSTERS: Record<BoosterId, { name: string; desc: string }> = {
  moves: { name: "+3 хода", desc: "Три дополнительных хода в свободной игре" },
  bomb: { name: "Бомба на старте", desc: "Раунд начинается с бомбой маточного молочка на поле" },
  shuffle: { name: "Перемешивание", desc: "Перемешать поле в любой момент свободной игры" },
};

export const BOX_INFO: Record<BoxKind, { name: string; how: string }> = {
  wood: { name: "Деревянная сота", how: "Раз в день — за все 3 задания дня" },
  wax: { name: "Восковая сота", how: "3 звезды в головоломке дня, недельный сундук, головоломка выходного дня" },
  gold: { name: "Золотая сота", how: "Каждые 7 дней серии головоломки дня, 3 звезды в выходной, редко — внутри восковой" },
  royal: { name: "Королевская сота", how: "Только в сезонах — появятся в следующих версиях" },
};

// ---------------------------------------------------------------- catalog
export type ItemKind = "skin" | "deco" | "flower" | "bee";
export type PageId = "skins" | "hive" | "garden" | "rare";
export interface Collectible {
  id: string; kind: ItemKind; name: string; rarity: Rarity; page: PageId;
  /** decorations: where it stands */
  place?: "hive" | "garden";
  /** skins worn on the head replace the level-10 crown */
  hat?: boolean;
  desc: string;
}
export const SKINS: Collectible[] = [
  { id: "scarf", kind: "skin", name: "Шарфик", rarity: "common", page: "skins", desc: "Тёплый вязаный шарф в полоску." },
  { id: "bow", kind: "skin", name: "Бантик", rarity: "common", page: "skins", desc: "Розовый бант — для праздника." },
  { id: "glasses", kind: "skin", name: "Очки", rarity: "rare", page: "skins", desc: "Круглые очки умной пчелы." },
  { id: "backpack", kind: "skin", name: "Рюкзачок", rarity: "rare", page: "skins", desc: "Для дальних полётов за нектаром." },
  { id: "wreath", kind: "skin", name: "Венок", rarity: "rare", page: "skins", hat: true, desc: "Венок из луговых цветов." },
  { id: "beret", kind: "skin", name: "Берет", rarity: "epic", page: "skins", hat: true, desc: "Берет художницы улья." },
  { id: "headphones", kind: "skin", name: "Наушники", rarity: "epic", page: "skins", desc: "Жужжать под музыку веселее." },
  { id: "halo", kind: "skin", name: "Нимб", rarity: "legendary", page: "skins", desc: "Золотое сияние над головой." },
];
export const DECOS: Collectible[] = [
  { id: "flags", kind: "deco", name: "Флажки", rarity: "common", page: "hive", place: "hive", desc: "Праздничная гирлянда у улья." },
  { id: "lanterns", kind: "deco", name: "Фонарики", rarity: "rare", page: "hive", place: "hive", desc: "Тёплый свет по вечерам." },
  { id: "barrel", kind: "deco", name: "Бочонок мёда", rarity: "epic", page: "hive", place: "hive", desc: "Запас на зиму. И на завтрак." },
  { id: "fountain", kind: "deco", name: "Медовый фонтан", rarity: "legendary", page: "hive", place: "hive", desc: "Мечта любой пасеки." },
  { id: "mushroom", kind: "deco", name: "Грибочки", rarity: "common", page: "garden", place: "garden", desc: "Выросли после дождя." },
  { id: "bench", kind: "deco", name: "Скамейка", rarity: "rare", page: "garden", place: "garden", desc: "Посидеть и послушать жужжание." },
  { id: "pinwheel", kind: "deco", name: "Вертушка", rarity: "epic", page: "garden", place: "garden", desc: "Крутится от каждого ветерка." },
  { id: "gnome", kind: "deco", name: "Гномик-пасечник", rarity: "legendary", page: "garden", place: "garden", desc: "Стережёт грядки и горшочек мёда." },
];
/** album entries that are not box items: rare flowers (first seed) and the night bee (10 fragments) */
export const RARE_ENTRIES: Collectible[] = [
  { id: "moonpoppy", kind: "flower", name: "Лунный мак", rarity: "rare", page: "rare", desc: "Светится по ночам. Семена — только из сот." },
  { id: "goldsun", kind: "flower", name: "Золотой подсолнух", rarity: "epic", page: "rare", desc: "Лепестки из чистого золота. Много нектара." },
  { id: "nochka", kind: "bee", name: "Ночная пчела", rarity: "legendary", page: "rare", desc: "Собирается из 10 фрагментов." },
];
export const ITEMS: Collectible[] = [...SKINS, ...DECOS];
export const ITEM_BY_ID: Record<string, Collectible> = Object.fromEntries([...ITEMS, ...RARE_ENTRIES].map((i) => [i.id, i]));
export const SKIN_BY_ID: Record<string, Collectible> = Object.fromEntries(SKINS.map((i) => [i.id, i]));

export interface Page { id: PageId; title: string; items: string[]; bonus: string }
export const PAGES: Page[] = [
  { id: "skins", title: "Наряды", items: SKINS.map((i) => i.id), bonus: "+10% мёда из головоломки" },
  { id: "hive", title: "Украшения улья", items: DECOS.filter((d) => d.place === "hive").map((i) => i.id), bonus: "+5% к мёду улья" },
  { id: "garden", title: "Украшения сада", items: DECOS.filter((d) => d.place === "garden").map((i) => i.id), bonus: "+2 нектара с каждого урожая" },
  { id: "rare", title: "Редкости", items: RARE_ENTRIES.map((i) => i.id), bonus: "+3 ч к хранилищу улья" },
];
export const FRAGMENTS_FOR_BEE = 10;
export const NIGHT_BEE = "nochka";

// ---------------------------------------------------------------- odds (shown in the game)
/** rarity odds in percent per item slot: [common, rare, epic, legendary] */
export const BOX_ODDS: Record<BoxKind, { slots: number; odds: number[]; first?: number[] }> = {
  wood: { slots: 1, odds: [82, 16, 2, 0] },
  wax: { slots: 2, odds: [60, 32, 7, 1] },
  gold: { slots: 3, odds: [40, 45, 13, 2], first: [0, 72, 24, 4] },
  royal: { slots: 3, odds: [0, 50, 35, 15], first: [0, 0, 70, 30] },
};
/** chance (percent) that a comb also holds a golden comb */
export const BONUS_GOLD: Record<BoxKind, number> = { wood: 1, wax: 6, gold: 0, royal: 0 };
export const PITY_EPIC = 10;
export const PITY_LEGENDARY = 30;
/** what an item slot of a rarity turns into, weights in percent */
export const KIND_ODDS: Record<Rarity, [DropKind, number][]> = {
  common: [["item", 42], ["booster", 36], ["seed", 16], ["fragment", 6]],
  rare: [["item", 47], ["seed", 20], ["booster", 21], ["fragment", 12]],
  epic: [["item", 50], ["fragment", 20], ["seed", 15], ["booster", 15]],
  legendary: [["item", 75], ["fragment", 25]],
};
type DropKind = "item" | "booster" | "seed" | "fragment";
export const FRAGMENTS_BY_RARITY: Record<Rarity, number> = { common: 1, rare: 1, epic: 2, legendary: 4 };
export const DUP_REROLL = true;
export const DUP_POLLEN: Record<Rarity, number> = { common: 5, rare: 12, epic: 30, legendary: 80 };
export const FRAGMENT_POLLEN = 4;      // per fragment once the night bee is home
export const SHOP_PRICE: Record<Rarity, number> = { common: 30, rare: 80, epic: 200, legendary: 400 };
export const SHOP_BOOSTER: Record<BoosterId, number> = { moves: 12, bomb: 15, shuffle: 10 };
export const SHOP_FRAGMENT = 25;
/** honey scales with the hive level like task rewards */
export const BOX_RESOURCES: Record<BoxKind, { honey: number; nectar: [number, number]; jelly: [number, number] }> = {
  wood: { honey: 40, nectar: [3, 6], jelly: [0, 0] },
  wax: { honey: 100, nectar: [8, 15], jelly: [50, 1] },        // jelly: [percent chance, amount]
  gold: { honey: 250, nectar: [18, 27], jelly: [100, 2] },
  royal: { honey: 400, nectar: [30, 40], jelly: [100, 3] },
};

// ---------------------------------------------------------------- state
export interface Loot {
  boxes: Record<BoxKind, number>;
  /** PRNG state; advanced only by opening combs */
  rng: number;
  /** golden combs opened since the last epic+ / legendary item from a golden comb */
  pity: { sinceEpic: number; sinceLeg: number };
  /** collected items (skins, decorations) and rare flowers (first seed) */
  owned: string[];
  pollen: number;
  fragments: number;
  boosters: Record<BoosterId, number>;
  /** seeds in the pocket: plant for free (rare flowers only this way) */
  seeds: Record<string, number>;
  opened: Record<BoxKind, number>;
  /** decorations the player put away */
  hidden: string[];
}
export const newLoot = (seed: number): Loot => ({
  boxes: { wood: 0, wax: 0, gold: 0, royal: 0 }, rng: seed >>> 0, pity: { sinceEpic: 0, sinceLeg: 0 },
  owned: [], pollen: 0, fragments: 0, boosters: { moves: 0, bomb: 0, shuffle: 0 }, seeds: {},
  opened: { wood: 0, wax: 0, gold: 0, royal: 0 }, hidden: [],
});

/** slot: the drop came from an item slot (rolled with the visible odds), not from the fixed resources */
export type Drop = (
  | { t: "honey"; n: number; rarity: Rarity }
  | { t: "nectar"; n: number; rarity: Rarity }
  | { t: "jelly"; n: number; rarity: Rarity }
  | { t: "seed"; flower: string; n: number; rarity: Rarity }
  | { t: "item"; id: string; rarity: Rarity; dup: boolean; pollen: number }
  | { t: "booster"; b: BoosterId; n: number; rarity: Rarity }
  | { t: "fragment"; n: number; rarity: Rarity; pollen: number }
  | { t: "box"; kind: BoxKind; rarity: Rarity }
) & { slot?: boolean };

const rarityIdx = (r: Rarity) => RARITIES.indexOf(r);
function pickWeighted<T>(rng: Rng, opts: [T, number][]): T {
  const total = opts.reduce((a, [, w]) => a + w, 0);
  let x = rng.next() * total;
  for (const [v, w] of opts) { if ((x -= w) < 0) return v; }
  return opts[opts.length - 1][0];
}
const rollRarity = (rng: Rng, odds: number[]) => pickWeighted(rng, RARITIES.map((r, i) => [r, odds[i]] as [Rarity, number]));

export interface OpenCtx {
  hiveLvl: number;
  /** normal flowers the player can grow (for seed drops) */
  flowers: string[];
  /** the night bee is already in the hive (fragments → pollen) */
  hasNightBee: boolean;
}

/**
 * Open one comb: pure, returns the new loot state and the drops (in reveal order).
 * Resources are reported in drops and must be credited by the caller (game.ts).
 */
export function openComb(l: Loot, kind: BoxKind, ctx: OpenCtx): { loot: Loot; drops: Drop[] } | null {
  if (kind === "royal" || l.boxes[kind] <= 0) return null;
  const rng = new Rng(l.rng);
  const R = BOX_RESOURCES[kind];
  const k = 1 + 0.5 * (Math.max(1, ctx.hiveLvl) - 1);
  const drops: Drop[] = [];
  drops.push({ t: "honey", n: Math.round(R.honey * k), rarity: "common" });
  drops.push({ t: "nectar", n: R.nectar[0] + rng.int(R.nectar[1] - R.nectar[0] + 1), rarity: "common" });
  if (R.jelly[1] && rng.next() * 100 < R.jelly[0]) drops.push({ t: "jelly", n: R.jelly[1], rarity: "common" });
  if (kind === "wood" && ctx.flowers.length) drops.push({ t: "seed", flower: ctx.flowers[rng.int(ctx.flowers.length)], n: 1, rarity: "common" });

  // item slots (rarity first, then what it is)
  const t = BOX_ODDS[kind];
  const owned = new Set(l.owned);
  let fragments = l.fragments;
  const slots: Rarity[] = [];
  for (let i = 0; i < t.slots; i++) slots.push(rollRarity(rng, i === 0 && t.first ? t.first : t.odds));
  let pity = l.pity;
  if (kind === "gold") {
    // pity: the 10th golden comb in a row without an epic+ item and the 30th without a legendary guarantee one
    if (pity.sinceLeg + 1 >= PITY_LEGENDARY && !slots.includes("legendary")) slots[0] = "legendary";
    else if (pity.sinceEpic + 1 >= PITY_EPIC && !slots.some((r) => rarityIdx(r) >= 2)) slots[0] = pickWeighted(rng, [["epic", t.first![2]], ["legendary", t.first![3]]]);
    const epic = slots.some((r) => rarityIdx(r) >= 2), leg = slots.includes("legendary");
    pity = { sinceEpic: epic ? 0 : pity.sinceEpic + 1, sinceLeg: leg ? 0 : pity.sinceLeg + 1 };
  }
  slots.sort((a, b) => rarityIdx(a) - rarityIdx(b)); // reveal the best last
  for (const r of slots) {
    const what = pickWeighted(rng, KIND_ODDS[r]);
    if (what === "item") {
      const pool = ITEMS.filter((it) => it.rarity === r);
      let it = pool[rng.int(pool.length)];
      // soft duplicate protection: a duplicate is re-rolled once (shown in the odds sheet)
      if (owned.has(it.id) && DUP_REROLL) it = pool[rng.int(pool.length)];
      const dup = owned.has(it.id);
      owned.add(it.id);
      drops.push({ t: "item", id: it.id, rarity: r, dup, pollen: dup ? DUP_POLLEN[r] : 0, slot: true });
    } else if (what === "booster") {
      const b = r === "common" ? "moves" : ((["moves", "bomb", "shuffle"] as BoosterId[])[rng.int(3)]);
      drops.push({ t: "booster", b, n: r === "epic" ? 3 : 1, rarity: r, slot: true });
    } else if (what === "seed") {
      if (r === "common") {
        const f = ctx.flowers.length ? ctx.flowers[rng.int(ctx.flowers.length)] : "sunflower";
        drops.push({ t: "seed", flower: f, n: 2, rarity: r, slot: true });
      } else {
        drops.push({ t: "seed", flower: r === "rare" ? "moonpoppy" : "goldsun", n: 1, rarity: r, slot: true });
      }
    } else {
      const n = FRAGMENTS_BY_RARITY[r];
      if (ctx.hasNightBee) drops.push({ t: "fragment", n, rarity: r, pollen: n * FRAGMENT_POLLEN, slot: true });
      else {
        // fragments beyond the 10 the bee needs are worth pollen right away
        const need = Math.max(0, FRAGMENTS_FOR_BEE - fragments);
        const keep = Math.min(n, need);
        fragments += keep;
        drops.push({ t: "fragment", n, rarity: r, pollen: (n - keep) * FRAGMENT_POLLEN, slot: true });
      }
    }
  }
  if (BONUS_GOLD[kind] && rng.next() * 100 < BONUS_GOLD[kind]) drops.push({ t: "box", kind: "gold", rarity: "epic" });

  // apply (non-resource part)
  const n: Loot = {
    ...l, rng: rng.state, pity, boxes: { ...l.boxes, [kind]: l.boxes[kind] - 1 }, opened: { ...l.opened, [kind]: l.opened[kind] + 1 },
    owned: [...l.owned], boosters: { ...l.boosters }, seeds: { ...l.seeds },
  };
  for (const d of drops) {
    if (d.t === "item") { if (!d.dup) n.owned.push(d.id); else n.pollen += d.pollen; }
    else if (d.t === "booster") n.boosters[d.b] += d.n;
    else if (d.t === "seed") {
      n.seeds[d.flower] = (n.seeds[d.flower] ?? 0) + d.n;
      if (ITEM_BY_ID[d.flower] && !n.owned.includes(d.flower)) n.owned.push(d.flower); // rare flower → album
    } else if (d.t === "fragment") n.pollen += d.pollen;
    else if (d.t === "box") n.boxes[d.kind] += 1;
  }
  n.fragments = fragments;
  return { loot: n, drops };
}

export const bestRarity = (drops: Drop[]): Rarity =>
  drops.reduce<Rarity>((b, d) => (d.t !== "honey" && d.t !== "nectar" && d.t !== "jelly" && rarityIdx(d.rarity) > rarityIdx(b) ? d.rarity : b), "common");

// ---------------------------------------------------------------- shop
export function buyItem(l: Loot, id: string): Loot | null {
  const it = ITEMS.find((i) => i.id === id);
  if (!it || l.owned.includes(id) || l.pollen < SHOP_PRICE[it.rarity]) return null;
  return { ...l, pollen: l.pollen - SHOP_PRICE[it.rarity], owned: [...l.owned, id] };
}
export function buyBooster(l: Loot, b: BoosterId): Loot | null {
  if (l.pollen < SHOP_BOOSTER[b]) return null;
  return { ...l, pollen: l.pollen - SHOP_BOOSTER[b], boosters: { ...l.boosters, [b]: l.boosters[b] + 1 } };
}
export function buyFragment(l: Loot, hasNightBee: boolean): Loot | null {
  if (hasNightBee || l.fragments >= FRAGMENTS_FOR_BEE || l.pollen < SHOP_FRAGMENT) return null;
  return { ...l, pollen: l.pollen - SHOP_FRAGMENT, fragments: l.fragments + 1 };
}

// ---------------------------------------------------------------- album
export function pageDone(owned: Set<string>, p: Page) { return p.items.every((i) => owned.has(i)); }
export interface AlbumBonus { puzzleHoney: number; hiveProd: number; harvestNectar: number; capHours: number }
export function albumBonus(ownedIds: string[], hasNightBee: boolean): AlbumBonus {
  const o = new Set(ownedIds); if (hasNightBee) o.add(NIGHT_BEE);
  const done = (id: PageId) => pageDone(o, PAGES.find((p) => p.id === id)!);
  return { puzzleHoney: done("skins") ? 0.1 : 0, hiveProd: done("hive") ? 0.05 : 0, harvestNectar: done("garden") ? 2 : 0, capHours: done("rare") ? 3 : 0 };
}

/** tolerant loader */
export function migrateLoot(raw: unknown, seed: number): Loot {
  const d = newLoot(seed);
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const num = (v: unknown, def = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : def);
  const rec = <K extends string>(keys: K[], v: unknown) => Object.fromEntries(keys.map((k) => [k, num((v as any)?.[k])])) as Record<K, number>;
  const ids = (v: unknown, ok: (s: string) => boolean) => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string" && ok(x)))) : []);
  const seeds: Record<string, number> = {};
  for (const [k, v] of Object.entries(o.seeds && typeof o.seeds === "object" ? o.seeds : {})) { const n = num(v); if (n > 0 && typeof k === "string") seeds[k] = n; }
  return {
    boxes: rec(BOX_KINDS, o.boxes),
    rng: typeof o.rng === "number" && Number.isFinite(o.rng) ? o.rng >>> 0 : d.rng,
    pity: { sinceEpic: Math.min(PITY_EPIC - 1, num(o.pity?.sinceEpic)), sinceLeg: Math.min(PITY_LEGENDARY - 1, num(o.pity?.sinceLeg)) },
    owned: ids(o.owned, (x) => !!ITEM_BY_ID[x] && x !== NIGHT_BEE),
    pollen: num(o.pollen), fragments: Math.min(FRAGMENTS_FOR_BEE, num(o.fragments)),
    boosters: rec(["moves", "bomb", "shuffle"] as BoosterId[], o.boosters),
    seeds, opened: rec(BOX_KINDS, o.opened),
    hidden: ids(o.hidden, (x) => DECOS.some((dd) => dd.id === x)),
  };
}
