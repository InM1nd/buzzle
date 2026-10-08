import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, ImageSourcePropType, StyleSheet, View } from "react-native";

export interface Pt { x: number; y: number }
interface Flight { id: number; from: Pt; to: Pt; n: number; img: ImageSourcePropType; onArrive?: () => void }
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

function FlightView({ f, done }: { f: Flight; done: (id: number) => void }) {
  const left = useRef(f.n);
  const arrived = useRef(false);
  const onEnd = useCallback(() => {
    if (!arrived.current) { arrived.current = true; f.onArrive?.(); }
    left.current -= 1;
    if (left.current <= 0) done(f.id);
  }, [f, done]);
  return <>{Array.from({ length: f.n }, (_, i) => <Drop key={i} f={f} i={i} onEnd={onEnd} />)}</>;
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
