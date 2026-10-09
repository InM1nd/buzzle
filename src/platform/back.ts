/**
 * "Back" for both builds: Android's hardware back (BackHandler) and, on web, Telegram's BackButton.
 * Listeners run newest first until one returns true (same contract as BackHandler).
 */
import { BackHandler, Platform } from "react-native";

type L = () => boolean;
const stack: L[] = [];
export function addBackListener(f: L): { remove: () => void } {
  if (Platform.OS !== "web") return BackHandler.addEventListener("hardwareBackPress", f);
  stack.push(f);
  return { remove: () => { const i = stack.lastIndexOf(f); if (i >= 0) stack.splice(i, 1); } };
}
/** Web: run the listeners (called by Telegram's BackButton). */
export function dispatchBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i]()) return true;
  return false;
}
