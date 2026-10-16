import { Entry, getLang, Params, render } from "./core";
import { data } from "./strings/data";
import { loot } from "./strings/loot";
import { ui } from "./strings/ui";
import { common } from "./strings/common";
import { play } from "./strings/play";
import { screens } from "./strings/screens";
import { lootScreen } from "./strings/lootScreen";
import { system } from "./strings/system";
import { event } from "./strings/event";
export * from "./core";

export const STRINGS = { ...data, ...loot, ...ui, ...common, ...play, ...screens, ...lootScreen, ...system, ...event } satisfies Record<string, Entry>;
export type Key = keyof typeof STRINGS;
const ALL = STRINGS as Record<string, Entry>;

/** translate a key in the current language */
export function t(key: Key, p?: Params): string { return render(ALL[key], getLang(), p); }
/** translate a computed key ("bee.<id>.name"); unknown keys return the fallback (or the key) */
export function tx(key: string, p?: Params, fallback?: string): string {
  const e = ALL[key];
  return e ? render(e, getLang(), p) : fallback ?? key;
}
export const hasKey = (key: string) => key in ALL;

/** make obj[prop] a live translation (data tables keep working with `b.name` at every call site) */
export function lz<T extends object>(obj: T, prop: keyof T & string, key: string) {
  Object.defineProperty(obj, prop, { get: () => tx(key), enumerable: true, configurable: true });
}
