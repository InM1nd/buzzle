/**
 * Save export / import (v1.3): the whole GameState as a shareable text code.
 *   BUZZLE1.<base64url(utf-8 JSON)>.<fnv1a-32 of the payload, hex>
 * Pure (own UTF-8 + base64, no TextEncoder/atob needed on older Hermes). Import goes through migrate(),
 * so a code from any older version loads, and a damaged or edited code is rejected by the checksum.
 */
import { GameState, migrate, STATE_VERSION } from "./game";
import { hashString } from "./rng";

export const CODE_PREFIX = "BUZZLE1";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function fromUtf8(b: number[]): string {
  let s = "";
  for (let i = 0; i < b.length;) {
    const x = b[i++];
    let c: number;
    if (x < 0x80) c = x;
    else if (x < 0xe0) c = ((x & 31) << 6) | (b[i++] & 63);
    else if (x < 0xf0) { c = ((x & 15) << 12) | ((b[i] & 63) << 6) | (b[i + 1] & 63); i += 2; }
    else { c = ((x & 7) << 18) | ((b[i] & 63) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63); i += 3; }
    s += String.fromCodePoint(c);
  }
  return s;
}
function b64(bytes: number[]): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) s += B64[n & 63];
  }
  return s;
}
function unb64(s: string): number[] | null {
  const out: number[] = [];
  let buf = 0, bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
  }
  return out;
}
const sum = (payload: string) => hashString(payload).toString(16).padStart(8, "0");

export function encodeSave(s: GameState): string {
  const payload = b64(utf8(JSON.stringify(s)));
  return `${CODE_PREFIX}.${payload}.${sum(payload)}`;
}

export type DecodeResult = { ok: true; state: GameState; version: number } | { ok: false; error: string };
/** Accepts the code with any whitespace / line breaks (messengers wrap long text). */
export function decodeSave(code: string, now: number): DecodeResult {
  const c = code.replace(/\s+/g, "");
  const m = /^BUZZLE1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/.exec(c);
  if (!m) return { ok: false, error: c.startsWith("BUZZLE") ? "Код обрезан или повреждён." : "Это не код сохранения Buzzle." };
  if (sum(m[1]) !== m[2]) return { ok: false, error: "Код повреждён: проверьте, что он скопирован целиком." };
  const bytes = unb64(m[1]);
  if (!bytes) return { ok: false, error: "Код повреждён." };
  let raw: unknown;
  try { raw = JSON.parse(fromUtf8(bytes)); } catch { return { ok: false, error: "Код повреждён." }; }
  if (!raw || typeof raw !== "object" || typeof (raw as { honey?: unknown }).honey !== "number") return { ok: false, error: "В коде нет сохранения." };
  const version = Number((raw as { version?: unknown }).version) || 1;
  if (version > STATE_VERSION) return { ok: false, error: "Сохранение из более новой версии Buzzle — обновите игру." };
  return { ok: true, state: migrate(raw, now), version };
}

/**
 * The imported save replaces the current one, but the game clock never goes back:
 * its newest seen time / day are kept, so importing an old save can't re-open daily or weekly rewards early.
 */
export function adoptImported(cur: GameState, imp: GameState): GameState {
  return { ...imp, clock: { maxSeen: Math.max(cur.clock.maxSeen, imp.clock.maxSeen), maxDay: Math.max(cur.clock.maxDay, imp.clock.maxDay) } };
}
