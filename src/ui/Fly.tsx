import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, ImageSourcePropType, StyleSheet, View } from "react-native";
import { BeeSprite } from "./BeeSprite";

export interface Pt { x: number; y: number }
interface Flight {
  id: number; from: Pt; to: Pt; n: number; img: ImageSourcePropType; onArrive?: () => void;
  /** bees escorting the drops: they swoop to the target, loop around it and vanish into it */
  bees?: string[];
}
interface FlyApi { fly: (f: Omit<Flight, "id">) => void }
const Ctx = createContext<FlyApi>({ fly: () => {} });
export const useFly = () => useContext(Ctx);

/** Measure a view's centre in window coordinates. */
export function centerOf(ref: View | null): Promise<Pt | null> {
  return new Promise((res) => {
    if (!ref || typeof ref.measureInWindow !== "function") return res(null);
    const t = setTimeout(() => res(null), 120); // never block an action on a measurement
    ref.measureInWindow((x, y, w, h) => { clearTimeout(t); res(Number.isFinite(x) && w + h > 0 ? { x: x + w / 2, y: y + h / 2 } : null); });
  });
}

function Drop({ f, i, onEnd }: { f: Flight; i: number; onEnd: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  const spread = useRef({ dx: (Math.random() - 0.5) * 120, dy: (Math.random() - 0.5) * 60 - 30 }).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(i * 55),
      Animated.timing(a, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start(onEnd);
  }, [a, i, onEnd]);
  const mx = f.from.x + spread.dx, my = f.from.y + spread.dy;
  return (
    <Animated.Image
      source={f.img}
      style={{
        position: "absolute", left: -16, top: -16, width: 32, height: 32,
        opacity: a.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [f.from.x, mx, f.to.x] }) },
          { translateY: a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [f.from.y, my, f.to.y] }) },
          { scale: a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.6] }) },
        ],
      }}
    />
  );
}

/** Sampled swarm path: bezier swoop from → around the target, one loop-de-loop, then into the target. */
export function swarmPath(from: Pt, to: Pt, i: number, n = 40) {
  const side = i % 2 ? 1 : -1;
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bend = side * (60 + 35 * i);
  const c = { x: from.x + dx * 0.45 + nx * bend, y: from.y + dy * 0.45 + ny * bend };
  const R = 24 + 6 * i;
  // loop entry point: below the target, on the incoming side
  const e = { x: to.x - side * R * 0.2, y: to.y + R };
  const pts: { t: number; x: number; y: number }[] = [];
  const A = Math.round(n * 0.55), B = Math.round(n * 0.35), Cn = n - A - B;
  for (let k = 0; k <= A; k++) {
    const t = k / A, u = 1 - t;
    pts.push({ t: 0.55 * t, x: u * u * from.x + 2 * u * t * c.x + t * t * e.x, y: u * u * from.y + 2 * u * t * c.y + t * t * e.y });
  }
  const a0 = Math.atan2(e.y - to.y, e.x - to.x);
  for (let k = 1; k <= B; k++) {
    const t = k / B, a = a0 - side * t * Math.PI * 2;
    pts.push({ t: 0.55 + 0.35 * t, x: to.x + Math.cos(a) * R, y: to.y + Math.sin(a) * R });
  }
  const last = pts[pts.length - 1];
  for (let k = 1; k <= Cn; k++) {
    const t = k / Cn;
    pts.push({ t: 0.9 + 0.1 * t, x: last.x + (to.x - last.x) * t, y: last.y + (to.y - last.y) * t });
  }
  // heading → bank + facing
  const rot: number[] = [], face: number[] = [];
  let dir = dx >= 0 ? 1 : -1;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const vx = b.x - a.x, vy = b.y - a.y, v = Math.hypot(vx, vy) || 1;
    if (vx / v > 0.3) dir = 1; else if (vx / v < -0.3) dir = -1;
    rot.push(Math.max(-22, Math.min(22, (vx / v) * 20 + (vy / v) * 6 * dir)));
    face.push(dir);
  }
  // view: three-quarter / profile toward the heading, front-ish while circling up or down
  const yaw = pts.map((_, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const vx = b.x - a.x, v = Math.hypot(vx, b.y - a.y) || 1;
    return +(face[k] * (0.3 + 0.7 * Math.min(1, Math.abs(vx) / v))).toFixed(3);
  });
  return { t: pts.map((p) => p.t), x: pts.map((p) => p.x), y: pts.map((p) => p.y), rot, face, yaw };
}

function SwarmBee({ f, id, i, onEnd }: { f: Flight; id: string; i: number; onEnd: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  const size = 34;
  const p = useRef(swarmPath(f.from, f.to, i)).current;
  useEffect(() => {
    const t = Animated.timing(a, { toValue: 1, duration: 1450 + i * 120, delay: 60 + i * 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    t.start(onEnd);
    return () => t.stop();
  }, [a, i, onEnd]);
  return (
    <Animated.View style={{
      position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size,
      opacity: a.interpolate({ inputRange: [0, 0.04, 0.93, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateX: a.interpolate({ inputRange: p.t, outputRange: p.x }) },
        { translateY: a.interpolate({ inputRange: p.t, outputRange: p.y }) },
        { rotate: a.interpolate({ inputRange: p.t, outputRange: p.rot.map((r) => `${r.toFixed(1)}deg`) }) },
        { scale: a.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0.5, 1, 1, 0.4] }) },
      ],
    }}>
      <BeeSprite id={id} size={size} seed={i + 1} turn={a.interpolate({ inputRange: p.t, outputRange: p.yaw })} />
    </Animated.View>
  );
}

function FlightView({ f, done }: { f: Flight; done: (id: number) => void }) {
  const left = useRef(f.n + (f.bees?.length ?? 0));
  const arrived = useRef(false);
  const onEnd = useCallback(() => {
    if (!arrived.current) { arrived.current = true; f.onArrive?.(); }
    left.current -= 1;
    if (left.current <= 0) done(f.id);
  }, [f, done]);
  return (
    <>
      {Array.from({ length: f.n }, (_, i) => <Drop key={i} f={f} i={i} onEnd={onEnd} />)}
      {(f.bees ?? []).map((id, i) => <SwarmBee key={`b${i}`} f={f} id={id} i={i} onEnd={onEnd} />)}
    </>
  );
}

export function FlyProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const id = useRef(1);
  const fly = useCallback((f: Omit<Flight, "id">) => setFlights((x) => [...x, { ...f, id: id.current++ }]), []);
  const done = useCallback((fid: number) => setFlights((x) => x.filter((q) => q.id !== fid)), []);
  return (
    <Ctx.Provider value={{ fly }}>
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>
        {flights.map((f) => <FlightView key={f.id} f={f} done={done} />)}
      </View>
    </Ctx.Provider>
  );
}
