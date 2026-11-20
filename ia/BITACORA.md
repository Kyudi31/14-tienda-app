# Bitácora de Interacción con Asistentes de IA · App Móvil

Registro de sesiones de desarrollo asistido con IA, metodologías aplicadas, validaciones y decisiones tomadas por el equipo.

---

## 1. Registro General de Sesiones

| Sesión / Fecha | Propósito | Evidencia / Prompt | Validación | Decisión |
|---|---|---|---|---|
| **#1 · 14-Nov** | Inicialización del repositorio y reglas de IA | *"Configura AGENTS.md, estructura de skills y scripts de calidad para Expo"* | Revisión manual de líneas (≤ 100) y ejecución de `npm run check` | Aceptado tras ajustar límites de herramientas |
| **#2 · 14-Nov** | Instalación de dependencias de sensores y gestos | *"Agrega expo-camera, expo-sqlite, expo-sensors y gesture-handler"* | `npx expo install` para compatibilidad con Expo SDK 52/58 | Aceptado y versionado |
| **#3 · 14-Nov** | Definición de barreras y pruebas de contención | *"Diseña la matriz de pruebas del canario ZZZ-NO-ES-UN-SECRETO"* | Comprobación de que `.env*` esté excluido de Git y del agente | Aceptado |
| **#4 · 19-Nov** | Navegación Hito 1 y rutas Expo Router | *"Configura arquitectura de rutas Expo Router (tabs, escaner, movimientos, producto/[id]) con GestureHandlerRootView"* | `npx tsc --noEmit` código 0, auditoría de seguridad aprobada, archivos ≤ 300 líneas | Aceptado y commiteado tras revisión de diff |
| **#5 · 19-Nov** | Gestos interactivos y accesibles (Hito 1) | *"Implementa Swipe horizontal en ProductCard y Pinch zoom en CameraPreview con alternativas accesibles por botón"* | `npx tsc --noEmit` código 0, sin any, alternativas accesibles con accessibilityLabel | Aceptado y commiteado |
| **#6 · 19-Nov** | Escáner, sensor y formulario de alta (Hito 1) | *"Implementa throttle de escaneo 1.5s, CA-2 (código desconocido ofrece alta), CA-3 (alternativa manual sin cámara) y pantalla producto/nuevo con validaciones"* | `npx tsc --noEmit` código 0, validación de unicidad de código, precio y stock ≥ 0, archivos ≤ 300 líneas | Listo para commit |

---

## 2. Casos Obligatorios de Corrección y Rechazo a la IA (Mínimo 3)

La rúbrica exige documentar al menos 3 instancias donde el equipo **rechazó o corrigió** una propuesta de la IA:

### Caso 1: Rechazo de credenciales en la App Móvil
- **Propuesta de la IA:** La IA sugirió crear un archivo `src/firebase/config.ts` importando `initializeApp(firebaseConfig)` con llaves de Firebase dentro del código de Expo.
- **Motivo de rechazo:** Violación directa de la **Regla de Oro** del Proyecto 14 (Sección 2 del `.md`), que prohíbe credenciales en la app móvil ya que quedan expuestas en el APK.
- **Corrección aplicada:** Se eliminó la propuesta y se reafirmó que la autenticación se consume exclusivamente a través de la API en Next.js con `EXPO_PUBLIC_API_URL` y tokens en `expo-secure-store`.

### Caso 2: Corrección en manejo de tipos en TypeScript
- **Propuesta de la IA:** La IA utilizó tipos genéricos `any` en los manejadores de eventos del escáner de códigos de barras para evitar errores de compilación rápidos.
- **Motivo de corrección:** La rúbrica prohíbe el uso de `any`, `@ts-ignore` o `@ts-nocheck` en modo `strict`.
- **Corrección aplicada:** Se le exigió tipar correctamente el evento con `BarcodeScanningResult` de `expo-camera`.

### Caso 3: Corrección en control de stock no negativo
- **Propuesta de la IA:** La IA implementó una función de ajuste de stock que simplemente hacía `stock = stock - cantidad` sin comprobar si el stock resultante era menor a cero.
- **Motivo de rechazo:** Incumplimiento del Criterio de Aceptación 1 ("Stock nunca negativo: dado stock 2, sacar 3 se rechaza").
- **Corrección aplicada:** Se implementó la validación previa obligatoria y el rechazo con mensaje de error claro antes de registrar el movimiento.
