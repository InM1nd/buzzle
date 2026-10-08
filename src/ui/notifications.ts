import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { PlannedNotification } from "../logic/notifyPlan";

export const CHANNEL_ID = "bzz-hive";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Улей и ежедневная головоломка",
    description: "Когда улей полон и когда готова новая ежедневная головоломка",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type PermState = "granted" | "denied" | "blocked";
export async function getPermission(): Promise<PermState> {
  const s = await Notifications.getPermissionsAsync();
  if (s.granted) return "granted";
  return s.canAskAgain ? "denied" : "blocked";
}
/** POST_NOTIFICATIONS prompt (Android 13+); the channel must exist first. */
export async function requestPermission(): Promise<PermState> {
  await ensureChannel();
  const cur = await getPermission();
  if (cur !== "denied") return cur;
  const r = await Notifications.requestPermissionsAsync();
  if (r.granted) return "granted";
  return r.canAskAgain ? "denied" : "blocked";
}

/** Replace all scheduled notifications with the plan (inexact alarms — no exact-alarm permission). */
export async function applyPlan(plan: PlannedNotification[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan.length) return;
  await ensureChannel();
  for (const p of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(p.at), channelId: CHANNEL_ID },
    });
  }
}
