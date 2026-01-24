// src/presentation/hooks/useCalendarSync.ts
import {
  container,
  SETTINGS_KEY_CALENDAR_SYNC,
} from "@/core/di/container";
import * as Calendar from "expo-calendar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export type CalendarPermissionStatus =
  | "loading"
  | "undetermined"
  | "denied"
  | "granted";

const IS_IOS = Platform.OS === "ios";

export function useCalendarSync() {
  const [calendarSyncEnabled, setCalendarSyncEnabledState] = useState(false);
  const [permStatus, setPermStatus] =
    useState<CalendarPermissionStatus>("loading");
  const [syncing, setSyncing] = useState(false);
  const loadingRef = useRef(false);

  const refreshEnabled = useCallback(async () => {
    try {
      const v = await container.getSetting.execute(SETTINGS_KEY_CALENDAR_SYNC);
      setCalendarSyncEnabledState(v === "1");
    } catch {
      setCalendarSyncEnabledState(false);
    }
  }, []);

  const refreshPermission = useCallback(async () => {
    if (!IS_IOS) {
      setPermStatus("denied");
      return;
    }
    try {
      const res = await Calendar.getCalendarPermissionsAsync();
      setPermStatus(
        res.status === "granted"
          ? "granted"
          : res.status === "denied"
            ? "denied"
            : "undetermined"
      );
    } catch {
      setPermStatus("denied");
    }
  }, []);

  useEffect(() => {
    refreshEnabled();
  }, [refreshEnabled]);

  useEffect(() => {
    if (IS_IOS) refreshPermission();
    else setPermStatus("denied");
  }, [refreshPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!IS_IOS) return false;
    if (loadingRef.current) return permStatus === "granted";
    loadingRef.current = true;
    try {
      const current = await Calendar.getCalendarPermissionsAsync();
      if (current.status === "granted") {
        setPermStatus("granted");
        return true;
      }
      const req = await Calendar.requestCalendarPermissionsAsync();
      setPermStatus(
        req.status === "granted"
          ? "granted"
          : req.status === "denied"
            ? "denied"
            : "undetermined"
      );
      return req.status === "granted";
    } catch {
      setPermStatus("denied");
      return false;
    } finally {
      loadingRef.current = false;
    }
  }, [permStatus]);

  const setCalendarSyncEnabled = useCallback(
    async (enabled: boolean) => {
      await container.setSetting.execute(
        SETTINGS_KEY_CALENDAR_SYNC,
        enabled ? "1" : "0"
      );
      setCalendarSyncEnabledState(enabled);
    },
    []
  );

  const syncNow = useCallback(async () => {
    if (!IS_IOS) return;
    if (syncing) return;
    setSyncing(true);
    try {
      const habits = await container.getAllHabits.execute();
      await container.calendarSyncService.syncHabits(habits);
    } catch (e) {
      if (__DEV__) console.warn("[useCalendarSync] syncNow", e);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return {
    isIOS: IS_IOS,
    calendarSyncEnabled,
    setCalendarSyncEnabled,
    permStatus,
    requestPermission,
    refreshPermission,
    refreshEnabled,
    syncNow,
    syncing,
    isPermitted: permStatus === "granted",
  };
}
