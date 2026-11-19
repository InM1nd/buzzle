/**
 * Cocoa Sort (winter mini-game, v1.7): Water Sort with drinks in mugs. Pure logic, no UI.
 * Winter twists on top of the classic rules:
 *  - foam: the lower layers of some mugs are hidden under whipped cream until they reach the top;
 *  - ice: a frozen mug can't be poured from or into until N more pours have been made;
 *  - Zhuzha's orders: a finished mug of the ordered drink is served (it empties and frees the mug).
 */
import { Rng, hashString } from "./rng";
import FROZEN from "./cocoaLevels.json";

export const CAP = 4;
/** a mug: drink colours bottom → top */
export type Cup = number[];
export interface Board {
  cups: Cup[];
  /** per mug: how many bottom layers are still under foam */
  hidden: number[];
  /** per mug: pours left until the ice melts (0 = free) */
  ice: number[];
  /** drinks Zhuzha still wants, first one is the current order */
  orders: number[];
}
export interface Move { board: Board; count: number; color: number; served: boolean }

export const complete = (c: Cup) => c.length === CAP && c.every((x) => x === c[0]);
export const won = (cups: Cup[]) => cups.every((c) => !c.length || complete(c));

/** the same-colour block on top of a mug */
function topRun(c: Cup): number {
  let n = 1;
  while (n < c.length && c[c.length - n - 1] === c[c.length - 1]) n++;
  return n;
}

/** Pour the top block of `from` into `to` (as much as fits); null if the move is not allowed. */
export function pour(b: Board, from: number, to: number): Move | null {
  const src = b.cups[from], dst = b.cups[to];
  if (!src || !dst || from === to || !src.length || complete(src) || dst.length >= CAP) return null;
  if (b.ice[from] > 0 || b.ice[to] > 0) return null;
  const color = src[src.length - 1];
  if (dst.length && dst[dst.length - 1] !== color) return null;
  const count = Math.min(topRun(src), CAP - dst.length);
  const cups = b.cups.map((c) => c.slice());
  cups[to].push(...cups[from].splice(-count));
  // the top layer is always visible: foam pops as soon as a hidden layer comes up
  const hidden = b.hidden.map((h, i) => (i === from ? Math.min(h, Math.max(0, cups[i].length - 1)) : i === to && complete(cups[i]) ? 0 : h));
  const ice = b.ice.map((n) => Math.max(0, n - 1));
  // serve the current order while a finished mug of it stands on the shelf (it may have been finished earlier)
  let orders = b.orders, served = false;
  for (let k; orders.length && (k = cups.findIndex((c) => complete(c) && c[0] === orders[0])) >= 0;) {
    cups[k] = []; hidden[k] = 0; orders = orders.slice(1); served = true;
  }
  return { board: { cups, hidden, ice, orders }, count, color, served };
}

export const isWon = (b: Board) => won(b.cups);

/** Same position regardless of mug order (ice travels with its mug; foam and orders don't change solvability). */
const key = (b: Board) => b.cups.map((c, i) => c.join("") + "/" + b.ice[i]).sort().join("|");

/** Moves that can matter for a solver: skip pouring a single-colour mug into an empty one (pure shuffle). */
function* moves(b: Board) {
  for (let f = 0; f < b.cups.length; f++) {
    const a = b.cups[f];
    if (!a.length || complete(a) || b.ice[f]) continue;
    const solid = topRun(a) === a.length;
    let emptyTried = false;
    for (let t = 0; t < b.cups.length; t++) {
      if (!b.cups[t].length && !b.ice[t]) {
        if (solid || emptyTried) continue; // all free empty mugs are equivalent
        emptyTried = true;
      }
      const m = pour(b, f, t);
      if (m) yield { from: f, to: t, m };
    }
  }
}

/** Shortest solution by BFS (pour count), or null if unsolvable / the search gets too big. Orders are ignored. */
export function solve(start: Board, limit = 300_000): { from: number; to: number }[] | null {
  const s0 = { ...start, orders: [] };
  if (isWon(s0)) return [];
  const seen = new Map<string, { prev: string; from: number; to: number } | null>([[key(s0), null]]);
  // moves are recorded in the mug order of each position, so keep full positions in the queue
  let frontier: { b: Board; k: string }[] = [{ b: s0, k: key(s0) }];
  while (frontier.length && seen.size < limit) {
    const next: typeof frontier = [];
    for (const { b, k } of frontier) {
      for (const { from, to, m } of moves(b)) {
        const nk = key(m.board);
        if (seen.has(nk)) continue;
        seen.set(nk, { prev: k, from, to });
        if (isWon(m.board)) {
          const path: { from: number; to: number }[] = [];
          for (let s = seen.get(nk); s; s = seen.get(s.prev)) path.unshift({ from: s.from, to: s.to });
          return path;
        }
        next.push({ b: m.board, k: nk });
      }
    }
    frontier = next;
  }
  return null;
}

export interface Level extends Board { n: number; par: number; colors: number }

/** Difficulty curve (0-based level n): colours 3 → 7, orders from level 3, foam from 5, ice from 9. */
export function shape(n: number) {
  return {
    colors: Math.min(7, 3 + Math.floor(n / 4)),
    orders: n >= 2 ? Math.min(3, 1 + Math.floor((n - 2) / 6)) : 0,
    foam: n >= 4 ? Math.min(4, 1 + Math.floor((n - 4) / 5)) : 0,
    ice: n >= 8 ? (n >= 20 ? 2 : 1) : 0,
  };
}

/** Deterministic, solvable level n — the same for every player. */
export function level(n: number, salt = "cocoa"): Level {
  const sh = shape(n);
  const rng = new Rng(hashString(`${salt}:${n}`));
  for (;;) {
    const units: number[] = [];
    for (let c = 0; c < sh.colors; c++) for (let i = 0; i < CAP; i++) units.push(c);
    for (let i = units.length - 1; i > 0; i--) { const j = rng.int(i + 1); [units[i], units[j]] = [units[j], units[i]]; }
    const cups: Cup[] = [];
    for (let c = 0; c < sh.colors; c++) cups.push(units.slice(c * CAP, c * CAP + CAP));
    if (cups.some((c) => topRun(c) >= 3)) continue; // no gifts at the start
    cups.push([], []);
    const full = cups.map((_, i) => i).filter((i) => cups[i].length);
    // Fisher–Yates, not sort(random): engines sort differently and every player must get the same level
    const pick = (k: number) => { const a = full.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rng.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
    const hidden = cups.map(() => 0);
    for (const i of pick(sh.foam)) hidden[i] = CAP - 1;
    const ice = cups.map(() => 0);
    for (const i of pick(sh.ice)) ice[i] = 3 + rng.int(4);
    // one mug per drink, so an order can't repeat
    const orders = Array.from({ length: sh.colors }, (_, i) => i);
    for (let i = orders.length - 1; i > 0; i--) { const j = rng.int(i + 1); [orders[i], orders[j]] = [orders[j], orders[i]]; }
    orders.length = sh.orders;
    const board: Board = { cups, hidden, ice, orders };
    const sol = solve(board);
    if (sol && sol.length >= sh.colors + 2) return { ...board, n, par: sol.length, colors: sh.colors };
  }
}

/** compact form for the frozen level list: "cups;hidden;ice;orders;par", cups as digit strings joined by "," */
export function encodeLevel(l: Level): string {
  return [l.cups.map((c) => c.join("")).join(","), l.hidden.join(""), l.ice.join(""), l.orders.join(""), l.par].join(";");
}
export function decodeLevel(n: number, s: string): Level {
  const [c, h, i, o, par] = s.split(";");
  const cups = c.split(",").map((x) => [...x].map(Number));
  const digits = (x: string) => [...x].map(Number);
  return { cups, hidden: digits(h), ice: digits(i), orders: digits(o), n, par: Number(par), colors: new Set(cups.flat()).size };
}

/** Level n as shipped (scripts/gen_cocoa_levels.ts); past the list the last 100 repeat. */
export function levelAt(n: number): Level {
  const k = n < FROZEN.length ? n : FROZEN.length - 100 + ((n - FROZEN.length) % 100);
  return { ...decodeLevel(n, FROZEN[k]) };
}

/** 3 stars at par + 3 pours, 2 at par + 8 (as in the prototype). */
export const stars = (moves: number, par: number) => (moves <= par + 3 ? 3 : moves <= par + 8 ? 2 : 1);
