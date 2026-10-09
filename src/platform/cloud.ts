/** Telegram CloudStorage as a promise KV (null outside Telegram / on old clients). */
import { cloudStorage } from "./telegram";
import { KV } from "./cloudSave";

const TIMEOUT = 6000;
function call<T>(f: (cb: (err: unknown, v?: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("cloud timeout")), TIMEOUT);
    try {
      f((err, v) => { clearTimeout(t); if (err) reject(err); else resolve(v as T); });
    } catch (e) { clearTimeout(t); reject(e); }
  });
}
export function telegramKV(): KV | null {
  const cs = cloudStorage();
  if (!cs) return null;
  return {
    get: (keys) => call<Record<string, string>>((cb) => cs.getItems(keys, cb)).then((r) => r ?? {}),
    set: (k, v) => call<boolean>((cb) => cs.setItem(k, v, cb)).then(() => {}),
    remove: (keys) => (keys.length ? call<boolean>((cb) => cs.removeItems(keys, cb)).then(() => {}) : Promise.resolve()),
  };
}
