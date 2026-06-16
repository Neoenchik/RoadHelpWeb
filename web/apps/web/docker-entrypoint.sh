#!/bin/sh
set -e

ROOT=/workspace
WEB="$ROOT/apps/web"

if [ ! -x "$ROOT/node_modules/.bin/next" ]; then
  echo "Installing npm dependencies..."
  cd "$ROOT"
  if [ -f package-lock.json ]; then
    npm ci --include=dev --legacy-peer-deps --no-audit --no-fund
  else
    npm install --include=dev --legacy-peer-deps --no-audit --no-fund
  fi
fi

cd "$WEB"
exec "$@"
