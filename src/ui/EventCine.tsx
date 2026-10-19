/**
 * v1.6 night-falls transition (once per event): the current scene darkens into the Halloween night, bats cross the moon,
 * fireflies rise, a pumpkin glow pulses, then the overlay fades away over the interface already switched to the event
 * look. One native-driven timing (0→1) feeds every layer through interpolation, so no React render runs per frame; App
 * swaps theme / backdrops / tiles under the fully opaque moment (`onCover`). "out" is the short fade back after the event.
 * Reduce motion: a short plain crossfade without particles.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";
import { USE_NATIVE_DRIVER } from "./anim";
import { SceneBg } from "./SceneBg";

const FX = {
  bats: [require("../../assets/art/halloween/fl_bat_1.webp"), require("../../assets/art/halloween/fl_bat_2.webp"), require("../../assets/art/halloween/fl_bat_3.webp")],
  firefly: require("../../assets/art/halloween/fl_firefly.webp"),
  glow: require("../../assets/art/halloween/fl_glow.webp"),
  sky: require("../../assets/art/halloween/fl_sky.webp"),
};
/** durations (ms) and the moment the overlay is fully opaque (fraction of the duration) */
export const CINE = { in: 3200, out: 1600, inReduced: 900, outReduced: 700, coverIn: 0.36, coverOut: 0.42 };

interface Props { dir: "in" | "out"; source: number; onCover: () => void; onDone: () => void }
export function EventCine({ dir, source, onCover, onDone }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const [reduced, setReduced] = useState<boolean | null>(null);
  const p = useRef(new Animated.Value(0)).current;
  const cb = useRef({ onCover, onDone });
  cb.current = { onCover, onDone };

  useEffect(() => {
    let alive = true;
    const q = AccessibilityInfo.isReduceMotionEnabled?.();
    if (!q) { setReduced(false); return; }
    q.then((r) => { if (alive) setReduced(!!r); }).catch(() => { if (alive) setReduced(false); });
    const t = setTimeout(() => { if (alive) setReduced((r) => r ?? false); }, 300); // never wait long for the query
    return () => { alive = false; clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (reduced === null) return;
    const total = dir === "in" ? (reduced ? CINE.inReduced : CINE.in) : (reduced ? CINE.outReduced : CINE.out);
    const cover = dir === "in" && !reduced ? CINE.coverIn : CINE.coverOut;
    const a = Animated.timing(p, { toValue: 1, duration: total, easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER });
    const tc = setTimeout(() => cb.current.onCover(), Math.round(total * cover) + 40);
    a.start(({ finished }) => { if (finished) cb.current.onDone(); });
    return () => { clearTimeout(tc); a.stop(); };
  }, [reduced, dir, p]);

  const full = dir === "in" && reduced === false;
  const c = dir === "in" && !reduced ? CINE.coverIn : CINE.coverOut;
  const ease = (a: number[], b: number[]) => p.interpolate({ inputRange: a, outputRange: b, extrapolate: "clamp" });
  const root = ease([0, c, full ? 0.62 : c + 0.12, 1], [0, 1, 1, 0]);
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, { opacity: root, zIndex: 50, elevation: 50 }]}>
      <SceneBg source={source} />
      {full ? (
        <>
          {/* dusk: the sky first darkens, then lightens into the night art */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#120826", opacity: ease([0, 0.3, 0.55], [0.75, 0.35, 0]) }]} />
          <Animated.Image source={FX.sky} resizeMode="cover" style={{ position: "absolute", left: 0, top: 0, width: W, height: W * 675 / 1200,
            opacity: ease([0.1, 0.35, 0.55, 0.8], [0, 0.55, 0.55, 0]), transform: [{ translateY: ease([0, 0.6], [-40, 0]) }] }} />
          <Animated.Image source={FX.glow} style={{ position: "absolute", left: W / 2 - W * 0.45, top: H * 0.72 - W * 0.45, width: W * 0.9, height: W * 0.9,
            opacity: ease([0.25, 0.42, 0.55, 0.7], [0, 0.85, 0.6, 0.9]), transform: [{ scale: ease([0.25, 0.45, 0.7], [0.6, 1.1, 0.95]) }] }} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = W * (0.12 + 0.15 * i) + (i % 2 ? 10 : -10), s = 26 + (i % 3) * 8, d = 0.22 + i * 0.04;
            return <Animated.Image key={`f${i}`} source={FX.firefly} style={{ position: "absolute", left: x, top: 0, width: s, height: s,
              opacity: ease([d, d + 0.1, 0.8, 0.95], [0, 1, 1, 0]),
              transform: [{ translateY: ease([d, 1], [H * (0.85 - (i % 3) * 0.05), H * (0.45 - (i % 2) * 0.1)]) }, { translateX: ease([d, 0.6, 1], [0, i % 2 ? 18 : -18, 0]) }] }} />;
          })}
          {FX.bats.map((b, i) => {
            const d = 0.14 + i * 0.1, e = Math.min(0.96, d + 0.5), s = 70 - i * 10, y = H * (0.14 + i * 0.09);
            return <Animated.Image key={`b${i}`} source={b} style={{ position: "absolute", left: 0, top: y, width: s, height: s,
              opacity: ease([d, d + 0.05, e - 0.05, e], [0, 1, 1, 0]),
              transform: [{ translateX: ease([d, e], i % 2 ? [W + 40, -s - 40] : [-s - 40, W + 40]) },
                { translateY: ease([d, (d + e) / 2, e], [0, -30 + i * 10, 10]) }, { scaleX: i % 2 ? -1 : 1 }] }} />;
          })}
        </>
      ) : null}
    </Animated.View>
  );
}
