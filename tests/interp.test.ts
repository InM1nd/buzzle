import { test } from "node:test";
import assert from "node:assert/strict";
import { interp } from "../src/ui/interp";

// the web puzzle effects map their Animated value through interp() instead of Animated.interpolate: same numbers
test("interp: piecewise linear like Animated.interpolate", () => {
  assert.equal(interp(0, [0, 0.15, 1], [1, 1, 0]), 1);
  assert.equal(interp(0.575, [0, 0.15, 1], [1, 1, 0]), 0.5);
  assert.equal(interp(1, [0, 0.15, 1], [1, 1, 0]), 0);
  assert.ok(Math.abs(interp(0.125, [0, 0.25, 1], [1, 1.25, 0.2]) - 1.125) < 1e-9);
  assert.equal(interp(0.5, [0, 1], [0, -50]), -25);
});

test("interp: extend vs clamp outside the input range", () => {
  assert.equal(interp(2, [0, 1], [0, 10]), 20);
  assert.equal(interp(-1, [0, 1], [0, 10]), -10);
  assert.equal(interp(2, [0, 1], [0, 10], true), 10);
  assert.equal(interp(0.02, [0.05, 1.05], [5, 15], true), 5);
});

test("interp: steep steps (spark trail opacity)", () => {
  const inR = [0, 0.1, 0.12, 0.92, 1], outR = [0, 0, 0.9, 0.5, 0];
  assert.equal(interp(0.05, inR, outR, true), 0);
  assert.ok(Math.abs(interp(0.11, inR, outR, true) - 0.45) < 1e-9);
  assert.equal(interp(1, inR, outR, true), 0);
});
