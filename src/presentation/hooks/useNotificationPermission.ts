import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";

export function useNotificationPermission() {
  const [status, setStatus] = useState<Notifications.PermissionStatus | null>(
    null
  );

  useEffect(() => {
    Notifications.getPermissionsAsync().then((res) => {
      setStatus(res.status);
    });
  }, []);

  const request = async () => {
    const res = await Notifications.requestPermissionsAsync();
    setStatus(res.status);
    return res.status;
  };

  return {
    status, // "granted" | "denied" | "undetermined"
    isGranted: status === "granted",
    request,
  };
}
