/**
 * 1.7 «Зимний улей»: the winter season (1 Dec – 28 Feb, local dates, offline). Pure data and helpers; game.ts wires them in.
 * Snowflakes are the one winter counter: like the Halloween points they only grow and are never spent. Every
 * FLAKES_PER_FRAGMENT of them is a winter-bee fragment (later a wax comb), and the advent calendar runs on top.
 * Plan and numbers: design/WINTER_ECONOMY.ru.md.
 */
import { season } from "./event";
import type { Reward } from "./tasks";

export const FLAKES_PER_FRAGMENT = 50;
export const WINTER_FRAGMENTS = 10;
/** snowflakes per source: a new daily / weekend star, a snowflake tile in free play, a wax / gold / royal comb opened in winter */
export const FLAKES = { star: 2, tile: 1, comb: 3 };
/** the snow bee: assembled from 10 winter fragments (art: scripts/import_winter_bees.py) */
export const WINTER_BEE = "snowbee";

/** advent catch-up: an earlier window opens for one round played (a credit) or this much pollen */
export const ADVENT_POLLEN = 10;
export const ADVENT_DAYS = 24;
/** winter shop prices */
export const WSHOP = { fragPollen: 25, fragJelly: 6, waxJelly: 6, goldJelly: 20, seedNectar: 150 };
export const WINTER_FLOWERS = ["hellebore", "poinsettia"];

export interface WinterState {
  /** "winter-2026" = 1 Dec 2026 – 28 Feb 2027 */
  id: string;
  flakes: number;
  /** winter-bee fragments in the pocket (0..10); kept from one winter to the next */
  frags: number;
  /** advent windows opened (1..24) */
  advent: number[];
  /** rounds played this December not yet spent on catching up an advent window */
  credits: number;
  /** winter shop limits: the game day of the last wax comb, the week of the last golden comb */
  waxDay: number;
  goldWeek: number;
}
export const newWinter = (): WinterState => ({ id: "", flakes: 0, frags: 0, advent: [], credits: 0, waxDay: -1, goldWeek: -1 });

const date = (day: number) => new Date(day * 86400000);
/** the winter that day belongs to ("winter-2026" for Dec 2026 – Feb 2027), null outside winter */
export function winterId(day: number): string | null {
  if (season(day) !== "winter") return null;
  const d = date(day);
  return `winter-${d.getUTCMonth() === 11 ? d.getUTCFullYear() : d.getUTCFullYear() - 1}`;
}
/** the save's progress for that winter: a new winter starts flakes and the advent over, fragments stay */
export const winterProgress = (w: WinterState, id: string): WinterState =>
  w.id === id ? w : { ...newWinter(), id, frags: w.frags };

/** winter backdrops: Christmas decor from 20 Dec (the mini-game invitation) to 7 Jan, evening from 17:00 to 7:00 */
export type WinterLook = "winter_day" | "winter_evening" | "christmas_day" | "christmas_evening";
export const CHRISTMAS = { fromDec: 20, toJan: 7 };
export function winterLook(day: number, hour: number): WinterLook {
  const d = date(day), m = d.getUTCMonth(), n = d.getUTCDate();
  const xmas = (m === 11 && n >= CHRISTMAS.fromDec) || (m === 0 && n <= CHRISTMAS.toJan);
  return `${xmas ? "christmas" : "winter"}_${hour >= 17 || hour < 7 ? "evening" : "day"}`;
}

/** December date of that day (1..31), 0 outside December */
export const decemberDate = (day: number): number => (winterId(day) && date(day).getUTCMonth() === 11 ? date(day).getUTCDate() : 0);

/**
 * Add snowflakes. Every crossed multiple of FLAKES_PER_FRAGMENT pays: a fragment while the bee is not home and the pocket
 * has room, a wax comb once the bee is home, otherwise (10 fragments waiting to be assembled) 4 pollen.
 */
export function addFlakes(w: WinterState, n: number, beeHome: boolean): { w: WinterState; frags: number; wax: number; pollen: number } {
  if (n <= 0) return { w, frags: 0, wax: 0, pollen: 0 };
  const steps = Math.floor((w.flakes + n) / FLAKES_PER_FRAGMENT) - Math.floor(w.flakes / FLAKES_PER_FRAGMENT);
  let frags = 0, wax = 0, pollen = 0;
  for (let i = 0; i < steps; i++) {
    if (beeHome) wax++;
    else if (w.frags + frags < WINTER_FRAGMENTS) frags++;
    else pollen += 4;
  }
  return { w: { ...w, flakes: w.flakes + n, frags: w.frags + frags }, frags, wax, pollen };
}

/** the 24 advent gifts (design/WINTER_ECONOMY.ru.md). Items not in the game yet keep their window waiting (grant). */
export const ADVENT: Reward[] = [
  { items: ["garland"] },
  { frags: 1, boosters: { bomb: 2 } },
  { seeds: { hellebore: 2 } },
  { boosters: { shuffle: 2 }, pollen: 10 },
  { boxes: ["wax"] },
  { items: ["bobblehat", "winterscarf"] },
  { items: ["goldstar"] },
  { items: ["gingerhouse"] },
  { frags: 1, boosters: { bomb: 2 } },
  { items: ["snowman"] },
  { boxes: ["wax"] },
  { items: ["antlers"] },
  { items: ["snowlanterns"] },
  { seeds: { poinsettia: 2 } },
  { boxes: ["gold"] },
  { items: ["mailbox"] },
  { items: ["lamppost"] },
  { items: ["firtree"] },
  { frags: 1, jelly: 5 },
  { items: ["santahat"] },
  { items: ["sled"] },
  { items: ["firwreath"] },
  { items: ["festivebow"] },
  { boxes: ["royal"], jelly: 5 }, // the fir tree (window 18) already has its star
];

export type AdventState = "open" | "today" | "catchup" | "future" | "closed";
/** what a window looks like on that day: opened, today's (free), an earlier one (catch-up), not yet, or past the grace (Jan) */
export function adventWindow(w: WinterState, n: number, day: number): AdventState {
  if (w.advent.includes(n)) return "open";
  const dec = decemberDate(day);
  if (!dec) return "closed";
  return n === dec ? "today" : n < dec ? "catchup" : "future";
}
