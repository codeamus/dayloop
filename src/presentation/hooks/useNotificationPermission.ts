import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationPermissionStatus =
  | "undetermined"
  | "denied"
  | "granted";

export function useNotificationPermission() {
  const [status, setStatus] =
    useState<NotificationPermissionStatus>("undetermined");
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await Notifications.getPermissionsAsync();
      setStatus(
        res.status === "granted"
          ? "granted"
          : res.status === "denied"
          ? "denied"
          : "undetermined"
      );
    } catch {
      // si falla, no cambies nada
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    // evita doble click / doble request simultáneo
    if (loadingRef.current) return status === "granted";
    loadingRef.current = true;

    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.status === "granted") {
        setStatus("granted");
        return true;
      }

      const req = await Notifications.requestPermissionsAsync();
      const next =
        req.status === "granted"
          ? "granted"
          : req.status === "denied"
          ? "denied"
          : "undetermined";

      setStatus(next);
      return next === "granted";
    } catch {
      return false;
    } finally {
      loadingRef.current = false;
    }
  }, [status]);

  return {
    status,
    refresh,
    requestPermission,
    isGranted: status === "granted",
    isDenied: status === "denied",
  };
}
