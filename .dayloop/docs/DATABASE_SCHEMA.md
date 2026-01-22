# Esquema de Base de Datos - Dayloop

## Visión General

Dayloop utiliza **SQLite** (via `expo-sqlite`) con modo **WAL** (Write-Ahead Logging) para mejor rendimiento en escrituras concurrentes.

**Versión actual del schema:** `5`

## Tablas

### 1. `habits`

Tabla principal que almacena la configuración de los hábitos.

#### Columnas

| Columna | Tipo | Descripción | Notas |
|---------|------|-------------|-------|
| `id` | `TEXT PRIMARY KEY` | Identificador único del hábito | UUID generado con `newId()` |
| `name` | `TEXT NOT NULL` | Nombre del hábito | Ej: "Meditar", "Ejercicio" |
| `color` | `TEXT NOT NULL` | Color del hábito | Hex color (ej: "#e6bc01") |
| `icon` | `TEXT NOT NULL` | Emoji/icono del hábito | Ej: "🔥", "💪" |
| `schedule_type` | `TEXT NOT NULL` | Tipo de programación | Valores: `"daily"`, `"weekly"`, `"monthly"` |
| `schedule_days` | `TEXT` | Días programados (JSON) | `null` para daily, `"[0,1,2]"` para weekly, `"[1,15]"` para monthly |
| `end_condition` | `TEXT` | Condición de fin (JSON) | `'{"type":"none"}'` o `'{"type":"byDate","endDate":"2024-12-31"}'` |
| `time_of_day` | `TEXT` | Período del día | `"morning"`, `"afternoon"`, `"evening"` |
| `time` | `TEXT` | ⚠️ **LEGACY** | Mantenido para compatibilidad, usar `start_time` |
| `start_time` | `TEXT` | Hora de inicio | Formato `"HH:mm"` (ej: `"08:00"`) |
| `end_time` | `TEXT` | Hora de fin | Formato `"HH:mm"` (ej: `"08:30"`) |
| `calendar_event_id` | `TEXT` | ID de evento de calendario | `null` si no está sincronizado |
| `reminder_offset_minutes` | `INTEGER` | Minutos antes de `start_time` para recordatorio | `null` si no hay recordatorio |
| `notification_ids` | `TEXT` | IDs de notificaciones (JSON) | Array de strings: `'["id1","id2"]'` |
| `is_paused` | `INTEGER` | Si el hábito está pausado | `0` = activo, `1` = pausado |
| `paused_at` | `TEXT` | Fecha de pausa | Formato `"YYYY-MM-DD"` o `null` |
| `pause_reason` | `TEXT` | Razón de pausa | `"manual"` o `"ended"` o `null` |

#### Ejemplo de Registro

```json
{
  "id": "abc123",
  "name": "Meditar",
  "color": "#e6bc01",
  "icon": "🧘",
  "schedule_type": "daily",
  "schedule_days": null,
  "end_condition": "{\"type\":\"none\"}",
  "time_of_day": "morning",
  "start_time": "08:00",
  "end_time": "08:30",
  "calendar_event_id": null,
  "reminder_offset_minutes": 15,
  "notification_ids": "[\"notif-1\",\"notif-2\"]",
  "is_paused": 0,
  "paused_at": null,
  "pause_reason": null
}
```

### 2. `habit_logs`

Tabla que almacena los registros de cumplimiento de hábitos por fecha.

#### Columnas

| Columna | Tipo | Descripción | Notas |
|---------|------|-------------|-------|
| `id` | `TEXT PRIMARY KEY` | Identificador único del log | UUID generado con `randomUUID()` |
| `habit_id` | `TEXT NOT NULL` | FK a `habits.id` | Referencia al hábito |
| `date` | `TEXT NOT NULL` | Fecha del log | Formato `"YYYY-MM-DD"` (LOCAL, no UTC) |
| `done` | `INTEGER NOT NULL` | Si el hábito fue completado | `0` = no hecho, `1` = hecho |
| `completed_at` | `TEXT` | ⚠️ **No utilizado actualmente** | Reservado para futuro |

#### Constraint Único

```sql
UNIQUE(habit_id, date)
```

Esto garantiza que solo puede haber un log por hábito por fecha. El repositorio usa `upsertLog()` para actualizar si existe o insertar si no.

#### Ejemplo de Registro

```json
{
  "id": "log-xyz",
  "habit_id": "abc123",
  "date": "2024-01-15",
  "done": 1,
  "completed_at": null
}
```

## Migraciones

El sistema de migraciones usa `PRAGMA user_version` para trackear la versión actual del schema.

### Migración V1 → V2

**Cambios:**
- Agrega columnas `start_time`, `end_time`, `calendar_event_id`
- Migra datos de `time` (legacy) a `start_time`
- Calcula `end_time` como `start_time + 30 minutos` si no existe
- Valores por defecto: `start_time = "08:00"`, `end_time = "08:30"`

### Migración V2 → V3

**Cambios:**
- Normaliza `schedule_type`: convierte `NULL` o vacío a `"daily"`
- Normaliza `schedule_days`: convierte `NULL` o vacío a `"[]"` para weekly/monthly
- Normaliza `end_condition`: convierte `NULL` o vacío a `'{"type":"none"}'`

### Migración V3 → V4

**Cambios:**
- Agrega columna `notification_ids` (TEXT)
- Inicializa con `'[]'` para hábitos existentes

### Migración V4 → V5

**Cambios:**
- Agrega columnas de pausa: `is_paused`, `paused_at`, `pause_reason`
- Inicializa `is_paused = 0` (activo) para hábitos existentes
- Inicializa `paused_at = NULL` y `pause_reason = NULL`

## Funciones de Utilidad

### `initDatabase()`

Inicializa la base de datos:
1. Activa modo WAL
2. Crea tablas si no existen
3. Ejecuta migraciones si es necesario

### `migrateIfNeeded()`

Verifica `PRAGMA user_version` y ejecuta migraciones pendientes en una transacción:
- Si falla, hace `ROLLBACK`
- Si tiene éxito, actualiza `PRAGMA user_version`

### `resetDatabase()`

**⚠️ Solo para desarrollo/testing:**
- Hace `WAL checkpoint`
- Elimina todas las tablas
- Resetea `PRAGMA user_version = 0`
- Ejecuta `VACUUM`
- Re-ejecuta `initDatabase()` (recrea schema + migraciones)

## Convenciones de Datos

### Fechas
- **Formato:** `"YYYY-MM-DD"` (string)
- **Zona horaria:** LOCAL (nunca UTC)
- **Ejemplo:** `"2024-01-15"` (15 de enero de 2024 en zona local)

### Horas
- **Formato:** `"HH:mm"` (24 horas)
- **Ejemplo:** `"08:00"`, `"23:30"`

### JSON en Columnas TEXT

Las siguientes columnas almacenan JSON:
- `schedule_days`: `"[0,1,2]"` o `"[1,15,31]"` o `null`
- `end_condition`: `'{"type":"none"}'` o `'{"type":"byDate","endDate":"2024-12-31"}'`
- `notification_ids`: `'["id1","id2"]'` o `'[]'`

**Nota:** El repositorio usa `JSON.stringify()` y `JSON.parse()` para serializar/deserializar.

### Booleanos

Los booleanos se almacenan como `INTEGER`:
- `0` = `false`
- `1` = `true`

Ejemplos: `is_paused`, `done`

## Índices

Actualmente no hay índices explícitos. SQLite crea automáticamente un índice para `PRIMARY KEY`.

**Recomendación futura:** Considerar índices en:
- `habit_logs(habit_id, date)` para queries de logs por hábito
- `habit_logs(date)` para queries de logs por fecha

## Queries Comunes

### Obtener todos los hábitos
```sql
SELECT * FROM habits ORDER BY rowid DESC;
```

### Obtener logs de un hábito desde una fecha
```sql
SELECT * FROM habit_logs
WHERE habit_id = ? AND date >= ?
ORDER BY date ASC;
```

### Obtener logs de una fecha específica
```sql
SELECT * FROM habit_logs WHERE date = ?;
```

### Upsert de log (implementado en repositorio)
```sql
-- 1. Buscar si existe
SELECT id, done FROM habit_logs WHERE habit_id = ? AND date = ?;

-- 2a. Si no existe: INSERT
INSERT INTO habit_logs (id, habit_id, date, done) VALUES (?, ?, ?, ?);

-- 2b. Si existe: UPDATE
UPDATE habit_logs SET done = ? WHERE id = ?;
```
