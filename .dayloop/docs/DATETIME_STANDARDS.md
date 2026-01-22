# Estándares de Manejo de Fechas y Horas - Dayloop

## Principio Fundamental: Local-Time-First

**Dayloop es una aplicación Local-Time-First.** Esto significa que todas las fechas se manejan en la zona horaria local del usuario, nunca en UTC.

### ⚠️ Prohibición Crítica

**NUNCA usar `toISOString()` para persistencia de días.**

El método `toISOString()` convierte a UTC, lo que causa bugs cuando un usuario marca un hábito a las 11 PM local: se guarda como el día siguiente en UTC.

## Formato de Persistencia

### Fechas: `"YYYY-MM-DD"` (string)

Todas las fechas se guardan como strings en formato ISO date (sin hora):
- ✅ Correcto: `"2024-01-15"`
- ❌ Incorrecto: `"2024-01-15T00:00:00.000Z"` (UTC)
- ❌ Incorrecto: `new Date().toISOString().split('T')[0]` (puede cambiar de día en UTC)

### Horas: `"HH:mm"` (string)

Las horas se guardan como strings en formato 24 horas:
- ✅ Correcto: `"08:00"`, `"23:30"`
- ❌ Incorrecto: `"8:0"` (debe tener padding)
- ❌ Incorrecto: Timestamps o objetos Date

## Helpers Locales

### Conversión Date → "YYYY-MM-DD" (Local)

**Función recomendada:**
```typescript
function toLocalYMD(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
```

**Ubicaciones en el código:**
- `src/domain/usecases/GetHabitStreaks.ts` (línea 20-24)
- `src/domain/usecases/GetHabitMonthlyStats.ts` (línea 22-26)

### Conversión "YYYY-MM-DD" → Date (Local)

**Función recomendada:**
```typescript
function parseLocalYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
}
```

**Ubicaciones en el código:**
- `src/domain/usecases/GetHabitStreaks.ts` (línea 14-17)

### Obtener "Hoy" en Local

**Función recomendada:**
```typescript
const today = toLocalYMD(new Date());
```

**Nota:** `new Date()` crea una fecha en la zona horaria local del dispositivo. Al usar `getFullYear()`, `getMonth()`, `getDate()` (sin métodos UTC), obtenemos los componentes locales.

## Operaciones con Fechas Locales

### Sumar/Restar Días

**Función recomendada:**
```typescript
function addDaysLocalYMD(dateStr: string, days: number): string {
  const dt = parseLocalYMD(dateStr);
  dt.setDate(dt.getDate() + days);
  return toLocalYMD(dt);
}

function previousDate(dateStr: string): string {
  return addDaysLocalYMD(dateStr, -1);
}
```

**Ubicaciones en el código:**
- `src/domain/usecases/GetHabitStreaks.ts` (línea 28-36)

### Obtener Día de la Semana (0-6)

**Función recomendada:**
```typescript
function getWeekDayFromLocalDate(dateStr: string): number {
  return parseLocalYMD(dateStr).getDay(); // 0..6 (Dom=0, Lun=1, ...)
}
```

**Ubicaciones en el código:**
- `src/domain/usecases/GetHabitStreaks.ts` (línea 40-42)
- `src/domain/usecases/GetHabitMonthlyStats.ts` (línea 44-47)

### Obtener Día del Mes (1-31)

**Función recomendada:**
```typescript
function getDayOfMonthFromLocalDate(dateStr: string): number {
  const { y, m, d } = parseYMD(dateStr);
  return new Date(y, m - 1, d).getDate(); // 1..31
}
```

**Ubicaciones en el código:**
- `src/domain/usecases/GetHabitMonthlyStats.ts` (línea 50-53)

## Comparaciones de Fechas

### Comparación Lexicográfica

Para fechas en formato `"YYYY-MM-DD"`, la comparación lexicográfica funciona correctamente:

```typescript
const date1 = "2024-01-15";
const date2 = "2024-01-20";

if (date1 > date2) { // false
  // ...
}
```

**Ubicaciones en el código:**
- `src/domain/usecases/GetTodayHabits.ts` (línea 31): `date > ec.endDate`

### Verificar si una Fecha es "Hoy"

```typescript
const today = toLocalYMD(new Date());
const isToday = dateStr === today;
```

### Verificar si una Fecha es Futura

```typescript
const today = toLocalYMD(new Date());
const isFuture = dateStr > today;
```

## Ejemplos de Uso Correcto

### ✅ Guardar un log de hábito

```typescript
const today = toLocalYMD(new Date()); // "2024-01-15"
await habitLogRepository.upsertLog(habitId, today, true);
```

### ✅ Obtener logs desde una fecha

```typescript
const fromDate = toLocalYMD(new Date()); // hoy
const logs = await habitLogRepository.getLogsForHabitSince(habitId, fromDate);
```

### ✅ Calcular racha (streak)

```typescript
const today = toLocalYMD(new Date());
let cursor = today;
let streak = 0;

while (doneSet.has(cursor)) {
  streak++;
  cursor = previousDate(cursor); // retrocede un día local
}
```

## Ejemplos de Uso Incorrecto

### ❌ Usar toISOString()

```typescript
// ❌ INCORRECTO
const today = new Date().toISOString().split('T')[0];
// Problema: Si son las 11 PM local, puede cambiar de día en UTC
```

### ❌ Usar métodos UTC

```typescript
// ❌ INCORRECTO
const year = date.getUTCFullYear();
const month = date.getUTCMonth();
// Problema: Convierte a UTC, puede cambiar de día
```

### ❌ Comparar timestamps

```typescript
// ❌ INCORRECTO
const date1 = new Date("2024-01-15").getTime();
const date2 = new Date("2024-01-20").getTime();
// Problema: Los timestamps incluyen hora, pueden causar bugs de día
```

## Verificación en el Código

### ✅ Verificado: No hay uso de `toISOString()`

Búsqueda en el código base:
- Solo aparece mencionado en `DATETIME_GUIDELINES.md` como advertencia
- No se usa en código de producción

### ✅ Verificado: Uso consistente de helpers locales

Los casos de uso principales usan las funciones locales:
- `GetHabitStreaks.ts`: Usa `toLocalYMD()`, `parseLocalYMD()`, `addDaysLocalYMD()`
- `GetHabitMonthlyStats.ts`: Usa `toLocalYMD()`, `parseYMD()`, `previousDate()`
- `GetTodayHabits.ts`: Usa helpers locales para parsear fechas

### ✅ Verificado: Persistencia en formato correcto

- `SqliteHabitLogRepository`: Guarda `date` como `"YYYY-MM-DD"` (string)
- `SqliteHabitRepository`: Guarda `paused_at` como `"YYYY-MM-DD"` (string) o `null`

## Resumen de Reglas

| Regla | Estado | Ubicación |
|-------|--------|-----------|
| No usar `toISOString()` | ✅ Cumplido | Verificado en código |
| Fechas como `"YYYY-MM-DD"` | ✅ Cumplido | Repositorios |
| Horas como `"HH:mm"` | ✅ Cumplido | Repositorios |
| Helpers locales para conversión | ✅ Cumplido | Use cases |
| Comparaciones lexicográficas | ✅ Cumplido | Use cases |
| Operaciones con días locales | ✅ Cumplido | Use cases |

## Referencias

- `DATETIME_GUIDELINES.md` (raíz del proyecto): Documentación original del problema
- `src/domain/usecases/GetHabitStreaks.ts`: Implementación de rachas con fechas locales
- `src/domain/usecases/GetHabitMonthlyStats.ts`: Estadísticas mensuales con fechas locales
- `src/data/sqlite/SqliteHabitLogRepository.ts`: Persistencia de logs con fechas `"YYYY-MM-DD"`
