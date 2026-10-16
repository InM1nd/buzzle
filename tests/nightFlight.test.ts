/** v1.6 «Ночной полёт»: determinism, passability (a simple controller clears the course), rewards. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { finishFlight, flightRunsToday, migrate, newState } from "../src/logic/game";
import { batY, FH, flightNectar, flightPoints, GROUND, newWorld, step, World } from "../src/logic/nightFlight";

/** flap when below the target height and falling: aims at the next gap, dodges a bat ahead */
function basic(w: World): boolean {
  const bx = w.dist + w.beeX;
  const next = w.stems.find((s) => s.x + 40 > bx);
  let target = next ? next.gapY + next.gap * 0.12 : FH * 0.45;
  const bat = w.bats.find((b) => b.x + 40 > bx && b.x - bx < 260);
  if (bat && (!next || bat.x < next.x)) {
    const at = batY(bat, w.t + (bat.x - bx) / 300);
    target = at > bat.y0 ? bat.y0 - 140 : bat.y0 + 170;
  }
  return w.y > target && w.vy > -50;
}
/** the basic pilot with a short look-ahead: if its choice crashes within ~0.9 s and the other one does not, switch */
function pilot(w: World): boolean {
  const want = basic(w);
  const survives = (first: boolean) => {
    let v = step(w, 1 / 60, first);
    for (let i = 0; i < 54 && !v.over; i++) v = step(v, 1 / 60, basic(v));
    return !v.over;
  };
  return survives(want) ? want : !want;
}
function fly(seed: number, maxT = 120, ctl = pilot) {
  let w = newWorld(seed, 560);
  for (let i = 0; i < maxT * 60 && !w.over; i++) w = step(w, 1 / 60, ctl(w));
  return w;
}

test("same seed and taps give the same run", () => {
  const a = fly(7, 30), b = fly(7, 30);
  assert.equal(a.passed, b.passed); assert.equal(a.candies, b.candies); assert.equal(a.y, b.y);
});

test("without taps the bee falls to the grass and the run ends", () => {
  const w = fly(3, 10, () => false);
  assert.ok(w.over); assert.equal(w.passed, 0); assert.ok(w.y >= GROUND - 40);
});

test("the course is passable: a simple pilot clears 30+ stems on most seeds", () => {
  const runs = Array.from({ length: 12 }, (_, i) => fly(100 + i).passed);
  const good = runs.filter((p) => p >= 30).length;
  assert.ok(good >= 9, `passed per run: ${runs.join(", ")}`);
});

test("a long frame is clamped: no tunnelling through a stem", () => {
  let w = newWorld(5, 560);
  w = step(w, 5, false);
  assert.ok(w.t <= 0.05 + 1e-9);
});

test("rewards: nectar and event points are capped per run", () => {
  assert.equal(flightNectar(0, 0), 0);
  assert.equal(flightNectar(10, 3), 8);
  assert.equal(flightNectar(200, 200), 15);
  assert.equal(flightPoints(5), 2);
  assert.equal(flightPoints(100), 8);
});

test("finishFlight: first 3 runs a day pay nectar, record kept, event points only during the event, saved", () => {
  const at = (d: number) => new Date(2026, 9, d, 12).getTime();
  let s = newState(at(20));
  const n0 = s.nectar;
  for (let i = 0; i < 4; i++) s = finishFlight(s, { passed: 10, candies: 6 }, at(20)).state;
  assert.equal(s.nectar - n0, 3 * 11);
  assert.equal(flightRunsToday(s, at(20)), 4);
  assert.equal(s.event.points, 0);
  const r = finishFlight(s, { passed: 12, candies: 9 }, at(25));
  assert.equal(r.reward.nectar, 15);
  assert.equal(r.reward.points, 4);
  assert.ok(r.reward.record);
  assert.equal(flightRunsToday(r.state, at(25)), 1);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(r.state)), at(25)).flight, r.state.flight);
});
