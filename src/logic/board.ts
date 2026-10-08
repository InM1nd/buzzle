import { COLS, ROWS, Pos, isAdjacent, neighbors } from "./hex";
import { Rng } from "./rng";

export const COLORS = 5;
export type CellKind = "n" | "bomb" | "wild";
export interface Cell {
  id: number;
  color: number; // 0..COLORS-1 (wild cells keep a colour only for rendering variety)
  kind: CellKind;
}
export interface Board {
  /** cells[c][r] */
  cells: Cell[][];
  nextId: number;
  rng: number;
}

export interface PuzzleRules {
  /** chain length that leaves a royal-jelly bomb behind */
  bombAt: number;
  /** chance that a refilled cell is a wildcard */
  wildChance: number;
  /** per-colour score multiplier */
  colorMult: number[];
}
export const DEFAULT_RULES: PuzzleRules = { bombAt: 6, wildChance: 0.02, colorMult: [1, 1, 1, 1, 1] };

function spawn(rng: Rng, id: number, rules: PuzzleRules): Cell {
  const color = rng.int(COLORS);
  const kind: CellKind = rng.next() < rules.wildChance ? "wild" : "n";
  return { id, color, kind };
}

export function createBoard(seed: number, rules: PuzzleRules = DEFAULT_RULES): Board {
  const rng = new Rng(seed >>> 0);
  let id = 1;
  const cells: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    cells.push([]);
    for (let r = 0; r < ROWS; r++) cells[c].push({ id: id++, color: rng.int(COLORS), kind: "n" });
  }
  let b: Board = { cells, nextId: id, rng: rng.state };
  if (!hasMoves(b)) b = shuffleBoard(b);
  return b;
}

export const cellAt = (b: Board, p: Pos) => b.cells[p.c][p.r];
const key = (p: Pos) => p.c * 100 + p.r;

/** Colour the path is locked to (first non-wild cell), or null if empty / all wild. */
export function pathColor(b: Board, path: Pos[]): number | null {
  for (const p of path) {
    const cell = cellAt(b, p);
    if (cell.kind !== "wild") return cell.color;
  }
  return null;
}

/** Can `next` be appended to the path? (adjacent to the last cell, unused, colour-compatible) */
export function canExtend(b: Board, path: Pos[], next: Pos): boolean {
  if (path.some((p) => p.c === next.c && p.r === next.r)) return false;
  if (path.length && !isAdjacent(path[path.length - 1], next)) return false;
  const cell = cellAt(b, next);
  if (cell.kind === "wild") return true;
  const pc = pathColor(b, path);
  return pc === null || pc === cell.color;
}

/** Touch handling helper: extend, backtrack (finger returns to the previous cell) or ignore. */
export function stepPath(b: Board, path: Pos[], p: Pos): Pos[] {
  const last = path[path.length - 1];
  if (last && last.c === p.c && last.r === p.r) return path;
  const prev = path[path.length - 2];
  if (prev && prev.c === p.c && prev.r === p.r) return path.slice(0, -1);
  return canExtend(b, path, p) ? [...path, p] : path;
}

export function isValidPath(b: Board, path: Pos[]): boolean {
  if (path.length < 3) return false;
  for (let i = 0; i < path.length; i++) if (!canExtend(b, path.slice(0, i), path[i])) return false;
  return true;
}

/** Score for a chain: 10/cell × colour bonus, +20% per cell above 3, +15 per bomb-blasted cell, × combo. */
export function chainScore(len: number, colorMult: number, blasted: number, combo: number): number {
  const base = 10 * len * colorMult * (1 + 0.2 * Math.max(0, len - 3));
  return Math.round((base + 15 * blasted) * (1 + 0.25 * combo));
}

export interface MoveResult {
  board: Board;
  score: number;
  /** cells removed: path + blast (for effects) */
  removed: { pos: Pos; cell: Cell; blast: boolean }[];
  bombsExploded: number;
  newBomb: Pos | null;
  /** number of fresh cells dropped into each column */
  dropped: number[];
  color: number | null;
  shuffled: boolean;
}

export function applyPath(b: Board, path: Pos[], rules: PuzzleRules = DEFAULT_RULES, combo = 0): MoveResult {
  if (!isValidPath(b, path)) throw new Error("invalid path");
  const color = pathColor(b, path);
  const remove = new Map<number, { pos: Pos; blast: boolean }>();
  path.forEach((p) => remove.set(key(p), { pos: p, blast: false }));
  // bombs in the path (and bombs caught in a blast) clear their neighbours
  let bombs = 0;
  const queue = path.filter((p) => cellAt(b, p).kind === "bomb");
  const exploded = new Set<number>();
  while (queue.length) {
    const p = queue.shift()!;
    if (exploded.has(key(p))) continue;
    exploded.add(key(p));
    bombs++;
    for (const n of neighbors(p.c, p.r)) {
      if (!remove.has(key(n))) {
        remove.set(key(n), { pos: n, blast: true });
        if (cellAt(b, n).kind === "bomb") queue.push(n);
      }
    }
  }
  // a long chain leaves a bomb on its last cell
  let newBomb: Pos | null = null;
  if (path.length >= rules.bombAt) {
    newBomb = path[path.length - 1];
    remove.delete(key(newBomb));
  }
  const blasted = [...remove.values()].filter((x) => x.blast).length;
  const score = chainScore(path.length, color === null ? 1 : rules.colorMult[color] ?? 1, blasted, combo);
  const removed = [...remove.values()].map((x) => ({ ...x, cell: cellAt(b, x.pos) }));
  if (newBomb) removed.push({ pos: newBomb, cell: cellAt(b, newBomb), blast: false });

  // gravity + refill (deterministic: columns left→right, new cells drawn top→bottom)
  const rng = new Rng(b.rng);
  let nextId = b.nextId;
  const dropped: number[] = [];
  const cells: Cell[][] = b.cells.map((col, c) => {
    const keep: Cell[] = [];
    col.forEach((cell, r) => {
      if (newBomb && newBomb.c === c && newBomb.r === r) {
        keep.push({ id: nextId++, color: color ?? cell.color, kind: "bomb" });
      } else if (!remove.has(key({ c, r }))) keep.push(cell);
    });
    const missing = ROWS - keep.length;
    dropped.push(missing);
    const fresh: Cell[] = [];
    for (let i = 0; i < missing; i++) fresh.push(spawn(rng, nextId++, rules));
    return [...fresh, ...keep];
  });
  let board: Board = { cells, nextId, rng: rng.state };
  let shuffled = false;
  if (!hasMoves(board)) {
    board = shuffleBoard(board);
    shuffled = true;
  }
  return { board, score, removed, bombsExploded: bombs, newBomb, dropped, color, shuffled };
}

/** Is there any valid chain of 3? */
export function hasMoves(b: Board): boolean {
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      const p0 = { c, r };
      for (const p1 of neighbors(c, r)) {
        if (!canExtend(b, [p0], p1)) continue;
        for (const p2 of neighbors(p1.c, p1.r)) if (canExtend(b, [p0, p1], p2)) return true;
      }
    }
  return false;
}

/** Re-deal colours of normal cells (ids, bombs and wildcards stay) until a move exists. Deterministic. */
export function shuffleBoard(b: Board): Board {
  const rng = new Rng(b.rng);
  for (let attempt = 0; attempt < 50; attempt++) {
    const cells = b.cells.map((col) => col.map((cell) => (cell.kind !== "n" ? cell : { ...cell, color: rng.int(COLORS) })));
    const nb = { cells, nextId: b.nextId, rng: rng.state };
    if (hasMoves(nb)) return nb;
  }
  // practically unreachable: force a wildcard in the corner
  const cells = b.cells.map((col) => col.slice());
  cells[0][ROWS - 1] = { ...cells[0][ROWS - 1], kind: "wild" };
  cells[0][ROWS - 2] = { ...cells[0][ROWS - 2], color: cells[1][ROWS - 1].color };
  return { cells, nextId: b.nextId, rng: rng.state };
}

/** Longest same-colour chain the greedy bot can find from each start (DFS with limit) — used for calibration/hints. */
export function findBestPath(b: Board, maxLen = 12, budget = 20000): Pos[] {
  let best: Pos[] = [];
  let steps = 0;
  const dfs = (path: Pos[]) => {
    if (++steps > budget) return;
    if (path.length > best.length) best = path.slice();
    if (path.length >= maxLen) return;
    const last = path[path.length - 1];
    for (const n of neighbors(last.c, last.r)) if (canExtend(b, path, n)) dfs([...path, n]);
  };
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (cellAt(b, { c, r }).kind !== "wild") dfs([{ c, r }]);
  return best.length >= 3 ? best : [];
}
