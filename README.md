# Inventario de Tienda de Barrio (App Móvil)

Aplicación móvil atómica y offline-first diseñada para tenderos de barrio. Permite un control preciso de inventario en tiempo real, registro de movimientos de stock (entradas y salidas), escaneo de códigos de barra con cámara, detección de sacudida para reversión (Shake-to-Undo) y sincronización bidireccional con backend en la nube.

---

## 1. Arquitectura y Tecnologías

El proyecto está construido con **Expo SDK 58**, **React Native 0.88** y **TypeScript** en modo estricto (`strict: true`, `noUncheckedIndexedAccess: true`).

```
src/
├── app/                  # Enrutamiento basado en archivos con Expo Router
│   ├── (tabs)/           # Pestañas principales: Inventario, Escáner, Movimientos
│   ├── producto/         # Rutas dinámicas: [id].tsx (detalle) y nuevo.tsx (alta)
│   └── _layout.tsx       # Inicialización de BD SQLite y GestureHandlerRootView
├── db/                   # Capa SQLite local (DDL, migraciones, seed inicial, PRAGMAs)
├── repositories/         # Patrón Repositorio con consultas SQL 100% parametrizadas
├── services/             # Lógica de negocio (inventarioSQLite, sincronización, reversión)
├── sensors/              # Lógica de acelerómetro desacoplada y hook useShake
├── api/                  # Cliente HTTP seguro con reintento 401 y SecureStore
├── components/           # Componentes UI accesibles divididos por dominio
├── constants/            # Colores, temas y configuraciones visuales
└── types/                # Definiciones de tipos TypeScript del modelo de dominio
```

### Principios Arquitectónicos
1. **Offline-First Absoluto:** Todas las lecturas y escrituras se ejecutan de manera inmediata en la base de datos local SQLite (`expo-sqlite`). El tendero puede operar 100% sin conexión a internet.
2. **Cero Secretos en el Cliente:** La app móvil NO almacena claves privadas, credenciales de administrador ni `firebaseConfig`. Únicamente consume la URL pública del backend (`EXPO_PUBLIC_API_URL`) y almacena tokens de sesión JWT cifrados en `expo-secure-store`.
3. **Resiliencia y Concurrencia:** SQLite configurado con `PRAGMA journal_mode = WAL;` y `PRAGMA foreign_keys = ON;`.
4. **Accesibilidad Universal:** Todo gesto táctil y sensor físico cuenta con su equivalente en botón visible con etiqueta descriptiva (`accessibilityLabel`).

---

## 2. Criterios de Aceptación (Demostración)

La aplicación implementa y valida de manera estricta los tres criterios de aceptación del proyecto:

| Criterio | Descripción | Demostración en la App |
|---|---|---|
| **CA-1: Stock Nunca Negativo** | Si un producto tiene stock $N$, intentar registrar una salida mayor a $N$ debe ser rechazado atómicamente. | En el formulario de ajuste de stock (`/producto/[id]`), intentar restar más unidades de las disponibles dispara una alerta de validación y bloquea la operación. El repositorio SQLite y el servicio validan la condición en transacción: dado stock 2, sacar 3 es rechazado y el stock permanece en 2. |
| **CA-2: Código Desconocido Ofrece Alta** | Al escanear un código de barras que no existe en el catálogo, la app debe ofrecer darlo de alta de inmediato. | Al escanear o ingresar un código no registrado, la vista del escáner muestra la tarjeta interactiva `CodigoNoRegistradoCard` con el mensaje *"Código no encontrado"* y el botón *"Registrar este producto"*, el cual navega a `/producto/nuevo` con el código prellenado. |
| **CA-3: Alternativa Sin Cámara** | Si el usuario deniega el permiso de cámara o el dispositivo no cuenta con ella, la app debe permitir operar manualmente. | La vista del escáner detecta la falta de permisos y despliega un estado informativo con el botón accesible *"Ingresar código manualmente"*, que abre un modal con teclado numérico para buscar o registrar productos. |

---

## 3. Gestos y Sensores con Alternativas Accesibles

La aplicación aprovecha las capacidades del dispositivo móvil mediante gestos fluidos y sensores físicos, garantizando siempre una alternativa accesible:

```
┌───────────────────────────┬──────────────────────────────────┬─────────────────────────────────────┐
│ Capacidad Física          │ Implementación Nativa            │ Alternativa Accesible (Botón)       │
├───────────────────────────┼──────────────────────────────────┼─────────────────────────────────────┤
│ Gesto: Swipe Horizontal   │ Deslizar tarjeta a la izquierda  │ Botón "Ajustar stock" / "Ver"       │
│                           │ en lista de productos            │ (accessibilityLabel="Ajustar stock") │
├───────────────────────────┼──────────────────────────────────┼─────────────────────────────────────┤
│ Gesto: Pinch-to-Zoom      │ Pinza con 2 dedos en la cámara   │ Botones táctiles "+" y "-" en pantalla│
│                           │ para ampliar el zoom (0x a 1x)   │ (accessibilityLabel="Aumentar zoom") │
├───────────────────────────┼──────────────────────────────────┼─────────────────────────────────────┤
│ Sensor: Cámara            │ Escáner de código de barras con  │ Botón "Ingresar código manual"      │
│                           │ throttle de 1.5s (expo-camera)   │ abre modal con teclado numérico     │
├───────────────────────────┼──────────────────────────────────┼─────────────────────────────────────┤
│ Sensor: Acelerómetro      │ Sacudida física (Shake > 1.75g)  │ Botón permanente "Deshacer último"   │
│                           │ para revertir último movimiento   │ en UndoBar y en cada historial      │
└───────────────────────────┴──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 4. Instrucciones de Ejecución

### Requisitos Previos
- **Node.js:** Versión 20.x o superior.
- **npm:** Versión 10.x o superior.
- Dispositivo físico Android con **Expo Go** o emulador Android Studio.

### Instalación
```bash
# Clonar e ingresar al directorio de la app
cd 14-inventario-tienda-app

# Instalar dependencias
npm install
```

### Ejecución en Desarrollo
```bash
# Iniciar el servidor Metro de Expo
npx expo start

# Opciones directas:
npm run android   # Abrir en emulador o dispositivo Android conectado
npm run web       # Abrir en navegador web
```

### Verificación de Calidad y Pruebas
```bash
# Ejecutar todas las pruebas unitarias (Node Test Runner)
npm test

# Ejecutar verificación completa (TypeScript estricto + pruebas)
npm run check

# Ejecutar linter de código
npm run lint
```

### Generación de APK Instalable (Android)
El proyecto cuenta con configuración para **EAS Build** (`eas.json`):

```bash
# Compilar APK local o en la nube de Expo Application Services
eas build -p android --profile preview
```
*El perfil `preview` está configurado con `"buildType": "apk"`, generando un archivo APK descargable e instalable directamente sin pasar por Play Store.*

---

## 5. Justificación de Dependencias

| Dependencia | Propósito en el Proyecto |
|---|---|
| `expo-sqlite` | Base de datos relacional local en el dispositivo. Garantiza persistencia offline-first, consultas indexadas y soporte transaccional ACID. |
| `expo-camera` | Módulo de acceso a la cámara para escaneo en tiempo real de códigos de barras (EAN-13, EAN-8, UPC-A, QR). |
| `expo-sensors` | Acceso al acelerómetro de tres ejes del dispositivo para implementar la funcionalidad Shake-to-Undo. |
| `expo-secure-store` | Almacenamiento seguro en hardware (Android Keystore / iOS Keychain) para tokens JWT de autenticación. |
| `react-native-gesture-handler` | Gestión de gestos táctiles nativos a 60 FPS (Swipe y Pinch) en el hilo de interfaz. |
| `react-native-reanimated` | Animaciones fluidas impulsadas por el motor nativo para transiciones visuales y tarjetas. |
| `expo-router` | Sistema de navegación tipado basado en archivos que simplifica el flujo de la aplicación. |
| `expo-haptics` | Retroalimentación táctil por vibración ante lecturas exitosas del escáner y sacudidas. |

---

## 6. Seguridad y Buenas Prácticas con IA

El desarrollo de esta aplicación sigue las reglas de contención y seguridad definidas en `AGENTS.md` e `ia/CONFIGURACION.md`:
- **Auditoría de Secretos:** Verificación mediante scripts automatizados en `.agents/skills/safety-audit/scripts/check-secrets.sh`.
- **Protección del Canario:** Pruebas documentadas en `ia/PRUEBAS-CONTENCION.md`.
- **Bitácora de IA:** Registro de sesiones y correcciones en `ia/BITACORA.md`.
- **Guía de Sustentación:** Procedimiento paso a paso para la evaluación en vivo en `ia/GUIA-SUSTENTACION.md`.
