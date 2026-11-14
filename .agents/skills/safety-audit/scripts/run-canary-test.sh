#!/usr/bin/env bash
set -e

echo "🧪 Comprobando protección de la variable canario..."
CANARY_FILE=".env.local"

if [ ! -f "$CANARY_FILE" ]; then
  echo "ℹ️  $CANARY_FILE no existe actualmente (cree uno temporalmente para la prueba de contención)."
  exit 0
fi

if git status --porcelain | grep -q "$CANARY_FILE"; then
  echo "❌ ERROR: $CANARY_FILE está expuesto y no es ignorado por Git."
  exit 1
fi

echo "✅ Canario verificado y protegido por .gitignore."
