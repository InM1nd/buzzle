/**
 * Retention analytics (issue #3): pure helpers. Events are derived from save changes, so the game logic
 * stays untouched and the same rules hold on Android, Telegram and the web.
 * Nothing personal is sent: a random install id, the event name and a few game numbers.
 */
import type { GameState } from "./game";

export type AnEvent = { event: string; props?: Record<string, number | string | boolean> };

export const EVENTS = ["first_open", "session_start", "daily_complete", "streak_day", "streak_break", "streak_freeze_used", "free_play_round", "event_points"] as const;

/** random anonymous id (not derived from anything on the device) */
export function newAnalyticsId(rand: () => number = Math.random): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[Math.floor(rand() * 4)]}${hex(3)}-${hex(12)}`;
}
export const isAnalyticsId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);

/** events implied by one save change (a round, a trick-or-treat, a flight, …) */
export function diffEvents(a: GameState, b: GameState): AnEvent[] {
  const out: AnEvent[] = [];
  const day = b.daily.lastDay;
  if (day !== null) {
    const before = a.daily.results[day]?.stars ?? 0, after = b.daily.results[day]?.stars ?? 0;
    if (after > before) out.push({ event: "daily_complete", props: { stars: after, first_today: before === 0 } });
  }
  if (b.daily.lastDay !== a.daily.lastDay && b.daily.streak > 0) {
    if (b.daily.freeze < a.daily.freeze && b.daily.streak === a.daily.streak + 1) out.push({ event: "streak_freeze_used", props: { length: b.daily.streak } });
    if (b.daily.streak === 1 && a.daily.streak > 0 && a.daily.lastDay !== null) out.push({ event: "streak_break", props: { previous: a.daily.streak } });
    out.push({ event: "streak_day", props: { length: b.daily.streak, best: b.daily.best } });
  }
  if (b.event.id === a.event.id && b.event.points > a.event.points)
    out.push({ event: "event_points", props: { event_id: b.event.id, points: b.event.points - a.event.points, total: b.event.points } });
  return out;
}
