// src/domain/services/CalendarSyncService.ts
import type { Habit } from "@/domain/entities/Habit";

/**
 * Servicio de sincronización con el calendario del dispositivo (iOS Calendar).
 * App -> Calendario: los hábitos se exportan como eventos en un calendario "Dayloop".
 * En Android no se soporta; las llamadas deben fallar silenciosamente o ser no-op.
 */
export interface CalendarSyncService {
  /**
   * Sincroniza los hábitos activos al calendario "Dayloop":
   * - Busca o crea el calendario "Dayloop" (color corporativo #E6BC01).
   * - Elimina eventos existentes en ese calendario para los próximos 7 días.
   * - Crea nuevos eventos según hábitos activos (bloque: start/end; puntual: 5 min).
   * - Respeta schedule (daily/weekly/monthly) y zona horaria local.
   */
  syncHabits(habits: Habit[]): Promise<void>;
}
