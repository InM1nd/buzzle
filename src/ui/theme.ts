import { Platform, TextStyle } from "react-native";
import { resolveTheme as resolve, UiStyle } from "../logic/uiStyle";
import type { ThemeName } from "../logic/uiStyle";

/** v1.6 interface themes. `C` is one mutable token object: setTheme() overwrites it in place (like art.ts setTileStyle) and the
 *  app root remounts on a theme change, so inline `C.x` reads and `themed()` style sheets pick the new values up. */
export type { ThemeName };
export type ThemePref = UiStyle;

const CLASSIC = {
  bg: "#FFF6E3",
  bg2: "#FFEFD0",
  card: "#FFFFFF",
  cardWarm: "#FFF9EE",
  text: "#4A2C12",
  dim: "#9C7B5B",
  faint: "#C9AE8C",
  line: "#F1DFC0",
  honey: "#FFB51F",
  honeyDeep: "#F08A00",
  honeyDark: "#C26A00",
  jelly: "#A77BEA",
  green: "#3DBE6A",
  greenDark: "#2A9551",
  red: "#F0533A",
  brown: "#7A4A1E",
  board: "#F7DFAE",
  boardEdge: "#E8C27E",
  pollen: ["#FFC233", "#FF6FA3", "#9B74F2", "#3FA2FF", "#47C97E"],
  /** v1.6 additions (classic values = what the screens hard-coded before) */
  panel: "#FFFFFF",        // top bar pills, tab bar, segmented control
  panelEdge: "#F0D7AE",
  cardEdge: "#F6DDA6",
  track: "#F3E3C6",
  trackEdge: "rgba(0,0,0,0)",
  scrim: "rgba(60,32,8,0.45)",
  tabIdle: "#7A4A1E",     // inactive tab icon / gear / clock / close
  tabOn: "#FFFFFF",       // icon on the active (orange) tab
  onBtn: "#5A3200",       // text on honey buttons
  glow: "#FFB51F",
  night: false,
};
const MIDNIGHT: typeof CLASSIC = {
  bg: "#171340",
  bg2: "#32296D",
  card: "#221C4D",
  cardWarm: "#1B1744",
  text: "#FFE8C2",
  dim: "#CDBCDD",
  faint: "#8F82C0",
  line: "#4A3E94",
  honey: "#FFB51F",
  honeyDeep: "#F08A00",
  honeyDark: "#FFB84D",
  jelly: "#A77BEA",
  green: "#3DBE6A",
  greenDark: "#2A9551",
  red: "#F0533A",
  brown: "#CDBCDD",
  board: "#151233",
  boardEdge: "#5446A0",
  pollen: ["#FFC233", "#FF6FA3", "#9B74F2", "#3FA2FF", "#47C97E"],
  panel: "#151233",
  panelEdge: "#5446A0",
  cardEdge: "#5446A0",
  track: "#3A3070",
  trackEdge: "#6556B5",
  scrim: "rgba(8,5,22,0.66)",
  tabIdle: "#CDBCDD",
  tabOn: "#4A2C12",
  onBtn: "#4A2C12",
  glow: "#FF9A3D",
  night: true,
};
export const THEMES: Record<ThemeName, typeof CLASSIC> = { classic: CLASSIC, midnight: MIDNIGHT };

export const C: typeof CLASSIC = { ...CLASSIC, pollen: [...CLASSIC.pollen] };
let current: ThemeName = "classic";
let version = 0;
export const themeName = () => current;
export const themeVersion = () => version;
export const isNight = () => current === "midnight";

const fam = Platform.OS === "ios" ? undefined : "Nunito";
export const F = {
  bold: { fontFamily: fam, fontWeight: "700" } as TextStyle,
  xbold: { fontFamily: fam, fontWeight: "800" } as TextStyle,
  black: { fontFamily: fam, fontWeight: "900" } as TextStyle,
};

export const shadow = {
  shadowColor: "#7A4A1E",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

/** switch the active theme (in place); returns true when it changed */
export function setTheme(n: ThemeName): boolean {
  if (n === current) return false;
  current = n;
  version++;
  Object.assign(C, THEMES[n], { pollen: [...THEMES[n].pollen] });
  // flat cards on the violet theme: no soft brown drop shadow
  Object.assign(shadow, n === "midnight"
    ? { shadowColor: "#000", shadowOpacity: 0, shadowRadius: 0, elevation: 0 }
    : { shadowColor: "#7A4A1E", shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 });
  return true;
}

/** the preference → the theme: "auto" follows the Halloween event */
export const resolveTheme = resolve;

/** Style sheets that read C must be rebuilt when the theme changes: wrap them, `const styles = themed(() => StyleSheet.create({...}))`.
 *  The proxy rebuilds lazily on first access after a switch, so modules keep their `styles.x` call sites. */
export function themed<T extends object>(make: () => T): T {
  let built: T | null = null;
  let at = -1;
  const get = (): T => {
    if (!built || at !== version) { built = make(); at = version; }
    return built;
  };
  return new Proxy({} as T, {
    get: (_t, k) => (get() as any)[k],
    has: (_t, k) => k in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: (get() as any)[k] }),
  });
}

// ---------------------------------------------------------------- literal colours
/** Screens were written with literal light colours. K.bg / K.bd / K.fg return them unchanged in the classic theme and a dark
 *  equivalent in midnight (surface → card, light tint → dark tint of the same hue, dark brown text → cream, ...). */
type RGBA = [number, number, number, number];
const parse = (c: string): RGBA | null => {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (m) {
    const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (m) { const p = m[1].split(",").map((x) => parseFloat(x)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  return null;
};
const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const cache = new Map<string, string>();
const memo = (kind: string, c: string, f: (v: RGBA) => string) => {
  const key = kind + c;
  let r = cache.get(key);
  if (r === undefined) { const v = parse(c); r = v ? f(v) : c; cache.set(key, r); }
  return r;
};
const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;

const bg = (c: string): string => {
  if (current === "classic") return c;
  return memo("bg", c, ([r, g, b, a]) => {
    const L = lum(r, g, b), mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    if (a < 0.5 || L < 0.5) return c;                                   // translucent whites and dark/saturated brand colours stay
    if (L > 0.9 && sat < 0.2) return a < 1 ? rgba(34, 28, 77, a) : "#221C4D";  // white / cream surface → card
    if (L > 0.74 && sat >= 0.1) {                                        // pastel tints → dark tints of the same hue
      if (g >= r && g >= b && g - b > 10) return "rgba(63,194,116,0.22)";
      if (b >= r && b >= g) return r > g + 12 ? "rgba(167,123,234,0.22)" : "rgba(90,160,255,0.24)";
      if (r >= g && b > g + 4 && sat > 0.1) return "rgba(255,143,176,0.24)";
      if (r >= g && g < b + 40 && g < 232 && sat > 0.14 && b < 200 && r - g > 24 && g - b < 20) return "rgba(240,83,58,0.24)";
      return "#32296D";                                                  // cream / honey tints → tile
    }
    if (L > 0.74) return "#32296D";
    if (L > 0.6 && sat < 0.35) return "#3A3070";                         // beige (disabled, tracks) → violet track
    return c;
  });
};
const bd = (c: string): string => {
  if (current === "classic") return c;
  return memo("bd", c, ([r, g, b, a]) => (a >= 0.5 && lum(r, g, b) > 0.62 ? "#5446A0" : c));
};
const FG: Record<string, string> = {
  "#4A2C12": "text", "#5A3200": "text", "#6B3E00": "text", "#3E2A12": "text", "#4A3218": "text", "#5E4426": "text", "#7A4A1E": "text", "#6E5232": "dim",
  "#8A6B4A": "dim", "#8A6A48": "dim", "#9C7B5B": "dim", "#A07A4C": "dim", "#C9AE86": "faint", "#C49A62": "dim", "#D9A54C": "accent",
  "#8A5200": "accent", "#C26A00": "accent", "#D27A00": "accent", "#7A4300": "accent", "#B07A10": "accent", "#E09A00": "accent",
  "#4E7A2A": "#9BE08A", "#2F4A17": "#9BE08A", "#7A8A3A": "#BFE9A8", "#2FA864": "#8FE9B0", "#6B4CA8": "#C9A8FF", "#7B52C2": "#C9A8FF",
  "#8A52D6": "#C9A8FF", "#8A5BE6": "#C9A8FF", "#2F7FD0": "#8CC4FF", "#2E8BEA": "#8CC4FF", "#B03A68": "#FF8FB0", "#9C2F5C": "#FF8FB0", "#5B5FC7": "#A9B4FF",
  "#C25E00": "accent", "#E04585": "#FF8FB0",
};
const fg = (c: string): string => {
  if (current === "classic") return c;
  const key = c.toUpperCase();
  const m = FG[key];
  if (m === "text") return MIDNIGHT.text;
  if (m === "dim") return MIDNIGHT.dim;
  if (m === "faint") return MIDNIGHT.faint;
  if (m === "accent") return "#FFB84D";
  if (m) return m;
  return c;
};
export const K = { bg, bd, fg };

/** the one active card per screen: orange border + glow (midnight only). Spread into the card's style.
 *  RN shadows do not glow on Android (they are grey, elevation only), so there the glow is drawn by <Glow/> rings instead. */
export const activeCard = (on = true) => (on && current === "midnight"
  ? {
      borderWidth: 2, borderColor: "#FF9A3D", elevation: 0,
      ...(Platform.OS === "android" ? null : { shadowColor: "#FF8A1F", shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }),
    }
  : null);
/** true when <Glow/> has to fake the glow with rings */
export const glowRings = () => current === "midnight" && Platform.OS === "android";
