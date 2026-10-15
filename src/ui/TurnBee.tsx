/** Approved raster bodies, wings and outfits; static front portraits and crisp flight frames. */
import React, { useMemo } from "react";
import { Animated, Image, StyleProp, View, ViewStyle } from "react-native";
import { TURN, WING_ROOT } from "./turnArt";
import { sinRange, useFlapClock } from "./anim";

type AV = Animated.Value | Animated.AnimatedInterpolation<number>;
const DIRS: [string, number][] = [["side-left", -1], ["q3-front-left", -.5], ["front", 0], ["q3-front", .5], ["side", 1]];
const ITEMS = new Set(["scarf", "bow", "glasses", "backpack", "wreath", "beret", "halo"]);
export const hasTurnBee = (id: string) => !!TURN[id];
export function outfitLayers(level: number, skin?: string): string[] {
  const hat = skin === "wreath" || skin === "beret";
  return [...(level >= 10 && !hat ? ["crown"] : []), ...(skin && ITEMS.has(skin) ? [skin] : [])];
}

export function TurnBee({ id, size, turn = 0, level = 1, skin, flap = true, seed = 0, tint, rest, style }: {
  id: string; size: number; turn?: number | AV; level?: number; skin?: string; flap?: boolean; seed?: number;
  tint?: string; rest?: AV; style?: StyleProp<ViewStyle>;
}) {
  const set = TURN[id] ?? TURN.zhuzha;
  const moving = flap && !tint;
  const clock = useFlapClock(seed, moving);
  const motion = useMemo(() => {
    const raw = clock.interpolate(sinRange(15));
    const squash = clock.interpolate(sinRange(.18, 0, 12, .82));
    return { rotation: rest ? Animated.multiply(raw, Animated.subtract(1, rest)) : raw,
      squash: rest ? Animated.add(rest, Animated.multiply(squash, Animated.subtract(1, rest))) : squash };
  }, [clock, rest]);
  const box = { width: size, height: size };
  const pick = (kind: string, d: string) => {
    const frames = set[kind];
    return frames?.[`${d}_${!moving && d === "front" && size > 96 ? 720 : 288}`];
  };
  const image = (kind: string, d: string) => <Image key={kind} testID={`bee-${kind}`} source={pick(kind, d)} fadeDuration={0}
    style={[box, { position: "absolute", tintColor: tint }]} />;
  const wing = (k: "w0" | "w1", d: string) => {
    const root = WING_ROOT[id]?.[d]?.[k] ?? WING_ROOT.zhuzha[d][k];
    const rotation = Animated.multiply(motion.rotation, root[2]).interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] });
    return <Animated.Image key={k} testID={`bee-${k}`} source={pick(k, d)} fadeDuration={0}
      style={[box, { position: "absolute", tintColor: tint, transformOrigin: [root[0] * size, root[1] * size, 0] },
        moving ? { transform: [{ rotate: rotation }, { scaleY: motion.squash }] } : null]} />;
  };
  const layer = (d: string, opacity?: AV) => {
    const mirrored = d.endsWith("-left"), bodyDirection = mirrored ? d.slice(0, -5) : d;
    return <Animated.View key={d} testID={`bee-view-${d}`} style={[box, { position: "absolute", opacity: opacity ?? 1 }]}>
      <View style={[box, mirrored && { transform: [{ scaleX: -1 }] }]}>
        {wing("w0", bodyDirection)}{wing("w1", bodyDirection)}{image("base", bodyDirection)}
      </View>
      {!tint ? outfitLayers(level, skin).filter(k => pick(k, d)).map(k => image(k, d)) : null}
    </Animated.View>;
  };
  if (!moving || typeof turn === "number") {
    const yaw = typeof turn === "number" ? turn : 0;
    const d = moving ? DIRS.reduce((a, b) => Math.abs(b[1] - yaw) < Math.abs(a[1] - yaw) ? b : a)[0] : "front";
    return <View pointerEvents="none" style={[box, style]}>{layer(d)}</View>;
  }
  return <View pointerEvents="none" style={[box, style]}>{DIRS.map(([d, center], i) => {
    const lo = center - .25, hi = center + .25;
    const opacity = turn.interpolate({ inputRange: i === 0 ? [-2, hi, hi + .001] : i === DIRS.length - 1 ? [lo - .001, lo, 2] : [lo - .001, lo, hi, hi + .001],
      outputRange: i === 0 ? [1, 1, 0] : i === DIRS.length - 1 ? [0, 1, 1] : [0, 1, 1, 0], extrapolate: "clamp" });
    return layer(d, opacity);
  })}</View>;
}
