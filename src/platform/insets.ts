import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onInsetsChange, telegramInsets } from "./telegram";

/** Safe-area insets; inside Telegram also the fullscreen device inset + Telegram's header controls. */
export function useInsets() {
  const base = useSafeAreaInsets();
  const [tgI, setTgI] = useState(telegramInsets);
  useEffect(() => onInsetsChange(() => setTgI(telegramInsets())), []);
  if (!tgI) return base;
  return {
    top: Math.max(base.top, tgI.top), bottom: Math.max(base.bottom, tgI.bottom),
    left: Math.max(base.left, tgI.left), right: Math.max(base.right, tgI.right),
  };
}
