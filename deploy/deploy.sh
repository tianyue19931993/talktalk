#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/talktalk}"
ENV_FILE="${ENV_FILE:-.env.production}"

cd "$APP_DIR"

echo "[deploy] Pulling latest main..."
git fetch origin main
git checkout main
git pull --ff-only origin main

if [ ! -f "$ENV_FILE" ]; then
  echo "[deploy] Missing $APP_DIR/$ENV_FILE"
  exit 1
fi

echo "[deploy] Building and restarting Docker service..."
docker compose --env-file "$ENV_FILE" up -d --build

echo "[deploy] Cleaning dangling Docker images..."
docker image prune -f

echo "[deploy] Current containers:"
docker compose ps

echo "[deploy] Done."
