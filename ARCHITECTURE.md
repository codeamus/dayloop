# Arquitectura de Dayloop

## Flujo de Dependencias (Regla de Oro)
Presentation -> Domain/Core
Data -> Domain (Implementación de Repositorios)
Infrastructure -> Domain/Core (Implementación de Interfaces)

## Capas
- **domain/**: Contiene las entidades (`Habit`, `HabitLog`), los `usecases` (la única forma de tocar datos desde la UI) y las interfaces de repositorios.
- **data/**: Implementaciones de SQLite. Aquí vive el SQL crudo y el mapeo a entidades de dominio.
- **core/**: Utilidades globales, Inyección de Dependencias (DI), configuración de notificaciones y constantes.
- **infrastructure/**: Adaptadores para servicios externos (Expo Notifications, Permissions).
- **presentation/**: Componentes de React Native, Hooks que consumen UseCases y navegación con Expo Router.