/**
 * Chunked save in a small key/value cloud (Telegram CloudStorage: ≤1024 keys, ≤4096 chars per value,
 * key ≤128 chars of [A-Za-z0-9_-]). Two alternating slots + a meta key, so a write interrupted halfway
 * never corrupts the previous save: chunks go to the free slot first, then the meta flips to it.
 */
export interface KV {
  get(keys: string[]): Promise<Record<string, string>>;
  set(key: string, value: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
}
export const CHUNK = 3800;          // chars per value (limit 4096)
export const MAX_CHUNKS = 200;      // ~760 KB; a real save is a few KB
export const META_KEY = "bzz_meta";
export interface Meta { v: 1; slot: "a" | "b"; n: number; len: number; at: number }
const key = (slot: string, i: number) => `bzz_${slot}_${i}`;

export function split(s: string, size = CHUNK): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : [""];
}
function parseMeta(raw: string | undefined): Meta | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw);
    if (m && m.v === 1 && (m.slot === "a" || m.slot === "b") && Number.isInteger(m.n) && m.n > 0 && m.n <= MAX_CHUNKS && Number.isFinite(m.at)) return m;
  } catch { /* ignore */ }
  return null;
}

/** Read the current save; null if there is none or it is incomplete. */
export async function readCloud(kv: KV): Promise<{ json: string; at: number; meta: Meta } | null> {
  const meta = parseMeta((await kv.get([META_KEY]))[META_KEY]);
  if (!meta) return null;
  const keys = Array.from({ length: meta.n }, (_, i) => key(meta.slot, i));
  const got = await kv.get(keys);
  const json = keys.map((k) => got[k] ?? "").join("");
  if (json.length !== meta.len) return null;
  return { json, at: meta.at, meta };
}

/** Write a save; `prev` is the meta currently in the cloud (from readCloud / the last write). */
export async function writeCloud(kv: KV, json: string, at: number, prev: Meta | null): Promise<Meta> {
  const parts = split(json);
  if (parts.length > MAX_CHUNKS) throw new Error("save too large");
  const slot: Meta["slot"] = prev?.slot === "a" ? "b" : "a";
  for (let i = 0; i < parts.length; i++) await kv.set(key(slot, i), parts[i]);
  const meta: Meta = { v: 1, slot, n: parts.length, len: json.length, at };
  await kv.set(META_KEY, JSON.stringify(meta));
  if (prev) {
    const old = Array.from({ length: prev.n }, (_, i) => key(prev.slot, i));
    await kv.remove(old).catch(() => {});
  }
  return meta;
}
