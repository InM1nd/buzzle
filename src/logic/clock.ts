/**
 * v1.6.1 app clock: App re-renders once a second (honey counter, timers). While a full-screen animation runs (the intro
 * clip, the night-falls transition, Night Flight) that re-render competes with the animation frames, so the clock pauses;
 * production and timers are computed from timestamps (tick), so the first tick after the pause catches up exactly.
 * Web also pauses it for a puzzle round (`game`): there each tick re-rendered the whole puzzle screen mid-drag, and the
 * round itself needs no clock (finishRound ticks first).
 */
export interface ClockBusy { cine: boolean; flight: boolean; game?: boolean }
export const clockPaused = (b: ClockBusy): boolean => b.cine || b.flight || !!b.game;
