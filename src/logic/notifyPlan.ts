import { GameState, cap, dailyStreak, rate, today } from "./game";
import { msUntilFull, capHours } from "./economy";
import { boostsFor } from "./bees";
import { nextGardenEvent } from "./garden";

export interface PlannedNotification { id: string; at: number; title: string; body: string }

/** Garden reminders never ring at night: 22:00–09:00 moves to 09:00. */
export function quiet(at: number): number {
  const d = new Date(at);
  const h = d.getHours();
  if (h >= 9 && h < 22) return at;
  const day = h >= 22 ? d.getDate() + 1 : d.getDate();
  return new Date(d.getFullYear(), d.getMonth(), day, 9, 0, 0).getTime();
}

/** Local notifications to schedule (recomputed whenever the app goes to background). */
export function planNotifications(s: GameState, now: number): PlannedNotification[] {
  if (!s.settings.notifications) return [];
  const out: PlannedNotification[] = [];
  const r = rate(s);
  const full = msUntilFull(s.hive, r, capHours(s.upgrades.storage, boostsFor(s.bees, s.beeLevels).capHours));
  if (full > 10 * 60_000) {
    out.push({ id: "hive-full", at: now + full, title: "Buzzle · улей полон 🍯", body: `Пчёлы собрали ${cap(s)} мёда — забери, пока они не заскучали!` });
  }
  // garden (opt-in: needs reminders on, and the garden switch in settings)
  if (s.settings.gardenReminders) {
    const ev = nextGardenEvent(s.garden);
    if (ev && ev.at > now + 10 * 60_000) {
      const at = quiet(ev.at);
      out.push(ev.kind === "bloom"
        ? { id: "garden", at, title: "Buzzle · цветы распустились 🌻", body: "Собери нектар в саду — пчёлы ждут новых уровней." }
        : { id: "garden", at, title: "Buzzle · сад хочет пить 💧", body: "Грядки высохли: полей цветы, чтобы они росли дальше." });
    }
  }
  const d = new Date(now);
  const day = today(s, now);
  const doneToday = !!s.daily.results[day]?.stars;
  const at = (dayOffset: number, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, 0, 0).getTime();
  const streak = dailyStreak(s, now);
  if (!doneToday && at(0, 19) > now + 60_000) {
    out.push({ id: "daily-today", at: at(0, 19), title: "Buzzle · головоломка дня ждёт 🐝", body: streak ? `Не прерывай серию: ${streak} дн. подряд!` : "Новые соты уже на месте." });
  }
  out.push({ id: "daily-next", at: at(1, 10), title: "Buzzle · новая головоломка дня 🌼", body: "Свежие соты, три звезды и маточное молочко." });
  return out;
}
