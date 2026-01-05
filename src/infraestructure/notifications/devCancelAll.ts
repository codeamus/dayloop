import * as Notifications from "expo-notifications";

export async function devCancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
