import { GameState, cap, dailyStreak, rate, today } from "./game";
import { msUntilFull, capHours } from "./economy";
import { boostsFor } from "./bees";

export interface PlannedNotification { id: string; at: number; title: string; body: string }

/** Local notifications to schedule (recomputed whenever the app goes to background). */
export function planNotifications(s: GameState, now: number): PlannedNotification[] {
  if (!s.settings.notifications) return [];
  const out: PlannedNotification[] = [];
  const r = rate(s);
  const full = msUntilFull(s.hive, r, capHours(s.upgrades.storage, boostsFor(s.bees).capHours));
  if (full > 10 * 60_000) {
    out.push({ id: "hive-full", at: now + full, title: "Улей полон 🍯", body: `Пчёлы собрали ${cap(s)} мёда — забери, пока они не заскучали!` });
  }
  const d = new Date(now);
  const day = today(s, now);
  const doneToday = !!s.daily.results[day]?.stars;
  const at = (dayOffset: number, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, 0, 0).getTime();
  const streak = dailyStreak(s, now);
  if (!doneToday && at(0, 19) > now + 60_000) {
    out.push({ id: "daily-today", at: at(0, 19), title: "Ежедневная головоломка ждёт 🐝", body: streak ? `Не прерывай серию: ${streak} дн. подряд!` : "Новые соты уже на месте." });
  }
  out.push({ id: "daily-next", at: at(1, 10), title: "Новая ежедневная головоломка 🌼", body: "Свежие соты, три звезды и маточное молочко." });
  return out;
}
