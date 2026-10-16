import { test } from "node:test";
import assert from "node:assert/strict";
import { changeGate } from "../src/logic/changeGate";

test("changeGate sends only changed values and tracks the last one", () => {
  const sent: number[] = [];
  const g = changeGate(5, (n) => sent.push(n));
  assert.equal(g(5), false);        // equals the initial value: nothing sent
  assert.equal(g(7), true);
  assert.equal(g(7), false);
  assert.equal(g(7), false);
  assert.equal(g(0), true);
  assert.equal(g(7), true);         // changing back is a change again
  assert.deepEqual(sent, [7, 0, 7]);
  assert.equal(g.last(), 7);
});
