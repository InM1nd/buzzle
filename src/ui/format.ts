import { numFmt, t, tx } from "../i18n";
export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export function duration(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60000));
  if (m < 60) return t("unit.min", { n: m });
  const h = Math.floor(m / 60), r = m % 60;
  return r ? t("unit.hmin", { h, m: r }) : t("unit.h", { n: h });
}
export const rateFmt = (r: number) => (r < 100 ? numFmt(Math.round(r * 10) / 10) : numFmt(Math.round(r)));
export const days = (n: number) => t("unit.days", { n });
export const dateLong = (d: Date) => t("date.long", { d: String(d.getDate()), month: tx(`month.${d.getMonth()}`) });
export const weekday = (d: Date) => tx(`wd.${d.getDay()}`);
