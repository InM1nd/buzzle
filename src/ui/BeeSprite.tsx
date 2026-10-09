/**
 * Layered, animated bee: two flapping wings (shared PNG) + body PNG (no wings/eyes) + two eyes (blink / look around).
 * Geometry mirrors scripts/make_art.py bee() in a 256×256 frame.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleProp, View, ViewStyle } from "react-native";
/* eslint-disable @typescript-eslint/no-require-imports */
import { sinDeg, sinRange, useAnimActive, useCycle, useFlapClock } from "./anim";

export const BEE_BODY: Record<string, number> = {
  zhuzha: require("../../assets/art/bee_zhuzha_body.png"),
  pushinka: require("../../assets/art/bee_pushinka_body.png"),
  boris: require("../../assets/art/bee_boris_body.png"),
  solnyshko: require("../../assets/art/bee_solnyshko_body.png"),
  klevera: require("../../assets/art/bee_klevera_body.png"),
  lavanda: require("../../assets/art/bee_lavanda_body.png"),
  vasilek: require("../../assets/art/bee_vasilek_body.png"),
  myatka: require("../../assets/art/bee_myatka_body.png"),
  iskorka: require("../../assets/art/bee_iskorka_body.png"),
  sonya: require("../../assets/art/bee_sonya_body.png"),
  zorkaya: require("../../assets/art/bee_zorkaya_body.png"),
  margo: require("../../assets/art/bee_margo_body.png"),
};
const WING = require("../../assets/art/bee_wing.png");
const EYE = require("../../assets/art/bee_eye.png");
const WIDE = new Set(["boris"]);
const SLEEPY = new Set(["sonya"]);

// geometry in the 256 frame (see make_art.py)
const CX = 128, CY = 0.56 * 256, BH = 0.34 * 256;
const WING_W = 181 / 2, WING_H = 140 / 2;       // bee_wing.png is drawn at 2x
const EYE_W = 58 / 2, EYE_H = 63 / 2;
const ROOT = WING_W * 0.36;                        // pivot: distance from wing centre to its root (towards the body)
const BASE = 25;                                   // base tilt of the wings (deg)
const RAD = (BASE * Math.PI) / 180;

type AV = Animated.Value | Animated.AnimatedInterpolation<number>;
/** eye drivers: blink 0..1, look offsets in px of the rendered sprite */
export interface Face { blink?: AV; lookX?: AV; lookY?: AV }

export interface BeeProps {
  id: string;
  size: number;
  /** wings flap (default true). */
  flap?: boolean;
  seed?: number;
  /** 0 = flying, 1 = resting (wings still); may be animated */
  rest?: Animated.AnimatedInterpolation<number> | Animated.Value;
  tint?: string;            // silhouette (locked bee)
  face?: Face;
  style?: StyleProp<ViewStyle>;
}

export function BeeSprite({ id, size, flap = true, seed = 0, rest, tint, face, style }: BeeProps) {
  const k = size / 256;
  const bw = (WIDE.has(id) ? 0.36 : 0.31) * 256;
  const clock = useFlapClock(seed, flap && !tint);
  const anim = flap && !tint;
  const wave = useMemo(() => {
    // wing swing in degrees: quick up-stroke, slower down-stroke
    const raw = clock.interpolate({ inputRange: [0, 0.35, 0.5, 0.85, 1], outputRange: [-6, 26, 24, -8, -6] });
    return rest ? Animated.multiply(raw, Animated.subtract(1, rest)) : raw;
  }, [clock, rest]);
  const wingAlpha = useMemo(() => clock.interpolate({ inputRange: [0, 0.4, 0.6, 1], outputRange: [0.95, 0.72, 0.72, 0.95] }), [clock]);
  const wingSquash = useMemo(() => clock.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [1, 0.62, 0.7, 1] }), [clock]);

  const wing = (sx: -1 | 1) => {
    // wing centre and root (pivot) in the 256 frame
    const wx = CX + sx * bw * 0.95, wy = CY - BH * 0.75;
    const base = sx * BASE; // RN: positive = clockwise (left wing tilts counter-clockwise, as in make_art.py)
    const rx = wx - sx * ROOT * Math.cos(RAD), ry = wy - ROOT * Math.sin(RAD);
    const box = WING_W * 2.2;
    const rot = anim
      ? Animated.multiply(wave, -sx).interpolate({ inputRange: [-90, 90], outputRange: [`${base - 90}deg`, `${base + 90}deg`] })
      : `${base}deg`;
    return (
      <Animated.View key={sx} pointerEvents="none" style={{
        position: "absolute", left: (rx - box / 2) * k, top: (ry - box / 2) * k, width: box * k, height: box * k,
        transform: [{ rotate: rot as never }],
      }}>
        <Animated.Image source={WING} style={{
          position: "absolute", width: WING_W * k, height: WING_H * k,
          left: (box / 2 + sx * ROOT - WING_W / 2) * k, top: (box / 2 - WING_H / 2) * k,
          opacity: anim ? (wingAlpha as never) : 0.95,
          tintColor: tint,
          transform: anim ? [{ scaleY: wingSquash as never }] : [],
        }} />
      </Animated.View>
    );
  };

  const eye = (sx: -1 | 1) => {
    const ex = CX + sx * bw * 0.38, ey = CY - BH * 0.32;
    const tf: object[] = [];
    if (face?.lookX) tf.push({ translateX: face.lookX });
    if (face?.lookY) tf.push({ translateY: face.lookY });
    if (face?.blink) tf.push({ scaleY: face.blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.08] }) });
    return (
      <Animated.Image key={`e${sx}`} source={EYE} style={{
        position: "absolute", left: (ex - EYE_W / 2) * k, top: (ey - EYE_H / 2) * k, width: EYE_W * k, height: EYE_H * k,
        transform: tf as never,
      }} />
    );
  };

  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      {wing(-1)}{wing(1)}
      <Animated.Image source={BEE_BODY[id] ?? BEE_BODY.zhuzha} style={{ position: "absolute", left: 0, top: 0, width: size, height: size, tintColor: tint }} />
      {!tint && !SLEEPY.has(id) ? <>{eye(-1)}{eye(1)}</> : null}
    </View>
  );
}

/** Blink + look-around driver (timers fire every few seconds; the motion itself runs natively). */
export function useFace(on = true, seed = 1) {
  const f = useRef({ blink: new Animated.Value(0), lookX: new Animated.Value(0), lookY: new Animated.Value(0) }).current;
  const act = useAnimActive();
  useEffect(() => {
    if (!on || !act) return;
    let alive = true;
    let r = (seed * 9301 + 49297) % 233280;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => { timers.push(setTimeout(() => { if (alive) fn(); }, ms)); };
    const blink = () => {
      const one = [
        Animated.timing(f.blink, { toValue: 1, duration: 70, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(f.blink, { toValue: 0, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ];
      Animated.sequence(rnd() < 0.25 ? [...one, Animated.delay(90), ...one] : one).start();
      later(1800 + rnd() * 3200, blink);
    };
    const look = () => {
      const dx = (rnd() - 0.5) * 2 * 2.6, dy = (rnd() - 0.6) * 2.2;
      Animated.sequence([
        Animated.parallel([
          Animated.timing(f.lookX, { toValue: dx, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(f.lookY, { toValue: dy, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.delay(700 + rnd() * 900),
        Animated.parallel([
          Animated.timing(f.lookX, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(f.lookY, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
      ]).start();
      later(3200 + rnd() * 3500, look);
    };
    later(900 + rnd() * 1200, blink);
    later(2000 + rnd() * 2000, look);
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [on, act, f, seed]);
  return f;
}

/** Gentle hover: bob + sway, one native loop. */
export function Hover({ children, amp = 5, sway = 3, period = 1700, phase = 0, style }: {
  children: React.ReactNode; amp?: number; sway?: number; period?: number; phase?: number; style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const act = useAnimActive();
  useCycle(v, period, act && (amp > 0 || sway > 0), phase % 1);
  const ty = useMemo(() => v.interpolate(sinRange(amp)), [v, amp]);
  const rot = useMemo(() => v.interpolate(sinDeg(sway, 0.25)), [v, sway]);
  return <Animated.View style={[style, { transform: [{ translateY: ty }, { rotate: rot }] }]}>{children}</Animated.View>;
}

/** A hovering, blinking, looking-around bee (tutorial, tasks, bee details). */
export function Mascot({ id = "zhuzha", size, seed = 3, style }: { id?: string; size: number; seed?: number; style?: StyleProp<ViewStyle> }) {
  const face = useFace(true, seed);
  return (
    <Hover amp={size * 0.035} sway={3} period={1900 + (seed % 5) * 140} phase={(seed % 7) / 7} style={style}>
      <BeeSprite id={id} size={size} seed={seed} face={face} />
    </Hover>
  );
}
