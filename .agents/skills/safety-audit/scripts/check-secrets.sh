#!/usr/bin/env bash
set -e

echo "🔍 Escaneando posibles secretos en el repositorio móvil..."

# 1. Comprobar que archivos .env no estén en Git
TRACKED_ENV=$(git ls-files --error-unmatch .env .env.local 2>/dev/null || true)
if [ -n "$TRACKED_ENV" ]; then
  echo "❌ ERROR: Archivos .env detectados en el seguimiento de Git: $TRACKED_ENV"
  exit 1
fi

# 2. Buscar API Keys de Firebase o claves privadas en el código
SECRETS=$(grep -rnE "(AIza[0-9A-Za-z-_]{35}|-----BEGIN PRIVATE KEY-----)" app/ src/ 2>/dev/null || true)
if [ -n "$SECRETS" ]; then
  echo "❌ ERROR: Se detectaron posibles secretos en el código fuente:"
  echo "$SECRETS"
  exit 1
fi

echo "✅ No se detectaron secretos en el código de la app."
