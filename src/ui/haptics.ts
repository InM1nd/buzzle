import * as Haptics from "expo-haptics";

let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };
const safe = (f: () => Promise<unknown>) => { if (enabled) f().catch(() => {}); };
export const hTick = () => safe(() => Haptics.selectionAsync());
export const hLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hHeavy = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
export const hSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hError = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
