/**
 * Web build: drive animated styles straight on the DOM node.
 * react-native-web has no native driver, and its JS driver re-renders the whole animated component on every animation
 * frame (useAnimatedProps → scheduleUpdate). With dozens of puzzle tiles that is a React render per tile per frame, and on
 * a 120 Hz iPhone twice as many frames as on a 60 Hz phone. Here the same Animated values (same springs / timings, so the
 * same motion) only write `style` on their element: no React work per frame. Native keeps Animated.View + the native driver.
 */
import { useLayoutEffect, useRef } from "react";
import { Animated, Platform } from "react-native";

export const WEB = Platform.OS === "web";

export { interp } from "./interp";

type Css = Partial<Record<"transform" | "opacity", string>>;
type Target = { style: Css } | null;
/** the element behind a react-native-web View ref */
export const domOf = (r: unknown): Target => (r && typeof (r as { style?: unknown }).style === "object" ? (r as { style: Css }) : null);

/**
 * Web only (no-op on native): listen to `values` and call `apply(current values)` on every change, plus once after every
 * render. `apply` writes the element styles itself (keep those properties out of the React style, so React never resets them).
 */
export function useDomAnim(values: Animated.Value[], init: number[], apply: (v: number[]) => void) {
  const cur = useRef(init.slice());
  const fn = useRef(apply);
  fn.current = apply;
  useLayoutEffect(() => {
    if (!WEB) return;
    fn.current(cur.current);
  });
  useLayoutEffect(() => {
    if (!WEB) return;
    const ids = values.map((v, i) => v.addListener(({ value }) => {
      cur.current[i] = value;
      fn.current(cur.current);
    }));
    return () => values.forEach((v, i) => v.removeListener(ids[i]));
  }, values); // eslint-disable-line react-hooks/exhaustive-deps
}
