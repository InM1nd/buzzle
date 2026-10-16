/**
 * v1.6 seasonal event «Тыквенная ночь» (Halloween): a calendar built into the app (offline, local dates) and a reward
 * track fed by event points. Points are track progress, not a currency: they are never spent.
 * Free play gets pumpkin tiles (1 point) and a ghost (3 points); the daily and weekend puzzles keep equal conditions
 * and pay points for new stars instead.
 */
import { BoxKind } from "./loot";

export interface EventDef { id: string; start: number; end: number }
/** trickDay: the game day the trick-or-treat guest was last treated */
export interface EventState { id: string; points: number; claimed: number; trickDay?: number }
export const newEventState = (): EventState => ({ id: "", points: 0, claimed: 0 });

/** rewards can still be claimed this many days after the last event day */
export const CLAIM_GRACE = 3;
export const PUMPKIN_CHANCE = 0.05;
export const POINTS = { pumpkin: 1, ghost: 3, star: 2, trick: 5 };

const utcDay = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
/** Halloween of the year that day falls in: three weeks, 19 October – 8 November (inclusive) */
export function halloween(year: number): EventDef {
  return { id: `halloween-${year}`, start: utcDay(year, 10, 19), end: utcDay(year, 11, 8) };
}
const yearOf = (day: number) => new Date(day * 86400000).getUTCFullYear();

/** web / screenshots only: `?event=1` turns the event on outside its dates (see App.tsx) */
let forced = false;
export const forceEvent = (on: boolean) => { forced = on; };

/** the event running on that game day (null outside the window) */
export function activeEvent(day: number): EventDef | null {
  const e = halloween(yearOf(day));
  if (day >= e.start && day <= e.end) return e;
  // own id: preview points never carry into the real event
  return forced ? { id: `${e.id}-preview`, start: day, end: day + 20 } : null;
}
/** the event whose track is still open: running, or ended at most CLAIM_GRACE days ago */
export function trackEvent(day: number): EventDef | null {
  const e = halloween(yearOf(day));
  if (day >= e.start && day <= e.end + CLAIM_GRACE) return e;
  return activeEvent(day);
}
/** the save's event progress for that event (a different/older event starts from zero) */
export const eventProgress = (s: EventState, e: EventDef): EventState => (s.id === e.id ? s : { id: e.id, points: 0, claimed: 0 });

export interface TrackReward { honey?: number; jelly?: number; box?: BoxKind; seeds?: { id: string; n: number }; skin?: string }
export interface TrackStep { at: number; reward: TrackReward }
/** cumulative points. Calibration: ~10 per free round, 6 per 3-star daily, 5 per guest → a casual player (~21 a day)
 * closes the track in about three weeks; daily puzzle + guest only reaches ~230 */
export const TRACK: TrackStep[] = [
  { at: 15, reward: { jelly: 2 } },
  { at: 38, reward: { box: "wood" } },
  { at: 68, reward: { seeds: { id: "pumpkin", n: 2 } } },
  { at: 105, reward: { skin: "witchhat" } },
  { at: 143, reward: { box: "wax" } },
  { at: 188, reward: { skin: "pumpkinwreath" } },
  { at: 233, reward: { skin: "pumpkinhat" } },
  { at: 278, reward: { box: "gold" } },
  { at: 323, reward: { seeds: { id: "pumpkin", n: 3 } } },
  { at: 368, reward: { skin: "batwings" } },
  { at: 413, reward: { jelly: 6 } },
  { at: 450, reward: { skin: "ghosthood", box: "royal" } },
];
/** steps reached but not claimed yet */
export const claimable = (s: EventState) => TRACK.filter((st, i) => i >= s.claimed && s.points >= st.at).length;
