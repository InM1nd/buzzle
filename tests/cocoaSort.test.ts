import { test } from "node:test";
import assert from "node:assert/strict";
import { Board, CAP, Cup, complete, encodeLevel, isWon, level, levelAt, pour, solve } from "../src/logic/cocoaSort";
import FROZEN from "../src/logic/cocoaLevels.json";

const B = (cups: Cup[], o: Partial<Board> = {}): Board => ({ cups, hidden: cups.map(() => 0), ice: cups.map(() => 0), orders: [], ...o });

test("cocoa sort: pour rules", () => {
  const b = B([[0, 1, 1], [1], [], [2, 2, 2, 2]]);
  assert.deepEqual(pour(b, 0, 1)?.board.cups[1], [1, 1, 1]); // whole top block moves
  assert.equal(pour(b, 0, 1)?.count, 2);
  assert.equal(pour(b, 3, 2), null); // a finished mug stays put
  assert.equal(pour(B([[0], [1]]), 0, 1), null); // different top colour
  assert.equal(pour(B([[0, 0, 0], [0, 0]]), 0, 1)?.count, 2); // only what fits
});

test("cocoa sort: foam pops when its layer reaches the top", () => {
  const b = B([[0, 1, 2], []], { hidden: [2, 0] });
  const m = pour(b, 0, 1)!;
  assert.equal(m.board.hidden[0], 1); // [0,1]: the 1 is now on top and visible
});

test("cocoa sort: ice blocks a mug and melts with pours", () => {
  const b = B([[0, 1], [1], [], [0]], { ice: [0, 0, 0, 2] });
  assert.equal(pour(b, 0, 3), null);
  const m1 = pour(b, 0, 1)!;
  assert.equal(m1.board.ice[3], 1);
  const m2 = pour(m1.board, 1, 2)!;
  assert.equal(m2.board.ice[3], 0);
  assert.ok(pour(m2.board, 0, 3));
});

test("cocoa sort: an ordered drink is served and its mug empties", () => {
  const m = pour(B([[1, 0], [0, 0, 0], []], { orders: [0, 1] }), 0, 1)!;
  assert.ok(m.served);
  assert.deepEqual(m.board.cups[1], []);
  assert.deepEqual(m.board.orders, [1]);
  assert.ok(!pour(B([[1, 0], [0, 0, 0]], { orders: [1] }), 0, 1)!.served); // not the current order
});

test("cocoa sort: a drink finished before its turn is served when its order comes up", () => {
  // berry (1) is finished first while cocoa (0) is ordered; finishing cocoa serves cocoa, then berry right away
  const m = pour(B([[1, 1, 1, 1], [2, 0], [0, 0, 0], [2, 2, 2]], { orders: [0, 1] }), 1, 2)!;
  assert.deepEqual(m.board.orders, []);
  assert.deepEqual(m.board.cups[0], []);
  assert.deepEqual(m.board.cups[2], []);
});

test("cocoa sort: a served mug loses its foam", () => {
  const m = pour(B([[1, 0], [0, 0, 0]], { hidden: [0, 2], orders: [0] }), 0, 1)!;
  assert.equal(m.board.hidden[1], 0);
});

test("cocoa sort: solver matches the prototype's reference solutions (14 and 17 pours)", () => {
  assert.equal(solve(B([[0, 1, 0, 1], [1, 0, 1, 0], [2, 4, 2, 4], [4, 2, 4, 2], [], []]))?.length, 14);
  assert.ok(solve(B([[0, 1, 0, 1], [1, 0, 1, 0], [2, 3, 2, 3], [3, 4, 3, 4], [4, 2, 4, 2], [], [], []]))!.length <= 17);
});

test("cocoa sort: first 40 levels are deterministic, fair at the start and solvable by replay", () => {
  for (let n = 0; n < 40; n++) {
    const lv = level(n);
    assert.deepEqual(level(n), lv, `level ${n} not deterministic`);
    assert.equal(lv.cups.flat().length, lv.colors * CAP);
    assert.ok(!lv.cups.some(complete), `level ${n} starts with a finished mug`);
    assert.equal(new Set(lv.orders).size, lv.orders.length, `level ${n} repeats an order`);
    let b: Board = { ...lv, orders: [] };
    const sol = solve(lv)!;
    assert.equal(sol.length, lv.par);
    for (const m of sol) b = pour(b, m.from, m.to)!.board;
    assert.ok(isWon(b), `level ${n} replay does not win`);
  }
});

test("cocoa sort: every shipped level decodes, is fair at the start and wins by replay of a par-long solution", () => {
  assert.equal(encodeLevel(levelAt(7)), FROZEN[7]);
  for (let n = 0; n < FROZEN.length; n++) {
    const lv = levelAt(n);
    assert.ok(!lv.cups.some(complete), `level ${n} starts with a finished mug`);
    assert.equal(new Set(lv.orders).size, lv.orders.length, `level ${n} repeats an order`);
    const sol = solve(lv);
    assert.ok(sol && sol.length === lv.par, `level ${n}: par ${lv.par}, solver ${sol?.length}`);
    let b: Board = { ...lv, orders: [] };
    for (const m of sol) b = pour(b, m.from, m.to)!.board;
    assert.ok(isWon(b), `level ${n} replay does not win`);
  }
  assert.deepEqual(levelAt(FROZEN.length).cups, levelAt(FROZEN.length - 100).cups); // the tail repeats
});
