# Deuda Técnica - Dayloop

Este documento registra violaciones de arquitectura, inconsistencias, y mejoras recomendadas detectadas en el código base.

## Violaciones de Arquitectura

### 1. Acceso Directo a Repositorio en Presentation

**Ubicación:** `src/presentation/hooks/useHabit.ts` (línea 15)

**Problema:**
```typescript
const result = await container.habitRepository.getById(id);
```

**Violación:** El hook accede directamente al repositorio en lugar de usar un caso de uso.

**Impacto:** Bajo. Funciona correctamente, pero rompe el principio de que Presentation solo debe usar casos de uso.

**Recomendación:**
1. Crear un caso de uso `GetHabitById` en `src/domain/usecases/GetHabitById.ts`:
   ```typescript
   export class GetHabitById {
     constructor(private habitRepository: HabitRepository) {}
     async execute(id: HabitId): Promise<Habit | null> {
       return this.habitRepository.getById(id);
     }
   }
   ```
2. Agregarlo al contenedor DI
3. Actualizar `useHabit.ts` para usar `container.getHabitById.execute(id)`

**Prioridad:** Media (mejora consistencia arquitectónica)

---

## Inconsistencias Menores

### 2. Columna `completed_at` No Utilizada

**Ubicación:** `src/data/sqlite/database.ts` (línea 46)

**Problema:** La tabla `habit_logs` tiene una columna `completed_at TEXT` que no se usa en ningún lugar del código.

**Impacto:** Muy bajo. Solo ocupa espacio en el schema.

**Recomendación:**
- Opción A: Eliminar la columna en una futura migración (V6)
- Opción B: Implementar la funcionalidad para guardar timestamp de completado

**Prioridad:** Baja (limpieza de schema)

---

### 3. Columna Legacy `time` en Habits

**Ubicación:** `src/data/sqlite/database.ts` (línea 23), `src/domain/entities/Habit.ts` (línea 39)

**Problema:** La columna `time` está marcada como LEGACY pero aún se mantiene y se usa como fallback en varios lugares.

**Impacto:** Bajo. Funciona como fallback, pero añade complejidad.

**Recomendación:**
- Mantener por ahora para compatibilidad con datos existentes
- Documentar que `startTime` y `endTime` son los campos preferidos
- Considerar migración de datos y eliminación en versión futura (V7+)

**Prioridad:** Baja (legacy mantenido intencionalmente)

---

## Mejoras Recomendadas

### 4. Falta de Índices en Base de Datos

**Ubicación:** `src/data/sqlite/database.ts`

**Problema:** No hay índices explícitos en las tablas. SQLite crea automáticamente índices para PRIMARY KEY, pero queries frecuentes podrían beneficiarse de índices adicionales.

**Recomendación:**
Agregar índices en migración futura:
```sql
CREATE INDEX idx_habit_logs_habit_id_date ON habit_logs(habit_id, date);
CREATE INDEX idx_habit_logs_date ON habit_logs(date);
```

**Prioridad:** Media (mejora rendimiento en queries grandes)

---

### 5. Feature Flags No Implementados

**Ubicación:** `src/core/features/features.ts`

**Problema:** Solo hay un feature flag (`calendarSync`) con un comentario sobre premium, pero no hay sistema de suscripción implementado.

**Recomendación:**
- Implementar servicio de suscripción cuando sea necesario
- Crear `src/core/subscription/subscriptionService.ts`
- Actualizar `features.ts` para usar el servicio

**Prioridad:** Baja (funcionalidad futura)

---

### 6. Validación de Datos en Repositorios

**Ubicación:** `src/data/sqlite/SqliteHabitRepository.ts`, `SqliteHabitLogRepository.ts`

**Problema:** Los repositorios confían en que los datos vienen correctos del dominio, pero no hay validación explícita de formatos (ej: `"YYYY-MM-DD"` para fechas).

**Impacto:** Bajo. El dominio debería validar, pero una capa extra de seguridad ayudaría.

**Recomendación:**
- Agregar validaciones básicas en repositorios (ej: regex para `"YYYY-MM-DD"`)
- O confiar en el dominio y documentar que la validación debe estar en casos de uso

**Prioridad:** Baja (defensa en profundidad)

---

### 7. Manejo de Errores en Migraciones

**Ubicación:** `src/data/sqlite/database.ts` (función `migrateIfNeeded`)

**Problema:** Si una migración falla, se hace ROLLBACK, pero no hay logging detallado ni recuperación.

**Recomendación:**
- Mejorar logging de errores en migraciones
- Considerar migraciones parciales o rollback más granular

**Prioridad:** Baja (funciona correctamente, solo mejora de observabilidad)

---

## Resumen de Prioridades

| # | Item | Prioridad | Esfuerzo | Impacto |
|---|------|------------|----------|---------|
| 1 | Acceso directo a repo en `useHabit.ts` | Media | Bajo | Consistencia arquitectónica |
| 2 | Columna `completed_at` no usada | Baja | Bajo | Limpieza |
| 3 | Columna legacy `time` | Baja | Medio | Compatibilidad |
| 4 | Falta de índices en DB | Media | Bajo | Rendimiento |
| 5 | Feature flags no implementados | Baja | Alto | Funcionalidad futura |
| 6 | Validación en repositorios | Baja | Medio | Seguridad |
| 7 | Manejo de errores en migraciones | Baja | Bajo | Observabilidad |

## Estado General

**Salud del Proyecto:** ✅ **Buena**

- Arquitectura limpia y bien separada
- Solo 1 violación menor de arquitectura
- Código consistente en manejo de fechas
- Sin dependencias circulares
- Buen uso de casos de uso en la mayoría del código

**Recomendación:** Abordar el item #1 (acceso directo a repo) para mantener consistencia arquitectónica perfecta.
