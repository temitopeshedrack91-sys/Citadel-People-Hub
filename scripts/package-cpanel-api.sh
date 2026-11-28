#!/usr/bin/env bash
# ==============================================================================
# CITADEL PEOPLE HUB — CPANEL SHARED HOSTING PACKAGING SCRIPT (NO SSH REQUIRED)
# ==============================================================================
# Run this script on a release build machine with PHP 8.3 and Composer installed.
# It produces `dist/citadel-api-cpanel-release.zip` containing the Laravel 11 API
# and pre-built `vendor/` directory ready to upload via cPanel File Manager to:
#   /home/<CPANEL_USERNAME>/citadel-api/
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
STAGE_DIR="${ROOT_DIR}/dist/citadel-api-stage"
ARCHIVE_PATH="${ROOT_DIR}/dist/citadel-api-cpanel-release.zip"

echo "==> Checking PHP & Composer on build machine..."
php -v
composer --version

echo "==> Installing production Composer dependencies in backend/..."
cd "${BACKEND_DIR}"
composer install \
  --no-dev \
  --prefer-dist \
  --no-interaction \
  --no-progress \
  --optimize-autoloader

echo "==> Clearing local development caches before packaging..."
rm -f bootstrap/cache/config.php \
      bootstrap/cache/routes-*.php \
      bootstrap/cache/events.php \
      bootstrap/cache/packages.php \
      bootstrap/cache/services.php

echo "==> Staging clean cPanel release files..."
rm -rf "${STAGE_DIR}" "${ARCHIVE_PATH}"
mkdir -p "${STAGE_DIR}"

rsync -a \
  --exclude='/.htaccess' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='tests' \
  --exclude='database/database.sqlite' \
  --exclude='storage/logs/*.log' \
  --exclude='storage/framework/cache/data/*' \
  --exclude='storage/framework/sessions/*' \
  --exclude='storage/framework/views/*.php' \
  "${BACKEND_DIR}/" "${STAGE_DIR}/"

# Ensure required writable storage & cache directories exist with .gitignore
mkdir -p \
  "${STAGE_DIR}/bootstrap/cache" \
  "${STAGE_DIR}/storage/app/public" \
  "${STAGE_DIR}/storage/framework/cache/data" \
  "${STAGE_DIR}/storage/framework/sessions" \
  "${STAGE_DIR}/storage/framework/views" \
  "${STAGE_DIR}/storage/logs"

echo "==> Creating ZIP archive: ${ARCHIVE_PATH}"
cd "${STAGE_DIR}"
zip -rq "${ARCHIVE_PATH}" . -x "*.DS_Store"

echo "==> Done! Upload ${ARCHIVE_PATH} to /home/<CPANEL_USERNAME>/citadel-api/ via cPanel File Manager."
