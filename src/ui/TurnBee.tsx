/** v1.5: pre-rendered turnaround frames (design/2d/all-species-accessories-v1) with outfits baked in. */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleProp, View, ViewStyle } from "react-native";
import { TURN, WING_ROOT } from "./turnArt";

const DIRS: [string, number][] = [["side-left", -1], ["q3-front-left", -0.5], ["front", 0], ["q3-front", 0.5], ["side", 1]];
const ITEM: Record<string, string> = { scarf: "scarf", bow: "bow", glasses: "glasses", backpack: "backpack", wreath: "wreath", beret: "beret", halo: "halo" };

export const hasTurnBee = (id: string) => !!TURN[id];

function frames(id: string, level: number, skin?: string) {
  const set = TURN[id];
  const it = skin && ITEM[skin] && set[ITEM[skin]] ? ITEM[skin] : level >= 10 && set.crown ? "crown" : "base";
  return set[it] ?? set.base;
}

export function TurnBee({ id, size, turn = 0, level = 1, skin, flap = true, seed = 0, style }: {
  id: string; size: number; turn?: number | Animated.AnimatedInterpolation<number> | Animated.Value; level?: number; skin?: string; flap?: boolean; seed?: number; style?: StyleProp<ViewStyle>;
}) {
  const f = frames(id, level, skin);
  const set = TURN[id];
  const big = size >= 110;
  const pick = (m: Record<string, any> | undefined, d: string) => m && ((big && m[`${d}_240`]) || m[`${d}_112`]);
  const clock = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flap) return;
    clock.setValue((seed % 7) / 7);
    const a = Animated.loop(Animated.timing(clock, { toValue: 1, duration: 76 + (seed % 4) * 4, easing: Easing.linear, useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, [flap, clock, seed]);
  const box = { width: size, height: size };
  const wing = (k: "L" | "R", d: string) => {
    const src = pick(set[`wing${k}`], d); const root = WING_ROOT[id]?.[d]?.[k];
    if (!src || !root) return null;
    const sgn = k === "L" ? 1 : -1;
    const rot = clock.interpolate({ inputRange: [0, 0.4, 0.55, 1], outputRange: ["0deg", `${sgn * 16}deg`, `${sgn * 15}deg`, "0deg"] });
    const sy = clock.interpolate({ inputRange: [0, 0.4, 0.55, 1], outputRange: [1, 0.72, 0.75, 1] });
    return <Animated.Image key={k} source={src} style={[box, { position: "absolute", transformOrigin: `${root[0] * 100}% ${root[1] * 100}%` } as any, flap ? { transform: [{ rotate: rot }, { scaleY: sy }] } : null]} />;
  };
  const layer = (d: string, extra?: any) => (
    <Animated.View key={d} style={[box, { position: "absolute", left: 0, top: 0 }, extra]}>
      {wing("L", d)}{wing("R", d)}
      <Image source={pick(f, d) || pick(set.base, d)} style={box} />
    </Animated.View>
  );
  if (typeof turn === "number") {
    const d = DIRS.reduce((a, b) => (Math.abs(b[1] - turn) < Math.abs(a[1] - turn) ? b : a))[0];
    return <View pointerEvents="none" style={[box, style]}>{layer(d)}</View>;
  }
  return (
    <View pointerEvents="none" style={[box, style]}>
      {DIRS.map(([d, c], i) => {
        const lo = c - 0.25, hi = c + 0.25;
        const op = turn.interpolate({
          inputRange: i === 0 ? [-2, hi, hi + 0.001] : i === DIRS.length - 1 ? [lo - 0.001, lo, 2] : [lo - 0.001, lo, hi, hi + 0.001],
          outputRange: i === 0 ? [1, 1, 0] : i === DIRS.length - 1 ? [0, 1, 1] : [0, 1, 1, 0], extrapolate: "clamp",
        });
        return layer(d, { opacity: op });
      })}
    </View>
  );
}
