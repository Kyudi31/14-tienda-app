---
name: safety-audit
description: >-
  Audita la seguridad, ausencia de credenciales filtradas y calidad del codigo en el repositorio.
---

# Auditoría de Seguridad y Calidad (App Móvil)

Sigue este procedimiento para validar el repositorio:

## 1. Escaneo de Secretos y Fugas
Ejecuta el script de comprobación:
```bash
./.agents/skills/safety-audit/scripts/check-secrets.sh
```
- Comprueba que `.env*` no esté rastreado por Git.
- Asegura que NO existan claves de Firebase ni credenciales en `app/` o `src/`.

## 2. Comprobación del Canario
Ejecuta la validación del canario de contención:
```bash
./.agents/skills/safety-audit/scripts/run-canary-test.sh
```

## 3. Calidad Automática
Corre el script unificado de verificación:
```bash
npm run check
```
- Valida TypeCheck con TypeScript (`tsc --noEmit`).
- Valida ESLint con Expo.
