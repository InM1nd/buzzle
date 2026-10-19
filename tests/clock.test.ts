import { test } from "node:test";
import assert from "node:assert/strict";
import { clockPaused } from "../src/logic/clock";
import { newState, tick } from "../src/logic/game";

test("app clock pauses only during full-screen animations", () => {
  assert.equal(clockPaused({ cine: false, flight: false }), false);
  assert.equal(clockPaused({ cine: true, flight: false }), true);
  assert.equal(clockPaused({ cine: false, flight: true }), true);
});

test("a paused clock loses no production: one late tick equals many small ones", () => {
  const T = new Date(2026, 9, 20, 12).getTime();
  const s0 = newState(T);
  let a = s0;
  for (let i = 1; i <= 30; i++) a = tick(a, T + i * 1000);
  const b = tick(s0, T + 30_000);
  assert.ok(Math.abs(a.hive.stored - b.hive.stored) < 1e-6, `${a.hive.stored} vs ${b.hive.stored}`);
});

import { canSkip, SKIP_GUARD_MS } from "../src/ui/introVideoShared";
test("intro clip ignores taps in its first 800 ms", () => {
  assert.equal(SKIP_GUARD_MS, 800);
  assert.equal(canSkip(1000, 1500), false);
  assert.equal(canSkip(1000, 1800), true);
});
