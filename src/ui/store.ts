import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState, migrate, newState, STATE_VERSION, STORAGE_KEY } from "../logic/game";

export interface Loaded { state: GameState; writable: boolean; fresh: boolean }

export async function loadState(now = Date.now()): Promise<Loaded> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    try {
      raw = await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      return { state: newState(now), writable: false, fresh: true }; // never overwrite unreadable storage
    }
  }
  if (!raw) return { state: newState(now), writable: true, fresh: true };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STATE_VERSION) await AsyncStorage.setItem(`bzz:backup:v${parsed?.version ?? "x"}`, raw).catch(() => {});
    return { state: migrate(parsed, now), writable: true, fresh: false };
  } catch {
    await AsyncStorage.setItem("bzz:backup:corrupt", raw).catch(() => {});
    return { state: newState(now), writable: true, fresh: true };
  }
}

let pending: Promise<void> = Promise.resolve();
export function saveState(s: GameState): Promise<void> {
  pending = pending.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s))).catch(() => {});
  return pending;
}
