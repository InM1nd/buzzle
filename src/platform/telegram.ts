/**
 * Telegram Mini App bridge (web only). `telegram-web-app.js` is loaded by the web index.html; outside
 * Telegram (normal browser, Android app, tests) every helper here is a safe no-op.
 */
import { Platform } from "react-native";

type Cb<T> = (err: unknown, v?: T) => void;
export interface TgCloudStorage {
  setItem(k: string, v: string, cb?: Cb<boolean>): void;
  getItem(k: string, cb: Cb<string>): void;
  getItems(k: string[], cb: Cb<Record<string, string>>): void;
  removeItems(k: string[], cb?: Cb<boolean>): void;
  getKeys(cb: Cb<string[]>): void;
}
type Inset = { top: number; bottom: number; left: number; right: number };
export interface TgWebApp {
  initData: string;
  platform: string;
  version: string;
  isVersionAtLeast(v: string): boolean;
  ready(): void;
  expand(): void;
  requestFullscreen?(): void;
  lockOrientation?(): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  setBottomBarColor?(c: string): void;
  isFullscreen?: boolean;
  safeAreaInset?: Inset;
  contentSafeAreaInset?: Inset;
  onEvent(e: string, f: () => void): void;
  offEvent(e: string, f: () => void): void;
  BackButton: { show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void };
  HapticFeedback?: {
    impactOccurred(s: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(t: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
  CloudStorage?: TgCloudStorage;
  /** opens a t.me link inside Telegram (e.g. the share sheet t.me/share/url) */
  openTelegramLink?(url: string): void;
  openLink?(url: string): void;
}

function find(): TgWebApp | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const w = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
  // the SDK also defines WebApp in a normal browser; inside Telegram there is initData or a real platform
  if (!w || (!w.initData && (!w.platform || w.platform === "unknown"))) return null;
  return w;
}
let cached: TgWebApp | null | undefined;
export const tg = (): TgWebApp | null => (cached === undefined ? (cached = find()) : cached);
export const inTelegram = () => !!tg();
const atLeast = (v: string) => { const w = tg(); try { return !!w && w.isVersionAtLeast(v); } catch { return false; } };
const safe = (f: () => void) => { try { f(); } catch { /* old client */ } };

/** Call once at startup (before the first render is fine). */
export function initTelegram(bg: string) {
  const w = tg();
  if (!w) return;
  safe(() => w.ready());
  safe(() => w.expand());
  if (atLeast("6.1")) { safe(() => w.setHeaderColor?.(bg)); safe(() => w.setBackgroundColor?.(bg)); }
  if (atLeast("7.10")) safe(() => w.setBottomBarColor?.(bg));
  // swipes in the puzzle must never minimise / close the mini app
  if (atLeast("7.7")) safe(() => w.disableVerticalSwipes?.());
  const mobile = w.platform === "android" || w.platform === "ios";
  if (mobile && atLeast("8.0")) {
    safe(() => w.requestFullscreen?.());
    safe(() => w.lockOrientation?.());
  }
}

/** Device safe area + Telegram's own header controls (fullscreen mode), in CSS px. */
export function telegramInsets(): Inset | null {
  const w = tg();
  if (!w) return null;
  const a = w.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const c = w.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
  return { top: (a.top || 0) + (c.top || 0), bottom: (a.bottom || 0) + (c.bottom || 0), left: (a.left || 0) + (c.left || 0), right: (a.right || 0) + (c.right || 0) };
}
export function onInsetsChange(f: () => void): () => void {
  const w = tg();
  if (!w) return () => {};
  const evs = ["safeAreaChanged", "contentSafeAreaChanged", "fullscreenChanged", "viewportChanged"];
  evs.forEach((e) => safe(() => w.onEvent(e, f)));
  return () => evs.forEach((e) => safe(() => w.offEvent(e, f)));
}

export function setBackButton(visible: boolean, onClick: () => void): () => void {
  const w = tg();
  if (!w || !atLeast("6.1")) return () => {};
  if (!visible) { safe(() => w.BackButton.hide()); return () => {}; }
  safe(() => w.BackButton.onClick(onClick));
  safe(() => w.BackButton.show());
  return () => { safe(() => w.BackButton.offClick(onClick)); };
}

export function cloudStorage(): TgCloudStorage | null {
  const w = tg();
  return w && atLeast("6.9") && w.CloudStorage ? w.CloudStorage : null;
}
export function haptic(): TgWebApp["HapticFeedback"] | null {
  const w = tg();
  return w && atLeast("6.1") && w.HapticFeedback ? w.HapticFeedback : null;
}
/** Visibility for flushing saves (Telegram pauses hidden webviews). */
export function onHide(f: () => void): () => void {
  if (Platform.OS !== "web" || typeof document === "undefined") return () => {};
  const h = () => { if (document.visibilityState === "hidden") f(); };
  document.addEventListener("visibilitychange", h);
  window.addEventListener("pagehide", f);
  return () => { document.removeEventListener("visibilitychange", h); window.removeEventListener("pagehide", f); };
}
/** Remove the HTML boot screen (web index.html) once the game state is loaded. */
export function hideBootScreen() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const el = document.getElementById("bzz-boot");
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 350);
}
export const IS_WEB = Platform.OS === "web";
/** Local reminders need the Android app; the web / Telegram build has no backend yet. */
export const NOTIFICATIONS_SUPPORTED = Platform.OS !== "web";
