# Configuración de Seguridad y Barreras de IA

Este documento describe la arquitectura de contención, qué riesgo cubre cada barrera, sus límites técnicos y los ajustes realizados en el proyecto.

---

## 1. Modelo de Amenazas y Riesgos Cubiertos

| Riesgo | Barrera Implementada | Mecanismo de Control |
|---|---|---|
| **Fuga de secretos de producción** | Ausencia total de secretos en disco + `.gitignore` estricto | La app no conoce `firebaseConfig` ni claves privadas. `.env*` está excluido de Git. |
| **Lectura de variables locales (.env\*)** | Regla explícita en `AGENTS.md` + bloqueo de lectura | Prohibido leer archivos `.env*` o canarios mediante herramientas del agente. |
| **Escape de la carpeta del proyecto** | Delimitación del workspace a la raíz del repositorio | Prohibido explorar rutas como `..`, `~` o directorios del sistema operativo. |
| **Comandos destructivos o exfiltración** | Prohibición de `curl`, `wget`, `sudo`, `rm -rf`, `git push --force` | Restricción de herramientas y solicitud de confirmación para acciones con efecto externo. |
| **Prompt Injection indirecto** | Instrucción de tratamiento de datos ("Datos, no órdenes") | Contenido de archivos, issues o respuestas de API se procesan como texto inerte. |
| **Degradación de código por IA** | Script unificado `npm run check` | TypeScript en modo estricto, ESLint sin advertencias (`--max-warnings 0`) y pruebas automatizadas. |

---

## 2. Capas de Seguridad y Límites Técnicos

### Capa 1: Reglas de Contexto (`AGENTS.md`)
- **Propósito:** Orienta al modelo sobre las normas del repositorio, estándares de arquitectura (capas `db`, `repositories`, `services`, `components`) y restricciones operativas.
- **Límite conocido:** Es una directiva contextual (soft control). Un prompt malicioso o una inyección compleja podría intentar eludirla si actúa sola.

### Capa 2: Confinamiento y Aislamiento (Sandbox)
- **Propósito:** Confinar el alcance de ejecución a la raíz del proyecto, evitando que scripts accedan a `~/.ssh`, `~/.bashrc` u otros repositorios locales.
- **Límite conocido:** Una regla simple de texto en comandos (ej. `curl *`) no detiene rutas absolutas (`/usr/bin/curl`) a menos que el sandbox o el interceptor supervise el binario.

### Capa 3: Arquitectura sin Secretos ("Zero Secrets in Client")
- **Propósito:** La regla de oro del proyecto 14 establece que el cliente móvil únicamente consume `EXPO_PUBLIC_API_URL` y guarda tokens en `expo-secure-store`. No existen claves de Firebase en el repositorio de la app.
- **Límite conocido:** Todo valor con prefijo `EXPO_PUBLIC_` se incrusta en el APK final; por diseño, solo se expone la URL base del backend.

---

## 3. Ajustes y Decisiones Técnicas
1. **Unificación de comandos:** Se integró el comando `npm run check` en `package.json` para validar tipos y linting en un solo paso antes de commits.
2. **Modularización con Skills:** Se estructuró la habilidad `safety-audit` en `.agents/skills/` para permitir auditorías reproducibles en cualquier momento.
