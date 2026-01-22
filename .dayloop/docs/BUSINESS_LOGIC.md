# Lógica de Negocio - Dayloop

## Definición de Hábito

Un **Hábito** en Dayloop es una actividad recurrente que el usuario quiere realizar de forma consistente. Cada hábito tiene:

### Propiedades Principales

1. **Identificación**
   - `id`: UUID único
   - `name`: Nombre del hábito (ej: "Meditar", "Ejercicio")
   - `icon`: Emoji/icono (ej: "🔥", "💪")
   - `color`: Color hexadecimal (ej: "#e6bc01")

2. **Programación (Schedule)**
   - `schedule`: Define cuándo el hábito debe realizarse
     - **Daily**: Todos los días
     - **Weekly**: Días específicos de la semana (0-6, donde 0=Domingo)
     - **Monthly**: Días específicos del mes (1-31)

3. **Tiempo**
   - `startTime`: Hora de inicio en formato `"HH:mm"` (ej: `"08:00"`)
   - `endTime`: Hora de fin en formato `"HH:mm"` (ej: `"08:30"`)
   - `timeOfDay`: Período del día (`"morning"`, `"afternoon"`, `"evening"`)
     - Se deriva automáticamente de `startTime`:
       - `morning`: 5:00 - 11:59
       - `afternoon`: 12:00 - 17:59
       - `evening`: 18:00 - 23:59 y 00:00 - 04:59

4. **Condición de Fin**
   - `endCondition`: Define si el hábito tiene fecha de expiración
     - `{ type: "none" }`: Sin fecha de fin
     - `{ type: "byDate", endDate: "YYYY-MM-DD" }`: Termina en una fecha específica

5. **Notificaciones**
   - `reminderOffsetMinutes`: Minutos antes de `startTime` para recordatorio (o `null`)
   - `notificationIds`: Array de IDs de notificaciones programadas

6. **Estado de Pausa**
   - `isPaused`: Si el hábito está pausado (`true`/`false`)
   - `pausedAt`: Fecha de pausa en formato `"YYYY-MM-DD"` (o `null`)
   - `pauseReason`: Razón de pausa (`"manual"` o `"ended"`)

7. **Sincronización con Calendario**
   - `calendarEventId`: ID del evento en el calendario del dispositivo (o `null`)

### Ejemplo de Hábito

```typescript
{
  id: "abc123",
  name: "Meditar",
  icon: "🧘",
  color: "#e6bc01",
  schedule: { type: "daily" },
  startTime: "08:00",
  endTime: "08:30",
  timeOfDay: "morning",
  endCondition: { type: "none" },
  reminderOffsetMinutes: 15,
  notificationIds: ["notif-1", "notif-2"],
  isPaused: false,
  pausedAt: null,
  pauseReason: null,
  calendarEventId: null
}
```

## Registro de Cumplimiento (HabitLog)

Un **HabitLog** registra si un hábito fue completado en una fecha específica:

```typescript
{
  id: "log-xyz",
  habitId: "abc123",
  date: "2024-01-15", // "YYYY-MM-DD" (local)
  done: true // o false
}
```

**Características:**
- Un solo log por hábito por fecha (constraint `UNIQUE(habit_id, date)`)
- La fecha se guarda en formato `"YYYY-MM-DD"` en zona horaria LOCAL
- `done: true` significa que el hábito fue completado ese día

## Cálculo de Rachas (Streaks)

Las rachas miden la consistencia del usuario en completar hábitos.

### Tipos de Rachas

#### 1. Daily Streak (Racha Diaria)

**Definición:** Días consecutivos en que el hábito fue completado, contando desde hoy hacia atrás.

**Reglas:**
- Solo cuenta días **programados** según el schedule del hábito
- Si un día no estaba programado, se salta (no rompe la racha)
- Se cuenta desde **hoy** hacia atrás hasta encontrar un día programado no completado

**Ejemplo:**
- Hábito: Daily
- Logs: 2024-01-15 ✅, 2024-01-14 ✅, 2024-01-13 ❌
- Current Daily Streak: **2** (15 y 14)

**Ejemplo con Weekly:**
- Hábito: Weekly (Lunes y Miércoles)
- Logs: 2024-01-15 (Mié) ✅, 2024-01-13 (Lun) ✅, 2024-01-10 (Vie) ❌ (no programado), 2024-01-08 (Mié) ✅
- Current Daily Streak: **2** (15 y 13, salta el 10 porque no estaba programado)

**Implementación:** `src/domain/usecases/GetHabitStreaks.ts` (líneas 146-190)

#### 2. Best Daily Streak (Mejor Racha Diaria)

**Definición:** La racha diaria más larga en todo el historial del hábito.

**Reglas:**
- Revisa todos los días completados en el historial
- Para cada día completado, cuenta hacia atrás cuántos días consecutivos fueron completados
- Retorna el máximo encontrado

**Implementación:** `src/domain/usecases/GetHabitStreaks.ts` (líneas 168-190)

#### 3. Weekly Streak (Racha Semanal)

**Definición:** Semanas consecutivas en que el hábito fue completado **completamente** (todos los días programados de esa semana).

**Reglas:**
- Solo aplica a hábitos `daily` o `weekly` (no `monthly`)
- Una semana está "completa" si **todos** los días programados de esa semana fueron completados
- La semana comienza en lunes (día 1)
- Se cuenta desde la semana actual hacia atrás

**Ejemplo:**
- Hábito: Weekly (Lunes y Miércoles)
- Semana 1 (8-14 Ene): Lun ✅, Mié ✅ → Semana completa
- Semana 2 (1-7 Ene): Lun ✅, Mié ✅ → Semana completa
- Semana 3 (25-31 Dic): Lun ✅, Mié ❌ → Semana incompleta
- Current Weekly Streak: **2**

**Implementación:** `src/domain/usecases/GetHabitStreaks.ts` (líneas 192-252)

#### 4. Best Weekly Streak (Mejor Racha Semanal)

**Definición:** La racha semanal más larga en todo el historial.

**Implementación:** `src/domain/usecases/GetHabitStreaks.ts` (líneas 229-242)

### Monthly Streak (Racha Mensual)

**Definición:** Días consecutivos del mes completados, contando desde hoy hacia atrás.

**Reglas:**
- Similar a Daily Streak, pero enfocado en el contexto mensual
- Puede cruzar meses hacia atrás (histórica)
- Solo cuenta días programados según el schedule

**Implementación:** `src/domain/usecases/GetHabitMonthlyStats.ts` (líneas 232-255)

## Lógica de "Due Today" (Hábito Vencido Hoy)

Un hábito está "due today" si:

1. **No está pausado** (`isPaused === false`)
2. **No ha expirado** según `endCondition`:
   - Si `endCondition.type === "byDate"` y `today > endCondition.endDate` → No está due
3. **Está programado para hoy** según su `schedule`:
   - `daily`: Siempre programado
   - `weekly`: Si el día de la semana actual está en `daysOfWeek`
   - `monthly`: Si el día del mes actual está en `daysOfMonth` (con normalización: si el mes tiene menos días, se usa el último día del mes)

**Implementación:** `src/domain/services/habitDue.ts`

## Modelo de Negocio

**Dayloop es 100% gratuito y sin restricciones.**

Todas las funcionalidades están disponibles sin límites:
- ✅ Creación ilimitada de hábitos
- ✅ Historial completo sin restricciones: acceso a toda la actividad desde el primer día
- ✅ Estadísticas avanzadas con agrupación por meses y semanas
- ✅ Visualización de años de datos con lazy loading optimizado
- ✅ Sincronización con calendario (si está implementada)
- ✅ Todas las features disponibles desde el primer uso

**Persistencia Local:**
- Todos los datos se almacenan localmente en SQLite
- No hay sincronización en la nube
- Privacidad total: los datos nunca salen del dispositivo
- El histórico se obtiene automáticamente desde el primer registro (MIN(date) en habit_logs)
- Si no hay registros, el inicio es la semana actual

## Estados de un Hábito en el Calendario Mensual

En `GetHabitMonthlyStats`, cada día del mes tiene un estado:

- **`done`**: El hábito fue completado ese día
- **`missed`**: El hábito estaba programado pero no fue completado (y ya pasó)
- **`unscheduled`**: El hábito no estaba programado para ese día
- **`future`**: El día está en el futuro (aún no ha llegado)

**Implementación:** `src/domain/usecases/GetHabitMonthlyStats.ts` (líneas 197-228)

## Resumen de Conceptos Clave

| Concepto | Descripción |
|----------|-------------|
| **Hábito** | Actividad recurrente con schedule, tiempo, y configuración |
| **HabitLog** | Registro de cumplimiento en una fecha específica |
| **Daily Streak** | Días consecutivos completados (desde hoy hacia atrás) |
| **Weekly Streak** | Semanas consecutivas completadas (todos los días programados) |
| **Due Today** | Hábito que debe realizarse hoy según su schedule |
| **Paused** | Estado temporal donde el hábito no aparece como "due" |
| **End Condition** | Fecha de expiración opcional del hábito |
| **Modelo de Negocio** | 100% gratuito, sin límites ni restricciones |
