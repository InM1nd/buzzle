/** Web build: Telegram HapticFeedback inside Telegram, a short vibrate() in mobile browsers that support it. */
import { haptic } from "../platform/telegram";

let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };
const vib = (ms: number) => { try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms); } catch { /* ignore */ } };
const run = (tgF: (h: NonNullable<ReturnType<typeof haptic>>) => void, ms: number) => {
  if (!enabled) return;
  const h = haptic();
  try { if (h) tgF(h); else if (ms) vib(ms); } catch { /* ignore */ }
};
export const hTick = () => run((h) => h.selectionChanged(), 0);
export const hLight = () => run((h) => h.impactOccurred("light"), 8);
export const hHeavy = () => run((h) => h.impactOccurred("heavy"), 20);
export const hSuccess = () => run((h) => h.notificationOccurred("success"), 15);
export const hError = () => run((h) => h.notificationOccurred("warning"), 25);
