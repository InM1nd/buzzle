import { test } from "node:test";
import assert from "node:assert/strict";
import { webFlags } from "../src/logic/devFlags";

test("?dev=1 / ?event=1 work only on localhost or in the dev build", () => {
  assert.deepEqual(webFlags("?dev=1&event=1", "inm1nd.github.io", false), { event: false, dev: false });
  assert.deepEqual(webFlags("?dev=1&event=1", "localhost", false), { event: true, dev: true });
  assert.deepEqual(webFlags("?event=1", "127.0.0.1", false), { event: true, dev: false });
  assert.deepEqual(webFlags("", "", true), { event: false, dev: true });
  assert.deepEqual(webFlags("?event=1", "", true), { event: true, dev: true });
  assert.deepEqual(webFlags("?event=10", "localhost", false), { event: false, dev: false });
});
