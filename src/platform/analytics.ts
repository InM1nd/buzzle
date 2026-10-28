/**
 * PostHog (EU) client for retention analytics: plain fetch to /batch, no SDK, no autocapture, no replay.
 * Events are queued in storage and sent in batches; a failed or missing network never blocks or crashes
 * the game (events just wait for the next try). Without a build-time key (EXPO_PUBLIC_POSTHOG_KEY)
 * or with the player's opt-out everything here is a no-op.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { APP_VERSION, APP_VERSION_CODE, DEV_BUILD } from "../version";
import { inTelegram } from "./telegram";
import type { AnEvent } from "../logic/analytics";

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || "";
const HOST = "https://eu.i.posthog.com";
const QKEY = "bzz:aq";
const MAX_QUEUE = 300, BATCH = 50, TIMEOUT = 10000;

type Queued = { event: string; properties: Record<string, unknown>; timestamp: string; uuid: string };
let id: string | null = null, on = false, queue: Queued[] = [], loaded = false, sending = false, timer: ReturnType<typeof setInterval> | null = null;
let lastSend: { status: number } | null = null;

export const analyticsConfigured = () => !!KEY;
export const platformName = (): "android" | "telegram" | "web" => (Platform.OS === "web" ? (inTelegram() ? "telegram" : "web") : "android");
/** test/debug hook: status of the last /batch request */
export const lastAnalyticsSend = () => lastSend;

const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); });
const persist = () => { AsyncStorage.setItem(QKEY, JSON.stringify(queue)).catch(() => {}); };

/** start (or update) analytics for this install; enabled=false drops anything still queued */
export async function initAnalytics(installId: string, enabled: boolean) {
  try {
    id = installId; on = enabled && !!KEY;
    if (!on) { queue = []; persist(); if (timer) clearInterval(timer); timer = null; return; }
    if (!loaded) {
      loaded = true;
      const raw = await AsyncStorage.getItem(QKEY).catch(() => null);
      const old = raw ? JSON.parse(raw) : [];
      if (Array.isArray(old)) queue = [...old.filter((e) => e && typeof e.event === "string"), ...queue].slice(-MAX_QUEUE);
    }
    if (!timer) timer = setInterval(() => { flushAnalytics(); }, 30000);
    flushAnalytics();
  } catch { /* never break the game */ }
}

export function track(events: AnEvent | AnEvent[]) {
  try {
    if (!on || !id) return;
    const list = Array.isArray(events) ? events : [events];
    if (!list.length) return;
    const now = new Date().toISOString();
    for (const e of list) queue.push({
      event: e.event, timestamp: now, uuid: uuid(),
      properties: { distinct_id: id, platform: platformName(), app_version: APP_VERSION, app_build: APP_VERSION_CODE, ...(DEV_BUILD ? { dev: true } : {}), $lib: "buzzle", $geoip_disable: true, ...e.props },
    });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    persist();
  } catch { /* never break the game */ }
}

/** send what's queued (in batches); keeps events on any failure */
export async function flushAnalytics(): Promise<void> {
  if (!on || sending || !queue.length || typeof fetch !== "function") return;
  sending = true;
  try {
    while (on && queue.length) {
      const batch = queue.slice(0, BATCH);
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const to = setTimeout(() => ctl?.abort(), TIMEOUT);
      let res: Response;
      try { res = await fetch(`${HOST}/batch/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: KEY, batch }), signal: ctl?.signal }); }
      finally { clearTimeout(to); }
      lastSend = { status: res.status };
      if (res.status >= 200 && res.status < 300) { const sent = new Set(batch.map((e) => e.uuid)); queue = queue.filter((e) => !sent.has(e.uuid)); persist(); }
      else if (res.status >= 400 && res.status < 500 && res.status !== 429) { queue = queue.slice(batch.length); persist(); } // malformed: don't retry forever
      else break;
    }
  } catch { /* offline: try again later */ }
  finally { sending = false; }
}
