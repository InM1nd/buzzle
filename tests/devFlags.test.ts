import { test } from "node:test";
import assert from "node:assert/strict";
import { webFlags } from "../src/logic/devFlags";

test("?dev=1 / ?event=1 work only on localhost or in the dev build", () => {
  assert.deepEqual(webFlags("?dev=1&event=1", "inm1nd.github.io", false), { event: false, winter: false, dev: false });
  assert.deepEqual(webFlags("?dev=1&event=1", "localhost", false), { event: true, winter: false, dev: true });
  assert.deepEqual(webFlags("?event=1", "127.0.0.1", false), { event: true, winter: false, dev: false });
  assert.deepEqual(webFlags("", "", true), { event: false, winter: false, dev: true });
  assert.deepEqual(webFlags("?event=1", "", true), { event: true, winter: false, dev: true });
  assert.deepEqual(webFlags("?event=10", "localhost", false), { event: false, winter: false, dev: false });
});

test("?winter=1 forces winter only on localhost or in the dev build", () => {
  assert.equal(webFlags("?winter=1", "localhost", false).winter, true);
  assert.equal(webFlags("?winter=1", "inm1nd.github.io", false).winter, false);
});
