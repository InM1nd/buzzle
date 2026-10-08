import { test } from "node:test";
import assert from "node:assert/strict";
import { neighbors, isAdjacent, hitTest, cellCenter, COLS, ROWS, HIVE_SLOTS } from "../src/logic/hex";
import {
  applyPath, Board, canExtend, Cell, chainScore, createBoard, DEFAULT_RULES, findBestPath, hasMoves, isValidPath, stepPath,
} from "../src/logic/board";

/** Build a board from a colour grid given row by row (top→bottom), '*' = wild, 'B<n>' bomb. */
function boardFrom(rows: string[][], rng = 1): Board {
  let id = 1;
  const cells: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    cells.push([]);
    for (let r = 0; r < ROWS; r++) {
      const v = rows[r][c];
      cells[c].push(v === "*" ? { id: id++, color: 0, kind: "wild" } : v.startsWith("B") ? { id: id++, color: Number(v[1]), kind: "bomb" } : { id: id++, color: Number(v), kind: "n" });
    }
  }
  return { cells, nextId: id, rng };
}
// checkerboard-ish filler with no accidental long chains
const filler = () => Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => String((c + 2 * r) % 5)));

test("neighbors: odd-q offset adjacency is symmetric and sized correctly", () => {
  assert.equal(neighbors(3, 3).length, 6);
  assert.equal(neighbors(0, 0).length, 2); // even column top-left: (0,1),(1,0)
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++)
      for (const n of neighbors(c, r)) assert.ok(neighbors(n.c, n.r).some((m) => m.c === c && m.r === r), `sym ${c},${r}`);
  // even column 2: up-diagonals are row-1; odd column 3: down-diagonals are row+1
  assert.ok(isAdjacent({ c: 2, r: 3 }, { c: 3, r: 2 }));
  assert.ok(!isAdjacent({ c: 2, r: 3 }, { c: 3, r: 4 }));
  assert.ok(isAdjacent({ c: 3, r: 3 }, { c: 4, r: 4 }));
  assert.ok(!isAdjacent({ c: 3, r: 3 }, { c: 4, r: 2 }));
});

test("neighbors are exactly the cells at hex distance √3·s in pixel space", () => {
  const s = 10;
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      const p = cellCenter(c, r, s);
      for (let c2 = 0; c2 < COLS; c2++)
        for (let r2 = 0; r2 < ROWS; r2++) {
          const q = cellCenter(c2, r2, s);
          const near = Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - Math.sqrt(3) * s) < 1e-6;
          assert.equal(near, isAdjacent({ c, r }, { c: c2, r: r2 }));
        }
    }
});

test("hitTest: centre hits, gaps between cells miss (forgiving but unambiguous)", () => {
  const s = 30;
  const p = cellCenter(4, 5, s);
  assert.deepEqual(hitTest(p.x + 5, p.y - 5, s), { c: 4, r: 5 });
  // midpoint between two neighbours is ~0.87 s from both → no hit
  const q = cellCenter(4, 6, s);
  assert.equal(hitTest((p.x + q.x) / 2, (p.y + q.y) / 2, s), null);
});

test("path validity: adjacency, same colour, no reuse, wildcard joins any colour, min length 3", () => {
  const g = filler();
  g[7][0] = "1"; g[6][0] = "1"; g[5][0] = "1"; g[4][0] = "2"; g[7][1] = "*";
  const b = boardFrom(g);
  const p = [{ c: 0, r: 7 }, { c: 0, r: 6 }, { c: 0, r: 5 }];
  assert.ok(isValidPath(b, p));
  assert.ok(!isValidPath(b, p.slice(0, 2)), "too short");
  assert.ok(!canExtend(b, p, { c: 0, r: 4 }), "wrong colour");
  assert.ok(!canExtend(b, p, { c: 0, r: 6 }), "reuse");
  assert.ok(!canExtend(b, [{ c: 0, r: 7 }], { c: 0, r: 5 }), "not adjacent");
  assert.ok(canExtend(b, [{ c: 0, r: 7 }], { c: 1, r: 7 }), "wild joins");
  // a path starting on a wild takes the colour of the first normal cell
  assert.ok(canExtend(b, [{ c: 1, r: 7 }], { c: 0, r: 7 }));
  // backtracking by returning to the previous cell
  assert.deepEqual(stepPath(b, p, { c: 0, r: 6 }), p.slice(0, 2));
});

test("applyPath: gravity keeps order, refills from the top, ids are fresh", () => {
  const g = filler();
  g[7][0] = "1"; g[6][0] = "1"; g[5][0] = "1";
  const b = boardFrom(g, 42);
  const above = b.cells[0].slice(0, 5).map((x) => x.id);
  const res = applyPath(b, [{ c: 0, r: 7 }, { c: 0, r: 6 }, { c: 0, r: 5 }]);
  assert.deepEqual(res.board.cells[0].slice(3).map((x) => x.id), above, "survivors fall to the bottom in order");
  assert.equal(res.dropped[0], 3);
  assert.deepEqual(res.dropped.slice(1), [0, 0, 0, 0, 0, 0]);
  const fresh = res.board.cells[0].slice(0, 3).map((x) => x.id);
  assert.ok(fresh.every((id) => id >= b.nextId));
  assert.equal(res.score, chainScore(3, 1, 0, 0));
});

test("refill is deterministic for the same seed and move sequence", () => {
  const run = (seed: number) => {
    let b = createBoard(seed);
    const scores: number[] = [];
    for (let i = 0; i < 8; i++) {
      const p = findBestPath(b, 8, 3000);
      const r = applyPath(b, p);
      scores.push(r.score);
      b = r.board;
    }
    return { b: JSON.stringify(b), scores };
  };
  assert.deepEqual(run(123), run(123));
  assert.notDeepEqual(run(123).b, run(124).b);
});

test("long chain leaves a bomb; bomb clears its neighbours (chain reaction)", () => {
  const g = filler();
  for (let r = 2; r < 8; r++) g[r][0] = "3";
  const b = boardFrom(g);
  const path = [7, 6, 5, 4, 3, 2].map((r) => ({ c: 0, r }));
  const res = applyPath(b, path);
  assert.ok(res.newBomb);
  // the bomb survives and falls to the bottom of column 0
  const bomb = res.board.cells[0][7];
  assert.equal(bomb.kind, "bomb");
  assert.equal(bomb.color, 3);

  const g2 = filler();
  g2[4][3] = "B1"; g2[3][3] = "1"; g2[5][3] = "1";
  const b2 = boardFrom(g2);
  const res2 = applyPath(b2, [{ c: 3, r: 3 }, { c: 3, r: 4 }, { c: 3, r: 5 }]);
  assert.equal(res2.bombsExploded, 1);
  assert.equal(res2.removed.filter((x) => x.blast).length, 4); // 6 neighbours minus 2 already in the path
  assert.equal(res2.score, chainScore(3, 1, 4, 0));
});

test("scoring: longer chains, colour bonus and combo all increase points", () => {
  assert.equal(chainScore(3, 1, 0, 0), 30);
  assert.equal(chainScore(5, 1, 0, 0), 70);
  assert.ok(chainScore(8, 1, 0, 0) > 2 * chainScore(4, 1, 0, 0));
  assert.equal(chainScore(3, 2, 0, 0), 60);
  assert.equal(chainScore(3, 1, 0, 2), 45);
  assert.equal(chainScore(3, 1, 2, 0), 60);
});

test("boards always have a move (generation + shuffle after a move)", () => {
  for (let seed = 1; seed < 60; seed++) {
    let b = createBoard(seed * 7919);
    assert.ok(hasMoves(b));
    for (let i = 0; i < 5; i++) {
      b = applyPath(b, findBestPath(b, 6, 2000), DEFAULT_RULES).board;
      assert.ok(hasMoves(b));
    }
  }
});

test("hive layout has 19 unique slots, centre first", () => {
  assert.equal(HIVE_SLOTS.length, 19);
  assert.deepEqual(HIVE_SLOTS[0], { q: 0, r: 0 });
  assert.equal(new Set(HIVE_SLOTS.map((s) => `${s.q},${s.r}`)).size, 19);
});
