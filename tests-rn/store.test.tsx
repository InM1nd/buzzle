/** Web/Telegram save layer: localStorage cache + chunked Telegram CloudStorage (fake KV here). */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { waitFor } from "@testing-library/react-native";
import { _setKV, flushCloud, loadState, saveState } from "../src/ui/store";
import { KV, readCloud, writeCloud } from "../src/platform/cloudSave";
import { newState } from "../src/logic/game";

const KEY = "bzz:state:v1";
function fakeKV() {
  const m = new Map<string, string>();
  const kv: KV = {
    get: async (keys) => Object.fromEntries(keys.map((k) => [k, m.get(k) ?? ""])),
    set: async (k, v) => { if (v.length > 4096) throw new Error("too long"); m.set(k, v); },
    remove: async (keys) => { keys.forEach((k) => m.delete(k)); },
  };
  return { kv, m };
}
beforeEach(async () => { await AsyncStorage.clear(); _setKV(null); });
afterAll(() => _setKV(null));

test("existing local (browser) save is kept and uploaded to the cloud on first Telegram launch", async () => {
  const now = Date.now();
  const local = { ...newState(now), honey: 777 };
  await AsyncStorage.setItem(KEY, JSON.stringify(local));
  const { kv } = fakeKV();
  _setKV(kv);
  const l = await loadState(now);
  expect(l.state.honey).toBe(777);
  expect(l.source).toBe("local");
  await waitFor(async () => expect(JSON.parse((await readCloud(kv))!.json).honey).toBe(777));
});

test("a newer cloud save (another device) wins over the local cache", async () => {
  const now = Date.now();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...newState(now), honey: 5 }));
  await AsyncStorage.setItem("bzz:savedAt", String(now - 60_000));
  const { kv } = fakeKV();
  await writeCloud(kv, JSON.stringify({ ...newState(now), honey: 4242 }), now - 1000, null);
  _setKV(kv);
  const l = await loadState(now);
  expect(l.source).toBe("cloud");
  expect(l.state.honey).toBe(4242);
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!).honey).toBe(4242); // local cache refreshed
});

test("saves are debounced and flushed to the cloud", async () => {
  const now = Date.now();
  const { kv, m } = fakeKV();
  _setKV(kv);
  await loadState(now);
  for (let i = 1; i <= 5; i++) await saveState({ ...newState(now), honey: i }, now + i);
  expect(m.size).toBe(0); // nothing written yet (debounce)
  await flushCloud();
  const r = await readCloud(kv);
  expect(JSON.parse(r!.json).honey).toBe(5);
  expect(r!.at).toBe(now + 5);
});

test("unreadable cloud: play from the local save and never overwrite the cloud", async () => {
  const now = Date.now();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...newState(now), honey: 9 }));
  const sets: string[] = [];
  _setKV({ get: async () => { throw new Error("offline"); }, set: async (k) => { sets.push(k); }, remove: async () => {} });
  const l = await loadState(now);
  expect(l.state.honey).toBe(9);
  await saveState(l.state, now + 1);
  await flushCloud();
  expect(sets).toEqual([]);
});
