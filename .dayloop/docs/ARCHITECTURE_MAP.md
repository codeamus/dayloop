# Mapa de Arquitectura - Dayloop

## Visión General

Dayloop sigue una arquitectura en capas (Clean Architecture) con separación clara de responsabilidades. El flujo de dependencias es unidireccional y respeta el principio de inversión de dependencias.

## Flujo de Dependencias (Regla de Oro)

```
Presentation → Domain/Core
Data → Domain (Implementación de Repositorios)
Infrastructure → Domain/Core (Implementación de Interfaces)
```

**Regla crítica:** Domain NO debe importar de Data, Presentation o Infrastructure. Solo define interfaces y entidades.

## Capas Detalladas

### 1. Domain (`src/domain/`)

**Responsabilidad:** Lógica de negocio pura, independiente de frameworks y tecnologías.

#### Estructura:
- **`entities/`**: Modelos de dominio
  - `Habit.ts`: Entidad principal del hábito
  - `HabitLog.ts`: Entidad de registro de cumplimiento
- **`repositories/`**: Interfaces (contratos) para acceso a datos
  - `HabitRepository.ts`: Contrato para operaciones CRUD de hábitos
  - `HabitLogRepository.ts`: Contrato para operaciones de logs
- **`usecases/`**: Casos de uso (única forma de interactuar con datos desde la UI)
  - `CreateHabit.ts`, `UpdateHabit.ts`, `DeleteHabit.ts`
  - `GetTodayHabits.ts`, `GetAllHabits.ts`
  - `GetHabitStreaks.ts`, `GetHabitMonthlyStats.ts`, `GetWeeklySummary.ts`
  - `ToggleHabitForDate.ts`, `ToggleHabitForToday.ts`
  - `SetHabitPaused.ts`, `AutoDisableExpiredHabits.ts`
- **`services/`**: Servicios de dominio
  - `habitDue.ts`: Lógica para determinar si un hábito está "due" hoy
  - `NotificationScheduler.ts`: Interfaz para programación de notificaciones

**Dependencias permitidas:**
- ✅ Solo imports internos de domain
- ✅ Utilidades puras de `src/utils/` (sin dependencias de framework)

**Dependencias prohibidas:**
- ❌ `@/data/*` (implementaciones SQLite)
- ❌ `@/presentation/*` (componentes UI)
- ❌ `@/infrastructure/*` (adaptadores externos)
- ❌ `expo-sqlite`, `react-native`, etc.

### 2. Data (`src/data/`)

**Responsabilidad:** Implementación concreta de persistencia usando SQLite.

#### Estructura:
- **`sqlite/`**:
  - `database.ts`: Configuración de DB, schema inicial, migraciones (v1→v5)
  - `SqliteHabitRepository.ts`: Implementación de `HabitRepository`
  - `SqliteHabitLogRepository.ts`: Implementación de `HabitLogRepository`
  - `debug.ts`: Utilidades de debugging

**Dependencias permitidas:**
- ✅ `@/domain/entities/*` (tipos)
- ✅ `@/domain/repositories/*` (interfaces)
- ✅ `expo-sqlite` (framework de persistencia)

**Dependencias prohibidas:**
- ❌ `@/presentation/*`
- ❌ `@/core/*` (excepto si es necesario para DI)

### 3. Core (`src/core/`)

**Responsabilidad:** Utilidades globales, configuración, DI, y servicios compartidos.

#### Estructura:
- **`di/container.ts`**: Contenedor de inyección de dependencias
  - Instancia repositorios (SQLite)
  - Instancia casos de uso
  - Instancia servicios (notificaciones)
- **`features/features.ts`**: Feature flags (ej: `calendarSync`)
- **`notifications/notifications.ts`**: Lógica de notificaciones
- **`settings/`**: Configuración de onboarding, recordatorios
- **`calendar/CalendarService.ts`**: Servicio de calendario
- **`review/reviewPrompt.ts`**: Lógica de prompts de reseña

**Dependencias permitidas:**
- ✅ `@/domain/*` (entidades, interfaces, casos de uso)
- ✅ `@/data/*` (repositorios concretos)
- ✅ `@/infrastructure/*` (adaptadores)
- ✅ Utilidades de `src/utils/`

### 4. Infrastructure (`src/infrastructure/`)

**Responsabilidad:** Adaptadores para servicios externos (Expo, APIs, etc.).

#### Estructura:
- **`notifications/`**:
  - `ExpoNotificationScheduler.ts`: Implementación de `NotificationScheduler`
  - `notificationCopy.ts`: Textos de notificaciones
  - `devCancelAll.ts`: Utilidades de desarrollo

**Dependencias permitidas:**
- ✅ `@/domain/services/*` (interfaces)
- ✅ `expo-notifications`, etc.

**Dependencias prohibidas:**
- ❌ `@/data/*`
- ❌ `@/presentation/*`

### 5. Presentation (`src/presentation/`)

**Responsabilidad:** Componentes React Native, hooks, y navegación.

#### Estructura:
- **`components/`**: Componentes reutilizables
  - `MonthlyCalendar.tsx`, `ColorPickerSheet.tsx`, `EmojiPickerSheet.tsx`
  - `Screen.tsx`, `StatusPill.tsx`, `WeekdaySelector.tsx`
  - `ToastProvider.tsx`
- **`hooks/`**: Hooks de React que consumen casos de uso
  - `useTodayHabits.ts`, `useAllHabits.ts`, `useHabit.ts`
  - `useCreateHabit.ts`, `useHabitStreak.ts`, `useHabitMonthlyStats.ts`
  - `useWeeklySummary.ts`, `useToggleHabitForDate.ts`
  - `useNotificationPermission.ts`, `useOnboardingGate.ts`

**Dependencias permitidas:**
- ✅ `@/core/di/container` (para obtener casos de uso)
- ✅ `@/domain/entities/*` (tipos)
- ✅ `@/domain/usecases/*` (tipos de retorno)
- ✅ `@/domain/services/*` (servicios de dominio, ej: `habitDue.ts`)
- ✅ `react-native`, `expo-router`, etc.

**Dependencias prohibidas:**
- ❌ `@/data/*` (NO acceder directamente a SQLite)
- ❌ `expo-sqlite` (NO usar directamente)

### 6. Utils (`src/utils/`)

**Responsabilidad:** Funciones puras y helpers sin dependencias de framework.

#### Estructura:
- `time.ts`: Helpers para formato `HH:mm`
- `timeOfDay.ts`: Lógica de "morning/afternoon/evening"
- `habitTime.ts`: Helpers para tiempos de hábitos
- `shared/id.ts`: Generación de IDs

**Dependencias permitidas:**
- ✅ Solo funciones puras de JavaScript/TypeScript

## Verificación de Dependencias Circulares

### ✅ Verificado: Domain es independiente
- `src/domain/` NO importa de `@/data/*`, `@/presentation/*`, ni `@/infrastructure/*`
- Solo importa tipos de `@/domain/*` y utilidades puras

### ✅ Verificado: Data implementa interfaces de Domain
- `SqliteHabitRepository` implementa `HabitRepository`
- `SqliteHabitLogRepository` implementa `HabitLogRepository`
- Solo importa tipos de Domain, no lógica

### ✅ Verificado: Presentation usa casos de uso
- Los hooks importan `container` y llaman a `container.*.execute()`
- No acceden directamente a repositorios (excepto un caso menor en `useHabit.ts`)

### ⚠️ Nota Menor: `useHabit.ts`
- Línea 15: Accede directamente a `container.habitRepository.getById(id)`
- **Recomendación:** Crear un caso de uso `GetHabitById` para mantener consistencia

## Inyección de Dependencias

El contenedor DI (`src/core/di/container.ts`) centraliza todas las instancias:
- Repositorios: `SqliteHabitRepository`, `SqliteHabitLogRepository`
- Servicios: `ExpoNotificationScheduler`
- Casos de uso: Todos los use cases instanciados con sus dependencias

**Patrón:** Los hooks de presentation obtienen casos de uso desde `container`, nunca instancian directamente.

## Resumen de Salud Arquitectónica

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Separación de capas | ✅ Excelente | Domain completamente aislado |
| Dependencias circulares | ✅ Sin problemas | Flujo unidireccional respetado |
| Uso de casos de uso | ⚠️ Mayormente correcto | 1 caso menor: `useHabit.ts` accede directamente a repo |
| Inversión de dependencias | ✅ Correcta | Data implementa interfaces de Domain |
| Independencia de Domain | ✅ Correcta | No depende de frameworks |
