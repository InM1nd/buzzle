/** v1.5: pre-rendered turnaround frames (design/2d/all-species-accessories-v1) with outfits baked in. */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleProp, View, ViewStyle } from "react-native";
import { TURN } from "./turnArt";

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
  const big = size >= 110;
  const src = (d: string) => (big && f[`${d}_320`]) || f[`${d}_144`] || f.front_144;
  // tiny wing-beat stand-in: a quick vertical squash so static frames still feel alive
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flap) return;
    const a = Animated.loop(Animated.timing(beat, { toValue: 1, duration: 260 + (seed % 5) * 20, easing: Easing.inOut(Easing.sin), useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, [flap, beat, seed]);
  const sy = beat.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.975, 1] });
  const box = { width: size, height: size };
  if (typeof turn === "number") {
    const d = DIRS.reduce((a, b) => (Math.abs(b[1] - turn) < Math.abs(a[1] - turn) ? b : a))[0];
    return (
      <View pointerEvents="none" style={[box, style]}>
        <Animated.Image source={src(d)} style={[box, flap ? { transform: [{ scaleY: sy }] } : null]} />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[box, style]}>
      {DIRS.map(([d, c], i) => {
        const lo = c - 0.25, hi = c + 0.25;
        const op = turn.interpolate({
          inputRange: i === 0 ? [-2, hi, hi + 0.001] : i === DIRS.length - 1 ? [lo - 0.001, lo, 2] : [lo - 0.001, lo, hi, hi + 0.001],
          outputRange: i === 0 ? [1, 1, 0] : i === DIRS.length - 1 ? [0, 1, 1] : [0, 1, 1, 0], extrapolate: "clamp",
        });
        return <Animated.Image key={d} source={src(d)} style={[box, { position: "absolute", opacity: op }, flap ? { transform: [{ scaleY: sy }] } : null]} />;
      })}
    </View>
  );
}
