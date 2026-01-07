# Release checklist — Dayloop

## Regla principal
- **OTA** si es solo JS/UI (pantallas, estilos, lógica TS/JS).
- **Build** si hay cambios nativos (plugins, permisos, app.json nativo, SDKs nativos).

## Antes de merge a `main`
- [ ] Probado en iOS (build instalada)
- [ ] Probado en Android (build instalada)
- [ ] Revisé crashes/warnings en consola
- [ ] Confirmé si es OTA o Build

## OTA (sin build)
✅ No cambies `expo.version`  
- Merge a `main` → workflow publica OTA en `branch: production`

## Build (con submit a stores)
✅ Sube `expo.version` cuando corresponda:
- feature grande / release visible / breaking changes / cambios nativos

Pasos:
1. Cambiar `expo.version` (ej: 1.0.5 → 1.0.6)
2. Commit + merge a `main`
3. Workflow: build + submit  
   - `autoIncrement: true` sube `ios.buildNumber` y `android.versionCode` automáticamente

## Cuándo subir `expo.version` (ejemplos)
### Requiere BUILD + subir version
- Cambios en plugins de `app.json`
- Permisos nuevos (iOS/Android)
- Cambios de notificaciones, background modes
- Cambios de icon/splash/adaptive icon
- Upgrades de Expo SDK / React Native
- Cualquier dependencia que toque nativo

### No requiere subir version (OTA)
- UI/UX (Home, Habits, Settings)
- Copywriting / textos
- Fixes de lógica de hábitos
- Ajustes de routing (expo-router) si no agrega nativo
- Refactors TS/JS
