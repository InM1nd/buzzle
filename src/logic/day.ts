import { hashString } from "./rng";

/** Local calendar day number (days since 1970-01-01 in local time). */
export function dayNumber(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

export function dayKey(day: number): string {
  const d = new Date(day * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Same seed for everyone on the same local date. */
export const dailySeed = (day: number) => hashString(`bzz-daily-${dayKey(day)}`);

export const DAILY_MOVES = 20;
/** Star thresholds for the daily puzzle (calibrated with a greedy bot, see tests/calibrate). */
export const DAILY_STARS: [number, number, number] = [1000, 1800, 2800];
export function starsFor(score: number, t = DAILY_STARS): 0 | 1 | 2 | 3 {
  return score >= t[2] ? 3 : score >= t[1] ? 2 : score >= t[0] ? 1 : 0;
}
