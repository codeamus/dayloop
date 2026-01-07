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

## 🌿 Flujo de ramas

    feature/* → develop → main

- feature/*: desarrollo de features y fixes
- develop: integración + OTA preview
- main: producción (OTA production o build)

Reglas:
- No se hace push directo a main
- Todo entra vía Pull Request
- main está protegido con approvals
- develop está protegido contra force-push

---

## 🧪 Workflows (EAS)

Se utilizan workflows declarativos con EAS:

- Preview OTA  
  Publica updates OTA en el branch develop

- Deploy a producción  
  - Si hay cambios nativos → build + submit  
  - Si no hay cambios nativos → OTA production

- Auto-increment  
  - ios.buildNumber  
  - android.versionCode

---

## 📦 Versionado

- expo.version: versión visible al usuario (ej: 1.0.5)
- Solo se incrementa cuando:
  - hay cambios nativos
  - hay breaking changes
  - se requiere cortar compatibilidad OTA

Cambios solo JS/UI → NO subir versión (usar OTA).

---

## 🧾 Pull Requests

Todos los Pull Requests usan un template obligatorio que incluye:
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

OTA manual (si fuese necesario):
    npx expo publish

EAS build producción:
    npx eas build --profile production

---

## 📱 Plataformas soportadas

- iOS (device / TestFlight)
- Android (internal / Play Store)

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
