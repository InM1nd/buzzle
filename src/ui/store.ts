import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { GameState, migrate, newState, STATE_VERSION, STORAGE_KEY } from "../logic/game";
import { KV, Meta, readCloud, writeCloud } from "../platform/cloudSave";
import { telegramKV } from "../platform/cloud";

export interface Loaded { state: GameState; writable: boolean; fresh: boolean; source?: "local" | "cloud" }

/** local save timestamp (web/Telegram: decides between the local cache and the cloud save) */
const SAVED_AT = "bzz:savedAt";
const CLOUD_DEBOUNCE = 4000;

// ----- Telegram CloudStorage (web inside Telegram only; null on Android and in a normal browser) -----
let kv: KV | null = null;
let cloudMeta: Meta | null = null;
let cloudOk = false;            // false if the cloud could not be read: never overwrite what we couldn't see
let cloudTimer: ReturnType<typeof setTimeout> | null = null;
let cloudPending: { json: string; at: number } | null = null;
let cloudChain: Promise<void> = Promise.resolve();
/** test hook */
export function _setKV(k: KV | null) { kv = k; cloudMeta = null; cloudOk = false; cloudPending = null; if (cloudTimer) clearTimeout(cloudTimer); cloudTimer = null; }

async function readLocal(): Promise<{ raw: string | null; at: number }> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    raw = await AsyncStorage.getItem(STORAGE_KEY); // one retry; a second failure propagates
  }
  const at = Number(await AsyncStorage.getItem(SAVED_AT).catch(() => null)) || 0;
  return { raw, at };
}

export async function loadState(now = Date.now()): Promise<Loaded> {
  if (kv === null) kv = telegramKV();
  let local: { raw: string | null; at: number };
  try {
    local = await readLocal();
  } catch {
    return { state: newState(now), writable: false, fresh: true }; // never overwrite unreadable storage
  }
  let raw = local.raw;
  let source: Loaded["source"] = "local";
  if (kv) {
    try {
      const c = await readCloud(kv);
      cloudOk = true;
      cloudMeta = c?.meta ?? null;
      if (c && (!raw || c.at > local.at)) {
        raw = c.json; source = "cloud";
        await AsyncStorage.setItem(STORAGE_KEY, c.json).catch(() => {});
        await AsyncStorage.setItem(SAVED_AT, String(c.at)).catch(() => {});
      } else if (raw && (!c || local.at > c.at)) {
        // first launch inside Telegram with an existing browser save (or a newer local one): upload it
        queueCloud(raw, local.at || now, 0);
      }
    } catch {
      cloudOk = false;
    }
  }
  if (!raw) return { state: newState(now), writable: true, fresh: true, source };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STATE_VERSION) await AsyncStorage.setItem(`bzz:backup:v${parsed?.version ?? "x"}`, raw).catch(() => {});
    return { state: migrate(parsed, now), writable: true, fresh: false, source };
  } catch {
    await AsyncStorage.setItem("bzz:backup:corrupt", raw).catch(() => {});
    return { state: newState(now), writable: true, fresh: true, source };
  }
}

function queueCloud(json: string, at: number, delay = CLOUD_DEBOUNCE) {
  if (!kv || !cloudOk) return;
  cloudPending = { json, at };
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => { cloudTimer = null; flushCloud(); }, delay);
}
/** Write the latest pending save to the cloud now (on hide / pagehide). */
export function flushCloud(): Promise<void> {
  if (cloudTimer) { clearTimeout(cloudTimer); cloudTimer = null; }
  const p = cloudPending;
  if (!kv || !cloudOk || !p) return cloudChain;
  cloudPending = null;
  const k = kv;
  cloudChain = cloudChain.then(async () => {
    try {
      cloudMeta = await writeCloud(k, p.json, p.at, cloudMeta);
    } catch {
      if (!cloudPending) cloudPending = p; // retry with the next save
    }
  });
  return cloudChain;
}

let pending: Promise<void> = Promise.resolve();
export function saveState(s: GameState, now = Date.now()): Promise<void> {
  const json = JSON.stringify(s);
  pending = pending.then(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, json);
    if (kv || Platform.OS === "web") await AsyncStorage.setItem(SAVED_AT, String(now));
  }).catch(() => {});
  queueCloud(json, now);
  return pending;
}
