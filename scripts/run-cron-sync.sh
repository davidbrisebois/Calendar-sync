#!/bin/sh
set -eu

APP_URL="${APP_URL:-http://127.0.0.1:${PORT:-3000}}"
CRON_ENDPOINT="${CRON_ENDPOINT:-/api/cron}"

if [ -n "${CRON_SECRET:-}" ]; then
  wget -q -O - --header="x-cron-secret: ${CRON_SECRET}" "${APP_URL}${CRON_ENDPOINT}" >/dev/null
else
  wget -q -O - "${APP_URL}${CRON_ENDPOINT}" >/dev/null
fi
