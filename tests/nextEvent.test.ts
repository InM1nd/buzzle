import { test } from "node:test";
import assert from "node:assert/strict";
import { halloween, nextEventStart } from "../src/logic/event";
import { dayNumber } from "../src/logic/day";

const d = (y: number, m: number, dd: number) => dayNumber(new Date(y, m - 1, dd));
test("locked Night Flight names the next Halloween start", () => {
  assert.equal(nextEventStart(d(2026, 10, 19)), halloween(2026).start);
  assert.equal(nextEventStart(d(2026, 10, 25)), halloween(2026).start); // running: its own start
  assert.equal(nextEventStart(d(2026, 11, 9)), halloween(2026).start);
  assert.equal(nextEventStart(d(2026, 11, 10)), halloween(2027).start);
  assert.equal(nextEventStart(d(2027, 1, 5)), halloween(2027).start);
  assert.equal(halloween(2027).start, d(2027, 10, 20));
});
