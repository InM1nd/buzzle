/**
 * v1.4 i18n core: English (default), Ukrainian, Russian.
 * Strings live in src/i18n/strings/*.ts as { key: { en, uk, ru } } so every language is written side by side and
 * the compiler refuses an entry that misses a language. A value is a string or plural forms
 * ({ one, other } for en, { one, few, many } for uk/ru). Placeholders: {name}; {n} is formatted per locale.
 */
export type Lang = "en" | "uk" | "ru";
export const LANGS: Lang[] = ["en", "uk", "ru"];
export interface PluralEn { one: string; other: string }
export interface PluralSlav { one: string; few: string; many: string }
export interface Entry { en: string | PluralEn; uk: string | PluralSlav; ru: string | PluralSlav }

let lang: Lang = "en";
const listeners = new Set<(l: Lang) => void>();
export const getLang = () => lang;
export function setLang(l: Lang) {
  if (!LANGS.includes(l) || l === lang) return;
  lang = l;
  listeners.forEach((f) => f(l));
}
export const onLang = (f: (l: Lang) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as string[]).includes(v);

/** CLDR cardinal rules for our three languages (no Intl dependency: older Hermes builds lack PluralRules). */
export function pluralCat(l: Lang, n: number): "one" | "few" | "many" | "other" {
  const i = Math.floor(Math.abs(n));
  const isInt = Math.abs(n) === i;
  if (l === "en") return i === 1 && isInt ? "one" : "other";
  if (!isInt) return "few"; // uk/ru fractions use the "other" form, which equals the genitive singular ("2,5 дня")
  const m10 = i % 10, m100 = i % 100;
  if (m10 === 1 && m100 !== 11) return "one";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "few";
  return "many";
}
export function pickPlural(l: Lang, v: string | PluralEn | PluralSlav, n: number): string {
  if (typeof v === "string") return v;
  const c = pluralCat(l, n);
  if ("other" in v) return c === "one" ? v.one : v.other;
  return c === "one" ? v.one : c === "few" ? v.few : v.many;
}

/** Locale number formatting: 1,234 / 1 234 ; decimal point / comma. */
export function numFmt(n: number, l: Lang = lang, digits?: number): string {
  const neg = n < 0; const a = Math.abs(n);
  const s = digits !== undefined ? a.toFixed(digits) : String(Math.round(a * 100) / 100);
  const [int, frac] = s.split(".");
  const sep = l === "en" ? "," : "\u00A0";
  const g = int.length > 4 || l === "en" ? int.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : int;
  return (neg ? "-" : "") + g + (frac ? (l === "en" ? "." : ",") + frac : "");
}
/** decimal separator only (for "×1,5" style multipliers) */
export const dec = (n: number, l: Lang = lang) => numFmt(n, l);

export type Params = Record<string, string | number>;
export function render(e: Entry, l: Lang, p?: Params): string {
  const n = typeof p?.n === "number" ? p.n : 1;
  let s = pickPlural(l, e[l], n);
  if (p) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? (typeof p[k] === "number" ? numFmt(p[k] as number, l) : String(p[k])) : m));
  return s;
}
