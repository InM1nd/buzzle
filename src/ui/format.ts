export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export function duration(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60000));
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} ч ${r} мин` : `${h} ч`;
}
export const rateFmt = (r: number) => (r < 100 ? r.toFixed(1).replace(".", ",").replace(",0", "") : String(Math.round(r)));
export const days = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WD = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
export const dateLong = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const weekday = (d: Date) => WD[d.getDay()];
