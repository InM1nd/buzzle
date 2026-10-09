/**
 * Layered, animated low-poly bee (v1.2). Every layer is a Blender render of the same camera frame
 * (scripts/bees3d), cropped and packed as WebP (src/ui/beeArt.ts):
 *   wings (under the body, flap around their projected root) · body · eyes (blink / look) · crown overlay.
 * Each species has several yaw views (front, ¾, near-profile; Zhuzha has 5). A signed `turn` value
 * (-1 … 1, may be animated) picks the view with native opacity cross-fades and mirrors the bee for the
 * other side, so bees turn toward where they fly without any JS per frame.
 * Bee levels: ≥5 golden shiny wings, 10 also a crown.
 * v1.3 skins: one more shared overlay per view (rendered on the same frame with the body as holdout);
 * hats (beret, wreath) replace the crown.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleProp, View, ViewStyle } from "react-native";
import { sinDeg, sinRange, useAnimActive, useCycle, useFlapClock } from "./anim";
import { BEE_VIEWS, BeeView, Layer, SHARED_VIEWS } from "./beeArt";
import { SKIN_BY_ID } from "../logic/loot";

const MAX_YAW = 62;
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
  rest?: AV;
  tint?: string;            // silhouette (locked bee)
  face?: Face;
  /** facing: 0 = front, ±1 = near profile to the right / left (mirrored). Number or animated value. */
  turn?: number | AV;
  /** bee level: ≥5 shiny wings, 10 crown */
  level?: number;
  /** v1.3: worn skin id (scarf, glasses, …) */
  skin?: string;
  style?: StyleProp<ViewStyle>;
}

const viewsOf = (id: string): BeeView[] => BEE_VIEWS[id] ?? BEE_VIEWS.zhuzha;
const nearest = (vs: BeeView[], yaw: number) => vs.reduce((b, v) => (Math.abs(v.yaw - yaw) < Math.abs(b.yaw - yaw) ? v : b), vs[0]);

function Img({ l, size, style, tint, extra }: { l: Layer; size: number; style?: object; tint?: string; extra?: object }) {
  const [src, r] = l;
  return (
    <Animated.Image source={src} fadeDuration={0} style={[{
      position: "absolute", left: r[0] * size, top: r[1] * size, width: r[2] * size, height: r[3] * size, tintColor: tint,
    }, style, extra] as never} />
  );
}

/** one yaw view: wings + body + eyes + crown */
function ViewLayers({ v, size, wave, wingAlpha, wingSquash, anim, tint, face, level, sleepy, skin }: {
  v: BeeView; size: number; wave: AV; wingAlpha: AV; wingSquash: AV; anim: boolean; tint?: string; face?: Face; level: number; sleepy: boolean; skin?: string;
}) {
  const sh = SHARED_VIEWS[v.yaw] ?? SHARED_VIEWS[0];
  const gold = level >= 5 && !tint;
  const wing = (side: "L" | "R") => {
    const l = (gold ? (side === "L" ? sh.goldL : sh.goldR) : (side === "L" ? sh.wingL : sh.wingR));
    const pw = side === "L" ? sh.pivotL : sh.pivotR;  // pivot in the shared wing render
    const ps = side === "L" ? v.pivotL : v.pivotR;    // pivot of this species
    const r = l[1];
    const x = r[0] + ps[0] - pw[0], y = r[1] + ps[1] - pw[1];
    // rotation box centred on the pivot, big enough for the whole wing
    const half = Math.max(Math.abs(x - ps[0]), Math.abs(x + r[2] - ps[0]), Math.abs(y - ps[1]), Math.abs(y + r[3] - ps[1]));
    const box = 2 * half * size;
    const sx = side === "L" ? 1 : -1; // L wing: clockwise = up
    const rot = anim
      ? Animated.multiply(wave, sx).interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] })
      : "0deg";
    return (
      <Animated.View key={side} pointerEvents="none" style={{
        position: "absolute", left: ps[0] * size - box / 2, top: ps[1] * size - box / 2, width: box, height: box,
        transform: [{ rotate: rot as never }],
      }}>
        <Animated.Image source={l[0]} fadeDuration={0} style={{
          position: "absolute", left: (x - ps[0]) * size + box / 2, top: (y - ps[1]) * size + box / 2, width: r[2] * size, height: r[3] * size,
          opacity: anim ? (wingAlpha as never) : 0.95, tintColor: tint,
          transform: anim ? [{ scaleY: wingSquash as never }] : [],
        }} />
      </Animated.View>
    );
  };
  const eyeTf: object[] = [];
  if (face?.lookX) eyeTf.push({ translateX: face.lookX });
  if (face?.lookY) eyeTf.push({ translateY: face.lookY });
  if (face?.blink) eyeTf.push({ scaleY: face.blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.08] }) });
  return (
    <>
      {wing("L")}{wing("R")}
      <Img l={v.body} size={size} tint={tint} />
      {v.eyes && !tint && !sleepy ? <Img l={v.eyes} size={size} extra={{ transform: eyeTf }} /> : null}
      {level >= 10 && !tint && !(skin && SKIN_BY_ID[skin]?.hat) ? <Img l={sh.crown} size={size} /> : null}
      {skin && !tint && sh.skins[skin] ? <Img l={sh.skins[skin]} size={size} /> : null}
    </>
  );
}

export function BeeSprite({ id, size, flap = true, seed = 0, rest, tint, face, turn = 0, level = 1, skin, style }: BeeProps) {
  const clock = useFlapClock(seed, flap && !tint);
  const anim = flap && !tint;
  const wave = useMemo(() => {
    // wing swing in degrees: quick up-stroke, slower down-stroke
    const raw = clock.interpolate({ inputRange: [0, 0.35, 0.5, 0.85, 1], outputRange: [-6, 26, 24, -8, -6] });
    return rest ? Animated.multiply(raw, Animated.subtract(1, rest)) : raw;
  }, [clock, rest]);
  const wingAlpha = useMemo(() => clock.interpolate({ inputRange: [0, 0.4, 0.6, 1], outputRange: [0.95, 0.72, 0.72, 0.95] }), [clock]);
  const wingSquash = useMemo(() => clock.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [1, 0.62, 0.7, 1] }), [clock]);
  const vs = viewsOf(id);
  const sleepy = id === "sonya";
  const common = { size, wave, wingAlpha, wingSquash, anim, tint, face, level, sleepy, skin };

  if (typeof turn === "number") {
    const v = nearest(vs, Math.abs(turn) * MAX_YAW);
    return (
      <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
        <View style={{ width: size, height: size, transform: turn < 0 ? [{ scaleX: -1 }] : [] }}>
          <ViewLayers v={v} {...common} />
        </View>
      </View>
    );
  }
  return <TurningBee vs={vs} turn={turn} common={common} style={style} size={size} />;
}

/** All yaw views stacked; native opacity steps pick the one matching |turn|, scaleX mirrors for turn < 0. */
function TurningBee({ vs, turn, common, style, size }: {
  vs: BeeView[]; turn: AV; common: Omit<React.ComponentProps<typeof ViewLayers>, "v">; style?: StyleProp<ViewStyle>; size: number;
}) {
  const t = useMemo(() => {
    const abs = turn.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0, 1], extrapolate: "clamp" });
    // flip only for clearly negative turns: at turn = 0 (a bee at rest) scaleX must be exactly 1, never 0
    const mirror = turn.interpolate({ inputRange: [-1, -0.002, -0.001, 1], outputRange: [-1, -1, 1, 1], extrapolate: "clamp" });
    const ys = vs.map((v) => v.yaw / MAX_YAW);
    const e = 0.025;
    const ops = vs.map((_, i) => {
      if (vs.length === 1) return 1;
      const lo = i > 0 ? (ys[i - 1] + ys[i]) / 2 : null;
      const hi = i < vs.length - 1 ? (ys[i] + ys[i + 1]) / 2 : null;
      const inR: number[] = [], outR: number[] = [];
      if (lo !== null) { inR.push(lo - e, lo + e); outR.push(0, 1); }
      if (hi !== null) { inR.push(hi - e, hi + e); outR.push(1, 0); }
      return abs.interpolate({ inputRange: inR, outputRange: outR, extrapolate: "clamp" });
    });
    return { mirror, ops };
  }, [turn, vs]);
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Animated.View style={{ width: size, height: size, transform: [{ scaleX: t.mirror as never }] }}>
        {vs.map((v, i) => (
          <Animated.View key={v.yaw} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size, opacity: t.ops[i] as never }}>
            <ViewLayers v={v} {...common} />
          </Animated.View>
        ))}
      </Animated.View>
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

/** Every few seconds the bee turns to one side, looks around and turns back (native timing). */
export function useTurn(on = true, seed = 1) {
  const v = useRef(new Animated.Value(0)).current;
  const act = useAnimActive();
  useEffect(() => {
    if (!on || !act) return;
    let alive = true;
    let r = (seed * 7919 + 104729) % 233280;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    let timer: ReturnType<typeof setTimeout>;
    const go = () => {
      const side = rnd() < 0.5 ? -1 : 1, amt = 0.3 + rnd() * 0.45;
      Animated.sequence([
        Animated.timing(v, { toValue: side * amt, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(900 + rnd() * 1200),
        Animated.timing(v, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]).start();
      timer = setTimeout(() => { if (alive) go(); }, 4200 + rnd() * 4000);
    };
    timer = setTimeout(go, 1800 + rnd() * 2500);
    return () => { alive = false; clearTimeout(timer); };
  }, [on, act, v, seed]);
  return v;
}

/** A hovering, blinking, looking-around bee that sometimes turns its head (tutorial, tasks, bee details). */
export function Mascot({ id = "zhuzha", size, seed = 3, level = 1, skin, style }: { id?: string; size: number; seed?: number; level?: number; skin?: string; style?: StyleProp<ViewStyle> }) {
  const face = useFace(true, seed);
  const turn = useTurn(true, seed);
  return (
    <Hover amp={size * 0.035} sway={3} period={1900 + (seed % 5) * 140} phase={(seed % 7) / 7} style={style}>
      <BeeSprite id={id} size={size} seed={seed} face={face} turn={turn} level={level} skin={skin} />
    </Hover>
  );
}
