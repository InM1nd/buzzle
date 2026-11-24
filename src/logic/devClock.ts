/**
 * 1.7 dev build only: "time travel" to test the winter in November. Shifts the clock the whole app reads (Date.now and new Date())
 * to a preset day at the current time of day. The game day never goes back (anti-rollback), so returning to an earlier preset
 * keeps the latest day seen; reset the dev save to start over.
 */
export const DEV_DATES = ["now", "dec1", "dec12", "dec20", "dec25", "jan2"] as const;
export type DevDate = (typeof DEV_DATES)[number];
const TARGET: Record<Exclude<DevDate, "now">, [number, number]> = { dec1: [11, 1], dec12: [11, 12], dec20: [11, 20], dec25: [11, 25], jan2: [0, 2] };

const Real = Date;
let shift = 0;
let patched = false;

/** the shift (ms) that moves `realNow` to the preset day, same time of day; Jan 2 is of the next year */
export function devShift(preset: DevDate, realNow: number): number {
  if (preset === "now") return 0;
  const n = new Real(realNow), [m, d] = TARGET[preset];
  const t = new Real(n.getFullYear() + (m === 0 ? 1 : 0), m, d, n.getHours(), n.getMinutes(), n.getSeconds()).getTime();
  return t - realNow;
}

export function setDevDate(preset: DevDate) {
  shift = devShift(preset, Real.now());
  if (patched || !shift) return;
  patched = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Shifted: any = function (this: unknown, ...a: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return a.length ? new (Real as any)(...a) : new Real(Real.now() + shift);
  };
  Shifted.now = () => Real.now() + shift;
  Shifted.UTC = Real.UTC; Shifted.parse = Real.parse; Shifted.prototype = Real.prototype;
  (globalThis as { Date: DateConstructor }).Date = Shifted;
}
