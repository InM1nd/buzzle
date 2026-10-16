import { GameState, cap, canClaimWeekly, dailyStreak, rate, today } from "./game";
import { weekdayOf } from "./day";
import { t } from "../i18n";
import { msUntilFull, capHours } from "./economy";
import { boostsFor } from "./bees";
import { nextGardenEvent } from "./garden";
import { eventProgress, halloween, TRACK } from "./event";

export interface PlannedNotification { id: string; at: number; title: string; body: string }

/** Quiet hours (default 22:00–09:00): a reminder that would ring inside them moves to the end. Handles windows across midnight. */
export function quiet(at: number, from = 22, to = 9): number {
  if (from === to) return at;
  const d = new Date(at);
  const h = d.getHours();
  const inside = from > to ? h >= from || h < to : h >= from && h < to;
  if (!inside) return at;
  const nextDay = from > to && h >= from;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (nextDay ? 1 : 0), to, 0, 0).getTime();
}

/** Local notifications to schedule (recomputed whenever the app goes to background), in the current language. */
export function planNotifications(s: GameState, now: number): PlannedNotification[] {
  const st = s.settings;
  if (!st.notifications) return [];
  const q = (at: number) => (st.quietOn ? quiet(at, st.quietFrom, st.quietTo) : at);
  const out: PlannedNotification[] = [];
  const r = rate(s);
  const full = msUntilFull(s.hive, r, capHours(s.upgrades.storage, boostsFor(s.bees, s.beeLevels).capHours));
  if (st.notifHive && full > 10 * 60_000) {
    out.push({ id: "hive-full", at: q(now + full), title: t("nt.hiveT"), body: t("nt.hiveB", { n: Math.floor(cap(s)) }) });
  }
  if (st.gardenReminders) {
    const ev = nextGardenEvent(s.garden);
    if (ev && ev.at > now + 10 * 60_000) {
      const at = q(ev.at);
      out.push(ev.kind === "bloom"
        ? { id: "garden", at, title: t("nt.bloomT"), body: t("nt.bloomB") }
        : { id: "garden", at, title: t("nt.dryT"), body: t("nt.dryB") });
    }
  }
  const d = new Date(now);
  const day = today(s, now);
  const doneToday = !!s.daily.results[day]?.stars;
  const at = (dayOffset: number, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, 0, 0).getTime();
  const streak = dailyStreak(s, now);
  if (st.notifDaily) {
    if (!doneToday && at(0, 19) > now + 60_000) {
      out.push({ id: "daily-today", at: q(at(0, 19)), title: t("nt.dailyT"), body: streak ? t("nt.dailyStreak", { n: streak }) : t("nt.dailyB") });
    }
    out.push({ id: "daily-next", at: q(at(1, 10)), title: t("nt.nextT"), body: t("nt.nextB") });
  }
  if (st.notifChests) {
    // a ready weekly chest: remind on Sunday evening (the chest resets on Monday)
    if (canClaimWeekly(s)) {
      const toSunday = (7 - weekdayOf(day) - 1 + 7) % 7;
      const sun = at(toSunday, 18);
      if (sun > now + 60 * 60_000) out.push({ id: "chest", at: q(sun), title: t("nt.chestT"), body: t("nt.chestB") });
    }
    // unopened combs: one gentle nudge the next evening
    const n = (s.loot.boxes.wood ?? 0) + (s.loot.boxes.wax ?? 0) + (s.loot.boxes.gold ?? 0);
    if (n > 0) out.push({ id: "combs", at: q(at(1, 18)), title: t("nt.combsT"), body: t("nt.combsB", { n }) });
  }
  // v1.6 Pumpkin Night: its start (10:00) and two days before the end (18:00), from the built-in calendar
  const ev = halloween(new Date(now).getFullYear());
  const local = (dayNum: number, h: number) => { const u = new Date(dayNum * 86400000); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), h, 0, 0).getTime(); };
  const start = local(ev.start, 10), ending = local(ev.end - 2, 18);
  if (start > now + 60_000) out.push({ id: "event-start", at: q(start), title: t("nt.evStartT"), body: t("nt.evStartB") });
  if (ending > now + 60_000 && eventProgress(s.event, ev).claimed < TRACK.length) out.push({ id: "event-end", at: q(ending), title: t("nt.evEndT"), body: t("nt.evEndB") });
  return out;
}
