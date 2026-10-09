/**
 * Web / Telegram: load every art asset once at startup and keep the decoded images referenced.
 * react-native-web's <Image> starts a fresh load for its URL on every mount and renders nothing if that
 * load fails (no retry). With the images pinned here, later loads of the same URL are served from the
 * document's memory cache instead of the network; failed loads are retried with backoff and when the
 * connection comes back.
 */
import { Asset } from "expo-asset";
import { ART } from "../ui/art";
import { BEE_VIEWS, GARDEN_ART, SHARED_VIEWS } from "../ui/beeArt";

const pinned: HTMLImageElement[] = [];
const failed = new Set<string>();
let started = false;

/** asset references are `{ uri, width, height }` objects on web (registry ids on native / some bundlers) */
function collect(v: unknown, out: Set<string>) {
  if (typeof v === "number") {
    if (Number.isInteger(v) && v > 0) { try { const u = Asset.fromModule(v).uri; if (u) out.add(u); } catch { /* not an asset id */ } }
  } else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === "object") {
    const u = (v as { uri?: unknown }).uri;
    if (typeof u === "string") out.add(u);
    else Object.values(v).forEach((x) => collect(x, out));
  }
}
function load(uri: string, attempt = 0) {
  const img = new window.Image();
  img.decoding = "async";
  img.onload = () => { failed.delete(uri); pinned.push(img); };
  img.onerror = () => {
    failed.add(uri);
    if (attempt < 6) setTimeout(() => load(uri, attempt + 1), 1000 * Math.pow(1.8, attempt));
  };
  img.src = uri;
}
export function pinArt(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const found = new Set<string>();
  collect(ART, found); collect(BEE_VIEWS, found); collect(SHARED_VIEWS, found); collect(GARDEN_ART, found);
  const uris = Array.from(found).filter((u) => /\.(png|webp|jpe?g)(\?|$)/i.test(u) || u.startsWith("data:image"));
  uris.forEach((u) => load(u));
  window.addEventListener("online", () => Array.from(failed).forEach((u) => load(u, 3)));
}
