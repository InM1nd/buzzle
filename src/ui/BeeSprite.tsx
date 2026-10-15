import React from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { TurnBee } from "./TurnBee";
import { useEffect, useMemo, useRef } from "react";
import { Easing } from "react-native";
import { sinDeg, sinRange, useAnimActive, useCycle } from "./anim";
type AV = Animated.Value | Animated.AnimatedInterpolation<number>;
export interface Face { blink?: AV; lookX?: AV; lookY?: AV }
export interface BeeProps { id: string; size: number; flap?: boolean; seed?: number; rest?: AV; tint?: string; face?: Face; turn?: number | AV; level?: number; skin?: string; style?: StyleProp<ViewStyle> }
export function BeeSprite({face, ...props}: BeeProps) { return <TurnBee {...props} />; }
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


/** Still, front-facing portrait for onboarding, language selection and detail sheets. */
export function Mascot({id="zhuzha",size,seed=3,level=1,skin,style}: {id?:string;size:number;seed?:number;level?:number;skin?:string;style?:StyleProp<ViewStyle>}) {
 return <BeeSprite id={id} size={size} flap={false} level={level} skin={skin} style={style} />;
}
