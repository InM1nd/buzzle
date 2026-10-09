/** Telegram CloudStorage save: chunking within the limits, slot flip, interrupted writes, limits. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHUNK, KV, META_KEY, readCloud, split, writeCloud } from "../src/platform/cloudSave";
import { newState } from "../src/logic/game";

/** In-memory CloudStorage with Telegram's limits enforced. */
function fakeKV(opts: { failAfter?: number } = {}) {
  const m = new Map<string, string>();
  let writes = 0;
  const kv: KV = {
    async get(keys) { const r: Record<string, string> = {}; for (const k of keys) r[k] = m.get(k) ?? ""; return r; },
    async set(k, v) {
      if (opts.failAfter !== undefined && writes >= opts.failAfter) throw new Error("network");
      writes++;
      assert.match(k, /^[A-Za-z0-9_-]{1,128}$/);
      assert.ok(v.length <= 4096, `value too long: ${v.length}`);
      m.set(k, v);
      assert.ok(m.size <= 1024, "too many keys");
    },
    async remove(keys) { keys.forEach((k) => m.delete(k)); },
  };
  return { kv, m };
}
const bigState = () => {
  const s = newState(1_700_000_000_000);
  // a long-played save: lots of daily results
  const results: Record<number, { stars: number; score: number }> = {};
  for (let d = 0; d < 400; d++) results[20000 + d] = { stars: d % 4, score: 1000 + d * 7 };
  return JSON.stringify({ ...s, daily: { ...s.daily, results } });
};

test("split keeps every chunk under the Telegram value limit", () => {
  const s = "x".repeat(CHUNK * 2 + 5);
  const p = split(s);
  assert.equal(p.length, 3);
  assert.equal(p.join(""), s);
  assert.ok(p.every((c) => c.length <= 4096));
  assert.deepEqual(split(""), [""]);
});

test("write → read round trip with a multi-chunk save", async () => {
  const { kv, m } = fakeKV();
  const json = bigState();
  assert.ok(json.length > CHUNK, "test save should need several chunks");
  const meta = await writeCloud(kv, json, 123, null);
  assert.equal(meta.slot, "a");
  assert.equal(meta.n, Math.ceil(json.length / CHUNK));
  const r = await readCloud(kv);
  assert.equal(r?.json, json);
  assert.equal(r?.at, 123);
  assert.equal(m.size, meta.n + 1);
});

test("slots alternate and stale chunks are removed", async () => {
  const { kv, m } = fakeKV();
  let meta = await writeCloud(kv, bigState(), 1, null);
  meta = await writeCloud(kv, "{\"small\":1}", 2, meta);
  assert.equal(meta.slot, "b");
  assert.equal(m.size, 2); // one chunk + meta
  assert.equal((await readCloud(kv))?.json, "{\"small\":1}");
  meta = await writeCloud(kv, "{\"v\":3}", 3, meta);
  assert.equal(meta.slot, "a");
  assert.equal((await readCloud(kv))?.at, 3);
});

test("an interrupted write keeps the previous save readable", async () => {
  const f = fakeKV();
  const first = await writeCloud(f.kv, "{\"first\":true}", 1, null);
  const broken: KV = { ...f.kv, set: async (k, v) => { if (k === META_KEY || k.endsWith("_1")) throw new Error("network"); return f.kv.set(k, v); } };
  await assert.rejects(writeCloud(broken, bigState(), 2, first));
  const r = await readCloud(f.kv);
  assert.equal(r?.json, "{\"first\":true}");
});

test("missing or damaged cloud data reads as no save", async () => {
  const { kv, m } = fakeKV();
  assert.equal(await readCloud(kv), null);
  m.set(META_KEY, "not json");
  assert.equal(await readCloud(kv), null);
  m.set(META_KEY, JSON.stringify({ v: 1, slot: "a", n: 2, len: 10, at: 5 }));
  m.set("bzz_a_0", "12345");
  assert.equal(await readCloud(kv), null); // chunk 1 missing -> length mismatch
});
