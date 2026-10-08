import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Easing, Image, ImageSourcePropType, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle,
} from "react-native";
import { C, F, shadow } from "./theme";
import { ART } from "./art";
import { hLight } from "./haptics";

// ---------- text ----------
type V = "title" | "h1" | "h2" | "h3" | "body" | "small" | "tiny" | "num";
const VS: Record<V, TextStyle> = {
  title: { ...F.black, fontSize: 34, lineHeight: 40 },
  h1: { ...F.black, fontSize: 26, lineHeight: 32 },
  h2: { ...F.xbold, fontSize: 20, lineHeight: 26 },
  h3: { ...F.xbold, fontSize: 16, lineHeight: 21 },
  body: { ...F.bold, fontSize: 15, lineHeight: 21 },
  small: { ...F.bold, fontSize: 13, lineHeight: 17 },
  tiny: { ...F.xbold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  num: { ...F.black, fontSize: 18, lineHeight: 22 },
};
export function Txt({ v = "body", color, center, style, ...rest }: TextProps & { v?: V; color?: string; center?: boolean }) {
  return <Text {...rest} style={[VS[v], { color: color ?? C.text }, center && { textAlign: "center" }, style]} />;
}

// ---------- pressable with squish ----------
const AP = Animated.createAnimatedComponent(Pressable);
export function Press({ style, children, onPress, disabled, scaleTo = 0.95, haptic = true, ...rest }:
  Omit<React.ComponentProps<typeof Pressable>, "style"> & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean; children?: React.ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 10 : 0 }).start();
  return (
    <AP
      {...rest}
      disabled={disabled}
      onPress={(e) => { if (haptic) hLight(); onPress?.(e); }}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={[style, { transform: [{ scale: s }] }]}
    >
      {children}
    </AP>
  );
}

// ---------- chunky game button ----------
const BTN = {
  honey: { face: "#FFB51F", depth: "#D98200", text: "#5A3200" },
  green: { face: "#4CC777", depth: "#2E9A54", text: "#FFFFFF" },
  purple: { face: "#A77BEA", depth: "#7B52C2", text: "#FFFFFF" },
  white: { face: "#FFFFFF", depth: "#E8D2AE", text: C.text },
  grey: { face: "#EADBC2", depth: "#D2BD9A", text: "#A08463" },
};
export type BtnColor = keyof typeof BTN;
export function GameButton(p: {
  title: string; onPress: () => void; color?: BtnColor; icon?: ImageSourcePropType; sub?: string; disabled?: boolean;
  small?: boolean; style?: StyleProp<ViewStyle>; label?: string;
}) {
  const c = BTN[p.disabled ? "grey" : p.color ?? "honey"];
  const y = useRef(new Animated.Value(0)).current;
  const depth = p.small ? 4 : 6;
  const h = p.small ? 42 : 56;
  const to = (v: number) => Animated.timing(y, { toValue: v, duration: 70, useNativeDriver: true }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ disabled: !!p.disabled }}
      onPress={() => { if (!p.disabled) { hLight(); p.onPress(); } }}
      onPressIn={() => !p.disabled && to(depth - 1)}
      onPressOut={() => to(0)}
      style={[{ height: h + depth }, p.style]}
    >
      <View style={[StyleSheet.absoluteFill, { top: depth, borderRadius: h / 2.4, backgroundColor: c.depth }]} />
      <Animated.View
        style={{
          height: h, borderRadius: h / 2.4, backgroundColor: c.face, alignItems: "center", justifyContent: "center",
          flexDirection: "row", gap: 8, paddingHorizontal: 16, transform: [{ translateY: y }],
        }}
      >
        {p.icon ? <Image source={p.icon} style={{ width: p.small ? 20 : 26, height: p.small ? 20 : 26 }} /> : null}
        <View style={{ alignItems: "center" }}>
          <Text style={[F.black, { color: c.text, fontSize: p.small ? 15 : 18, lineHeight: p.small ? 19 : 22 }]}>{p.title}</Text>
          {p.sub ? <Text style={[F.xbold, { color: c.text, opacity: 0.75, fontSize: 12, lineHeight: 15 }]}>{p.sub}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ---------- numbers ----------
export const fmt = (n: number) => {
  const v = Math.floor(n);
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",")} млн`;
  if (v >= 10000) return `${(v / 1000).toFixed(v >= 1e5 ? 0 : 1).replace(".", ",")}K`;
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

/** Number that counts smoothly to its new value. */
export function CountUp({ value, style, duration = 600, format = fmt }: { value: number; style?: StyleProp<TextStyle>; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const v = start + (value - start) * e;
      setShown(v);
      if (t >= 1) { clearInterval(id); from.current = value; }
    }, 16);
    return () => { clearInterval(id); from.current = value; };
  }, [value, duration]);
  return <Text style={style}>{format(shown)}</Text>;
}

// ---------- currency pill ----------
export function Pill({ icon, value, color = C.text, bump, onLayoutIcon, label }: {
  icon: ImageSourcePropType; value: number; color?: string; bump?: number; label: string;
  onLayoutIcon?: (ref: View | null) => void;
}) {
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!bump) return;
    Animated.sequence([
      Animated.timing(s, { toValue: 1.18, duration: 120, useNativeDriver: true }),
      Animated.spring(s, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
    ]).start();
  }, [bump, s]);
  return (
    <Animated.View accessibilityLabel={label} style={[styles.pill, shadow, { transform: [{ scale: s }] }]}>
      <View ref={(r) => onLayoutIcon?.(r)} collapsable={false}>
        <Image source={icon} style={{ width: 26, height: 26 }} />
      </View>
      <CountUp value={value} style={[F.black, { fontSize: 16, color, minWidth: 28 }]} />
    </Animated.View>
  );
}

// ---------- progress bar ----------
export function Bar({ progress, color = C.honey, height = 12, track = "#F3E3C6", style }: { progress: number; color?: string; height?: number; track?: string; style?: StyleProp<ViewStyle> }) {
  const w = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(1, progress)), duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, w]);
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }, style]}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }}>
        <View style={{ position: "absolute", top: 2, left: 6, right: 6, height: Math.max(2, height / 4), borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" }} />
      </Animated.View>
    </View>
  );
}

export function Stars({ n, size = 28, gap = 2, animate = false }: { n: number; size?: number; gap?: number; animate?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {[0, 1, 2].map((i) => <StarIcon key={i} on={i < n} size={i === 1 ? size * 1.15 : size} delay={animate ? 250 + i * 260 : -1} />)}
    </View>
  );
}
function StarIcon({ on, size, delay }: { on: boolean; size: number; delay: number }) {
  const s = useRef(new Animated.Value(delay >= 0 && on ? 0 : 1)).current;
  useEffect(() => {
    if (delay >= 0 && on) {
      Animated.sequence([Animated.delay(delay), Animated.spring(s, { toValue: 1, useNativeDriver: true, bounciness: 16, speed: 10 })]).start(() => {});
      const id = setTimeout(() => hLight(), delay + 60);
      return () => clearTimeout(id);
    }
  }, [delay, on, s]);
  return (
    <View style={{ width: size, height: size }}>
      <Image source={ART.starOff} style={{ position: "absolute", width: size, height: size }} />
      {on ? <Animated.Image source={ART.star} style={{ position: "absolute", width: size, height: size, transform: [{ scale: s }] }} /> : null}
    </View>
  );
}

export function Card({ children, style, warm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; warm?: boolean }) {
  return <View style={[styles.card, shadow, warm && { backgroundColor: C.cardWarm }, style]}>{children}</View>;
}

/** Gentle bob + slight wobble, for bees. */
export function Bobbing({ children, amp = 5, period = 1600, delay = 0, style }: { children: React.ReactNode; amp?: number; period?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: period / 2, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a, period, delay]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-amp, amp] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Centered modal card over a dimmed backdrop (in-tree overlay, animated). */
export function Overlay({ visible, onClose, children, dismissable = true }: { visible: boolean; onClose?: () => void; children: React.ReactNode; dismissable?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const vis = useRef(visible);
  vis.current = visible;
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(a, { toValue: visible ? 1 : 0, duration: visible ? 260 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished && !vis.current) setMounted(false);
    });
  }, [visible, a]);
  if (!mounted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(60,32,8,0.45)", opacity: a }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismissable && onClose?.()} accessibilityLabel="Закрыть окно" />
      </Animated.View>
      <View style={styles.overlayCenter} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }]}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

export function CloseBtn({ onPress, color = C.dim }: { onPress: () => void; color?: string }) {
  return (
    <Press onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.close}>
      <Image source={ART.close} style={{ width: 16, height: 16, tintColor: color }} />
    </Press>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderRadius: 22, paddingLeft: 6, paddingRight: 14, height: 40 },
  card: { backgroundColor: C.card, borderRadius: 24, padding: 16 },
  overlayCenter: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 22 },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: C.cardWarm, borderRadius: 30, padding: 22, ...shadow, elevation: 12 },
  close: { position: "absolute", right: 14, top: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: "#F6E7CB", alignItems: "center", justifyContent: "center", zIndex: 2 },
});
