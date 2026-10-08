/**
 * Flat-top hex grid in "odd-q" offset coordinates: columns are vertical, odd columns are shifted
 * down by half a cell. Row 0 is the top. Gravity pulls cells towards higher rows.
 */
export const COLS = 7;
export const ROWS = 8;

export type Pos = { c: number; r: number };

export const inBounds = (c: number, r: number, cols = COLS, rows = ROWS) => c >= 0 && c < cols && r >= 0 && r < rows;

export function neighbors(c: number, r: number, cols = COLS, rows = ROWS): Pos[] {
  const odd = c & 1;
  const d = odd
    ? [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
    : [[0, -1], [0, 1], [-1, -1], [1, -1], [-1, 0], [1, 0]];
  const out: Pos[] = [];
  for (const [dc, dr] of d) {
    const nc = c + dc, nr = r + dr;
    if (inBounds(nc, nr, cols, rows)) out.push({ c: nc, r: nr });
  }
  return out;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return neighbors(a.c, a.r).some((n) => n.c === b.c && n.r === b.r);
}

/** Pixel centre of a cell for hex "radius" s (centre→corner). */
export function cellCenter(c: number, r: number, s: number): { x: number; y: number } {
  const h = Math.sqrt(3) * s;
  return { x: s + c * 1.5 * s, y: h / 2 + r * h + (c & 1 ? h / 2 : 0) };
}

export function boardSize(s: number, cols = COLS, rows = ROWS) {
  const h = Math.sqrt(3) * s;
  return { width: s * (1.5 * cols + 0.5), height: h * (rows + 0.5) };
}

/** Nearest cell whose centre is within `tolerance`×s of the point (forgiving touch hit test). */
export function hitTest(x: number, y: number, s: number, tolerance = 0.82): Pos | null {
  let best: Pos | null = null;
  let bestD = Infinity;
  const approxC = Math.round((x - s) / (1.5 * s));
  for (let c = approxC - 1; c <= approxC + 1; c++) {
    if (c < 0 || c >= COLS) continue;
    const h = Math.sqrt(3) * s;
    const approxR = Math.round((y - h / 2 - (c & 1 ? h / 2 : 0)) / h);
    for (let r = approxR - 1; r <= approxR + 1; r++) {
      if (!inBounds(c, r)) continue;
      const p = cellCenter(c, r, s);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = { c, r };
      }
    }
  }
  return best && bestD <= tolerance * s ? best : null;
}

/** Hive layout: axial hex of radius 2 (19 slots), flat-top. Slot 0 is the centre. */
export const HIVE_SLOTS: { q: number; r: number }[] = (() => {
  const out: { q: number; r: number }[] = [{ q: 0, r: 0 }];
  for (let ring = 1; ring <= 2; ring++) {
    for (let q = -ring; q <= ring; q++) {
      for (let r = Math.max(-ring, -q - ring); r <= Math.min(ring, -q + ring); r++) {
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) === ring) out.push({ q, r });
      }
    }
  }
  return out;
})();

export function hiveCenter(q: number, r: number, s: number) {
  return { x: 1.5 * s * q, y: Math.sqrt(3) * s * (r + q / 2) };
}
