import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFlight, arcPath } from "../src/logic/flight";

const W = 380, H = 330;

test("flight path: closed loop, strictly increasing normalised time, sane duration", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const f = buildFlight({ w: W, h: H, seed, margin: 20 });
    assert.equal(f.t[0], 0);
    assert.ok(Math.abs(f.t[f.t.length - 1] - 1) < 1e-9);
    for (let i = 1; i < f.t.length; i++) assert.ok(f.t[i] > f.t[i - 1], `t not increasing at ${i} (seed ${seed})`);
    const n = f.t.length;
    for (const k of ["x", "y", "rot", "flip", "rest"] as const) assert.equal(f[k].length, n);
    // closed: last keyframe equals the first, so the native loop does not jump
    assert.equal(f.x[n - 1], f.x[0]); assert.equal(f.y[n - 1], f.y[0]); assert.equal(f.flip[n - 1], f.flip[0]);
    assert.ok(f.duration > 3000 && f.duration < 30000, `duration ${f.duration}`);
  }
});

test("flight path: stays inside the area, bank angle and facing bounded", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const f = buildFlight({ w: W, h: H, seed, margin: 20, land: seed % 2 ? { x: 150, y: 140 } : null });
    for (let i = 0; i < f.t.length; i++) {
      assert.ok(f.x[i] >= 0 && f.x[i] <= W && f.y[i] >= 0 && f.y[i] <= H, `out of bounds (seed ${seed})`);
      assert.ok(Math.abs(f.rot[i]) <= 25);
      assert.ok(Math.abs(f.flip[i]) <= 1);
    }
  }
});

test("flight path: deterministic per seed, varied across seeds", () => {
  const a = buildFlight({ w: W, h: H, seed: 7 }), b = buildFlight({ w: W, h: H, seed: 7 }), c = buildFlight({ w: W, h: H, seed: 8 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.x, c.x);
  const durations = new Set(Array.from({ length: 12 }, (_, i) => buildFlight({ w: W, h: H, seed: i + 1 }).duration));
  assert.ok(durations.size >= 10, "bees should not be in sync");
});

test("flight path: landing holds still on the comb with a working wiggle, then takes off", () => {
  const land = { x: 190, y: 150 };
  const f = buildFlight({ w: W, h: H, seed: 11, land });
  assert.ok(f.landAt !== null);
  const resting = f.t.map((t, i) => ({ t, i })).filter(({ i }) => f.rest[i] === 1);
  assert.ok(resting.length >= 4);
  const span = (resting[resting.length - 1].t - resting[0].t) * f.duration;
  assert.ok(span > 1000 && span < 3600, `hold ${span}ms`);
  for (const { i } of resting) assert.ok(Math.hypot(f.x[i] - land.x, f.y[i] - land.y) < 4, "stays on the comb");
  assert.ok(resting.some(({ i }) => f.rot[i] !== 0), "wiggles while working");
  assert.ok(f.rest.some((r) => r === 0));
  // without landing: never rests
  assert.ok(buildFlight({ w: W, h: H, seed: 11 }).rest.every((r) => r === 0));
});

test("flight path: turns pass through a narrow facing (sprite flips smoothly)", () => {
  const f = buildFlight({ w: W, h: H, seed: 3 });
  const signs = f.flip.map(Math.sign);
  assert.ok(signs.includes(1) && signs.includes(-1), "a loop has both directions");
  for (let i = 1; i < f.flip.length; i++) assert.ok(Math.abs(f.flip[i] - f.flip[i - 1]) <= 0.5, "no instant flip");
});

test("arcPath: starts and ends at the given points", () => {
  const p = arcPath({ x: 0, y: 0 }, { x: 100, y: 50 }, 30);
  assert.deepEqual([p[0].x, p[0].y], [0, 0]);
  assert.ok(Math.abs(p[p.length - 1].x - 100) < 1e-9 && Math.abs(p[p.length - 1].y - 50) < 1e-9);
});
