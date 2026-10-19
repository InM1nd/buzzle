/**
 * v1.6 night-falls transition (once per event). App keeps the old interface mounted on top of the new one (same layout, the
 * other theme and backdrops) and fades it out with `p` (0→1, one native-driven timing), so every background, card, text and
 * the tab bar blends from the classic into the midnight colours pixel by pixel while the scene backdrops crossfade; no React
 * render runs per frame. This component runs that timing and draws the accents on a transparent top layer: the moon rises,
 * bats cross it, fireflies drift up, a pumpkin glow pulses. It also swallows taps until the end. "out" is the plain fade back
 * after the event; reduce motion = a short fade without accents.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { USE_NATIVE_DRIVER } from "./anim";

const FX = {
  bats: [require("../../assets/art/halloween/fl_bat_1.webp"), require("../../assets/art/halloween/fl_bat_2.webp"), require("../../assets/art/halloween/fl_bat_3.webp")],
  firefly: require("../../assets/art/halloween/fl_firefly.webp"),
  glow: require("../../assets/art/halloween/fl_glow.webp"),
  moon: require("../../assets/art/halloween/fl_moon.webp"),
};
/** durations (ms): the colour fade runs over `fade` of the whole, the accents over all of it */
export const CINE = { in: 2600, out: 1600, reduced: 450, fade: 0.8 };
export const cineMs = (dir: "in" | "out", reduced: boolean) => (reduced ? CINE.reduced : dir === "in" ? CINE.in : CINE.out);

/** the system "reduce motion" switch, read once at launch and followed; null until known (at most 300 ms) */
export function useReduceMotion() {
  const [r, setR] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setR(!!v); }).catch(() => { if (alive) setR(false); });
    const t = setTimeout(() => { if (alive) setR((v) => v ?? false); }, 300);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => setR(!!v));
    return () => { alive = false; clearTimeout(t); sub?.remove?.(); };
  }, []);
  return r;
}

/** opacity of the old interface layer while `p` runs: ease-in-out baked into stops (the native driver has no `easing`) */
export const oldLayerOpacity = (p: Animated.Value, reduced: boolean) => {
  const end = reduced ? 1 : CINE.fade;
  return p.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1].map((x) => x * end), outputRange: [1, 0.875, 0.5, 0.125, 0], extrapolate: "clamp" });
};

interface Props { dir: "in" | "out"; reduced: boolean; p: Animated.Value; onDone: () => void }
export function EventCine({ dir, reduced, p, onDone }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    p.setValue(0);
    const a = Animated.timing(p, { toValue: 1, duration: cineMs(dir, reduced), easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER });
    // one frame after the commit: the new interface has mounted under the still opaque old one before anything moves
    const raf = requestAnimationFrame(() => a.start(({ finished }) => { if (finished) done.current(); }));
    return () => { cancelAnimationFrame(raf); a.stop(); };
  }, [dir, reduced, p]);

  const ease = (a: number[], b: number[]) => p.interpolate({ inputRange: a, outputRange: b, extrapolate: "clamp" });
  const accents = dir === "in" && !reduced;
  const m = W * 0.3;
  return (
    // taps wait for the end: a Play / Flight tap mid-fade would tear both layers down
    <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]}>
      {accents ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.Image source={FX.moon} style={{ position: "absolute", left: W * 0.62, top: H * 0.12, width: m, height: m,
            opacity: ease([0.05, 0.35, 0.8, 1], [0, 1, 1, 0]), transform: [{ translateY: ease([0, 0.6], [H * 0.12, 0]) }, { scale: ease([0, 0.6], [0.85, 1]) }] }} />
          <Animated.Image source={FX.glow} style={{ position: "absolute", left: W / 2 - W * 0.45, top: H * 0.72 - W * 0.45, width: W * 0.9, height: W * 0.9,
            opacity: ease([0.2, 0.42, 0.6, 1], [0, 0.7, 0.5, 0]), transform: [{ scale: ease([0.2, 0.45, 0.8], [0.6, 1.1, 0.95]) }] }} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = W * (0.12 + 0.15 * i) + (i % 2 ? 10 : -10), s = 26 + (i % 3) * 8, d = 0.18 + i * 0.04;
            return <Animated.Image key={`f${i}`} source={FX.firefly} style={{ position: "absolute", left: x, top: 0, width: s, height: s,
              opacity: ease([d, d + 0.1, 0.8, 1], [0, 1, 1, 0]),
              transform: [{ translateY: ease([d, 1], [H * (0.85 - (i % 3) * 0.05), H * (0.45 - (i % 2) * 0.1)]) }, { translateX: ease([d, 0.6, 1], [0, i % 2 ? 18 : -18, 0]) }] }} />;
          })}
          {FX.bats.map((b, i) => {
            const d = 0.1 + i * 0.1, e = Math.min(0.98, d + 0.55), s = 70 - i * 10, y = H * (0.14 + i * 0.09);
            return <Animated.Image key={`b${i}`} source={b} style={{ position: "absolute", left: 0, top: y, width: s, height: s,
              opacity: ease([d, d + 0.05, e - 0.05, e], [0, 1, 1, 0]),
              transform: [{ translateX: ease([d, e], i % 2 ? [W + 40, -s - 40] : [-s - 40, W + 40]) },
                { translateY: ease([d, (d + e) / 2, e], [0, -30 + i * 10, 10]) }, { scaleX: i % 2 ? -1 : 1 }] }} />;
          })}
        </View>
      ) : null}
    </View>
  );
}
