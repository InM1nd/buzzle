// web-only stub for screenshots: behaves like a fresh Android install (permission not yet asked)
module.exports = {
  setNotificationHandler: () => {},
  setNotificationChannelAsync: () => Promise.resolve(null),
  getPermissionsAsync: () => Promise.resolve({ granted: false, canAskAgain: true }),
  requestPermissionsAsync: () => Promise.resolve({ granted: true, canAskAgain: true }),
  scheduleNotificationAsync: () => Promise.resolve("id"),
  cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date", TIME_INTERVAL: "timeInterval" },
};
