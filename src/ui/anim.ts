/**
 * Animation plumbing for v1.1 bee animations - RN Animated + native driver only.
 * - every loop is a single native `Animated.loop(timing 0→1, linear)`; shapes come from interpolation,
 *   so the JS thread is not involved per frame or per iteration;
 * - everything pauses while the app is in the background (and screens unmount when not shown);
 * - wing flapping uses 3 shared clocks (ref-counted), so 12 flapping bees cost 3 native animations.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing } from "react-native";

// ---------- app active state ----------
let active = AppState.currentState !== "background";
const subs = new Set<(a: boolean) => void>();
let appSub: { remove(): void } | null = null;
function ensureAppSub() {
  if (appSub) return;
  try {
    appSub = AppState.addEventListener("change", (st) => setActive(st !== "background"));
  } catch { /* test env */ }
}
function setActive(a: boolean) {
  if (a === active) return;
  active = a;
  subs.forEach((f) => f(a));
}
export function isAnimActive() { return active; }
/** test helper: simulate the app going to the background / foreground */
export function _setAnimActive(a: boolean) { setActive(a); }
/** true while the app is in the foreground. */
export function useAnimActive(): boolean {
  const [a, setA] = useState(active);
  useEffect(() => {
    ensureAppSub();
    subs.add(setA);
    setA(active);
    return () => { subs.delete(setA); };
  }, []);
  return a;
}

// ---------- looping 0→1 cycles that resume where they paused ----------
export function useCycle(v: Animated.Value, duration: number, on: boolean, start = 0) {
  const pos = useRef(start);
  useEffect(() => {
    if (!on || !(duration > 0)) return;
    let stopped = false;
    const p0 = Math.min(0.999, Math.max(0, pos.current));
    v.setValue(p0);
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const first = Animated.timing(v, { toValue: 1, duration: Math.max(16, (1 - p0) * duration), easing: Easing.linear, useNativeDriver: true });
    first.start(({ finished }) => {
      if (!finished || stopped) return;
      v.setValue(0);
      loop.start();
    });
    return () => {
      stopped = true;
      first.stop();
      loop.stop();
      v.stopAnimation((x) => { pos.current = typeof x === "number" && Number.isFinite(x) ? x : 0; });
    };
  }, [v, duration, on]);
}

/** inputRange/outputRange sampling sin over one cycle: value = amp * sin(2π(t + phase)) + offset */
export function sinRange(amp: number, phase = 0, n = 12, offset = 0) {
  const inputRange: number[] = [], outputRange: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    inputRange.push(t);
    outputRange.push(offset + amp * Math.sin(2 * Math.PI * (t + phase)));
  }
  return { inputRange, outputRange };
}
export function sinDeg(amp: number, phase = 0, n = 12, offset = 0) {
  const r = sinRange(amp, phase, n, offset);
  return { inputRange: r.inputRange, outputRange: r.outputRange.map((d) => `${d.toFixed(2)}deg`) };
}

// ---------- shared wing clocks ----------
interface Clock { ms: number; v: Animated.Value; refs: number; anim: Animated.CompositeAnimation | null }
const CLOCKS: Clock[] = [62, 71, 83].map((ms) => ({ ms, v: new Animated.Value(0), refs: 0, anim: null }));
function startClock(c: Clock) {
  c.anim = Animated.loop(Animated.timing(c.v, { toValue: 1, duration: c.ms, easing: Easing.linear, useNativeDriver: true }));
  c.anim.start();
}
function stopClock(c: Clock) { c.anim?.stop(); c.anim = null; }
/** A 0→1 sawtooth at ~12-16 Hz for wing flapping; shared between bees with the same seed % 3. */
export function useFlapClock(seed: number, on = true): Animated.Value {
  const c = CLOCKS[Math.abs(Math.floor(seed)) % CLOCKS.length];
  const act = useAnimActive();
  useEffect(() => {
    if (!on || !act) return;
    c.refs++;
    if (c.refs === 1) startClock(c);
    return () => {
      c.refs--;
      if (c.refs <= 0) { c.refs = 0; stopClock(c); }
    };
  }, [c, on, act]);
  return c.v;
}
/** test helper */
export function _clockRefs() { return CLOCKS.map((c) => c.refs); }
