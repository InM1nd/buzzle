/**
 * v1.6.1 app clock: App re-renders once a second (honey counter, timers). While a full-screen animation runs (the intro
 * clip, the night-falls transition, Night Flight) that re-render competes with the animation frames, so the clock pauses;
 * production and timers are computed from timestamps (tick), so the first tick after the pause catches up exactly.
 */
export interface ClockBusy { cine: boolean; flight: boolean }
export const clockPaused = (b: ClockBusy): boolean => b.cine || b.flight;
