# Dayloop 🟡

Dayloop es una app mobile para trackear hábitos de forma simple, visual y sin fricción, enfocada en el día a día, con soporte para hábitos diarios, semanales y mensuales.

Está construida con Expo + React Native, usando una arquitectura limpia por capas y soporte para actualizaciones OTA (Over-The-Air).

---

## 🚀 Stack tecnológico

- Expo (SDK moderno)
- React Native
- TypeScript
- Expo Router
- SQLite (local)
- EAS Build / Submit / Update
- Expo Notifications
- Expo Updates (OTA)

---

## 🧱 Arquitectura

El proyecto sigue una arquitectura por capas, separando responsabilidades:

    src/
    ├─ domain/           # Entidades, usecases y reglas de negocio
    ├─ data/             # Implementaciones de repositorios (SQLite)
    ├─ infraestructure/  # Servicios externos (notificaciones, Expo)
    ├─ presentation/     # Screens, hooks y UI
    ├─ core/             # DI container y configuración global

Principios aplicados:
- Separación clara de responsabilidades
- Usecases explícitos
- Infra desacoplada
- UI sin lógica de negocio

---

## 🧠 Funcionalidades principales

- Crear hábitos:
  - Diarios
  - Semanales (días específicos)
  - Mensuales (días del mes)
- Marcar hábitos como completados por día
- Vista Hoy:
  - Pendientes
  - Completados
  - Filtros por frecuencia y momento del día
- Vista Mis hábitos para gestión completa
- Estadísticas (streaks y resúmenes)
- Notificaciones programadas
- Soporte offline

---

## 🔔 Notificaciones

Las notificaciones se gestionan mediante un servicio desacoplado:

- NotificationScheduler (interfaz)
- ExpoNotificationScheduler (implementación)

Soporta:
- Hábitos diarios
- Hábitos semanales
- Hábitos mensuales (fallback MVP)

Las notificaciones:
- se programan al crear un hábito
- se cancelan al eliminarlo
- mantienen sus IDs persistidos para control y limpieza

---

## ⚡ OTA (Over-The-Air Updates)

Dayloop utiliza Expo Updates para enviar cambios sin pasar por App Store ni Play Store.

Configuración clave usada en app.json:

    updates:
      fallbackToCacheTimeout: 0

    runtimeVersion:
      policy: appVersion

### Qué se puede actualizar por OTA
- UI y estilos
- Lógica TypeScript / JavaScript
- Navegación
- Textos y copy
- Bugfixes

### Qué NO se puede actualizar por OTA
- Cambios nativos
- Plugins
- Permisos
- Cambios nativos en app.json
- SDKs nativos

---

## 🌿 Flujo de ramas (definitivo)

Objetivo:
- `main`: publicar a stores (producción)
- `preview`: TestFlight + Play Store testers internos
- `develop`: desarrollo interno (dev client / builds internos)

Flujo:

    feature/* → develop → preview → main

Reglas:
- No se hace push directo a main
- main solo recibe PR desde preview
- preview solo recibe PR desde develop
- develop recibe PR desde feature/*

---

## 🧪 Perfiles EAS (build + submit)

### Development (develop)
Uso: pruebas internas rápidas con Dev Client.

Build:
    npx eas build --profile development --platform ios
    npx eas build --profile development --platform android

Canal OTA:
- `channel: develop`

---

### Preview (preview)
Uso: TestFlight + Play Store testers internos (release-like, pero no producción).

Build:
    npx eas build --profile preview --platform ios
    npx eas build --profile preview --platform android

Submit:
    npx eas submit --profile preview --platform ios
    npx eas submit --profile preview --platform android

Tracks:
- Android: `internal`
- iOS: TestFlight (App Store Connect)

Canal OTA:
- `channel: preview`

---

### Production (main)
Uso: Stores (producción real).

Build:
    npx eas build --profile production --platform ios
    npx eas build --profile production --platform android

Submit:
    npx eas submit --profile production --platform ios
    npx eas submit --profile production --platform android

Tracks:
- Android: `production`
- iOS: App Store (review)

Canal OTA:
- `channel: production`

---

## 📦 Versionado

- `expo.version`: versión visible al usuario (ej: 1.0.5)
- Solo se incrementa al mergear a `main` (release)
- `autoIncrement: true` maneja:
  - iOS `buildNumber`
  - Android `versionCode`

Cambios solo JS/UI → OTA (no requiere subir versión, mientras no cambie runtimeVersion).

---

## 🧾 Pull Requests

Todos los PRs usan template obligatorio que incluye:
- Tipo de cambio
- Checklist de pruebas
- Decisión explícita entre OTA o Build

Archivo:
    .github/pull_request_template.md

---

## 🚀 Scripts comunes

Desarrollo:
    pnpm start

Build local:
    pnpm expo prebuild

EAS build (preview):
    npx eas build --profile preview

EAS submit (preview):
    npx eas submit --profile preview

EAS build (producción):
    npx eas build --profile production

EAS submit (producción):
    npx eas submit --profile production

---

## 📱 Plataformas soportadas

- iOS (device / TestFlight / App Store)
- Android (internal testing / Play Store)

---

## 🧑‍💻 Autor

Codeamus  
Proyecto personal enfocado en calidad, claridad y experiencia de usuario.

---

## 🟡 Filosofía

Dayloop busca:
- simplicidad
- claridad visual
- cero fricción
- hábitos que se adapten a la vida real

No es una app de presión, es una app de acompañamiento.
