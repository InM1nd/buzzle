import { test } from "node:test";
import assert from "node:assert/strict";
import { boardSize, cellCenter, COLS, fitStretch, hitTest, ROWS, tileSize } from "../src/logic/hex";

test("stretched puzzle hit testing matches every rendered cell at phone widths", () => {
  for (const width of [320, 360, 390, 430]) {
    const s = (width - 42) / (1.5 * COLS + 0.5);
    for (const available of [400, 540, 700]) {
      const k = fitStretch(s, available);
      assert.ok(k >= 1 && k <= 1.06);
      const size = boardSize(s, COLS, ROWS, k);
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const p = cellCenter(c, r, s, k);
        assert.ok(p.x > 0 && p.x < size.width && p.y > 0 && p.y < size.height);
        assert.deepEqual(hitTest(p.x, p.y, s, 0.82, k), { c, r });
      }
    }
  }
});

test("tile geometry leaves a gap at either vertical stretch bound", () => {
  for (const k of [1, 1.06]) {
    const s = 30, { w, h } = tileSize(s, k);
    assert.ok(w > 0 && w < 2 * s);
    const a = cellCenter(0, 0, s, k), b = cellCenter(0, 1, s, k);
    assert.ok(h > 0 && h < b.y - a.y);
    assert.equal(hitTest(-100, -100, s, 0.82, k), null);
  }
});
