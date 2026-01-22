# Dayloop AI Manifest (Instrucciones Permanentes)

Este documento contiene las reglas y flujos que **SIEMPRE** deben seguirse al desarrollar funcionalidades en Dayloop.

## Flujo Automático de Desarrollo

Siempre que se solicite desarrollar una funcionalidad, seguir este flujo **AUTOMÁTICAMENTE** sin que se repita:

### 1. Fase de Análisis

**ANTES de proponer cualquier solución:**

1. ✅ Consultar `.dayloop/docs/ARCHITECTURE_MAP.md`
   - Verificar capas y flujo de dependencias
   - Identificar dónde debe ir la nueva funcionalidad
   - Verificar que no se rompan reglas de arquitectura

2. ✅ Consultar `.dayloop/docs/BUSINESS_LOGIC.md`
   - Entender conceptos de negocio (Hábitos, Rachas, Due Today, etc.)
   - Verificar que la funcionalidad respete la lógica de negocio existente
   - Identificar si requiere cambios en entidades o casos de uso

3. ✅ Consultar `.dayloop/docs/DATETIME_STANDARDS.md` (si involucra fechas)
   - Verificar uso correcto de fechas locales
   - Prohibir uso de `toISOString()` para días

4. ✅ Consultar `.dayloop/docs/DATABASE_SCHEMA.md` (si involucra persistencia)
   - Verificar estructura de tablas
   - Identificar si requiere migraciones

### 2. Planificación

**Presentar un plan estructurado:**

1. Crear un plan de **3 a 7 puntos** claros y específicos
2. Listar **todos los archivos a modificar** organizados por capa:
   - `src/domain/` (entidades, casos de uso, servicios)
   - `src/data/` (repositorios, migraciones)
   - `src/presentation/` (componentes, hooks)
   - `src/core/` (DI, configuración)
   - `src/infrastructure/` (adaptadores)
3. Identificar **dependencias** entre cambios
4. Estimar si requiere **migraciones de base de datos**

### 3. Reglas de Código (CRÍTICAS)

#### 3.1. Ubicación de Lógica

- ✅ **Lógica de negocio SIEMPRE en `src/domain/usecases/`**
  - Nunca en componentes UI
  - Nunca en repositorios
  - Nunca en servicios de infraestructura

- ✅ **Persistencia SIEMPRE en `src/data/sqlite/`**
  - Repositorios implementan interfaces de `src/domain/repositories/`
  - Migraciones en `database.ts`

#### 3.2. Manejo de Fechas (PROHIBICIÓN ABSOLUTA)

- ❌ **PROHIBIDO usar `toISOString()` para días**
- ❌ **PROHIBIDO usar métodos UTC** (`getUTCFullYear()`, etc.)
- ✅ **SIEMPRE usar formato `"YYYY-MM-DD"` (string) en zona LOCAL**
- ✅ **SIEMPRE usar helpers locales** (`toLocalYMD()`, `parseLocalYMD()`, etc.)
- Ver ejemplos en `.dayloop/docs/DATETIME_STANDARDS.md`

#### 3.3. Jerarquía de Capas (INVIOLABLE)

```
Presentation → Domain/Core
Data → Domain (Implementación de Repositorios)
Infrastructure → Domain/Core (Implementación de Interfaces)
```

**Reglas específicas:**

- ❌ **Domain NO puede importar de:**
  - `@/data/*`
  - `@/presentation/*`
  - `@/infrastructure/*`
  - Frameworks (expo-sqlite, react-native, etc.)

- ✅ **Presentation solo puede:**
  - Usar casos de uso desde `container`
  - Importar tipos de `@/domain/entities/*`
  - Importar servicios de dominio (`@/domain/services/*`)

- ✅ **Data solo puede:**
  - Implementar interfaces de `@/domain/repositories/*`
  - Importar tipos de `@/domain/entities/*`

#### 3.4. Inyección de Dependencias

- ✅ **SIEMPRE usar `container` desde `src/core/di/container.ts`**
- ✅ **NUNCA instanciar casos de uso directamente en hooks**
- ✅ **Agregar nuevos casos de uso al contenedor DI**

### 4. Validación Post-Desarrollo

**Al terminar cualquier cambio, clasificar:**

1. **OTA (JS/UI)**: Cambios que solo afectan JavaScript/TypeScript
   - Componentes, hooks, casos de uso
   - No requieren rebuild nativo
   - Ejemplos: Nuevos casos de uso, cambios en UI, lógica de negocio

2. **Requiere Build Nativo**: Cambios que afectan código nativo
   - Dependencias nativas nuevas
   - Cambios en `app.json`, `eas.json`
   - Migraciones de base de datos (puede requerir rebuild si hay cambios en schema)
   - Ejemplos: Nuevas dependencias de Expo, cambios en permisos nativos

### 5. Bloqueo de Violaciones

**Si una petición rompe reglas:**

1. ❌ **BLOQUEAR la implementación** que viola la regla
2. 📋 **Explicar QUÉ regla se rompe** y POR QUÉ
3. ✅ **Proponer la alternativa correcta** respetando arquitectura
4. 📚 **Referenciar documentación relevante** (ARCHITECTURE_MAP.md, etc.)

**Ejemplos de bloqueos:**

- ❌ "No puedo poner lógica de negocio en el componente. Debe ir en un caso de uso."
- ❌ "No puedo usar `toISOString()` para guardar días. Debe usar `toLocalYMD()`."
- ❌ "No puedo importar `@/data/*` desde Domain. Debe usar una interfaz de repositorio."

## Checklist de Desarrollo

Antes de marcar una tarea como completa, verificar:

- [ ] Se consultaron ARCHITECTURE_MAP.md y BUSINESS_LOGIC.md
- [ ] La lógica de negocio está en `src/domain/usecases/`
- [ ] La persistencia está en `src/data/sqlite/`
- [ ] No se usa `toISOString()` para días
- [ ] Se respeta la jerarquía de capas (Domain no conoce Data/UI)
- [ ] Se agregaron casos de uso al contenedor DI
- [ ] Se clasificó el cambio como OTA o Requiere Build Nativo
- [ ] Se actualizó documentación si es necesario

## Referencias Rápidas

- **Arquitectura**: `.dayloop/docs/ARCHITECTURE_MAP.md`
- **Lógica de Negocio**: `.dayloop/docs/BUSINESS_LOGIC.md`
- **Fechas**: `.dayloop/docs/DATETIME_STANDARDS.md`
- **Base de Datos**: `.dayloop/docs/DATABASE_SCHEMA.md`
- **Deuda Técnica**: `.dayloop/docs/TECHNICAL_DEBT.md`

## Notas Importantes

- Este manifest tiene **prioridad sobre** cualquier petición que lo viole
- Si hay conflicto entre una petición y este manifest, **seguir el manifest**
- Cuando se detecte una violación, **educar al usuario** sobre la regla correcta

---

**Última actualización**: 2024-01-XX
**Versión**: 1.0
